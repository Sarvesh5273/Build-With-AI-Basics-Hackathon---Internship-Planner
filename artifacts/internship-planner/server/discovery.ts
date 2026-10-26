import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DraftSchema, FactSchema, type Listing, type Preferences, type SearchRun } from '../shared/schemas';
import { rank } from '../shared/rank';
import { DISCOVERY_RUN_MS, DISCOVERY_WIND_DOWN_MS } from '../shared/limits';
import { boundedSourceText, readPages, groq, searchPages, type PublicPage } from './providers';
import { hash,evidenceListing,mergeListings,sameInternship } from './evidence';
import { normalizedHost, safeUrl } from './safe-url';
import { PublicError,publicMessage } from './errors';
import { saveListing, cachedExtraction, saveExtraction } from './store';
import { agentEnabled, readWithAgent } from './agent';
import { boardOrganization, postingListing, readBoardPostings } from './board-listings';
import { countDrop, dropUnknownFacts, type FactNormalization } from './model-contract';
import { queryPlan, type QueryTask } from './discovery-plan';
import { agentWorthy, canonicalSource, classifyLead, detectBoard, deniedSource, knownThirdParty, pageLinks, leadPriority, type DiscoveryLead } from './source-boards';
/** Per-run bounds (demo-oriented; Groq's 8k tokens/minute is the real throughput ceiling). Searches include ownership look-ups. */
export const RUN_SEARCHES=20,RUN_URLS=80,RUN_LISTINGS=50;
/** Page reading falls over to the smaller model (its own Groq allowance) instead of waiting; quotes are validated in code either way. */
const DISCOVERY_MODELS=['openai/gpt-oss-120b','openai/gpt-oss-20b'];
interface Record {owner:string;preferences:Preferences;run:SearchRun;abort:AbortController;queries:QueryTask[];cursor:number;page:number;seen:Set<string>;pending:DiscoveryLead[];pages:Map<string,PublicPage>;continuationUsed:boolean;agentTried:Set<string>;agentJobs:Promise<void>[];agentReady:{lead:DiscoveryLead;page:PublicPage}[];boardOwners:Map<string,Promise<string|null>>;}
const records=new Map<string,Record>();
let active=0;
const ats=/(^|\.)(greenhouse\.io|lever\.co|myworkdayjobs\.com|smartrecruiters\.com|workable\.com|ashbyhq\.com)$/;
export function buildQueries(p:Preferences){return queryPlan(p).map(t=>t.query);}
export function getRun(id:string,owner:string){
  const record=records.get(id);
  if(!record||record.owner!==owner)throw new PublicError('unknown_run','This search is unavailable or expired. Saved listings remain in your browser.',404);
  return record;
}
export function cancelRun(id:string,owner:string){const r=getRun(id,owner);if(!['queued','searching','reading','interpreting'].includes(r.run.status))return;r.abort.abort('cancelled');r.run.status='cancelled';r.run.stage='Cancelled. Already accepted evidence remains available.';}
function prune(){for(const [id,r]of records)if(Date.now()-Date.parse(r.run.startedAt)>24*3600000)records.delete(id);}
export function createRun(owner:string,p:Preferences,continuation:string|null){
  prune();
  if(active>=2)throw new PublicError('search_busy','Both discovery slots are busy. Try again later.',429,30);
  if(records.size>=100)throw new PublicError('capacity','The discovery record capacity is full. Try later.',429,3600);
  let queries=queryPlan(p),cursor=0,page=0,seen=new Set<string>(),pending:DiscoveryLead[]=[],pages=new Map<string,PublicPage>();
  if(continuation){
    const old=getRun(continuation,owner);
    if(old.continuationUsed||!['complete','partial'].includes(old.run.status))throw new PublicError('continuation_used','This continuation is not available. It may already have been used.',409);
    if(JSON.stringify(old.preferences)!==JSON.stringify(p))throw new PublicError('changed_preferences','Start a new search for changed preferences rather than reusing the old continuation.',409);
    old.continuationUsed=true;queries=old.queries;cursor=old.cursor;page=old.page;seen=new Set(old.seen);pending=old.pending.slice();pages=new Map(old.pages);
  }
  const id=randomUUID(),abort=new AbortController();
  const run:SearchRun={id,status:'queued',stage:'Queued for public-source discovery',coverage:[],usage:{searches:0,fetchedUrls:0,modelCalls:0,agentRuns:0,agentCostUsd:0},listings:[],errors:[],sourceStatus:[],continuation:null,startedAt:new Date().toISOString()};
  const record:Record={owner,preferences:p,run,abort,queries,cursor,page,seen,pending,pages,continuationUsed:false,agentTried:new Set(),agentJobs:[],agentReady:[],boardOwners:new Map()};
  records.set(id,record);active++;
  void execute(record).finally(()=>{active--;});
  return id;
}
function branded(page:PublicPage,organization:string){
  const normalize=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const headers=page.text.split('\n').filter(l=>/^#{1,2}\s/.test(l)).slice(0,3).join(' ');
  return ` ${normalize(`${page.title} ${headers}`)} `.includes(` ${normalize(organization)} `);
}
function remember(r:Record,requested:string,page:PublicPage){
  if(r.pages.size>=48)r.pages.delete(r.pages.keys().next().value!);
  r.pages.set(canonicalSource(requested),page);
  if(canonicalSource(page.url)!==canonicalSource(requested)){
    if(r.pages.size>=48)r.pages.delete(r.pages.keys().next().value!);
    r.pages.set(canonicalSource(page.url),page);
  }
}
async function readOne(url:string,r:Record):Promise<PublicPage|null>{
  const cached=r.pages.get(canonicalSource(url));
  if(cached)return cached;
  if(r.run.usage.fetchedUrls>=RUN_URLS||r.abort.signal.aborted)return null;
  r.run.usage.fetchedUrls++;
  const outcome=(await readPages([url],r.abort.signal,{runId:r.run.id}))[0];
  if(!outcome?.page){r.run.sourceStatus.push({url,state:outcome?.error??'No readable ownership source'});return null;}
  remember(r,url,outcome.page);return outcome.page;
}
/**
 * The official site links to the same employer board even when the address
 * form differs (boards. vs job-boards. Greenhouse hosts, a Workday locale
 * segment, or Greenhouse's embed link). Platform and tenant must both match.
 */
export function sameAtsBoard(link:string,target:string){
  const to=detectBoard(target);if(!to)return false;
  const url=new URL(link);
  if(to.platform==='greenhouse'&&/(^|\.)greenhouse\.io$/.test(normalizedHost(url.href))&&url.pathname.startsWith('/embed/'))return url.searchParams.get('for')?.toLowerCase()===to.tenant.toLowerCase();
  const from=detectBoard(url.href);
  return !!from&&from.platform===to.platform&&from.tenant.toLowerCase()===to.tenant.toLowerCase()&&(to.platform!=='workday'||normalizedHost(url.href)===normalizedHost(target));
}
async function ownership(page:PublicPage,organization:string,r:Record):Promise<string|null>{
  const host=normalizedHost(page.url);
  if(deniedSource(page.url))return null;
  // Institution homepage must identify the organization AND link into this career/programme surface.
  // Cross-domain ATS pages require the official homepage link, never a plausible ATS tenant alone.
  const root=new URL('/',page.url).href;
  if(ats.test(host)){
    if(r.run.usage.searches>=RUN_SEARCHES)return null;
    const query=`"${organization}" official careers website`;
    r.run.usage.searches++;r.run.coverage.push({query,page:0});
    const candidates=await searchPages(query,0,r.abort.signal,{runId:r.run.id});
    for(const candidate of candidates.slice(0,3)){
      if(r.run.usage.fetchedUrls>=RUN_URLS)break;
      try{
        const url=await safeUrl(candidate.url);
        if(ats.test(normalizedHost(url))||deniedSource(url))continue;
        const official=await readOne(url,r);
        if(!official||!branded(official,organization))continue;
        const owned=official.links.some(link=>{
          try{const backlink=new URL(link,official.url),target=new URL(page.url);
            if(normalizedHost(backlink.href)===host&&backlink.pathname!=='/'&&(target.pathname===backlink.pathname||target.pathname.startsWith(backlink.pathname.replace(/\/$/,'')+'/')))return true;
            return sameAtsBoard(backlink.href,page.url);}
          catch{return false;}
        });
        if(owned)return `${official.url} identifies ${organization} and explicitly links to this ATS tenant/board. ATS platform domain alone was not treated as proof.`;
      }catch(error){if(fatal(error)||r.abort.signal.aborted)throw error;/* Another candidate may corroborate. */}
    }
    return null;
  }
  const home=await readOne(root,r);
  if(!home||normalizedHost(home.url)!==host||!branded(home,organization))return null;
  const path=new URL(page.url).pathname;
  const linked=home.links.some(link=>{
    try{const url=new URL(link,home.url);return normalizedHost(url.href)===host&&url.pathname!=='/'&&(path===url.pathname||path.startsWith(url.pathname.replace(/\/$/,'')+'/'));}
    catch{return false;}
  });
  const linksHome=page.links.some(link=>{try{const url=new URL(link,page.url);return normalizedHost(url.href)===host&&url.pathname==='/';}catch{return false;}});
  if(!linked&&!linksHome)return null;
  return `The programme page and separate homepage ${home.url} both identify ${organization}, with a navigation link ${linked?'from homepage into this programme/careers surface':'from programme to that same-host homepage'}. Preliminary ownership corroboration, not institutional certification.`;
}
const pageFact={value:z.string().trim().max(400),quote:z.string().min(8).max(400)};
export const PageExtraction=z.strictObject({
  opportunities:z.array(DraftSchema.extend({
    identityQuote:z.string().min(8).max(400),
    facts:z.array(FactSchema.pick({kind:true,value:true,quote:true,due:true}).extend(pageFact)).max(6),
  })).max(1),
  leadIndices:z.array(z.number().int().min(0).max(23)).max(12),
});
const extractInstruction=`Extract at most ONE internship/studentship and SIX preliminary facts, never general jobs or another programme's rules. Exact quotes mandatory; title/organization must occur in source. All quotes refer to this single page. Do not generate sourceId or rule fields: source identity is server-owned and structured eligibility is prepared after target selection. Research=lab placement; Company=industry. Omit unsupported facts. Prioritize funding/benefits, topic/location and explicit deadline/cycle/visa/remote evidence for ranking; quote eligibility only if space. Funding: fullyFunded only explicit fully-funded wording; else partial/unpaid/unknown. Separate benefits/exclusions/fees. Visa supported only explicit assistance; else unsupported/unknown. Cycle open/closed/rolling/unknown, not inferred from live URL; duration is review, not cycle. Remote remote/onsite/hybrid/unknown. skill/document/external/submission/stage need mandatory wording, else review. due=null unless deadline: fixed UTC needs quoted year/date/time/zone, else dateOnly; rolling needs explicit wording. cycleKey=stated year/cycle or empty. leadIndices select only supplied link indices worth reading for programme details or internships, never invented URLs. Empty opportunities is valid for a directory.`;
function fatal(error:unknown){return error instanceof PublicError&&['provider_limit','provider_access','provider_payment','daily_limit','configuration','operational_storage'].includes(error.code);}
function interpretFailure(r:Record,error:unknown){
  return r.abort.signal.aborted?'Stopped by the run time limit before interpretation finished; Continue can read it again':`Not interpreted: ${publicMessage(error)}`;
}
/** Run notes are for fatal problems and failed searches (coverage gaps); one page's failure is reported under Sources checked. */
function noteError(r:Record,error:unknown,runNote=fatal(error)){
  if(r.abort.signal.aborted)return;
  const message=publicMessage(error);if(runNote&&!r.run.errors.includes(message))r.run.errors.push(message);
  console.warn(JSON.stringify({stage:'discovery',runId:r.run.id,operation:r.run.status,code:error instanceof PublicError?error.code:'source_validation'}));
}
function enqueue(r:Record,queue:DiscoveryLead[],lead:DiscoveryLead){
  if(r.seen.has(lead.url)||queue.length>=120)return;
  r.seen.add(lead.url);
  // A single posting on a public board leads to the whole board: one read yields every relevant internship there.
  if(lead.board?.feedUrl&&(lead.kind==='board'||lead.kind==='posting')){
    const feed={...lead,url:lead.board.feedUrl,kind:'feed' as const,parent:lead.board.url};
    if(!r.seen.has(feed.url)){r.seen.add(feed.url);queue.push(feed);}
    return;
  }
  queue.push(lead);
}
/** Merge and publish synchronously (pages are read concurrently), then persist. Returns the index of a merged twin, or -1. */
async function publish(r:Record,found:Listing){
  const twin=r.run.listings.findIndex(l=>l.id===found.id||sameInternship(l,found));
  // Shown listings carry ranking fields; strip them so only the stored listing shape is merged and saved.
  const unranked=(l:Listing):Listing=>{const {score:_s,reasons:_r,excluded:_e,...rest}=l as Listing&{score?:number;reasons?:string[];excluded?:boolean};return rest;};
  const listing=twin<0?found:mergeListings(unranked(r.run.listings[twin]),found);
  if(twin<0)r.run.listings.push(rank(listing,r.preferences));else r.run.listings[twin]=rank(listing,r.preferences);
  await saveListing(r.owner,listing);
  return twin;
}
const platformName={greenhouse:'Greenhouse',lever:'Lever',ashby:'Ashby',workday:'Workday',smartrecruiters:'SmartRecruiters',workable:'Workable'} as const;
/**
 * Reads one employer's public job board and turns its most relevant internship
 * postings into listings without an AI call (facts are verbatim posting text).
 * Ownership is checked once per board, not per posting.
 */
async function readBoard(r:Record,lead:DiscoveryLead){
  const board=lead.board!;
  r.run.status='reading';r.run.stage=`Reading ${platformName[board.platform]} job board “${board.tenant}” for internship postings`;
  const relevance=(title:string,location:string)=>leadPriority({url:board.url,title,snippet:location,kind:'posting'},r.preferences);
  const {total,postings}=await readBoardPostings(board,r.abort.signal,relevance,Math.max(0,Math.min(12,RUN_LISTINGS-r.run.listings.length)));
  if(r.abort.signal.aborted)return;
  if(!postings.length){r.run.sourceStatus.push({url:board.url,state:`${platformName[board.platform]} board read: ${total} internship posting${total===1?'':'s'}, none with readable details`});return;}
  const organization=boardOrganization(board,postings[0],[...r.preferences.organizations,...(lead.organization?[lead.organization]:[])]);
  if(!r.boardOwners.has(board.url)){
    const boardPage:PublicPage={url:board.url,title:organization,text:'',links:[],fetchedAt:new Date().toISOString(),freshness:''};
    const searchName=organization.startsWith('Employer not named')?(postings[0].organization||board.tenant):organization;
    r.boardOwners.set(board.url,ownership(boardPage,searchName,r).catch(error=>{if(fatal(error))throw error;return null;}));
  }
  const corroboration=await r.boardOwners.get(board.url)!;
  if(r.abort.signal.aborted)return;
  const host=new URL(board.url).hostname;
  const unverified=`${platformName[board.platform]} job board (${host}) publishing ${organization}'s postings; no link to it from ${organization}'s own website was found, so it is not verified as official. Organization name is taken from the board${postings[0].organization?'':' address'}. Confirm on the organization's careers site.`.slice(0,600);
  let added=0;
  for(const posting of postings){
    if(r.abort.signal.aborted||r.run.listings.length>=RUN_LISTINGS)break;
    const built=postingListing(posting,board,boardOrganization(board,posting,r.preferences.organizations),corroboration??unverified,!!corroboration,new Date().toISOString());
    if(!built?.listing)continue;
    await publish(r,built.listing);added++;
  }
  const capped=added<postings.length&&r.run.listings.length>=RUN_LISTINGS?` (this run's ${RUN_LISTINGS}-listing limit was reached; Search more continues)`:'';
  r.run.sourceStatus.push({url:board.url,state:`${platformName[board.platform]} board read directly: ${total} internship posting${total===1?'':'s'}; ${added} most relevant added from the posting text (no AI; quotes checked)${corroboration?', official board':', board not verified as official'}${capped}`});
}
async function interpret(r:Record,page:PublicPage,lead:DiscoveryLead,queue:DiscoveryLead[]){
  let links=pageLinks(page,r.preferences);
  // Deterministic link/board discovery does not depend on a successful AI call.
  for(const child of links.slice(0,8))enqueue(r,queue,child);
  const sourceId=hash(page.url);
  // A link-heavy page can exceed the request allowance on metadata alone: offer fewer links rather than skip it.
  let extra={links:links.map(l=>l.url)},boundedText='';
  for(let n=links.length;;n=Math.floor(n/2)){
    extra={links:links.slice(0,n).map(l=>l.url)};
    try{boundedText=boundedSourceText(PageExtraction,extractInstruction,sourceId,page.title,page.text,extra);links=links.slice(0,n);break;}
    catch(error){if(!(error instanceof PublicError&&error.code==='input_limit')||n===0)throw error;}
  }
  const cacheKey=hash(`quoted-page-reader-v1|${page.url}|${page.text}|${boundedText}|${JSON.stringify(extra)}`);
  const cached=PageExtraction.safeParse(await cachedExtraction(cacheKey));
  let extracted:z.infer<typeof PageExtraction>;
  if(cached.success){
    extracted=cached.data;
    r.run.sourceStatus.push({url:page.url,state:'Reused compatible public-text interpretation; quotes revalidated against the fetched page'});
  }else{
    r.run.status='interpreting';r.run.stage='Groq is extracting public-page facts and identifying follow-up links; quotes are validated in code';
    const normalized:FactNormalization={dropped:0};
    extracted=await groq('opportunity_evidence',PageExtraction,extractInstruction,{title:page.title,text:boundedText,...extra},r.abort.signal,{
      runId:r.run.id,models:DISCOVERY_MODELS,normalize:value=>dropUnknownFacts(value,normalized),onSalvage:countDrop(normalized),onCall:()=>{r.run.usage.modelCalls++;r.run.stage='Groq is interpreting public evidence; no taste or academic answers are included';},
      onWait:seconds=>{r.run.stage=`Waiting for the shared Groq token allowance (up to ${seconds}s); the ${DISCOVERY_RUN_MS/60000}-minute run limit still applies`;},
    });
    if(r.abort.signal.aborted)return;
    if(normalized.dropped)r.run.sourceStatus.push({url:page.url,state:`${normalized.dropped} generated fact${normalized.dropped===1?'':'s'} failed validation (unsupported category or a quote outside length limits) and ${normalized.dropped===1?'was':'were'} discarded; other quoted facts are still validated`});
    if(normalized.droppedOpportunities)r.run.sourceStatus.push({url:page.url,state:'A generated opportunity lacked a usable title, organization, track or identity quote and was discarded; its links can still be explored'});
    if(normalized.droppedLeads)r.run.sourceStatus.push({url:page.url,state:`${normalized.droppedLeads} suggested follow-up link${normalized.droppedLeads===1?' was':'s were'} not among the supplied links and ${normalized.droppedLeads===1?'was':'were'} ignored`});
    await saveExtraction(cacheKey,extracted);
  }
  for(const index of extracted.leadIndices)if(links[index])enqueue(r,queue,links[index]);
  let accepted=0;
  for(const draft of extracted.opportunities){
    if(r.abort.signal.aborted||r.run.listings.length>=RUN_LISTINGS)return;
    // One interpretation request contains one known page. Bind its identity in
    // code; the model cannot choose it. Quotes must still pass the same gates.
    const boundDraft={...draft,facts:draft.facts.map(f=>({...f,sourceId,rule:null}))};
    const evidence=evidenceListing(boundDraft,{...page,text:boundedText},'Ownership not yet verified');
    if(!evidence)continue;
    // Known announcement sites cannot be the organization's own page: spend no URLs trying.
    const corroboration=knownThirdParty(page.url)?null:await ownership(page,draft.organization,r);
    if(r.abort.signal.aborted)return;
    const host=new URL(page.url).hostname.replace(/^www\./,'');
    const found:Listing=corroboration?{...evidence,sources:evidence.sources.map(s=>({...s,ownership:corroboration,official:true}))}:
      {...evidence,sources:evidence.sources.map(s=>({...s,official:false,
        ownership:(ats.test(normalizedHost(page.url))?
          `Job-board page (${host}) that names ${draft.organization}, but no link to it from ${draft.organization}'s own website was found, so it is not verified as official. Confirm on the organization's careers site.`:
          `Other source (${host}), not verified as ${draft.organization}'s own page. The quotes are on this page, but it may be copied, outdated or incomplete; confirm on the official site.`).slice(0,600)}))};
    const twin=await publish(r,found);
    if(r.abort.signal.aborted)return;
    accepted++;
    r.run.sourceStatus.push({url:page.url,state:twin>=0&&r.run.listings[twin].id!==found.id?
      `Added as another source for the same internship (${corroboration?'official':'unverified other source'})`:
      corroboration?'Corroborated official evidence accepted; missing criteria remain unknown':'Shown as an unverified other source; quotes checked, organization ownership not confirmed'});
  }
  if(!accepted&&!extracted.opportunities.length)r.run.sourceStatus.push({url:page.url,state:'Directory or no applicable internship; relevant source links can still be explored'});
}
const RUN_MS=DISCOVERY_RUN_MS,AGENT_RESERVED_TAIL_MS=25000;
/** Planned end: stop starting new searches/pages and let in-flight work finish (Scout-like natural completion). */
const windingDown=(r:Record)=>Date.now()>=Date.parse(r.run.startedAt)+DISCOVERY_WIND_DOWN_MS;
/**
 * At most two capped paid Agent reads per run, for the most promising leads Fetch
 * could not read. Agent runs take minutes, so they run in the background while
 * discovery continues; recovered pages are interpreted at the end of the run
 * through the same quote and ownership gates as Fetch pages.
 */
function startAgentReads(r:Record,unreadable:{lead:DiscoveryLead;error:string}[]){
  if(!agentEnabled())return 0;
  const deadlineAt=Date.parse(r.run.startedAt)+RUN_MS-AGENT_RESERVED_TAIL_MS;
  const candidates=unreadable.filter(u=>!r.agentTried.has(canonicalSource(u.lead.url)))
    .filter(u=>{const worthy=agentWorthy(u.lead,r.preferences);if(!worthy)r.run.sourceStatus.push({url:u.lead.url,state:'Not sent to the paid Agent: third-party or unrecognised host that could not be accepted as an official source'});return worthy;})
    .sort((a,b)=>leadPriority(b.lead,r.preferences)-leadPriority(a.lead,r.preferences));
  let started=0;
  for(const {lead,error} of candidates){
    if(r.abort.signal.aborted||(r.run.usage.agentRuns??0)>=2)break;
    const remaining=(deadlineAt-Date.now())/1000;
    if(remaining<45){r.run.sourceStatus.push({url:lead.url,state:'Too little run time remained for a capped Agent read; available through Search more'});break;}
    r.agentTried.add(canonicalSource(lead.url));
    r.run.usage.agentRuns=(r.run.usage.agentRuns??0)+1;started++;
    r.agentJobs.push(readWithAgent(lead.url,r.abort.signal,{maxSeconds:remaining,deadlineAt,stealth:/block/i.test(error),runId:r.run.id}).then(agent=>{
      r.run.usage.agentCostUsd=Math.round(((r.run.usage.agentCostUsd??0)+(agent.costUsd??0))*1000)/1000;
      if(agent.page){
        remember(r,lead.url,agent.page);r.agentReady.push({lead,page:agent.page});
        r.run.sourceStatus.push({url:lead.url,state:`Read by TinyFish Agent after Fetch failed (${agent.steps??'?'} steps, about $${(agent.costUsd??0).toFixed(2)}); quotes are still validated`});
      }else r.run.sourceStatus.push({url:lead.url,state:`TinyFish Agent fallback: ${agent.error}`});
    },()=>{r.run.sourceStatus.push({url:lead.url,state:'TinyFish Agent read was stopped with the run; its remote run was cancelled'});}));
  }
  return started;
}
async function finishAgentReads(r:Record,queue:DiscoveryLead[]){
  if(!r.agentJobs.length&&!r.agentReady.length)return;
  r.run.status='reading';r.run.stage='Waiting for capped TinyFish Agent reads of sources Fetch could not open';
  await Promise.all(r.agentJobs);r.agentJobs=[];
  for(const {lead,page} of r.agentReady.splice(0)){
    if(r.abort.signal.aborted)break;
    for(const child of pageLinks(page,r.preferences).slice(0,8))enqueue(r,queue,child);
    try{await interpret(r,page,lead,queue);}
    catch(error){noteError(r,error);r.run.sourceStatus.push({url:page.url,state:interpretFailure(r,error)});if(fatal(error))break;}
  }
}
async function execute(r:Record){
  const timer=setTimeout(()=>r.abort.abort('deadline'),RUN_MS);
  try{
    const queue=r.pending.slice();r.pending=queue;
    // Resume unread leads before spending more searches. Otherwise dispatch two
    // differentiated queries at a time, never a broad unbounded crawl.
    const startingPage=r.page;
    while(queue.length<14&&r.run.usage.searches<RUN_SEARCHES-3&&r.cursor<r.queries.length&&!r.abort.signal.aborted&&!windingDown(r)){
      const tasks:{task:QueryTask;page:number}[]=[];
      while(tasks.length<2&&r.run.usage.searches+tasks.length<6&&r.cursor<r.queries.length){
        tasks.push({task:r.queries[r.cursor++],page:r.page});
        if(r.cursor>=r.queries.length&&r.page<10){r.cursor=0;r.page++;break;}
      }
      r.run.status='searching';r.run.stage='Searching requested organizations, official postings and research programmes';
      const fatalErrors:unknown[]=[];
      await Promise.all(tasks.map(async({task,page})=>{
        r.run.usage.searches++;r.run.coverage.push({query:task.query,page});
        try{
          const results=await searchPages(task.query,page,r.abort.signal,{...task,runId:r.run.id});
          for(const result of results){const lead=classifyLead(result,task.organization);if(lead)enqueue(r,queue,lead);}
        }catch(error){noteError(r,error,true);if(fatal(error))fatalErrors.push(error);}
      }));
      if(fatalErrors.length)throw fatalErrors[0];
      if(r.page!==startingPage)break;
    }
    while(queue.length&&!r.abort.signal.aborted&&!windingDown(r)&&r.run.usage.fetchedUrls<RUN_URLS&&r.run.listings.length<RUN_LISTINGS){
      queue.sort((a,b)=>leadPriority(b,r.preferences)-leadPriority(a,r.preferences));
      const batch=queue.splice(0,Math.min(4,RUN_URLS-r.run.usage.fetchedUrls));
      const readable: {lead:DiscoveryLead;page:PublicPage}[]=[];
      try{
        for(const lead of batch){
          const cached=r.pages.get(lead.url);
          if(cached)readable.push({lead,page:cached});
        }
        const fresh=batch.filter(l=>!r.pages.has(l.url));
        // Feed reads are a separate format, but use the same metered TinyFish
        // Fetch service. No employer account or application write APIs.
        // Public job boards: read directly as structured data (no TinyFish page or AI call).
        const boardErrors:unknown[]=[];
        await Promise.all(fresh.filter(l=>l.kind==='feed'&&l.board).map(async lead=>{
          try{await readBoard(r,lead);}
          catch(error){
            if(r.abort.signal.aborted)return;
            // One unreadable board is a per-source gap (Sources checked), not a run-level warning.
            console.warn(JSON.stringify({stage:'discovery',runId:r.run.id,operation:'board',code:error instanceof PublicError?error.code:'source_validation'}));
            r.run.sourceStatus.push({url:lead.board!.url,state:`${platformName[lead.board!.platform]} board could not be read: ${publicMessage(error)}`});
            if(fatal(error)){noteError(r,error);boardErrors.push(error);}
          }
        }));
        r.abort.signal.throwIfAborted();
        if(boardErrors.length)throw boardErrors[0];
        const markdown=fresh.filter(l=>l.kind!=='feed');
        const safe:DiscoveryLead[]=[];
        for(const lead of markdown){
          try{await safeUrl(lead.url);safe.push(lead);}
          catch{r.run.sourceStatus.push({url:lead.url,state:'Source safety validation failed; no reading attempted'});}
        }
        if(safe.length){
          r.run.status='reading';r.run.stage=`TinyFish Fetch is reading ${safe.length} career/programme sources; linked postings will be explored`;
          r.run.usage.fetchedUrls+=safe.length;
          const outcomes=await readPages(safe.map(l=>l.url),r.abort.signal,{runId:r.run.id});
          const unreadable:{lead:DiscoveryLead;error:string}[]=[];
          for(const outcome of outcomes){
            const lead=safe.find(l=>l.url===outcome.requestedUrl)!;
            if(outcome.page){remember(r,lead.url,outcome.page);readable.push({lead,page:outcome.page});}
            else {
              r.run.sourceStatus.push({url:lead.url,state:outcome.error??'No readable page'});
              unreadable.push({lead,error:outcome.error??''});
            }
          }
          // Each unreadable URL is listed in Sources checked; it is not a run-level warning.
          startAgentReads(r,unreadable);
        }
        // Agent reads finished in the background are interpreted first: they were the most promising unreadable leads.
        readable.unshift(...r.agentReady.splice(0));
        for(const {lead,page}of readable){
          if(lead.board?.feedUrl)enqueue(r,queue,{...lead,url:lead.board.feedUrl,kind:'feed',parent:lead.board.url});
          // Queue deterministic follow-ups even if Groq later fails.
          for(const child of pageLinks(page,r.preferences).slice(0,8))enqueue(r,queue,child);
        }
        // Two pages at a time: one per Groq model allowance.
        let next=0,stop:unknown=null;const failed:DiscoveryLead[]=[];
        const worker=async()=>{
          while(next<readable.length&&!r.abort.signal.aborted&&!stop&&!windingDown(r)){
            const {lead,page}=readable[next++];
            try{await interpret(r,page,lead,queue);}
            catch(error){noteError(r,error);r.run.sourceStatus.push({url:page.url,state:interpretFailure(r,error)});
              if(fatal(error)||r.abort.signal.aborted){failed.push(lead);stop??=error;}
            }
          }
        };
        await Promise.all([worker(),worker()]);
        if(stop){queue.unshift(...failed,...readable.slice(next).map(item=>item.lead));throw stop;}
        // Pages read but not yet interpreted at wind-down stay cached for Search more.
        if(next<readable.length)queue.unshift(...readable.slice(next).map(item=>item.lead));
      }catch(error){
        noteError(r,error);
        if(fatal(error)||r.abort.signal.aborted){
          // Keep unread leads for "Search more" after a limit or the run deadline.
          for(const lead of batch)if(!queue.some(l=>l.url===lead.url))queue.push(lead);
          break;
        }
        // A provider hiccup on one batch must not end discovery: skip that batch (no retry loop) and continue.
        for(const lead of batch)r.run.sourceStatus.push({url:lead.url,state:`Skipped after an error in its batch: ${publicMessage(error)}`});
      }
    }
    if(!r.abort.signal.aborted)await finishAgentReads(r,queue);
    else await Promise.allSettled(r.agentJobs); // let aborted Agent reads cancel their remote runs
    r.run.listings.sort((a,b)=>b.score-a.score);
    if(r.abort.signal.aborted){
      r.run.status=r.abort.signal.reason==='cancelled'?'cancelled':'partial';
      if(r.abort.signal.reason==='deadline')r.run.errors.push(`The overall ${DISCOVERY_RUN_MS/60000}-minute discovery limit was reached. Unprocessed leads can be continued; this is not necessarily a TinyFish timeout.`);
    }
    else r.run.status=r.run.errors.length?'partial':'complete';
    if(['complete','partial'].includes(r.run.status)&&(r.pending.length||r.cursor<r.queries.length||r.page<10))r.run.continuation=r.run.id;
    r.run.stage=`${r.run.listings.length} evidence-backed ${r.run.listings.length===1?'opportunity':'opportunities'} found from ${r.run.usage.fetchedUrls} pages and ${r.run.usage.searches} searches.${r.pending.length?` ${r.pending.length} more leads are queued — Search more reads them.`:''}`;
  }catch(error){
    if(r.run.status!=='cancelled'){r.run.status=r.run.listings.length?'partial':'failed';r.run.errors.push(publicMessage(error));r.run.stage='Discovery stopped; your accepted evidence is preserved.';}
  }finally{clearTimeout(timer);}
}
