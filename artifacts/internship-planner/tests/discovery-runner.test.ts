import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import { z } from 'zod';
import { hash } from '../server/evidence';
import { defaultPreferences } from '../shared/schemas';
import { DISCOVERY_RUN_MS, DISCOVERY_WIND_DOWN_MS } from '../shared/limits';

vi.mock('../server/safe-url',async importOriginal=>{
  const original=await importOriginal<typeof import('../server/safe-url')>();
  return {...original,safeUrl:vi.fn(async(raw:string)=>original.parsePublicUrl(raw).href)};
});
vi.mock('../server/store',()=>({saveListing:vi.fn(async()=>{}),cachedExtraction:vi.fn(async()=>null),saveExtraction:vi.fn(async()=>{})}));
vi.mock('../server/providers',async importOriginal=>{
  const original=await importOriginal<typeof import('../server/providers')>();
  return {...original,searchPages:vi.fn(),readPages:vi.fn(),groq:vi.fn()};
});
vi.mock('../server/agent',()=>({agentEnabled:vi.fn(()=>false),readWithAgent:vi.fn()}));
import { createRun,getRun,cancelRun,PageExtraction } from '../server/discovery';
import { agentEnabled,readWithAgent } from '../server/agent';
import { searchPages,readPages,groq,type PublicPage } from '../server/providers';
import { PublicError } from '../server/errors';
const search=vi.mocked(searchPages),read=vi.mocked(readPages),model=vi.mocked(groq);
const programme='https://university.edu/software-internship';
const home='https://university.edu/';
const rolePage=(url=programme):PublicPage=>({url,title:'Example University Software Internship',text:'Example University offers the Software Internship. Interns receive a research stipend.',links:[home],fetchedAt:'2026-10-14T00:00:00Z',freshness:'Test public page'});
const homepage:PublicPage={...rolePage(home),title:'Example University',links:[programme]};
const extracted=(_page:PublicPage)=>({opportunities:[{organization:'Example University',title:'Software Internship',track:'Research',identityQuote:'Example University offers the Software Internship.',cycleKey:'',facts:[{kind:'fundingBenefit',value:'Research stipend',quote:'Interns receive a research stipend.',due:null}]}],leadIndices:[]});
async function finished(id:string,owner:string){
  for(let i=0;i<200;i++){const r=getRun(id,owner).run;if(['complete','partial','failed','cancelled'].includes(r.status))return r;await new Promise(resolve=>setTimeout(resolve,5));}
  throw Error('Mock run did not finish');
}
beforeEach(()=>{
  vi.clearAllMocks();
  search.mockResolvedValue([{url:programme,title:'Software Internship'}]);
  read.mockImplementation(async urls=>urls.map(url=>({requestedUrl:url,page:url===home?homepage:rolePage(url),error:null})));
  model.mockImplementation(async(_name,_schema,_instruction,_data,_signal,context)=>{
    context?.onCall?.();
    return extracted(rolePage()) as never;
  });
});
afterEach(()=>{vi.useRealTimers();});
describe('end-to-end bounded discovery graph',()=>{
  it('serializes a quoted-facts discovery contract without premature eligibility rules',()=>{
    const schema=JSON.parse(JSON.stringify(z.toJSONSchema(PageExtraction)));
    const fields=schema.properties!.opportunities.items.properties.facts.items.properties;
    expect(Object.keys(fields).sort()).toEqual(['due','kind','quote','value']);
  });
  it('binds known single-page source identity in code, not generated output',async()=>{
    const output=extracted(rolePage());
    expect(PageExtraction.safeParse(output).success).toBe(true);
    expect(PageExtraction.safeParse({...output,opportunities:output.opportunities.map(o=>({...o,facts:o.facts.map(f=>({...f,sourceId:'model-chosen-source'}))}))}).success).toBe(false);
    const run=await finished(createRun('identity-owner',defaultPreferences,null),'identity-owner');
    expect(run.listings[0].facts[0].sourceId).toBe(hash(programme));
    expect(run.listings[0].facts[0].sourceId).toBe(run.listings[0].sources[0].id);
    expect(run.listings[0].facts[0].rule).toBeNull();
  });
  it('follows a directory even when its model extraction fails, preserving later valid evidence',async()=>{
    const directory='https://university.edu/programmes';
    search.mockResolvedValue([{url:directory,title:'University programmes'}]);
    read.mockImplementation(async urls=>urls.map(url=>({requestedUrl:url,page:url===directory?{...rolePage(directory),title:'Programme directory',text:'[Software Internship](https://university.edu/software-internship)',links:[programme]}:url===home?homepage:rolePage(url),error:null})));
    const base=model.getMockImplementation()!;
    model.mockImplementation(async(...args)=>{if((args[3] as {title:string}).title==='Programme directory')throw new PublicError('provider_failed','Groq rejected this directory.');return base(...args);});
    const id=createRun('directory-owner',{...defaultPreferences,tracks:['Research']},null);
    const run=await finished(id,'directory-owner');
    // One page's failure is a per-source note, not a run-level warning.
    expect(run.status).toBe('complete');
    expect(run.listings).toHaveLength(1);
    expect(read.mock.calls.some(([urls])=>urls.includes(programme))).toBe(true);
    expect(run.errors).toEqual([]);
    expect(run.sourceStatus).toContainEqual({url:directory,state:'Not interpreted: Groq rejected this directory.'});
    expect(run.usage.fetchedUrls).toBeLessThanOrEqual(40);
  });
  it('shows a known announcement page as an unverified other source without spending URLs on ownership, then merges the official page',async()=>{
    const blog='https://opportunitydesk.org/2026/10/example-software-internship/';
    search.mockResolvedValue([{url:blog,title:'Example University Software Internship 2027'}]);
    read.mockImplementation(async urls=>urls.map(url=>({requestedUrl:url,page:url===blog?{...rolePage(blog),title:'Opportunity Desk: Example University Software Internship',text:'Example University offers the Software Internship. Interns receive a research stipend. Apply on the official website.',links:[programme]}:url===home?homepage:rolePage(url),error:null})));
    const run=await finished(createRun('other-owner',{...defaultPreferences,tracks:['Research']},null),'other-owner');
    expect(run.listings).toHaveLength(1);
    const [listing]=run.listings;
    // The official programme page (linked from the blog) became the primary source; the blog is kept as another source.
    expect(listing.canonicalUrl).toBe(programme);
    expect(listing.sources.map(s=>[s.url,s.official])).toEqual([[programme,true],[blog,false]]);
    expect(listing.sources[1].ownership).toContain('not verified');
    expect(new Set(listing.facts.map(f=>f.sourceId))).toEqual(new Set([hash(programme)]));
    expect(run.sourceStatus.some(s=>s.url===blog&&s.state.includes('unverified other source'))).toBe(true);
    // No ownership search was spent on the announcement site.
    expect(search.mock.calls.some(([query])=>String(query).includes('official careers website'))).toBe(false);
  });
  it('keeps an uncorroborated page as an unverified listing instead of discarding its quoted evidence',async()=>{
    const news='https://news.example.org/software-internship';
    search.mockResolvedValue([{url:news,title:'Software Internship news'}]);
    read.mockImplementation(async urls=>urls.map(url=>({requestedUrl:url,page:url===news?{...rolePage(news),links:[]}:null,error:url===news?null:'unreadable'})));
    const run=await finished(createRun('news-owner',{...defaultPreferences,tracks:['Research']},null),'news-owner');
    expect(run.listings).toHaveLength(1);
    expect(run.listings[0].sources[0].official).toBe(false);
    expect(run.listings[0].facts).toHaveLength(1);
  });
  it('turns a public job board into listings without an AI call, with one ownership check per board',async()=>{
    const board='https://jobs.lever.co/example',posting=board+'/intern-id';
    const description='Example builds research software. You will be a Software Intern on the tools team. We do not sponsor visas for this internship. The hourly pay is $40 per hour.';
    const api=vi.fn(async(url:string)=>new Response(JSON.stringify(url.includes('api.lever.co')?[{text:'Software Intern 2027',hostedUrl:posting,categories:{location:'Remote - Canada'},descriptionPlain:description},{text:'Senior Engineer',hostedUrl:board+'/senior'}]:{}),{status:200}));
    vi.stubGlobal('fetch',api);
    search.mockImplementation(async query=>query.includes('official careers')?[{url:'https://university.edu/careers',title:'Example careers'}]:[{url:board,title:'Example internships'}]);
    read.mockImplementation(async urls=>urls.map(url=>({requestedUrl:url,page:url==='https://university.edu/careers'?{...homepage,url,links:[board]}:rolePage(url),error:null})));
    const id=createRun('feed-owner',{...defaultPreferences,tracks:['Company']},null);
    const run=await finished(id,'feed-owner');
    vi.unstubAllGlobals();
    const listing=run.listings.find(l=>l.canonicalUrl===posting)!;
    expect(listing).toBeDefined();
    expect(listing.organization).toBe('Example');
    expect(listing.sources[0].ownership).toContain('explicitly links to this ATS');
    expect(listing.facts.find(f=>f.kind==='visa')?.value).toBe('unsupported');
    expect(listing.facts.find(f=>f.kind==='remote')?.value).toBe('remote');
    expect(listing.facts.find(f=>f.kind==='funding')?.quote).toContain('$40 per hour');
    expect(api.mock.calls.some(([url])=>String(url).startsWith('https://api.lever.co/v0/postings/example'))).toBe(true);
    expect(model.mock.calls.some(call=>(call[3] as {title:string}).title.includes('Software Intern 2027'))).toBe(false);
    expect(run.sourceStatus.some(s=>s.state.includes('board read directly'))).toBe(true);
  });
  it('reports a per-URL failure without erasing a successful sibling source',async()=>{
    const bad='https://university.edu/blocked-internship';
    search.mockResolvedValue([{url:programme,title:'Software Internship'},{url:bad,title:'Blocked Internship'}]);
    read.mockImplementation(async urls=>urls.map(url=>url===bad?{requestedUrl:url,page:null,error:'The site blocked automated reading by TinyFish Fetch.'}:{requestedUrl:url,page:url===home?homepage:rolePage(url),error:null}));
    const id=createRun('partial-owner',defaultPreferences,null),run=await finished(id,'partial-owner');
    expect(run.listings).toHaveLength(1);expect(run.status).toBe('complete');expect(run.errors).toEqual([]);
    expect(run.sourceStatus.some(s=>s.state.includes('blocked automated reading'))).toBe(true);
    expect(readWithAgent).not.toHaveBeenCalled();
  });
  it('does not accept late AI results after an explicit cancellation',async()=>{
    let release:((value:unknown)=>void)|undefined;
    model.mockImplementation(async(...args)=>{args[5]?.onCall?.();return await new Promise<unknown>(resolve=>{release=resolve;}) as never;});
    const id=createRun('cancel-owner',defaultPreferences,null);
    for(let i=0;i<100&&!release;i++)await new Promise(resolve=>setTimeout(resolve,5));
    expect(release).toBeDefined();cancelRun(id,'cancel-owner');release!(extracted(rolePage()));
    await new Promise(resolve=>setTimeout(resolve,20));
    expect(getRun(id,'cancel-owner').run).toMatchObject({status:'cancelled',listings:[]});
    expect(()=>getRun(id,'another-owner')).toThrow('unavailable or expired');
  });
  it('advances real provider result pages and rejects reuse of a continuation',async()=>{
    const first=createRun('continue-owner',{...defaultPreferences,tracks:['Research']},null);
    const run=await finished(first,'continue-owner');
    expect(run.continuation).toBe(first);
    search.mockClear();
    const second=createRun('continue-owner',{...defaultPreferences,tracks:['Research']},first);
    await finished(second,'continue-owner');
    expect(search.mock.calls.some(([,page])=>page>0)).toBe(true);
    expect(()=>createRun('continue-owner',{...defaultPreferences,tracks:['Research']},first)).toThrow('continuation');
  });
  it('distinguishes the overall clock cutoff from a TinyFish request timeout',async()=>{
    vi.useFakeTimers();
    search.mockImplementation(async(_query,_page,signal)=>await new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})));
    const id=createRun('clock-owner',defaultPreferences,null);
    await vi.advanceTimersByTimeAsync(DISCOVERY_RUN_MS);
    const run=getRun(id,'clock-owner').run;
    expect(run.status).toBe('partial');
    expect(run.errors).toHaveLength(1);
    expect(run.errors[0]).toContain(`overall ${DISCOVERY_RUN_MS/60000}-minute`);
    expect(run.errors[0]).not.toContain('provider timed out');
  });
  it('winds down at the planned time: finishes in-flight work, completes without an error and keeps leads for Search more',async()=>{
    vi.useFakeTimers();
    const many=Array.from({length:12},(_,i)=>({url:`https://university.edu/internship-${i}`,title:`Software Internship ${i}`}));
    search.mockResolvedValue(many);
    // Each page read takes 70 s (simulating the shared AI token allowance), so the queue cannot drain before wind-down.
    read.mockImplementation(async urls=>{await new Promise(resolve=>setTimeout(resolve,70000));return urls.map(url=>({requestedUrl:url,page:url===home?homepage:rolePage(url),error:null}));});
    const id=createRun('wind-owner',{...defaultPreferences,tracks:['Research']},null);
    await vi.advanceTimersByTimeAsync(DISCOVERY_WIND_DOWN_MS+75000);
    const run=getRun(id,'wind-owner').run;
    expect(run.status).toBe('complete');
    expect(run.errors).toEqual([]);
    expect(run.listings.length).toBeGreaterThan(0);
    expect(run.continuation).toBe(id);
    expect(run.stage).toMatch(/more leads are queued — Search more reads them/);
  });
  it('recovers an unreadable lead with the capped Agent, then applies the same quote and ownership gates',async()=>{
    const blocked='https://university.edu/research-internship',other=['https://university.edu/a-internship','https://university.edu/b-internship'];
    vi.mocked(agentEnabled).mockReturnValue(true);
    vi.mocked(readWithAgent).mockImplementation(async url=>url===blocked
      ?{page:{...rolePage(blocked),freshness:'Read by TinyFish Agent'},error:null,steps:6,costUsd:0.096}
      :{page:null,error:'The site also blocked TinyFish Agent.',steps:2,costUsd:0.032});
    const aggregator='https://www.ziprecruiter.com/Jobs/Example-University-Internship';
    search.mockResolvedValue([{url:blocked,title:'Research Internship'},...other.map(url=>({url,title:'Internship'})),{url:aggregator,title:'Example University Internship'}]);
    read.mockImplementation(async urls=>urls.map(url=>url===home?{requestedUrl:url,page:homepage,error:null}:{requestedUrl:url,page:null,error:'The site blocked automated reading by TinyFish Fetch.'}));
    const run=await finished(createRun('agent-owner',{...defaultPreferences,tracks:['Research']},null),'agent-owner');
    expect(vi.mocked(readWithAgent).mock.calls.length).toBeLessThanOrEqual(2);
    expect(vi.mocked(readWithAgent).mock.calls.map(c=>c[0])).not.toContain(aggregator);
    expect(run.usage.agentRuns).toBe(vi.mocked(readWithAgent).mock.calls.length);
    expect(run.listings.map(l=>l.canonicalUrl)).toContain(blocked);
    expect(run.listings.find(l=>l.canonicalUrl===blocked)!.sources[0].freshness).toContain('TinyFish Agent');
    expect(run.sourceStatus.some(s=>s.state.includes('Read by TinyFish Agent after Fetch failed'))).toBe(true);
    vi.mocked(agentEnabled).mockReturnValue(false);
  });
});
