import { mkdir, readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ListingSchema, type Listing } from '../shared/schemas';
import { PublicError } from './errors';
const StoreSchema=z.strictObject({
  day:z.string(),searches:z.number().int().min(0),urls:z.number().int().min(0),models:z.number().int().min(0),tokens:z.number().int().min(0),
  rates:z.array(z.strictObject({key:z.string().max(100),at:z.number(),kind:z.enum(['search','assessment','preparation'])})).max(5000),
  modelWindow:z.array(z.strictObject({at:z.number(),tokens:z.number().int(),id:z.string().optional(),settled:z.boolean().optional(),model:z.string().max(80).optional()})).max(300),
  modelDay:z.array(z.strictObject({id:z.string().max(80),tokens:z.number().int().min(0),model:z.string().max(80)})).max(4000).default([]),
  queryWindow:z.array(z.number()).max(25).default([]),
  urlWindow:z.array(z.strictObject({at:z.number(),count:z.number().int().min(1).max(10)})).max(120).default([]),
  extractions:z.array(z.strictObject({key:z.string().max(80),at:z.number(),value:z.unknown()})).max(120).default([]),
  listings:z.array(z.strictObject({owner:z.string().max(80),at:z.number(),listing:ListingSchema})).max(240),
  // TinyFish Agent spend in integer micro-USD. Reservations are held until actual steps settle them.
  agentMicroUsd:z.number().int().min(0).default(0),agentRuns:z.number().int().min(0).default(0),
  agentReservations:z.array(z.strictObject({id:z.string().max(80),day:z.string(),micro:z.number().int().min(0),settled:z.boolean()})).max(50).default([]),
});
type Store=z.infer<typeof StoreSchema>;
const directory=resolve(process.cwd(),'../../private-runtime');
const path=resolve(directory,'usage-and-sources.json');
let chain:Promise<unknown>=Promise.resolve();
const fresh=(now:number):Store=>({day:new Date(now).toISOString().slice(0,10),searches:0,urls:0,models:0,tokens:0,rates:[],modelWindow:[],modelDay:[],queryWindow:[],urlWindow:[],extractions:[],listings:[],agentMicroUsd:0,agentRuns:0,agentReservations:[]});
async function transaction<T>(work:(data:Store,now:number)=>T):Promise<T>{
  const operation=chain.then(async()=>{
    const now=Date.now();let data:Store;
    try{data=StoreSchema.parse(JSON.parse(await readFile(path,'utf8')));}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')data=fresh(now);
      else throw new PublicError('operational_storage','Usage storage is unavailable. Provider calls are paused.',503);}
    if(data.day!==new Date(now).toISOString().slice(0,10)){
      const previous=data;data=fresh(now);data.rates=previous.rates;data.modelWindow=previous.modelWindow;data.listings=previous.listings;
      data.queryWindow=previous.queryWindow;data.urlWindow=previous.urlWindow;data.extractions=previous.extractions;
      data.agentReservations=previous.agentReservations.filter(r=>!r.settled).slice(-50);
    }
    data.rates=data.rates.filter(r=>now-r.at<3600000);
    data.modelWindow=data.modelWindow.filter(r=>now-r.at<60000);
    data.queryWindow=data.queryWindow.filter(at=>now-at<60000);
    data.urlWindow=data.urlWindow.filter(r=>now-r.at<60000);
    data.extractions=data.extractions.filter(r=>now-r.at<7*86400000);
    data.listings=data.listings.filter(r=>now-r.at<7*86400000);
    const result=work(data,now);
    try{
      await mkdir(directory,{recursive:true,mode:0o700});await chmod(directory,0o700);
      await writeFile(path+'.tmp',JSON.stringify(StoreSchema.parse(data)),{mode:0o600});await rename(path+'.tmp',path);await chmod(path,0o600);
    }catch(error){
      // Log the failure class only (schema path or filesystem code), never stored content.
      const detail=error instanceof z.ZodError?{schema:error.issues.slice(0,3).map(i=>({path:i.path.slice(0,3).join('.'),code:i.code}))}:{fs:(error as NodeJS.ErrnoException).code??'unknown'};
      console.warn(JSON.stringify({stage:'store',code:'save_failed',...detail}));
      throw new PublicError('operational_storage','Usage storage could not be saved. Provider calls are paused.',503);
    }
    return result;
  });
  chain=operation.catch(()=>{});return operation;
}
let healthyUntil=0;
export async function checkOperationalStore(){
  if(Date.now()<healthyUntil)return;
  await transaction(()=>undefined);
  healthyUntil=Date.now()+30000;
}
export async function reserveRun(owner:string,ip:string,kind:'search'|'assessment'|'preparation'){
  return transaction((d,now)=>{
    // Private demo use: generous per-browser/network hourly caps that still stop a runaway loop.
    const max=1000;
    const browser=d.rates.filter(r=>r.key===owner&&r.kind===kind),network=d.rates.filter(r=>r.key===ip&&r.kind===kind);
    const exceeded=browser.length>=max?browser:network.length>=2000?network:null;
    if(exceeded)throw new PublicError('hourly_limit','The hourly allowance is used. Saved progress remains available.',429,Math.ceil((exceeded[0].at+3600000-now)/1000));
    if(d.rates.length>4000)throw new PublicError('capacity','The shared usage ledger is full. Try later.',429,3600);
    if(kind!=='assessment'&&d.searches>=2000)throw new PublicError('daily_limit','The shared daily discovery/preparation allowance is used. Try after UTC midnight.',429,3600);
    if(kind!=='assessment')d.searches++;
    d.rates.push({key:owner,kind,at:now},{key:ip,kind,at:now});
  });
}
export async function reserveQuery(){return transaction((d,now)=>{
  if(d.queryWindow.length>=25)return Math.ceil((d.queryWindow[0]+60000-now)/1000);
  d.queryWindow.push(now);return 0;
});}
export async function reserveUrls(count:number){return transaction((d,now)=>{
  if(!Number.isInteger(count)||count<1||count>10)throw new PublicError('input_limit','Invalid source batch.',400);
  if(d.urls+count>950)throw new PublicError('daily_limit','The shared daily source allowance is used.',429,3600);
  if(d.urlWindow.reduce((n,r)=>n+r.count,0)+count>120)return Math.ceil((d.urlWindow[0].at+60000-now)/1000);
  d.urls+=count;d.urlWindow.push({at:now,count});return 0;
});}
export interface ModelReservation {id:string;day:string;tokens:number;model:string}
/** Groq free tier, per model (account headers 2026-10-24): 8,000 tokens/minute, 1,000 requests/day, ~200k tokens/day. */
const MODEL_MINUTE_TOKENS=7800,MODEL_DAY_TOKENS=195000,MODEL_DAY_REQUESTS=950;
/** Reserve on the first model in preference order that has room; each Groq model has its own allowance. */
export async function reserveModel(tokens:number,models:string[]=['openai/gpt-oss-120b']){
  return transaction((d,now)=>{
    if(tokens>7000)throw new PublicError('input_limit','This source is too large for the verified model limit.',400);
    const of=(m:string)=>(v:{model?:string})=>(v.model??'openai/gpt-oss-120b')===m;
    const today=(m:string)=>d.modelDay.filter(of(m));
    const usable=models.filter(m=>{const t=today(m);return t.length<MODEL_DAY_REQUESTS&&t.reduce((n,v)=>n+v.tokens,0)+tokens<=MODEL_DAY_TOKENS;});
    if(!usable.length)throw new PublicError('daily_limit','Groq’s free daily allowance for every available model is used. No call was made.',429,3600);
    let wait=Infinity;
    for(const model of usable){
      const window=d.modelWindow.filter(of(model));
      if(window.reduce((sum,v)=>sum+v.tokens,0)+tokens>MODEL_MINUTE_TOKENS){wait=Math.min(wait,window.length?Math.ceil((window[0].at+60000-now)/1000):1);continue;}
      const reservation:ModelReservation={id:randomUUID(),day:d.day,tokens,model};
      d.models++;d.tokens+=tokens;d.modelWindow.push({at:now,tokens,id:reservation.id,settled:false,model});
      d.modelDay=[...d.modelDay,{id:reservation.id,tokens,model}].slice(-4000);
      return {wait:0,reservation};
    }
    return {wait:Math.max(1,wait),reservation:null};
  });
}
export async function settleModel(reservation:ModelReservation,tokens:number){
  if(!Number.isInteger(tokens)||tokens<0||tokens>1000000)return;
  await transaction(d=>{
    const entry=d.modelWindow.find(r=>r.id===reservation.id);
    if(!entry||entry.settled)return; // Missing usage retains the full reservation.
    entry.settled=true;entry.tokens=tokens;
    const day=d.modelDay.find(r=>r.id===reservation.id);if(day)day.tokens=tokens;
    if(d.day===reservation.day)d.tokens=Math.max(0,d.tokens+tokens-reservation.tokens);
  });
}
/** Daily TinyFish Agent ceiling (same order as the reference app's capped Agent use). */
export const AGENT_DAILY_MICRO_USD=1_500_000,AGENT_DAILY_RUNS=8;
export interface AgentReservation {id:string;day:string;micro:number}
export async function reserveAgent(micro:number):Promise<AgentReservation>{
  return transaction(d=>{
    if(!Number.isInteger(micro)||micro<1||micro>1_000_000)throw new PublicError('input_limit','Invalid Agent reservation.',400);
    if(d.agentRuns>=AGENT_DAILY_RUNS||d.agentMicroUsd+micro>AGENT_DAILY_MICRO_USD)throw new PublicError('agent_budget','Today’s capped TinyFish Agent allowance is used; no Agent run was started.',429,3600);
    const reservation={id:randomUUID(),day:d.day,micro};
    d.agentRuns++;d.agentMicroUsd+=micro;
    if(d.agentReservations.length>=50)d.agentReservations.shift();
    d.agentReservations.push({...reservation,settled:false});
    return reservation;
  });
}
/** Replaces the reservation with the actual step cost. Unknown cost keeps the full reservation. */
export async function settleAgent(reservation:AgentReservation,micro:number|null){
  if(micro===null||!Number.isInteger(micro)||micro<0||micro>100_000_000)return;
  await transaction(d=>{
    const entry=d.agentReservations.find(r=>r.id===reservation.id);
    if(!entry||entry.settled)return;
    entry.settled=true;
    if(d.day===reservation.day)d.agentMicroUsd=Math.max(0,d.agentMicroUsd+micro-reservation.micro);
  });
}
export async function cachedExtraction(key:string){return transaction(d=>d.extractions.find(e=>e.key===key)?.value??null);}
export async function saveExtraction(key:string,value:unknown){
  if(Buffer.byteLength(JSON.stringify(value))>80000)throw new PublicError('input_limit','The public extraction exceeded its cache limit.');
  await transaction((d,now)=>{
    d.extractions=d.extractions.filter(e=>e.key!==key);
    if(d.extractions.length>=120)d.extractions.shift();
    d.extractions.push({key,at:now,value});
  });
}
export async function saveListing(owner:string,listing:Listing){await transaction((d,now)=>{
  d.listings=d.listings.filter(l=>!(l.owner===owner&&l.listing.id===listing.id));
  if(d.listings.length>=240)d.listings.shift();
  d.listings.push({owner,at:now,listing});
});}
export async function trustedListing(owner:string,id:string,version:string):Promise<Listing>{
  return transaction(d=>{
    const record=d.listings.find(r=>r.owner===owner&&r.listing.id===id&&r.listing.version===version);
    if(!record)throw new PublicError('expired_target','This target’s trusted evidence expired or changed. Discover it again before preparation.',409);
    return record.listing;
  });
}
