import {describe,it,expect,vi} from 'vitest';
import {buildQuestions} from '../shared/question-bank';
import type {PreparedGoal} from '../shared/planning';
const state=vi.hoisted(()=>({calls:0,allowed:true}));
vi.mock('../server/store',()=>({cachedExtraction:async()=>null,saveExtraction:async()=>{}}));
vi.mock('../server/providers',()=>({groq:async(_p:unknown,schema:{parse(v:unknown):unknown})=>{
  state.calls++;
  return schema.parse({canAssess:state.allowed,reason:'Conceptual coverage only, not practical competence',
    questions:state.allowed?[{prompt:'Explain a defensible first check for a cryogenic detector calibration anomaly.',
      criteria:['Identify an independent calibration/reference comparison','Discuss uncertainty and one follow-up measurement']}]:[]});
}}));
import {supplementQuestions} from '../server/generated-questions';
function goal(skill:string):PreparedGoal{return {
  listing:{id:'goal',version:'version',organization:'Example Institution',title:'Research Internship',track:'Research',cycleKey:'',canonicalUrl:'https://institution.edu/internship',identityQuote:'Research Internship',
    facts:[{kind:'skill',value:skill,quote:`${skill} experience is required.`,sourceId:'source',rule:null,due:null}],
    sources:[{id:'source',url:'https://institution.edu/internship',title:'Research Internship',fetchedAt:new Date().toISOString(),interpretedAt:new Date().toISOString(),freshness:'Test',ownership:'Fixture',official:true}]},
  preparedAt:new Date().toISOString(),gaps:[],sourceStatus:[],
};}
describe('bounded conceptual supplementation',()=>{
  it('binds source/target IDs server-side and freezes rubrics before answers',async()=>{
    state.allowed=true;const g=goal('Cryogenic detector calibration'),p=buildQuestions([g],'pack');
    const result=await supplementQuestions(p,[g],new AbortController().signal,'run'),q=result.questions.find(q=>q.origin==='generated')!;
    expect(q.rubrics).toHaveLength(2);expect(q.sourceRefs[0]).toEqual({goalId:'goal',sourceId:'source',quote:g.listing.facts[0].quote});
    expect(result.questions.length).toBeGreaterThanOrEqual(6);expect(result.questions.length).toBeLessThanOrEqual(8);
    expect(result.uncovered.goal.length).toBeGreaterThan(0);
  });
  it('does not claim to grade clinical or physical competence',async()=>{
    const g=goal('Clinical surgery'),p=buildQuestions([g],'pack'),calls=state.calls;
    const result=await supplementQuestions(p,[g],new AbortController().signal,'run');
    expect(state.calls).toBe(calls);expect(result.questions.every(q=>q.origin==='reviewed')).toBe(true);
  });
  it('retains a Not assessed gap when responsible generation declines',async()=>{
    state.allowed=false;const g=goal('Cryogenic detector calibration');
    const result=await supplementQuestions(buildQuestions([g],'pack'),[g],new AbortController().signal,'run');
    expect(result.questions.every(q=>q.origin==='reviewed')).toBe(true);
    expect(result.uncovered.goal.join(' ')).toContain('Conceptual coverage only');
  });
});
