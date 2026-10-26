import { describe,it,expect } from 'vitest';
import type { Fact } from '../shared/schemas';
import { emptyProfile,ProfileSchema,type PreparedGoal,type Availability } from '../shared/planning';
import { eligibility,criterionKey } from '../shared/eligibility';
import { buildQuestions,readiness } from '../shared/question-bank';
import { buildPlan,deadline,localMidnight,weekOf } from '../shared/scheduler';
const now=Date.parse('2026-10-14T12:00:00Z');
const a:Availability={hoursPerWeek:14,examWeeks:[],bufferDays:0,personalTargets:{},timezone:'UTC'};
const fact=(kind:Fact['kind'],value:string,quote=value):Fact=>({kind,value,quote,sourceId:'source',rule:null,due:null});
const grade={...fact('eligibility','Minimum 90%','Applicants need minimum academic marks of 90%.'),rule:{field:'grade' as const,operator:'min' as const,number:90,scale:'%',values:[]}};
const year={...fact('eligibility','Year 3','Applicants must be in academic year 3 or later.'),rule:{field:'year' as const,operator:'min' as const,number:3,scale:null,values:[]}};
const profile={...emptyProfile,studyYear:3,gradeValue:95,gradeScale:'100'};
function goal(id:string,track:'Research'|'Company'='Research',extras:Fact[]=[],at='2026-11-02T17:00:00Z'):PreparedGoal{
  return {listing:{id,version:'evidence-1',organization:'Example University',title:'Software Internship',track,identityQuote:'Example University Software Internship',cycleKey:'2026',canonicalUrl:'https://university.edu/internship',
    facts:[grade,year,...extras,{...fact('deadline','Closing date','Applications close on 2 November 2026 at 17:00 UTC.'),due:{kind:'fixed',at,timezone:'UTC'}}],
    sources:[{id:'source',url:'https://university.edu/internship',title:'Software Internship',fetchedAt:new Date(now).toISOString(),interpretedAt:new Date(now).toISOString(),freshness:'Read for this test',ownership:'Test fixture',official:true}]},
    preparedAt:new Date(now).toISOString(),gaps:[],sourceStatus:[]};
}
const cv=fact('document','CV','A CV is required with the application.');
const submit=fact('submission','Online application','Submit the application through the official form.');
describe('local sourced preliminary eligibility',()=>{
  it('changing study year and grade changes the supported verdict',()=>{
    const g=goal('a');
    expect(eligibility(g,profile).status).toBe('meetsExtractedCriteria');
    expect(eligibility(g,{...profile,studyYear:2}).status).toBe('failsCriteria');
    expect(eligibility(g,{...profile,gradeValue:80}).criteria[0].status).toBe('failed');
  });
  it('never converts a CGPA to percentage or treats unstated scales as equal',()=>{
    expect(eligibility(goal('a'),{...profile,gradeValue:9.5,gradeScale:'10'}).status).toBe('needsConfirmation');
    expect(eligibility(goal('a'),{...profile,gradeScale:''}).status).toBe('needsConfirmation');
  });
  it('missing evidence and unsupported conditions cannot produce a positive',()=>{
    const g=goal('a');g.gaps=['A linked mandatory condition was not read'];
    expect(eligibility(g,profile).status).toBe('needsConfirmation');
    g.gaps=[];g.listing.facts.push(fact('eligibility','Unmapped institute condition','Only institutes satisfying the linked condition are eligible.'));
    expect(eligibility(g,profile).status).toBe('needsConfirmation');
  });
  it('source-specific confirmations are invalidated by changed evidence versions',()=>{
    const age={...fact('eligibility','At least 18','Applicants must be at least 18 years of age.'),rule:{field:'ageThreshold' as const,operator:'confirm' as const,number:18,scale:null,values:[]}};
    const g=goal('a','Research',[age]),key=criterionKey('a',2,g.listing.version);
    expect(eligibility(g,{...profile,confirmations:{[key]:true}}).status).toBe('meetsExtractedCriteria');
    g.listing.version='changed-evidence';
    expect(eligibility(g,{...profile,confirmations:{[key]:true}}).status).toBe('needsConfirmation');
  });
  it('checks country aliases but not opaque memberships',()=>{
    const citizenship={...fact('eligibility','French or Canadian citizenship','French or Canadian citizenship is required.'),rule:{field:'nationality' as const,operator:'oneOf' as const,number:null,scale:null,values:['French','Canadian']}};
    expect(eligibility(goal('a','Research',[citizenship]),{...profile,nationality:'France'}).status).toBe('meetsExtractedCriteria');
    expect(eligibility(goal('a','Research',[citizenship]),{...profile,nationality:'India'}).status).toBe('failsCriteria');
    citizenship.rule.values=['member states'];
    expect(eligibility(goal('a','Research',[citizenship]),{...profile,nationality:'India'}).status).toBe('needsConfirmation');
  });
  it('rejects impossible grade values above their declared numeric scale',()=>{
    expect(ProfileSchema.safeParse({...profile,gradeValue:5,gradeScale:'4'}).success).toBe(false);
  });
});
describe('question coverage and honest foundations',()=>{
  it('creates a bounded reusable reviewed pack and labels source gaps',()=>{
    const g=goal('a','Research',[fact('skill','Cryogenic detector calibration','Cryogenic detector calibration experience is required.')]);
    const pack=buildQuestions([g],'pack');
    expect(pack.questions.length).toBeGreaterThanOrEqual(6);
    expect(pack.questions.length).toBeLessThanOrEqual(8);
    expect(pack.uncovered.a.join(' ')).toContain('Cryogenic');
    expect(readiness(pack,null).every(r=>r.status==='Not assessed')).toBe(true);
  });
  it('does not reuse a mismatched rubric/pack verdict',()=>{
    const pack=buildQuestions([goal('a')],'pack');
    expect(readiness(pack,{packId:'other',packVersion:pack.version,assessedAt:new Date(now).toISOString(),items:[]}).every(r=>r.status==='Not assessed')).toBe(true);
  });
});
describe('fixed-clock shared deadline and capacity kernel',()=>{
  it('shares CV once across tracks, with the earliest served deadline and one ledger',()=>{
    const goals=[goal('research','Research',[cv,submit],'2026-10-20T17:00:00Z'),goal('company','Company',[cv,submit],'2026-11-02T17:00:00Z')];
    const p=buildPlan(goals,profile,null,null,a,{},now),core=p.tasks.find(t=>t.id==='cv-core')!;
    expect(core.goalIds.sort()).toEqual(['company','research']);
    expect(core.due).toBe(Date.parse('2026-10-20T17:00:00Z'));
    expect(p.allocations.filter(x=>x.taskId==='cv-core').reduce((n,x)=>n+x.hours,0)).toBeCloseTo(2);
    expect(p.weeks.every(w=>w.used<=w.capacity+1e-7)).toBe(true);
  });
  it('uses zero exam-week capacity and an honest empty next action',()=>{
    const p=buildPlan([goal('a','Research',[cv,submit],'2026-10-18T17:00:00Z')],profile,null,null,{...a,examWeeks:['2026-10-12']},{},now);
    expect(p.allocations.some(x=>x.week==='2026-10-12')).toBe(false);
    expect(p.weeks[0].capacity).toBe(0);expect(p.next).toBeNull();expect(p.risk.length).toBeGreaterThan(0);
  });
  it('reports overflow instead of overbooking when hours shrink',()=>{
    const p=buildPlan([goal('a','Research',[cv,submit],'2026-10-20T17:00:00Z')],profile,null,null,{...a,hoursPerWeek:0.2},{},now);
    expect(p.risk.some(r=>r.remainingHours>0)).toBe(true);
    expect(p.weeks.every(w=>w.used<=w.capacity+1e-7)).toBe(true);
  });
  it('prorates the current day/week and never allocates after a mid-week UTC cutoff',()=>{
    const cutoff='2026-10-14T18:00:00Z';
    const p=buildPlan([goal('a','Research',[cv,submit],cutoff)],profile,null,null,a,{},now);
    expect(p.allocations.every(x=>x.end<=Date.parse(cutoff))).toBe(true);
    expect(p.allocations.reduce((n,x)=>n+x.hours,0)).toBeCloseTo(0.5);
    expect(p.risk.length).toBeGreaterThan(0);
  });
  it('cannot compress external letter waiting into study hours',()=>{
    const letter=fact('document','Recommendation letter','A recommendation letter is mandatory.');
    const p=buildPlan([goal('a','Research',[letter,submit],'2026-10-20T17:00:00Z')],profile,null,null,a,{},now);
    expect(p.tasks.find(t=>t.id.startsWith('letter-received-a-'))!.waitDays).toBe(14);
    expect(p.risk.some(r=>r.reason.includes('waiting'))).toBe(true);
  });
  it('closed and confirmed-ineligible cycles have no active submission allocations',()=>{
    const closed=goal('closed','Research',[cv,submit],'2026-10-10T17:00:00Z');
    const invalid=goal('invalid','Company',[cv,submit]);invalid.listing.facts.push({...year,rule:{...year.rule,number:4}});
    const p=buildPlan([closed,invalid],profile,null,null,a,{},now);
    expect(p.goalStates.closed.cycle).toBe('closed');
    expect(p.goalStates.invalid.eligibility).toBe('failsCriteria');
    expect(p.tasks.some(t=>t.id==='submit-closed'||t.id==='submit-invalid')).toBe(false);
  });
  it('removes closed tags and recalculates the shared task deadline',()=>{
    const early=goal('early','Research',[cv,submit],'2026-10-13T17:00:00Z'),later=goal('later','Company',[cv,submit]);
    const p=buildPlan([early,later],profile,null,null,a,{},now),core=p.tasks.find(t=>t.id==='cv-core')!;
    expect(core.goalIds).toEqual(['later']);expect(core.due).toBe(Date.parse('2026-11-02T17:00:00Z'));
  });
  it('a missed personal target is overdue, not an official closure',()=>{
    const g=goal('rolling','Research',[cv,submit]);g.listing.facts=g.listing.facts.filter(f=>f.kind!=='deadline');
    const p=buildPlan([g],profile,null,null,{...a,personalTargets:{rolling:'2026-10-13'}},{},now);
    expect(p.goalStates.rolling.overdue).toBe(true);expect(p.goalStates.rolling.cycle).not.toBe('closed');
  });
  it('completion removes remaining effort; reopen restores it without duplicating tasks',()=>{
    const g=goal('a','Research',[cv,submit]),done={'cv-core':{at:new Date(now).toISOString(),hours:2}};
    const completed=buildPlan([g],profile,null,null,a,done,now),reopened=buildPlan([g],profile,null,null,a,{},now);
    expect(completed.allocations.some(x=>x.taskId==='cv-core')).toBe(false);
    expect(reopened.allocations.filter(x=>x.taskId==='cv-core').reduce((n,x)=>n+x.hours,0)).toBeCloseTo(2);
    expect(completed.weeks[0].used+completed.weeks[0].completed).toBeLessThanOrEqual(a.hoursPerWeek+1e-7);
  });
  it('keeps incompatible essays distinct rather than merging all preparation',()=>{
    const statement=fact('document','Motivation statement','A distinct motivation statement is required.');
    const p=buildPlan([goal('a','Research',[statement,submit]),goal('b','Company',[statement,submit])],profile,null,null,a,{},now);
    expect(p.tasks.filter(t=>t.id.startsWith('statement-')).length).toBe(2);
  });
  it('uses conservative date-only planning without inventing a time or premature closure',()=>{
    const g=goal('a');g.listing.facts=g.listing.facts.filter(f=>f.kind!=='deadline');
    g.listing.facts.push({...fact('deadline','20 October 2026','Applications close on 20 October 2026.'),due:{kind:'dateOnly',at:'2026-10-20',timezone:null}});
    const d=deadline(g,a,Date.parse('2026-10-20T15:00:00Z'));
    expect(d.closed).toBe(false);expect(d.due).toBe(Date.parse('2026-10-19T10:00:00Z'));
    expect(deadline(g,a,Date.parse('2026-10-21T13:00:00Z')).closed).toBe(true);
  });
  it('calendar weeks and midnight conversion respect DST and student timezone',()=>{
    expect(weekOf('2026-10-15')).toBe('2026-10-12');
    expect(new Date(localMidnight('2026-10-15','Asia/Kolkata')).toISOString()).toBe('2026-10-14T18:30:00.000Z');
    expect(localMidnight('2026-03-30','Europe/Berlin')-localMidnight('2026-03-23','Europe/Berlin')).toBe(167*3600000);
  });
  it('changed document constraints do not inherit incompatible completion',()=>{
    const g=goal('a','Research',[cv,submit]),old=buildPlan([g],profile,null,null,a,{},now);
    const task=old.tasks.find(t=>t.id.startsWith('cv-format-'))!;
    g.listing.facts=g.listing.facts.map(f=>f===cv?{...f,quote:'A one-page PDF CV is required.'}:f);
    const next=buildPlan([g],profile,null,null,a,{[task.id]:{at:new Date(now).toISOString(),hours:0.5}},now);
    expect(next.tasks.find(t=>t.id.startsWith('cv-format-'))!.id).not.toBe(task.id);
    expect(next.allocations.some(x=>x.taskId.startsWith('cv-format-'))).toBe(true);
  });
  it('foundation Ready cannot substitute for practical skill evidence',()=>{
    const g=goal('a','Research',[fact('skill','Python','Python programming proficiency is required.'),submit]),pack=buildQuestions([g],'pack');
    const assessment={packId:pack.id,packVersion:pack.version,assessedAt:new Date(now).toISOString(),items:pack.questions.flatMap(q=>q.rubrics.map(r=>({
      questionId:q.id,rubricId:r.id,status:'met' as const,reason:'Fixture evidence',excerpt:'Fixture answer',
    })))};
    const p=buildPlan([g],profile,pack,assessment,a,{},now);
    expect(p.tasks.some(t=>t.id.startsWith('skill-evidence-'))).toBe(true);
  });
});
