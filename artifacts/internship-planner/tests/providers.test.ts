import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {z} from 'zod';
vi.mock('../server/store',()=>({
  reserveQuery:vi.fn(async()=>0),reserveUrls:vi.fn(async()=>0),
  reserveModel:vi.fn(async(tokens:number)=>({wait:0,reservation:{id:'test-reservation',day:'2026-10-14',tokens,model:'openai/gpt-oss-120b'}})),
  settleModel:vi.fn(async()=>{}),
}));
vi.mock('../server/safe-url',async importOriginal=>{
  const original=await importOriginal<typeof import('../server/safe-url')>();
  return {...original,safeUrl:vi.fn(async(raw:string)=>original.parsePublicUrl(raw).href)};
});
import {groq,readPages,searchPages,boundedSourceText} from '../server/providers';
import {settleModel,reserveModel} from '../server/store';
const quoteSchema=z.strictObject({quote:z.string()});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('TINYFISH_API_KEY','test-placeholder');vi.stubEnv('GROQ_API_KEY','test-placeholder');});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
describe('native provider contracts and safe diagnostics',()=>{
  it('passes only the bounded input, validates output and settles actual reported usage',async()=>{
    const calls=vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"quote":"Public source statement"}'}}],usage:{prompt_tokens:100,completion_tokens:200,total_tokens:300}})));
    vi.stubGlobal('fetch',calls);
    const result=await groq('test_evidence',quoteSchema,'Extract exact public quote',{text:'Public source statement'},new AbortController().signal);
    expect(result.quote).toBe('Public source statement');
    expect(settleModel).toHaveBeenCalledWith(expect.objectContaining({id:'test-reservation'}),300);
    const payload=JSON.parse((calls.mock.calls[0] as unknown as [string,RequestInit])[1].body as string);
    expect(payload.response_format.json_schema.strict).toBe(true);
    expect(payload).not.toHaveProperty('tools');
    expect(payload.messages[1].content).not.toContain('taste');
  });
  it('labels a Groq structured-output rejection without logging the failed generation',async()=>{
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:{code:'json_validate_failed',failed_generation:'PRIVATE_FAILED_GENERATION'}}),{status:400})));
    await expect(groq('test',quoteSchema,'Extract',{text:'Public text'},new AbortController().signal)).rejects.toMatchObject({code:'provider_output',message:expect.stringContaining('Groq extraction could not produce valid structured output')});
    expect(JSON.stringify(warn.mock.calls)).not.toContain('PRIVATE_FAILED_GENERATION');
    expect(settleModel).not.toHaveBeenCalled();
  });
  it('retries malformed output once on the other allowed model, then succeeds',async()=>{
    vi.spyOn(console,'warn').mockImplementation(()=>{});vi.spyOn(console,'log').mockImplementation(()=>{});
    vi.mocked(reserveModel).mockImplementation(async(tokens:number,models?:string[])=>({wait:0,reservation:{id:'r',day:'2026-10-14',tokens,model:models![0]}}));
    const bodies:string[]=[];
    vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{bodies.push(String(init.body));
      return bodies.length===1?new Response(JSON.stringify({error:{code:'json_validate_failed'}}),{status:400}):
        new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({quote:'Public text here'})}}]}),{status:200});}));
    await expect(groq('test',quoteSchema,'Extract',{text:'Public text'},new AbortController().signal,{models:['openai/gpt-oss-120b','openai/gpt-oss-20b']})).resolves.toEqual({quote:'Public text here'});
    expect(JSON.parse(bodies[0]).model).toBe('openai/gpt-oss-120b');
    expect(JSON.parse(bodies[1]).model).toBe('openai/gpt-oss-20b');
  });
  it('salvages a complete object that Groq rejected, using the same strict local contract',async()=>{
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});vi.spyOn(console,'log').mockImplementation(()=>{});
    const listSchema=z.strictObject({quotes:z.array(z.string().min(3)).max(2)});
    const rejected=JSON.stringify({quotes:['first quote','second quote','third quote']});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:{code:'json_validate_failed',failed_generation:rejected}}),{status:400})));
    await expect(groq('test',listSchema,'Extract',{text:'x'},new AbortController().signal,{onSalvage:()=>{}})).resolves.toEqual({quotes:['first quote','second quote']});
    expect(JSON.stringify(warn.mock.calls)).not.toContain('third quote');
    // Unsalvageable output still fails closed.
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:{code:'json_validate_failed',failed_generation:'{"other":1}'}}),{status:400})));
    await expect(groq('test',listSchema,'Extract',{text:'x'},new AbortController().signal,{onSalvage:()=>{}})).rejects.toMatchObject({code:'provider_output'});
  });
  it('moves a rate-limited page to the other model, then waits the stated retry time once',async()=>{
    vi.spyOn(console,'warn').mockImplementation(()=>{});vi.spyOn(console,'log').mockImplementation(()=>{});
    vi.mocked(reserveModel).mockImplementation(async(tokens:number,models?:string[])=>({wait:0,reservation:{id:'r',day:'2026-10-14',tokens,model:models![0]}}));
    const limited=()=>new Response(JSON.stringify({error:{code:'rate_limit_exceeded'}}),{status:429,headers:{'retry-after':'2'}});
    const bodies:string[]=[];
    vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{bodies.push(String(init.body));
      return bodies.length<=2?limited():new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({quote:'Public text here'})}}]}),{status:200});}));
    vi.useFakeTimers();
    const result=groq('test',quoteSchema,'Extract',{text:'Public text'},new AbortController().signal,{models:['openai/gpt-oss-120b','openai/gpt-oss-20b']});
    await vi.advanceTimersByTimeAsync(2100);
    await expect(result).resolves.toEqual({quote:'Public text here'});
    vi.useRealTimers();
    expect(bodies.map(b=>JSON.parse(b).model)).toEqual(['openai/gpt-oss-120b','openai/gpt-oss-20b','openai/gpt-oss-120b']);
  });
  it('diagnoses only structural validity, never failed output values or error messages',async()=>{
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    const failed=JSON.stringify({quote:42,privateText:'NEVER_LOG_THIS_VALUE'});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:{code:'json_validate_failed',failed_generation:failed}}),{status:400})));
    await expect(groq('test',quoteSchema,'Extract',{text:'Public text'},new AbortController().signal)).rejects.toMatchObject({code:'provider_output'});
    const diagnostic=warn.mock.calls.map(call=>call[0]).join('\n');
    expect(diagnostic).toContain('"completeJson":true');
    expect(diagnostic).toContain('"schemaMatches":false');
    expect(diagnostic).toContain('invalid_type');
    expect(diagnostic).not.toContain('privateText');
    expect(diagnostic).not.toContain('NEVER_LOG_THIS_VALUE');
  });
  it('retains successful siblings and reports blocked URLs without launching Agent',async()=>{
    const good='https://university.edu/internship',bad='https://university.edu/blocked';
    const network=vi.fn(async()=>new Response(JSON.stringify({results:[{url:good,final_url:null,title:null,text:'Public internship text',links:[]}],errors:[{url:bad,error:'bot_blocked'}]})));
    vi.stubGlobal('fetch',network);
    const outcomes=await readPages([good,bad],new AbortController().signal);
    expect(outcomes[0].page?.text).toBe('Public internship text');
    expect(outcomes[1]).toMatchObject({page:null,error:expect.stringContaining('blocked automated reading')});
    expect(network).toHaveBeenCalledTimes(1);
    expect((network.mock.calls[0] as unknown as [string])[0]).toBe('https://api.fetch.tinyfish.ai/');
  });
  it('distinguishes connectivity from a timeout and treats provider billing failure explicitly',async()=>{
    vi.spyOn(console,'warn').mockImplementation(()=>{});
    vi.stubGlobal('fetch',vi.fn(async()=>{throw new TypeError('Network unavailable');}));
    await expect(searchPages('internship',0,new AbortController().signal)).rejects.toMatchObject({code:'provider_network',message:expect.stringContaining('TinyFish Search could not be reached')});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:402})));
    await expect(searchPages('internship',0,new AbortController().signal)).rejects.toMatchObject({code:'provider_payment',message:expect.stringContaining('No wallet top-up')});
  });
  it('permits short source text and crops long evidence without exceeding the request allowance',()=>{
    expect(boundedSourceText(quoteSchema,'Extract','source','Public title','Short source text')).toBe('Short source text');
    const long='Official internship evidence. '.repeat(2000);
    const bounded=boundedSourceText(quoteSchema,'Extract','source','Public title',long);
    expect(bounded.length).toBeLessThan(long.length);
    expect(long.startsWith(bounded)).toBe(true);
  });
});
