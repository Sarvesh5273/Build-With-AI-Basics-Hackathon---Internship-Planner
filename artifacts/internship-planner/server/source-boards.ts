import type { Preferences } from '../shared/schemas';
import { parsePublicUrl, normalizedHost } from './safe-url';
import type { PublicPage } from './providers';

export interface Board {
  platform: 'greenhouse'|'lever'|'ashby'|'workday'|'smartrecruiters'|'workable';
  tenant: string;
  url: string;
  feedUrl: string|null;
  posting: boolean;
}
export interface DiscoveryLead {
  url:string;title:string;snippet?:string;
  kind:'posting'|'index'|'board'|'feed'|'detail';
  organization?:string;
  parent?:string;
  board?:Board;
}
// Login-walled / anti-automation job boards and social sites stay out.
const denied=['indeed.com','glassdoor.com','internshala.com','linkedin.com','facebook.com','reddit.com','medium.com','youtube.com','quora.com','instagram.com','foundit.in','twitter.com','tiktok.com'];
// Public opportunity-announcement sites: readable, often richer detail, never the organization's own page.
const announcers=['opportunitydesk.org','youthop.com','youthopportunities.com','opportunitiesforafricans.com','scholars4dev.com','opportunitiescircle.com','studentopportunities.com'];
/** Known third-party pages: shown as "other source", and no URLs are spent trying to prove organization ownership. */
export function knownThirdParty(raw:string){
  const host=normalizedHost(raw);
  return announcers.some(domain=>host===domain||host.endsWith('.'+domain));
}
export function deniedSource(raw:string){
  const host=normalizedHost(raw);
  return denied.some(domain=>host===domain||host.endsWith('.'+domain));
}
export function canonicalSource(raw:string){
  const url=parsePublicUrl(raw);
  for(const key of [...url.searchParams.keys()])if(/^utm_|^(gclid|fbclid|referrer)$/i.test(key))url.searchParams.delete(key);
  url.searchParams.sort();return url.href;
}
export function detectBoard(raw:string):Board|null{
  const url=parsePublicUrl(raw),host=normalizedHost(raw),parts=url.pathname.split('/').filter(Boolean);
  const tenant=parts[0];
  if(!tenant||!/^[a-zA-Z0-9_-]{1,100}$/.test(tenant))return null;
  if(host==='boards.greenhouse.io'||host==='job-boards.greenhouse.io'){
    return {platform:'greenhouse',tenant,url:`https://${host}/${tenant}`,feedUrl:`https://boards-api.greenhouse.io/v1/boards/${tenant}/jobs`,posting:parts[1]==='jobs'&&!!parts[2]||url.searchParams.has('gh_jid')};
  }
  if(host==='jobs.lever.co'||host==='jobs.eu.lever.co'){
    return {platform:'lever',tenant,url:`https://${host}/${tenant}`,feedUrl:`https://${host.includes('.eu.')?'api.eu.lever.co':'api.lever.co'}/v0/postings/${tenant}?mode=json`,posting:parts.length>1};
  }
  if(host==='jobs.ashbyhq.com'){
    return {platform:'ashby',tenant,url:`https://${host}/${tenant}`,feedUrl:`https://api.ashbyhq.com/posting-api/job-board/${tenant}?includeCompensation=true`,posting:parts.length>1};
  }
  if(host.endsWith('.myworkdayjobs.com')){
    const index=parts.indexOf('job');
    const path=(index<0?parts:parts.slice(0,index)).join('/');
    const site=(index<0?parts:parts.slice(0,index)).filter(p=>!/^[a-z]{2}(-[A-Z]{2})?$/.test(p)).pop(),wdTenant=host.split('.')[0];
    const feedUrl=site&&/^[A-Za-z0-9_-]{1,100}$/.test(site)&&/^[a-z0-9-]{1,63}$/.test(wdTenant)?`https://${host}/wday/cxs/${wdTenant}/${site}/jobs`:null;
    return {platform:'workday',tenant:wdTenant,url:`https://${host}/${path}`,feedUrl,posting:index>=0&&parts.length>index+1};
  }
  if(host==='careers.smartrecruiters.com'||host==='jobs.smartrecruiters.com')return {
    platform:'smartrecruiters',tenant,url:`https://careers.smartrecruiters.com/${tenant}`,feedUrl:null,posting:host==='jobs.smartrecruiters.com'&&parts.length>1,
  };
  if(host==='apply.workable.com')return {platform:'workable',tenant,url:`https://${host}/${tenant}`,feedUrl:null,posting:parts[1]==='j'&&!!parts[2]};
  return null;
}
export function classifyLead(input:{url:string;title:string;snippet?:string},organization?:string,parent?:string):DiscoveryLead|null{
  try{
    const url=canonicalSource(input.url);if(deniedSource(url))return null;
    const board=detectBoard(url);
    return {...input,url,organization,parent,kind:board?(board.posting?'posting':'board'):/\b(intern|internship|studentship|fellowship|placement)\b/i.test(input.title)?'posting':'index',...(board?{board}:{})};
  }catch{return null;}
}
/**
 * Paid Agent reads are only worth it for sources that can pass the ownership
 * gate: recognised ATS boards, academic/government/intergovernmental domains,
 * or a host named after a requested organization. Third-party job aggregators
 * never become listings, so the Agent is not spent on them.
 */
export function agentWorthy(lead:Pick<DiscoveryLead,'url'|'board'|'organization'>,p:Preferences){
  if(lead.board)return true;
  const host=normalizedHost(lead.url);
  if(/\.(edu|gov|int|mil)$|\.(ac|edu|gov|res|ernet)\.[a-z]{2}$|^(careers|jobs)\.[a-z0-9-]+(\.[a-z]{2,3})?$/.test(host))return true;
  const labels=host.split('.').slice(0,-1);
  const names=[...p.organizations,lead.organization??''].map(o=>o.toLowerCase().replace(/[^a-z0-9]/g,'')).filter(n=>n.length>=3);
  return names.some(name=>labels.some(label=>label.replace(/[^a-z0-9]/g,'')===name));
}
const intern=/\b(intern(?:ship|ships|s)?|studentship|summer student|co[- ]?op|student placement)\b/i;
export function leadPriority(lead:Pick<DiscoveryLead,'url'|'title'|'snippet'|'kind'>,p:Preferences){
  const text=`${lead.title} ${lead.snippet??''} ${new URL(lead.url).pathname}`.toLowerCase();
  const observed=` ${`${lead.title} ${lead.snippet??''} ${new URL(lead.url).hostname}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()} `;
  let score=lead.kind==='posting'?20:lead.kind==='feed'?40:lead.kind==='detail'?18:0;
  // A query mentioning CERN can still return another employer. Only observed
  // title/snippet/hostname matches earn collection priority; never the hint.
  for(const organization of p.organizations){
    const name=organization.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    if(name&&observed.includes(` ${name} `))score+=50;
  }
  if(intern.test(text))score+=15;
  for(const topic of p.topics)if(text.includes(topic.toLowerCase()))score+=8;
  for(const word of p.include)if(text.includes(word.toLowerCase()))score+=3;
  if(/\b(senior|staff|principal|director|manager)\b/i.test(lead.title)&&!intern.test(lead.title))score-=30;
  return score;
}
export function pageLinks(page:PublicPage,p:Preferences):DiscoveryLead[]{
  const labels=new Map<string,string>();
  for(const match of page.text.matchAll(/\[([^\]\n]{1,240})\]\((https:\/\/[^)\s]+)\)/g)){
    try{labels.set(canonicalSource(match[2]),match[1]);}catch{/* Malformed source links remain unusable. */}
  }
  const unique=new Map<string,DiscoveryLead>();
  for(const raw of page.links){
    try{
      const url=new URL(raw,page.url).href,label=labels.get(canonicalSource(url))??new URL(url).pathname;
      const board=detectBoard(url);
      if(!board&&!/(intern|studentship|student|summer|career|jobs?|research|programme|program|eligib|requirement|application|apply|funding|faq)/i.test(`${label} ${new URL(url).pathname}`))continue;
      const lead=classifyLead({url,title:label.slice(0,240)},undefined,page.url);
      if(lead&&lead.url!==canonicalSource(page.url))unique.set(lead.url,{...lead,kind:board?lead.kind:/eligib|requirement|apply|application|funding|faq/i.test(label)?'detail':lead.kind});
    }catch{/* Reject external scripts, credentials and unsafe link schemes. */}
  }
  return [...unique.values()].sort((a,b)=>leadPriority(b,p)-leadPriority(a,p)).slice(0,24);
}
