import type { Fact } from './schemas';
import type { Profile,PreparedGoal,EligibilityResult,CriterionResult } from './planning';
export const normalized=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const criterionKey=(goalId:string,index:number,version='')=>`${goalId}:${index}:${version.slice(0,16)}`;
function scale(s:string){
  if(s.trim()==='%')return '100';
  const n=normalized(s);
  if(['percent','percentage','100','100 point'].includes(n))return '100';
  if(/^\d+(?:\.\d+)?$/.test(s.trim()))return String(Number(s));
  return '';
}
function country(s:string){
  const key=normalized(s),aliases:Record<string,string>={indian:'india',canadian:'canada',french:'france',german:'germany',swiss:'switzerland',japanese:'japan',british:'united kingdom',uk:'united kingdom',usa:'united states',us:'united states',american:'united states',australian:'australia',chinese:'china',singaporean:'singapore',brazilian:'brazil',spanish:'spain',dutch:'netherlands',italian:'italy',korean:'south korea'};
  const value=aliases[key]??key;
  return ['india','canada','france','germany','switzerland','japan','united kingdom','united states','australia','china','singapore','brazil','spain','netherlands','italy','south korea'].includes(value)?value:null;
}
function inspect(f:Fact,p:Profile,key:string):Omit<CriterionResult,'key'|'factIndex'>{
  const r=f.rule,unknown=(reason:string,needsFollowup=true)=>({status:'unknown' as const,reason,needsFollowup});
  if(!r||r.field==='other')return unknown('The quoted condition needs manual source review; it was not converted to a supported rule.');
  // Relative future conditions cannot be resolved from today's academic details.
  if(/\b(at (?:the )?start|during (?:the )?(?:internship|placement)|by (?:the )?start|throughout)\b/i.test(f.quote)&&!['ageThreshold','english'].includes(r.field)){
    const response=p.confirmations[key];
    return response==null?unknown('Confirm this condition for the stated internship period, not just today.'):
      {status:response?'met':'failed',reason:'Self-reported confirmation for the source’s stated period.',needsFollowup:true};
  }
  if(r.operator==='confirm'||r.field==='ageThreshold'){
    const response=p.confirmations[key];
    return response==null?unknown('A source-specific confirmation is required.'):
      {status:response?'met':'failed',reason:'Based on your source-specific confirmation, not independent verification.',needsFollowup:true};
  }
  if(r.field==='english'){
    if(/\bfrench\b/i.test(f.quote)){
      const response=p.confirmations[key];
      return response==null?unknown('English/French alternatives need a source-specific confirmation.'):
        {status:response?'met':'failed',reason:'Your source-specific language confirmation, not a fluency test.',needsFollowup:true};
    }
    if(p.english==null)return unknown('Your English confirmation is missing.');
    return {status:p.english?'met':'failed',reason:'Based on your language self-report, not a fluency test.',needsFollowup:false};
  }
  const field={year:p.studyYear,grade:p.gradeValue,remainingSemesters:p.remainingSemesters,
    nationality:p.nationality,branch:p.branch,institute:p.institute,degree:p.degree,degreeDate:p.degreeDate}[r.field];
  if(field==null||field==='')return unknown('The academic detail needed for this condition is missing.',false);
  if(r.field==='grade'&&(!r.scale||!p.gradeScale||!scale(r.scale)||!scale(p.gradeScale)||scale(r.scale)!==scale(p.gradeScale)))
    return unknown('The source and your grade use different or unstated scales. No CGPA-to-percentage conversion was made.',false);
  let met:boolean|undefined;
  if(r.operator==='oneOf'&&typeof field==='string'&&r.values.length){
    if(r.field==='nationality'){
      const mine=country(field),allowed=r.values.map(country);
      if(mine&&allowed.every(Boolean))met=allowed.includes(mine);
      else if(r.values.some(value=>normalized(value)===normalized(field)))met=true;
      else{
        const response=p.confirmations[key];
        return response==null?unknown('Nationality wording/membership cannot be resolved safely; check the linked condition.'):
          {status:response?'met':'failed',reason:'Your confirmation of the quoted citizenship/membership condition.',needsFollowup:true};
      }
    }else met=r.values.some(value=>normalized(value)===normalized(field));
  }
  if(['min','max'].includes(r.operator)&&typeof field==='number'&&r.number!==null)
    met=r.operator==='min'?field>=r.number:field<=r.number;
  if(r.field==='degreeDate'&&typeof field==='string'&&r.values.length===1&&/^\d{4}-\d{2}-\d{2}$/.test(r.values[0]))
    met=r.operator==='min'?field>=r.values[0]:r.operator==='max'?field<=r.values[0]:undefined;
  if(met===undefined)return unknown('The extracted comparison cannot be checked safely.');
  if(!met&&r.operator==='oneOf'&&r.field!=='nationality'){
    const response=p.confirmations[key];
    return response==null?unknown('Your wording does not exactly match the sourced list; confirm equivalence rather than assuming a rejection.'):
      {status:response?'met':'failed',reason:'Based on your confirmation against the quoted list.',needsFollowup:true};
  }
  return {status:met?'met':'failed',reason:met?'Your stated detail meets this extracted comparison.':'Your stated detail fails this mandatory sourced comparison.',needsFollowup:false};
}
export function eligibility(goal:PreparedGoal,p:Profile):EligibilityResult{
  const criteria:CriterionResult[]=goal.listing.facts.flatMap((f,factIndex)=>f.kind==='eligibility'?[{
    key:criterionKey(goal.listing.id,factIndex,goal.listing.version),factIndex,...inspect(f,p,criterionKey(goal.listing.id,factIndex,goal.listing.version)),
  }]:[]);
  const gaps=[...goal.gaps];
  if(!criteria.length)gaps.push('No supported mandatory eligibility criteria were captured. Absence of evidence is not eligibility.');
  const status=criteria.some(c=>c.status==='failed')?'failsCriteria':
    criteria.length&&criteria.every(c=>c.status==='met')&&!gaps.length?'meetsExtractedCriteria':'needsConfirmation';
  return {status,criteria,gaps};
}
