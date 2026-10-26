import { createHash } from 'node:crypto';
import type { Draft, Listing, Source } from '../shared/schemas';
import type { PublicPage } from './providers';
import { normalize } from '../shared/rank';
import { supportsDate } from './source-date';
const canonicalText=(v:string)=>normalize(v.replace(/[*_`]/g,''));
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex').slice(0,32);
export function supported(text:string,quote:string){return canonicalText(text).includes(canonicalText(quote));}
function originalPosition(text:string,quote:string){
  let cleaned='';const offsets:number[]=[];
  for(let i=0;i<text.length;i++){
    const character=text[i];if(/[*_`]/.test(character))continue;
    if(/\s/.test(character)){
      if(cleaned&&!cleaned.endsWith(' ')){cleaned+=' ';offsets.push(i);}
    }else for(const lower of character.toLowerCase()){cleaned+=lower;offsets.push(i);}
  }
  const index=cleaned.indexOf(canonicalText(quote));
  return index<0?-1:offsets[index];
}
/** singlePosting: the page is one job posting (structured board data), so there is no other programme for a far-away quote to belong to. */
export function evidenceListing(draft:Draft,page:PublicPage,ownership:string,official=true,options:{singlePosting?:boolean}={}):Listing|null{
  const text=`${page.title}\n${page.text}`;
  if(!supported(text,draft.identityQuote)||!supported(text,draft.organization)||!supported(text,draft.title)||
    !/intern|studentship|summer|research|trainee|placement/i.test(draft.title))return null;
  const sourceId=hash(page.url);
  const identityIndex=canonicalText(text).indexOf(canonicalText(draft.identityQuote));
  const facts=draft.facts.filter(f=>{
    if(f.sourceId!==sourceId||!supported(text,f.quote))return false;
    const position=canonicalText(text).indexOf(canonicalText(f.quote));
    if(!options.singlePosting&&Math.abs(position-identityIndex)>6000)return false;
    // Reject a fact under a different programme heading, not merely a nearby quote.
    const rawIdentity=originalPosition(text,draft.identityQuote),rawFact=originalPosition(text,f.quote);
    const between=text.slice(Math.min(rawIdentity,rawFact),Math.max(rawIdentity,rawFact));
    const otherHeading=between.split('\n').find(line=>/^#{1,3}\s/.test(line)&&/internship|studentship|fellowship|programme/i.test(line)&&!supported(line,draft.title)&&!supported(draft.title,line.replace(/^#+\s*/,'')));
    if(otherHeading&&!options.singlePosting)return false;
    if(f.kind==='funding'&&!['fullyFunded','partial','unpaid','unknown'].includes(f.value))return false;
    if(f.kind==='funding'&&f.value==='fullyFunded'&&(!/\bfully[- ]funded\b/i.test(f.quote)||/\b(?:not|never|no longer)\b.{0,30}\bfully[- ]funded\b/i.test(f.quote)))return false;
    if(f.kind==='visa'&&(!['supported','unsupported','unknown'].includes(f.value)||f.value==='supported'&&(
      !/visa.{0,60}(support|sponsor|assist|provid)|(?:support|sponsor|assist|provid).{0,60}visa/i.test(f.quote)||
      /\b(no|not|cannot|unable|without|do not|does not|will not|won't)\b.{0,50}\b(visa|support|sponsor|assist)\b/i.test(f.quote))))return false;
    if(f.kind==='visa'){
      const negative=/\b(no|not|cannot|unable|without|do not|does not|will not|won't)\b.{0,50}\b(visa|support|sponsor|assist|provid)\w*\b|\bvisas?\b.{0,60}\b(not|cannot|unavailable|won't|will not)\b/i.test(f.quote);
      if(f.value==='supported'&&negative||f.value==='unsupported'&&!negative)return false;
    }
    if(f.kind==='cycle'){
      if(!['open','closed','rolling','unknown'].includes(f.value))return false;
      const closed=/\bapplications?\b.{0,80}\b(closed|no longer|not open)\b|\bclosed\b.{0,40}\bapplications?\b/i.test(f.quote);
      if(f.value==='closed'&&!closed||f.value==='open'&&(closed||!/\b(?:are|is|now|currently)\s+open\b|accepting applications|apply now/i.test(f.quote)))return false;
      if(f.value==='rolling'&&!/\brolling\b|year[- ]round|throughout the year/i.test(f.quote))return false;
    }
    if(f.rule?.number!==null&&f.rule?.number!==undefined&&!f.quote.includes(String(f.rule.number)))return false;
    if(f.rule?.field==='grade'&&(!f.rule.scale||!f.quote.includes(f.rule.scale)))return false;
    if(!supportsDate(f))return false;
    return true;
  });
  const interpretedAt=new Date().toISOString();
  const source:Source={id:sourceId,url:page.url,title:page.title,fetchedAt:page.fetchedAt,interpretedAt,freshness:page.freshness,ownership,official};
  const canonical=new URL(page.url);
  for(const key of [...canonical.searchParams.keys()])if(/^utm_|^(gclid|fbclid)$/i.test(key))canonical.searchParams.delete(key);
  canonical.hostname=canonical.hostname.replace(/^www\./,'');
  const cycleKey=draft.cycleKey&&supported(text,draft.cycleKey)?draft.cycleKey:'';
  const id=hash(`${canonical.href}:${canonicalText(draft.title)}:${cycleKey}`);
  return {...draft,cycleKey,facts,id,version:hash(JSON.stringify(facts)),canonicalUrl:page.url,sources:[source]};
}

export const isOfficial=(l:Pick<Listing,'sources'>)=>l.sources.some(s=>s.official!==false);
const datedDeadlines=(l:Listing)=>new Set(l.facts.filter(f=>f.kind==='deadline'&&f.due&&(f.due.kind==='fixed'||f.due.kind==='dateOnly')&&f.due.at).map(f=>f.due!.at!.slice(0,10)));
const cycleStates=(l:Listing)=>new Set(l.facts.filter(f=>f.kind==='cycle').map(f=>canonicalText(f.value)).filter(v=>['open','closed','rolling'].includes(v)));
/**
 * Same internship described on different pages: same organization and title, and no
 * conflicting sourced cycle evidence. A missing cycle key is not a wildcard: an archived
 * page (old deadline, "closed") must never merge into a current posting, or its deadline
 * would mark the current internship closed.
 */
export function sameInternship(a:Listing,b:Listing){
  if(canonicalText(a.organization)!==canonicalText(b.organization)||canonicalText(a.title)!==canonicalText(b.title))return false;
  if(a.cycleKey&&b.cycleKey)return canonicalText(a.cycleKey)===canonicalText(b.cycleKey);
  // Dated deadlines must agree; a date on only one side could be an old cycle's, so keep them apart.
  const da=datedDeadlines(a),db=datedDeadlines(b);
  if((da.size||db.size)&&![...da].some(d=>db.has(d)))return false;
  const sa=cycleStates(a),sb=cycleStates(b);
  if(sa.size&&sb.size&&(sa.has('closed')!==sb.has('closed')))return false;
  return true;
}
/**
 * Adds another page's sources and quoted facts to a listing already shown. Keeps the
 * existing id (it may be saved or selected); an official page becomes the primary
 * source and canonical link. Every fact keeps its own sourceId, so the UI can show
 * which page said what.
 */
export function mergeListings(existing:Listing,extra:Listing):Listing{
  const promote=!isOfficial(existing)&&isOfficial(extra);
  const [primary,secondary]=promote?[extra,existing]:[existing,extra];
  // First occurrence wins (a Map would let the later, less trusted copy overwrite it).
  const firstBy=<T,>(items:T[],key:(item:T)=>string)=>{const seen=new Set<string>();return items.filter(i=>{const k=key(i);if(seen.has(k))return false;seen.add(k);return true;});};
  const sources=firstBy([...primary.sources,...secondary.sources],s=>s.id).slice(0,8);
  const kept=new Set(sources.map(s=>s.id));
  const facts=firstBy([...primary.facts,...secondary.facts].filter(f=>kept.has(f.sourceId)),f=>`${f.kind}|${canonicalText(f.quote)}`).slice(0,32);
  return {...primary,id:existing.id,cycleKey:primary.cycleKey||secondary.cycleKey,sources,facts,version:hash(JSON.stringify([sources.map(s=>s.id),facts]))};
}
