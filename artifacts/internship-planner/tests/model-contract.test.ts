import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
vi.mock('../server/store',()=>({
  reserveQuery:vi.fn(async()=>0),reserveUrls:vi.fn(async()=>0),
  reserveModel:vi.fn(async(tokens:number)=>({wait:0,reservation:{id:'test-reservation',day:'2026-10-24',tokens}})),
  settleModel:vi.fn(async()=>{}),saveListing:vi.fn(async()=>{}),cachedExtraction:vi.fn(async()=>null),saveExtraction:vi.fn(async()=>{}),
  trustedListing:vi.fn(async()=>null),
}));
import {z} from 'zod';
import {groq,wireSchema} from '../server/providers';
import {countDrop,dropUnknownFacts,relaxForWire,salvage,type FactNormalization} from '../server/model-contract';
import {PageExtraction} from '../server/discovery';
import {PreparationExtraction} from '../server/preparation';
const quote='Example University offers the Software Internship.';
const page=(kind:string,due:unknown=null)=>({opportunities:[{organization:'Example University',title:'Software Internship',track:'Research',identityQuote:quote,cycleKey:'',
  facts:[{kind:'topic',value:'software',quote,due:null},{kind,value:'ten weeks',quote,due}]}],leadIndices:[]});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('GROQ_API_KEY','test-placeholder');});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
const reply=(content:unknown)=>vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}})));
const CONSTRAINTS=/"(minLength|maxLength|minItems|maxItems|minimum|maximum|exclusiveMinimum|exclusiveMaximum|pattern|format|enum|const)"/;
describe('Groq request contract: structure only, strict validation locally',()=>{
  it('sends no value constraints for any extraction schema but keeps structure and describes the limits',()=>{
    for(const strict of [PageExtraction,PreparationExtraction]){
      const sent=wireSchema(strict),local=z.toJSONSchema(strict);
      expect(JSON.stringify(sent)).not.toMatch(CONSTRAINTS);
      expect(JSON.stringify(local)).toMatch(/"maxLength"/);
      expect(JSON.stringify(sent)).toContain('"additionalProperties":false');
    }
    const fact=(wireSchema(PageExtraction) as any).properties.opportunities.items.properties.facts; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(fact.description).toContain('At most 6 items');
    expect(fact.items.properties.kind).toMatchObject({type:'string'});
    expect(fact.items.properties.kind.description).toContain('"eligibility"');
    expect(fact.items.properties.quote.description).toContain('At most 400 characters');
    expect(fact.items.required).toEqual(expect.arrayContaining(['kind','value','quote','due']));
  });
  it('does not treat a property literally named like a keyword as a constraint',()=>{
    expect(relaxForWire({type:'object',properties:{format:{type:'string',maxLength:3}},required:['format']}))
      .toEqual({type:'object',properties:{format:{type:'string',description:'At most 3 characters.'}},required:['format']});
  });
  it('drops only the off-list fact and nulls an unknown due kind before strict validation',()=>{
    const stats:FactNormalization={dropped:0};
    const parsed=PageExtraction.parse(dropUnknownFacts(page('duration'),stats));
    expect(stats.dropped).toBe(1);
    expect(parsed.opportunities[0].facts.map(f=>f.kind)).toEqual(['topic']);
    const due=PageExtraction.parse(dropUnknownFacts(page('deadline',{kind:'soon',at:null,timezone:null}),{dropped:0}));
    expect(due.opportunities[0].facts[1]).toMatchObject({kind:'deadline',due:null});
  });
  it('drops a too-short fact or identity locally',()=>{
    const stats:FactNormalization={dropped:0};
    const short=page('topic');short.opportunities[0].facts[1].quote='Paid';
    expect(PageExtraction.parse(dropUnknownFacts(short,stats)).opportunities[0].facts).toHaveLength(1);expect(stats.dropped).toBe(1);
    const noIdentity=page('topic');noIdentity.opportunities[0].identityQuote='Intern';
    const counted:FactNormalization={dropped:0};
    expect(PageExtraction.parse(dropUnknownFacts({...noIdentity,leadIndices:[2]},counted))).toEqual({opportunities:[],leadIndices:[2]});
    expect(counted.droppedOpportunities).toBe(1);
    expect(dropUnknownFacts({identityQuote:'x',facts:[]},{dropped:0})).toMatchObject({identityQuote:null});
  });
  it('salvage removes only the over-long fact, an out-of-range lead and extra facts; counts each by kind',()=>{
    const long=page('topic');long.opportunities[0].facts[1].quote='x'.repeat(401);
    const many={...long,leadIndices:[1,99,3]};
    for(let i=0;i<6;i++)many.opportunities[0].facts.push({kind:'topic',value:`v${i}`,quote,due:null});
    const stats:FactNormalization={dropped:0};
    const parsed=PageExtraction.parse(salvage(PageExtraction,many,countDrop(stats)));
    expect(parsed.opportunities[0].facts).toHaveLength(6);
    expect(parsed.opportunities[0].facts.every(f=>f.quote.length<=400)).toBe(true);
    expect(parsed.leadIndices).toEqual([1,3]);
    expect(stats).toEqual({dropped:1,droppedLeads:1});
  });
  it('salvage repairs inside an over-long list before trimming it, keeping the first opportunity minus its bad fact',()=>{
    const first=page('topic').opportunities[0];first.facts[1].quote='q'.repeat(500);
    const second={...page('topic').opportunities[0],title:'Second Internship'};
    const stats:FactNormalization={dropped:0};
    const parsed=PageExtraction.parse(salvage(PageExtraction,{opportunities:[first,second],leadIndices:[]},countDrop(stats)));
    expect(parsed.opportunities.map(o=>[o.title,o.facts.length])).toEqual([['Software Internship',1]]);
    expect(stats).toEqual({dropped:1});
  });
  it('salvage drops an opportunity whose own field is invalid and fails closed outside arrays',()=>{
    const bad=page('topic');(bad.opportunities[0] as {track:string}).track='research lab';
    const stats:FactNormalization={dropped:0};
    expect(PageExtraction.parse(salvage(PageExtraction,bad,countDrop(stats))).opportunities).toEqual([]);
    expect(stats.droppedOpportunities).toBe(1);
    const prep={identityQuote:'y'.repeat(401),facts:[],gaps:[]};
    expect(PreparationExtraction.safeParse(salvage(PreparationExtraction,prep,()=>{})).success).toBe(false);
  });
  it('preparation: over-long gap notes are shortened, not lost; an invalid rule drops only its fact',()=>{
    const fact={kind:'eligibility',value:'second year',quote:'Open to second-year students.',due:null,rule:null};
    const raw={identityQuote:quote,facts:[fact,{...fact,rule:{field:'f'.repeat(61),operator:'min',number:2,scale:null,values:[]}}],gaps:['g'.repeat(300)]};
    const stats:FactNormalization={dropped:0};
    const parsed=PreparationExtraction.parse(salvage(PreparationExtraction,dropUnknownFacts(raw,stats),countDrop(stats)));
    expect(parsed.facts).toHaveLength(1);expect(parsed.gaps[0]).toHaveLength(240);expect(stats.dropped).toBe(1);
  });
  it('end to end: groq() keeps the valid facts when one quote exceeds the limit (the reported failure)',async()=>{
    const long=page('topic');long.opportunities[0].facts[1].quote='z'.repeat(450);
    const calls=reply(long);vi.stubGlobal('fetch',calls);vi.spyOn(console,'log').mockImplementation(()=>{});
    const stats:FactNormalization={dropped:0};
    const result=await groq('opportunity_evidence',PageExtraction,'Extract',{text:quote},new AbortController().signal,{normalize:v=>dropUnknownFacts(v,stats),onSalvage:countDrop(stats)});
    expect(result.opportunities[0].facts).toHaveLength(1);expect(stats.dropped).toBe(1);
    const sent=JSON.parse((calls.mock.calls[0] as unknown as [string,RequestInit])[1].body as string).response_format.json_schema;
    expect(sent.strict).toBe(true);expect(JSON.stringify(sent.schema)).not.toMatch(CONSTRAINTS);
  });
  it('without salvage an invalid value is still rejected locally; no generated claim is accepted',async()=>{
    vi.stubGlobal('fetch',reply(page('duration')));vi.spyOn(console,'log').mockImplementation(()=>{});
    await expect(groq('opportunity_evidence',PageExtraction,'Extract',{text:quote},new AbortController().signal)).rejects.toMatchObject({code:'model_shape'});
  });
});
