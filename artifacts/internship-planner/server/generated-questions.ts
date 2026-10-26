import { z } from 'zod';
import type { PreparedGoal,QuestionPack,Question } from '../shared/planning';
import { skillAreas } from '../shared/question-bank';
import { hash } from './evidence';
import { groq } from './providers';
import { cachedExtraction,saveExtraction } from './store';
const Output=z.strictObject({
  canAssess:z.boolean(),reason:z.string().max(300),
  questions:z.array(z.strictObject({prompt:z.string().min(15).max(700),criteria:z.array(z.string().min(8).max(250)).length(2)})).max(2),
});
export async function supplementQuestions(pack:QuestionPack,goals:PreparedGoal[],signal:AbortSignal,runId:string){
  const candidates=goals.flatMap(g=>g.listing.facts.filter(f=>f.kind==='skill'&&!skillAreas(f.value+' '+f.quote).length)
    .map(f=>({g,f})));
  // One skill can add at most two conceptual questions; all other gaps stay visible.
  const candidate=candidates.find(({f})=>!/\b(clinical|surgery|patient care|licensed|safety-critical|spoken|physical|operate machinery)\b/i.test(f.value+' '+f.quote));
  if(!candidate)return pack;
  const {g,f}=candidate,key=hash(`concept-question-1|${f.value}|${f.quote}`);
  const cached=Output.safeParse(await cachedExtraction(key));
  const result=cached.success?cached.data:await groq('conceptual_skill_questions',Output,
    'Design at most two text-only conceptual foundation questions and two fixed rubric criteria per question for the supplied sourced skill. This is app-generated preparation, not an official interview or certification. Set canAssess false and explain if a text answer cannot be evaluated responsibly. Never claim to assess clinical care, licensure, safety-critical operation, physical performance or spoken fluency. No personal input. Rubrics must exist before answers, be concise, specific and defensible. No invented employer thresholds or admissions predictions.',
    {skill:f.value,officialQuote:f.quote},signal,{runId});
  signal.throwIfAborted();
  if(!cached.success)await saveExtraction(key,result);
  if(!result.canAssess||!result.questions.length){
    pack.uncovered[g.listing.id].push(`${f.value}: ${result.reason||'not responsibly assessed by a short text interview'}`);
    return pack;
  }
  const generated:Question[]=result.questions.map(q=>{
    const id=`generated-${hash(JSON.stringify({skill:f.value,...q}))}`;
    return {id,area:f.value.slice(0,100),prompt:q.prompt,version:hash(JSON.stringify(q)),
      rubrics:q.criteria.map((criterion,i)=>({id:`${id}-${i}`,criterion})),goalIds:[g.listing.id],
      sourceRefs:[{goalId:g.listing.id,sourceId:f.sourceId,quote:f.quote}],origin:'generated',
      scope:'App-generated conceptual foundations from this sourced skill; no certification of specialist or practical competence.'};
  });
  const replace=pack.questions.filter(q=>!q.sourceRefs.length);
  const keep=pack.questions.filter(q=>q.sourceRefs.length).slice(0,8-generated.length);
  while(keep.length<6-generated.length&&replace.length)keep.push(replace.shift()!);
  const questions=[...keep,...generated];
  // If a bounded supplement displaces reviewed coverage, disclose it.
  for(const q of pack.questions)if(!questions.some(n=>n.id===q.id))
    for(const goalId of q.goalIds)pack.uncovered[goalId].push(`${q.area}: displaced by the bounded conceptual supplement; not assessed in this pack.`);
  pack.questions=questions;
  pack.version=hash(JSON.stringify(questions.map(q=>({id:q.id,version:q.version,rubrics:q.rubrics}))));
  return pack;
}
