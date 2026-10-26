import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { FactSchema,RuleSchema,defaultPreferences,type Fact,type Listing } from '../shared/schemas';
import { pageLinks } from './source-boards';
import { buildQuestions } from '../shared/question-bank';
import { PreparedGoalSchema,QuestionPackSchema,type PreparedGoal,type PreparationRun,type QuestionPack } from '../shared/planning';
import { trustedListing,saveListing,cachedExtraction,saveExtraction } from './store';
import { groq,readPages,boundedSourceText } from './providers';
import { agentEnabled,readWithAgent } from './agent';
import { countDrop,dropUnknownFacts,type FactNormalization } from './model-contract';
import { evidenceListing,hash,supported } from './evidence';
import { safeUrl,normalizedHost } from './safe-url';
import { PublicError,publicMessage } from './errors';
import { supplementQuestions } from './generated-questions';
const RawRule=z.strictObject({
  field:z.string().max(60),operator:z.string().max(40),number:z.number().finite().nullable(),
  scale:z.string().max(40).nullable(),values:z.array(z.string().max(120)).max(30),
});
const preparationFact={value:z.string().max(400),quote:z.string().min(8).max(500),rule:RawRule.nullable()};
export const PreparationExtraction=z.strictObject({
  identityQuote:z.string().min(8).max(400).nullable(),
  facts:z.array(FactSchema.omit({sourceId:true}).extend(preparationFact)).max(8),
  gaps:z.array(z.string().max(240)).max(8),
});
const instruction=`Prepare selected internship evidence, not an eligibility verdict about a student. Return the exact identity quote containing this programme title; null if it is not this programme. Extract up to eight mandatory eligibility, skill, document, external action, submission, selection-stage or deadline facts with exact quotes. Prioritize eligibility and requirements. No invented criteria, threshold, grade conversion or stage dates. rule fields: year, grade, nationality, branch, institute, degree, english, remainingSemesters, degreeDate, ageThreshold, other. Operators min/max/oneOf/confirm; unsupported comparisons use other/confirm. Keep original numeric scale (including %), not converted values. Ambiguous alternatives, forbidden categories, future-time conditions or membership rules need confirmation. Every numeric/list value must occur in the quotation. Suggested skills are review, not mandatory skill. due=null unless an exact sourced deadline/date; no year/timezone inference. Record missing/ambiguous requirements, incomplete coverage and unread linked conditions in gaps. Never judge a person's eligibility or admission chances.`;
type Ref={id:string;version:string};
interface PrepRecord {owner:string;run:PreparationRun;abort:AbortController;targets:Ref[];continued:boolean;agentRuns?:number;}
const records=new Map<string,PrepRecord>(),packs=new Map<string,{owner:string;pack:QuestionPack;at:number}>();
let active=0,validating=0;
function prune(){
  const now=Date.now();
  for(const [id,r]of records)if(now-Date.parse(r.run.startedAt)>86400000)records.delete(id);
  for(const [id,p]of packs)if(now-p.at>86400000)packs.delete(id);
}
export function getPreparation(id:string,owner:string){
  const r=records.get(id);if(!r||r.owner!==owner)throw new PublicError('unknown_preparation','This preparation expired. Your browser-held details and answers remain available.',404);
  return r;
}
export function trustedPack(id:string,owner:string){
  prune();const p=packs.get(id);
  if(!p||p.owner!==owner)throw new PublicError('expired_pack','The trusted question pack expired. Prepare the selected targets again; your answers are preserved.',409);
  return p.pack;
}
export function cancelPreparation(id:string,owner:string){const r=getPreparation(id,owner);r.abort.abort('cancelled');}
export async function createPreparation(owner:string,targets:Ref[],continuation:string|null){
  prune();
  if(active+validating>=2||records.size+validating>=100)throw new PublicError('capacity','Source preparation is busy. Try again later.',429,30);
  validating++;
  try{
  if(new Set(targets.map(t=>t.id)).size!==targets.length)throw new PublicError('invalid_input','Select each target only once.',400);
  const prior=continuation?getPreparation(continuation,owner):null;
  if(prior&&(prior.continued||prior.run.status==='running'||JSON.stringify(prior.targets)!==JSON.stringify(targets)))
    throw new PublicError('changed_targets','Start a fresh preparation for changed targets or an already-used continuation.',409);
  // Validate every client reference before any paid source call.
  const listings:Listing[]=[];
  for(const target of targets)listings.push(await trustedListing(owner,target.id,target.version));
  if(prior)prior.continued=true;
  const id=randomUUID(),abort=new AbortController();
  const run:PreparationRun={id,status:'running',stage:'Preparing selected official sources',startedAt:new Date().toISOString(),
    goals:prior?.run.goals.slice()??[],pack:null,pending:prior?.run.pending.slice()??targets.slice(),errors:[]};
  const r:PrepRecord={owner,run,abort,targets,continued:false};records.set(id,r);active++;
  void execute(r,listings).finally(()=>active--);return id;
  }finally{validating--;}
}
function typedRule(raw:z.infer<typeof RawRule>|null,quote:string):Fact['rule']{
  if(!raw)return null;
  const norm=(s:string)=>s.toLowerCase().replace(/[^a-z]/g,'');
  const fields:Record<string,string>={year:'year',studyyear:'year',grade:'grade',gpa:'grade',cgpa:'grade',
    nationality:'nationality',citizenship:'nationality',branch:'branch',institute:'institute',degree:'degree',
    english:'english',language:'english',remainingsemesters:'remainingSemesters',degreedate:'degreeDate',age:'ageThreshold',agethreshold:'ageThreshold',other:'other'};
  const field=fields[norm(raw.field)]??'other';
  const candidate={...raw,field};
  const parsed=RuleSchema.safeParse(candidate);if(!parsed.success)return null;
  const rule=parsed.data;
  if(rule.number!==null&&!new RegExp(`(^|[^\\d.])${String(rule.number).replace('.','\\.')}([^\\d.]|$)`).test(quote))return null;
  if(rule.field==='grade'&&(!rule.scale||!quote.includes(rule.scale)||!/\b(gpa|cgpa|grade|academic|marks|percentage)\b|%/i.test(quote)))return null;
  if(rule.field==='year'&&!/\byears?\b.{0,30}\b(study|studies)\b|\b(study|academic)[ -]+year\b|\b[1-9](?:st|nd|rd|th)[ -]+year\b/i.test(quote))return null;
  if(rule.field==='ageThreshold'&&!/\b(age|aged|years old|years of age)\b/i.test(quote))return null;
  if(rule.field==='english'&&/\b(IELTS|TOEFL|CEFR|[ABC][12])\b/i.test(quote))return null;
  if(rule.field==='english'&&!/\b(English|French)\b/i.test(quote))return null;
  if(rule.field==='remainingSemesters'&&!/\bsemesters?\b/i.test(quote))return null;
  if(rule.operator==='min'&&/\b(at most|no more than|maximum|not exceed)\b/i.test(quote))return null;
  if(rule.operator==='max'&&/\b(at least|no fewer than|minimum)\b/i.test(quote))return null;
  if(rule.operator==='oneOf'&&(!rule.values.length||rule.values.some(v=>!supported(quote,v))))return null;
  if(rule.operator==='oneOf'&&/\b(not eligible|ineligible|excluded|must not|not accepted)\b/i.test(quote))return null;
  return rule;
}
async function prepare(listing:Listing,r:PrepRecord,follow=true):Promise<PreparedGoal>{
  r.run.stage=`Reading selected target: ${listing.title}`;
  const url=await safeUrl(listing.canonicalUrl);
  const result=(await readPages([url],r.abort.signal,{runId:r.run.id}))[0];
  let page=result?.page??null,agentNote:string|null=null;
  if(!page&&agentEnabled()&&(r.agentRuns??0)<1){
    // One capped paid Agent read per preparation, only after Fetch failed.
    r.agentRuns=(r.agentRuns??0)+1;
    r.run.stage=`TinyFish Fetch could not read ${listing.title}; TinyFish Agent is opening it in a real browser (capped)`;
    const deadlineAt=Date.parse(r.run.startedAt)+180000-25000,remaining=(deadlineAt-Date.now())/1000;
    const agent=await readWithAgent(url,r.abort.signal,{maxSeconds:remaining,deadlineAt,stealth:/block/i.test(result?.error??''),runId:r.run.id});
    page=agent.page;
    agentNote=agent.page?`Read by TinyFish Agent after Fetch failed (${agent.steps??'?'} steps, about $${(agent.costUsd??0).toFixed(2)}).`:agent.error;
  }
  if(!page)throw new PublicError('unreadable_source',[result?.error??'The selected source could not be read.',agentNote].filter(Boolean).join(' '));
  if(normalizedHost(page.url)!==normalizedHost(url))throw new PublicError('source_changed','The source redirected to an uncorroborated host; no requirements accepted.');
  const extra={organization:listing.organization,programme:listing.title};
  const text=boundedSourceText(PreparationExtraction,instruction,hash(page.url),page.title,page.text,extra);
  const key=hash(`selected-criteria-1|${page.url}|${text}|${JSON.stringify(extra)}`);
  const cached=PreparationExtraction.safeParse(await cachedExtraction(key));
  const normalized:FactNormalization={dropped:0};
  const parsed=cached.success?cached.data:await groq('selected_target_requirements',PreparationExtraction,instruction,{title:page.title,text,...extra},r.abort.signal,{
    runId:r.run.id,normalize:value=>dropUnknownFacts(value,normalized),onSalvage:countDrop(normalized),onWait:s=>{r.run.stage=`Waiting ${s}s for the shared Groq allowance; source work remains bounded.`;},
  });
  r.abort.signal.throwIfAborted();
  if(!parsed.identityQuote)throw new PublicError('source_changed','The current source no longer corroborates this selected programme.');
  const draft={...listing,identityQuote:parsed.identityQuote,facts:parsed.facts.map(f=>({
    ...f,kind:['document','external','skill'].includes(f.kind)&&/\b(optional|recommended|desirable|preferred|not required)\b/i.test(f.quote)?'review' as const:f.kind,
    sourceId:hash(page.url),rule:typedRule(f.rule,f.quote),
  }))};
  const validated=evidenceListing(draft,page,listing.sources[0]?.ownership??'Previously corroborated selected source',listing.sources[0]?.official!==false);
  if(!validated)throw new PublicError('source_changed','Target identity or quoted evidence changed; review it before planning.');
  const gaps=[...parsed.gaps];
  if(listing.sources[0]?.official===false)gaps.push('These requirements were read from an unverified third-party page, not the organization’s own site. Confirm every condition and date on the official page before acting.');
  if(normalized.dropped)gaps.push(`${normalized.dropped} generated requirement${normalized.dropped===1?'':'s'} failed validation (unsupported category, rule or quote length) and ${normalized.dropped===1?'was':'were'} discarded; re-check the official page.`);
  if(text.length<page.text.length)gaps.push('Only a bounded portion of this page was interpreted; additional mandatory conditions may be missing.');
  if(validated.facts.length<parsed.facts.length)gaps.push('Some generated facts failed quote, attribution or date validation.');
  if(!validated.facts.some(f=>f.kind==='eligibility'))gaps.push('Mandatory eligibility criteria were not captured.');
  const stillSupported=evidenceListing({...listing,identityQuote:parsed.identityQuote,
    facts:listing.facts.filter(f=>f.sourceId===hash(page.url))},page,listing.sources[0]?.ownership??'Previously corroborated selected source',listing.sources[0]?.official!==false)?.facts??[];
  const facts=[...new Map([...listing.facts.filter(f=>f.sourceId!==hash(page.url)),...stillSupported,...validated.facts].map(f=>[`${f.kind}|${f.quote}`,f])).values()];
  if(facts.length>32)gaps.push('The evidence limit was reached; further requirements need review.');
  const sources=[...new Map([...listing.sources,...validated.sources].map(s=>[s.id,s])).values()].slice(-8);
  let enriched={...listing,facts:facts.slice(-32),sources,version:hash(JSON.stringify(facts))};
  if(follow){
    const links=pageLinks(page,defaultPreferences).filter(l=>l.url!==page.url&&normalizedHost(l.url)===normalizedHost(page.url)&&
      /\b(eligibility|requirements|apply|application|documents|selection|stages|criteria)\b/i.test(l.title+' '+l.url));
    if(links.length>2)gaps.push('Further linked requirements remain unread beyond the two-page follow-up allowance.');
    for(const link of links.slice(0,2)){
      try{
        const next=await prepare({...enriched,canonicalUrl:link.url},r,false);
        enriched={...next.listing,canonicalUrl:listing.canonicalUrl};
        gaps.push(...next.gaps);
      }catch(error){
        r.abort.signal.throwIfAborted();
        gaps.push(`Linked requirements were not established: ${publicMessage(error)}`);
      }
    }
  }
  const goal=PreparedGoalSchema.parse({listing:enriched,preparedAt:new Date().toISOString(),gaps:[...new Set(gaps)].slice(0,30),
    sourceStatus:[cached.success?'Reused a validated public interpretation against a freshly fetched page.':'Read and interpreted selected official source.',...(agentNote?[agentNote]:[]), 'Additional linked or unpublished conditions can remain unconfirmed.']});
  if(!cached.success)await saveExtraction(key,parsed);
  if(follow)await saveListing(r.owner,enriched);return goal;
}
async function execute(r:PrepRecord,listings:Listing[]){
  const timeout=setTimeout(()=>r.abort.abort('deadline'),180000);
  try{
    while(r.run.pending.length&&!r.abort.signal.aborted){
      const next=r.run.pending[0],listing=listings.find(l=>l.id===next.id)!;
      try{
        const goal=await prepare(listing,r);
        r.abort.signal.throwIfAborted();
        r.run.goals=r.run.goals.filter(g=>g.listing.id!==goal.listing.id);r.run.goals.push(goal);
        // Keep enriched versions valid in a continuation, but never trust client edits.
        next.version=goal.listing.version;
        const target=r.targets.find(t=>t.id===next.id);if(target)target.version=goal.listing.version;
        r.run.pending.shift();
      }catch(error){
        if(r.abort.signal.aborted)break;
        r.run.errors.push(publicMessage(error));
        r.run.goals.push({listing,preparedAt:new Date().toISOString(),gaps:[publicMessage(error),'Source preparation did not establish complete requirements.'],sourceStatus:['No new claims were accepted.']});
        r.run.pending.shift();
        if(error instanceof PublicError&&['daily_limit','provider_access','provider_payment','operational_storage'].includes(error.code))break;
      }
    }
    if(r.run.goals.length){
      let pack=buildQuestions(r.run.goals,randomUUID());
      if(!r.abort.signal.aborted)try{pack=await supplementQuestions(pack,r.run.goals,r.abort.signal,r.run.id);}
      catch(error){r.run.errors.push(publicMessage(error));}
      pack=QuestionPackSchema.parse(pack);
      while(packs.size>=100)packs.delete(packs.keys().next().value!);
      packs.set(pack.id,{owner:r.owner,pack,at:Date.now()});r.run.pack=pack;
    }
    r.run.status=r.abort.signal.reason==='cancelled'?'cancelled':r.run.pending.length||r.run.errors.length?'partial':'complete';
    r.run.stage=r.run.pending.length?'Partial preparation; continue explicitly for remaining selected targets.':'Source preparation finished; review gaps before applying.';
  }catch(error){r.run.errors.push(publicMessage(error));r.run.status='partial';r.run.stage='Preparation unavailable; existing browser progress is preserved.';}
  finally{clearTimeout(timeout);}
}
