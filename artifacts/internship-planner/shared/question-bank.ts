import type { PreparedGoal,Question,QuestionPack,Assessment } from './planning';
import { normalized } from './eligibility';
type BankRow={area:string;prompt:string;criteria:[string,string]};
// Reviewed foundational questions, not employer interview questions or mastery tests.
const bank:BankRow[]=[
  {area:'Software foundations',prompt:'A program must look up a student by a unique ID thousands of times. Compare an unsorted list and a hash map, including one trade-off.',criteria:['Explains linear list scanning versus expected constant-time hash lookup.','Mentions memory, collisions, ordering or worst-case behavior as a trade-off.']},
  {area:'Software foundations',prompt:'An API sometimes creates the same record twice after a retry. Explain a safe approach and how you would test it.',criteria:['Explains an idempotency key or a database uniqueness constraint.','Tests repeated/concurrent retries and verifies only one logical record exists.']},
  {area:'Data reasoning',prompt:'A dataset has 99% negative examples. A classifier always predicts negative and reports 99% accuracy. What is misleading, and what would you examine instead?',criteria:['Recognizes class imbalance and failure to detect positives.','Suggests positive-class recall/precision, a confusion matrix or suitable task-specific metrics.']},
  {area:'Data reasoning',prompt:'You clean and standardize a dataset before splitting it into train and test sets. What can go wrong, and how should you avoid it?',criteria:['Identifies leakage of test-set information into learned preprocessing.','Fits learned preprocessing on training data only and applies it unchanged to validation/test data.']},
  {area:'Research reasoning',prompt:'A treatment group improved after an intervention. Why is that not enough to claim the intervention caused the improvement? Describe a better comparison.',criteria:['Identifies confounding, baseline differences, time effects or selection bias.','Proposes a justified control/comparison and appropriate assignment or controls.']},
  {area:'Research reasoning',prompt:'An experiment did not support your hypothesis. What would you record and investigate before changing the hypothesis?',criteria:['Records methods, observations and deviations without hiding contrary evidence.','Checks measurement/controls/assumptions and proposes a discriminating follow-up rather than claiming proof.']},
  {area:'Quantitative reasoning',prompt:'Two groups average 80 and 60, with 10 and 30 participants respectively. What is the combined average? Explain why averaging the two averages is wrong.',criteria:['Computes the weighted mean as (80×10+60×30)/40 = 65.','Explains that unequal group sizes require weighting.']},
  {area:'Quantitative reasoning',prompt:'A measurement is 100 ± 5 units. What does the uncertainty communicate, and what extra information would you need before treating it as a confidence interval?',criteria:['Explains the measurement is uncertain rather than exact.','Asks how uncertainty was estimated and its coverage/confidence assumptions; does not invent a confidence level.']},
  {area:'Engineering reasoning',prompt:'A sensor fails intermittently only when a motor runs. Describe a systematic investigation before replacing components.',criteria:['Proposes reproducible measurements and considers power, noise, grounding, timing or coupling.','Changes one factor at a time and verifies an actual root cause rather than guessing.']},
  {area:'Engineering reasoning',prompt:'You can improve either reliability or throughput but not both within the budget. How would you decide and validate the choice?',criteria:['Defines requirements and consequences of failure rather than maximizing a metric blindly.','Compares evidence/trade-offs and proposes acceptance tests against the chosen requirements.']},
  {area:'Written communication',prompt:'A project is delayed because a dependency is unavailable. Write a short update to a teammate with the impact and next step. Do not include personal or confidential information.',criteria:['Clearly states the blocker and concrete effect without blaming or concealing uncertainty.','Gives a specific next step/owner or decision and a realistic update plan.']},
  {area:'Written communication',prompt:'Explain one technical idea you know to a new student in 3–5 sentences. State an important limitation of your explanation.',criteria:['Gives a coherent explanation with a concrete example or useful structure.','States a relevant limitation and avoids unsupported certainty.']},
];
const aliases:Record<string,RegExp>={
  'Software foundations':/\b(software|computing|computer science|programming|python|javascript|java|coding|algorithm|backend|frontend)\b/i,
  'Data reasoning':/\b(data|machine learning|statistics|statistical|analytics|bioinformatics)\b/i,
  'Research reasoning':/\b(research|science|biology|chemistry|physics|laboratory|experiment|scientific)\b/i,
  'Quantitative reasoning':/\b(math|mathematics|quantitative|economics|finance|statistic|data)\b/i,
  'Engineering reasoning':/\b(engineer|engineering|mechanical|electrical|electronics|embedded|robotic|hardware)\b/i,
  'Written communication':/\b(communication|writing|written|report|documentation)\b/i,
};
export function skillAreas(text:string){return Object.keys(aliases).filter(a=>aliases[a].test(normalized(text)));}
export function buildQuestions(goals:PreparedGoal[],id:string):QuestionPack{
  const coverage=new Map<string,{goalIds:Set<string>;refs:Question['sourceRefs']}>();
  const uncovered:QuestionPack['uncovered']={};
  for(const g of goals){
    uncovered[g.listing.id]=[];
    const needs=g.listing.facts.filter(f=>['skill','topic'].includes(f.kind));
    for(const f of needs){
      const mapped=skillAreas(f.value+' '+f.quote);
      if(f.kind==='skill'&&!mapped.length)uncovered[g.listing.id].push(`${f.value}: no reviewed responsible assessment in this short pack.`);
      if(f.kind==='skill'&&mapped.length)uncovered[g.listing.id].push(`${f.value}: only foundation reasoning is covered; specialist/practical proficiency is not certified.`);
      for(const area of mapped){
        const c=coverage.get(area)??{goalIds:new Set(),refs:[]};
        c.goalIds.add(g.listing.id);
        if(c.refs.length<30)c.refs.push({goalId:g.listing.id,sourceId:f.sourceId,quote:f.quote});
        coverage.set(area,c);
      }
    }
    if(!needs.length)uncovered[g.listing.id].push('Published skill requirements were not captured; general foundations do not establish programme readiness.');
    for(const f of g.listing.facts.filter(f=>f.kind==='eligibility'&&/\b(english|french|language)\b/i.test(f.quote)))
      uncovered[g.listing.id].push('Spoken language proficiency / formal language evidence is not assessed by this written interview.');
  }
  const needed=[...coverage.keys()];
  const base=needed.length?needed:['Research reasoning','Written communication'];
  const ordered=[...bank.filter((b,i)=>base.includes(b.area)&&bank.findIndex(x=>x.area===b.area)===i),...bank.filter((b,i)=>base.includes(b.area)&&bank.findIndex(x=>x.area===b.area)!==i)];
  for(const row of bank)if(ordered.length<6&&!ordered.includes(row))ordered.push(row);
  const selected=ordered.slice(0,8);
  const questions:Question[]=selected.map(row=>{
    const index=bank.indexOf(row),c=coverage.get(row.area),qid=`foundations-${index}`;
    return {id:qid,area:row.area,prompt:row.prompt,version:'reviewed-foundations-1',
      rubrics:row.criteria.map((criterion,i)=>({id:`${qid}-${i}`,criterion})),
      goalIds:c?[...c.goalIds]:[],sourceRefs:c?.refs??[],origin:'reviewed',
      scope:c?'App-authored foundations relevant to the quoted topic/skill, not an official employer question or complete skill test.':'General foundation coverage; not evidence of a published requirement.'};
  });
  for(const [area,c]of coverage)if(!questions.some(q=>q.area===area))
    for(const goalId of c.goalIds)uncovered[goalId].push(`${area}: not included in this bounded interview.`);
  return {id,version:'reviewed-foundations-1',createdAt:new Date().toISOString(),targets:goals.map(g=>({id:g.listing.id,version:g.listing.version})),questions,uncovered};
}
export function readiness(pack:QuestionPack,assessment:Assessment|null){
  return [...new Set(pack.questions.map(q=>q.area))].map(area=>{
    const qs=pack.questions.filter(q=>q.area===area);
    const rows=assessment?.packId===pack.id&&assessment.packVersion===pack.version?assessment.items.filter(i=>qs.some(q=>q.id===i.questionId)):[]; 
    const tested=rows.filter(r=>r.status!=='notAssessed');
    const score=tested.length?tested.reduce((n,r)=>n+(r.status==='met'?1:r.status==='partial'?0.5:0),0)/tested.length:null;
    return {area,status:score==null?'Not assessed':score>=0.75?'Ready':score>=0.25?'Partly':'Not yet',
      scope:'Evidence from a short foundations interview, not mastery or admission odds.',
      covered:tested.length,total:qs.reduce((n,q)=>n+q.rubrics.length,0)};
  });
}
