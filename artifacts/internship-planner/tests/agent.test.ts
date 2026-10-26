import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
vi.mock('../server/store',()=>({
  reserveAgent:vi.fn(async(micro:number)=>({id:'agent-reservation',day:'2026-10-24',micro})),
  settleAgent:vi.fn(async()=>{}),
}));
vi.mock('../server/providers',()=>({delay:vi.fn(async(_ms:number,signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Aborted','AbortError');})}));
vi.mock('../server/safe-url',async importOriginal=>{
  const original=await importOriginal<typeof import('../server/safe-url')>();
  return {...original,safeUrl:vi.fn(async(raw:string)=>original.parsePublicUrl(raw).href)};
});
import {readWithAgent,agentEnabled,AGENT_STEP_MICRO_USD} from '../server/agent';
import {reserveAgent,settleAgent} from '../server/store';
const url='https://careers.university.edu/internships';
const text='University Summer Research Internship. Open to undergraduate students. Stipend provided. Apply by 15 January 2027.';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
function provider(routes:{wallet?:unknown;run?:unknown;created?:unknown}){
  return vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
    const path=new URL(String(input)).pathname;
    if(path==='/v1/wallet')return json(routes.wallet??{available_balance:'47.91',currency:'USD',auto_reload:{state:'unconfigured'}});
    if(path==='/v1/automation/run-async')return json(routes.created??{run_id:'run_123',error:null});
    if(path.endsWith('/cancel'))return json({run_id:'run_123',status:'CANCELLED'});
    if(path.startsWith('/v1/runs/'))return json(routes.run??{status:'COMPLETED',num_of_steps:6,result:{title:'Summer Internship',url,text,links:[{text:'Eligibility',url:'/eligibility'},{text:'bad',url:'javascript:alert(1)'}]}});
    throw new Error(`unexpected ${init?.method} ${path}`);
  });
}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('TINYFISH_API_KEY','test-placeholder');vi.stubEnv('TINYFISH_AGENT_FALLBACK','on');vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
describe('capped TinyFish Agent fallback',()=>{
  it('is opt-in: without TINYFISH_AGENT_FALLBACK=on no provider call or reservation happens',async()=>{
    vi.stubEnv('TINYFISH_AGENT_FALLBACK','');const fetch=provider({});vi.stubGlobal('fetch',fetch);
    expect(agentEnabled()).toBe(false);
    expect(await readWithAgent(url,new AbortController().signal,{maxSeconds:120})).toMatchObject({page:null});
    expect(fetch).not.toHaveBeenCalled();expect(reserveAgent).not.toHaveBeenCalled();
  });
  it('refuses when wallet auto-reload is on or the balance is low, before reserving or starting a run',async()=>{
    for(const wallet of [{available_balance:'40',currency:'USD',auto_reload:{state:'on',threshold:'5',recharge_to:'25'}},{available_balance:'0.40',currency:'USD',auto_reload:{state:'unconfigured'}}]){
      const fetch=provider({wallet});vi.stubGlobal('fetch',fetch);
      const out=await readWithAgent(url,new AbortController().signal,{maxSeconds:120});
      expect(out.page).toBeNull();expect(out.error).toMatch(/auto-reload|below the safe minimum/);
      expect(fetch.mock.calls.map(c=>new URL(String(c[0])).pathname)).toEqual(['/v1/wallet']);
    }
    expect(reserveAgent).not.toHaveBeenCalled();
  });
  it('skips when too little run time remains',async()=>{
    const fetch=provider({});vi.stubGlobal('fetch',fetch);
    expect((await readWithAgent(url,new AbortController().signal,{maxSeconds:30})).error).toMatch(/Too little run time/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reserves 25 steps, bounds duration, settles actual steps and returns a validated same-host page',async()=>{
    const fetch=provider({});vi.stubGlobal('fetch',fetch);
    const out=await readWithAgent(url,new AbortController().signal,{maxSeconds:500,stealth:true});
    expect(reserveAgent).toHaveBeenCalledWith(25*AGENT_STEP_MICRO_USD);
    const body=JSON.parse(fetch.mock.calls.find(c=>String(c[0]).endsWith('/run-async'))![1]!.body as string);
    expect(body.agent_config).toEqual({max_duration_seconds:120});
    expect(body.agent_config).not.toHaveProperty('max_steps');
    expect(body.browser_profile).toBe('stealth');
    expect(body.goal).toMatch(/Do not sign in.*apply/);
    expect(JSON.stringify(body.output_schema)).not.toMatch(/additionalProperties|oneOf|const/);
    expect(settleAgent).toHaveBeenCalledWith(expect.objectContaining({id:'agent-reservation'}),6*AGENT_STEP_MICRO_USD);
    expect(out).toMatchObject({steps:6,costUsd:0.096,error:null});
    expect(out.page).toMatchObject({url,text});
    expect(out.page!.links).toEqual(['https://careers.university.edu/eligibility']);
    expect(out.page!.freshness).toMatch(/TinyFish Agent/);
  });
  it('never adopts an off-host final URL and rejects empty captures',async()=>{
    vi.stubGlobal('fetch',provider({run:{status:'COMPLETED',num_of_steps:3,result:{title:'x',url:'https://attacker.example.org/x',text,links:[]}}}));
    expect((await readWithAgent(url,new AbortController().signal,{maxSeconds:120})).page?.url).toBe(url);
    vi.stubGlobal('fetch',provider({run:{status:'COMPLETED',num_of_steps:3,result:{title:'x',url,text:'',links:[]}}}));
    expect(await readWithAgent(url,new AbortController().signal,{maxSeconds:120})).toMatchObject({page:null,steps:3});
  });
  it('reports a site-blocked failure honestly and still settles its steps',async()=>{
    vi.stubGlobal('fetch',provider({run:{status:'FAILED',num_of_steps:2,result:null,error:{code:'SITE_BLOCKED'}}}));
    const out=await readWithAgent(url,new AbortController().signal,{maxSeconds:120});
    expect(out).toMatchObject({page:null,error:expect.stringContaining('blocked'),steps:2});
    expect(settleAgent).toHaveBeenCalledWith(expect.anything(),2*AGENT_STEP_MICRO_USD);
  });
  it('cancels the remote run when the discovery run is aborted, keeping the reservation counted',async()=>{
    const controller=new AbortController();
    const fetch=vi.fn(async(input:string|URL|Request)=>{
      const path=new URL(String(input)).pathname;
      if(path==='/v1/wallet')return json({available_balance:'47',currency:'USD',auto_reload:{state:'unconfigured'}});
      if(path==='/v1/automation/run-async'){controller.abort('deadline');return json({run_id:'run_123'});}
      return json({run_id:'run_123',status:'CANCELLED'});
    });
    vi.stubGlobal('fetch',fetch);
    await expect(readWithAgent(url,controller.signal,{maxSeconds:120})).rejects.toBeTruthy();
    expect(fetch.mock.calls.some(c=>String(c[0]).endsWith('/v1/runs/run_123/cancel'))).toBe(true);
    expect(settleAgent).not.toHaveBeenCalled();
  });
  it('maps 402 to an explicit no-top-up message',async()=>{
    vi.stubGlobal('fetch',vi.fn(async(input:string|URL|Request)=>new URL(String(input)).pathname==='/v1/wallet'?json({available_balance:'47',currency:'USD',auto_reload:{state:'off',threshold:'5',recharge_to:'25'}}):new Response('{}',{status:402})));
    expect((await readWithAgent(url,new AbortController().signal,{maxSeconds:120})).error).toMatch(/No wallet top-up/);
  });
  it('cancels at the caller deadline and settles the steps TinyFish reports for the cancelled run',async()=>{
    const fetch=vi.fn(async(input:string|URL|Request)=>{
      const path=new URL(String(input)).pathname;
      if(path==='/v1/wallet')return json({available_balance:'47',currency:'USD',auto_reload:{state:'unconfigured'}});
      if(path==='/v1/automation/run-async')return json({run_id:'run_9'});
      if(path.endsWith('/cancel'))return json({run_id:'run_9',status:'CANCELLED'});
      return json({status:'CANCELLED',num_of_steps:3,result:null,error:{message:'Run cancelled by user'}});
    });
    vi.stubGlobal('fetch',fetch);
    const out=await readWithAgent(url,new AbortController().signal,{maxSeconds:120,deadlineAt:Date.now()-1});
    expect(out).toMatchObject({page:null,steps:3,costUsd:0.048,error:expect.stringContaining('time limit')});
    expect(fetch.mock.calls.some(c=>String(c[0]).endsWith('/v1/runs/run_9/cancel'))).toBe(true);
    expect(settleAgent).toHaveBeenCalledWith(expect.anything(),3*AGENT_STEP_MICRO_USD);
  });
});
