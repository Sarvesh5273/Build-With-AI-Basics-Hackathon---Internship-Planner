import { z } from 'zod';
import { ListingSchema } from './schemas';
const short=(n=160)=>z.string().trim().max(n);
export const dateKey=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{
  const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;
},'Enter a valid calendar date');
export const ProfileSchema=z.strictObject({
  nationality:short(60),studyYear:z.number().int().min(1).max(12).nullable(),
  gradeValue:z.number().min(0).max(1000).nullable(),gradeScale:short(40),
  branch:short(),institute:short(),degree:short(80),degreeDate:dateKey.nullable(),
  remainingSemesters:z.number().int().min(0).max(30).nullable(),english:z.boolean().nullable(),
  confirmations:z.record(short(80),z.boolean().nullable()),
}).superRefine((p,ctx)=>{
  const numeric=p.gradeScale.trim()==='%'?100:Number(p.gradeScale.trim());
  if(p.gradeValue!==null&&p.gradeScale.trim()&&Number.isFinite(numeric)&&numeric>0&&p.gradeValue>numeric)
    ctx.addIssue({code:'custom',path:['gradeValue'],message:'The grade cannot exceed its stated numeric scale.'});
});
export type Profile=z.infer<typeof ProfileSchema>;
export const emptyProfile:Profile={nationality:'',studyYear:null,gradeValue:null,gradeScale:'',branch:'',institute:'',degree:'',degreeDate:null,remainingSemesters:null,english:null,confirmations:{}};
export const AvailabilitySchema=z.strictObject({
  hoursPerWeek:z.number().min(0).max(60),examWeeks:z.array(dateKey.refine(s=>new Date(s+'T00:00:00Z').getUTCDay()===1,'Choose the Monday of the exam week')).max(52),
  bufferDays:z.number().int().min(0).max(30),personalTargets:z.record(short(80),dateKey),
  timezone:short(100).refine(t=>{try{new Intl.DateTimeFormat('en',{timeZone:t});return true;}catch{return false;}},'Choose a supported timezone'),
});
export type Availability=z.infer<typeof AvailabilitySchema>;
export const PreparedGoalSchema=z.strictObject({
  listing:ListingSchema,preparedAt:z.string().datetime(),
  gaps:z.array(short(500)).max(30),sourceStatus:z.array(short(500)).max(30),
});
export type PreparedGoal=z.infer<typeof PreparedGoalSchema>;
export const QuestionSchema=z.strictObject({
  id:short(80),area:short(100),prompt:short(1000),version:short(80),
  rubrics:z.array(z.strictObject({id:short(80),criterion:short(500)})).min(1).max(3),
  goalIds:z.array(short(80)).max(200),sourceRefs:z.array(z.strictObject({goalId:short(80),sourceId:short(80),quote:short(1200)})).max(30),
  origin:z.enum(['reviewed','generated']),scope:short(500),
});
export type Question=z.infer<typeof QuestionSchema>;
export const QuestionPackSchema=z.strictObject({
  id:short(80),version:short(80),createdAt:z.string().datetime(),
  targets:z.array(z.strictObject({id:short(80),version:short(80)})).max(200),
  questions:z.array(QuestionSchema).min(6).max(8),uncovered:z.record(short(80),z.array(short(300)).max(40)),
});
export type QuestionPack=z.infer<typeof QuestionPackSchema>;
export const AssessmentSchema=z.strictObject({
  packId:short(80),packVersion:short(80),assessedAt:z.string().datetime(),
  items:z.array(z.strictObject({
    questionId:short(80),rubricId:short(80),status:z.enum(['met','partial','missing','notAssessed']),
    reason:short(300),excerpt:short(500),
  })).max(24),
});
export type Assessment=z.infer<typeof AssessmentSchema>;
export const CompletionSchema=z.record(short(150),z.strictObject({
  at:z.string().datetime(),hours:z.number().min(0).max(100),label:short(600).optional(),goalIds:z.array(short(80)).max(200).optional(),
})).refine(c=>Object.keys(c).length<=2000,'The bounded progress history is full');
export type Completions=z.infer<typeof CompletionSchema>;
export interface PreparationRun {
  id:string;status:'running'|'complete'|'partial'|'cancelled';stage:string;startedAt:string;
  goals:PreparedGoal[];pack:QuestionPack|null;pending:{id:string;version:string}[];errors:string[];
}
export interface AssessmentRun {
  id:string;status:'running'|'complete'|'failed';startedAt:string;result:Assessment|null;error:string|null;
}
export type EligibilityStatus='meetsExtractedCriteria'|'failsCriteria'|'needsConfirmation';
export interface CriterionResult {key:string;factIndex:number;status:'met'|'failed'|'unknown';reason:string;needsFollowup:boolean;}
export interface EligibilityResult {status:EligibilityStatus;criteria:CriterionResult[];gaps:string[];}
export interface PlannedTask {
  id:string;label:string;hours:number;goalIds:string[];sourceRefs:{goalId:string;sourceId:string;quote:string}[];
  guidance:string;dependencies:string[];waitDays:number;kind:'work'|'external'|'review';
  due:number;dueLabel:string;officialConstraint:boolean;
}
export interface Allocation {taskId:string;week:string;hours:number;start:number;end:number;}
export interface Plan {
  tasks:PlannedTask[];allocations:Allocation[];weeks:{week:string;capacity:number;used:number;exam:boolean;completed:number}[];
  risk:{taskId:string;goalIds:string[];reason:string;remainingHours:number}[];
  goalStates:Record<string,{cycle:'closed'|'active'|'unknown';eligibility:EligibilityStatus;overdue:boolean}>;
  next:PlannedTask|null;conditionalStages:{goalId:string;sourceId:string;quote:string;label:string;date:string|null}[];
}
