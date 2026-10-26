import { z } from 'zod';
import { ProfileDraftSchema,emptyProfile,PreparedGoalSchema,QuestionPackSchema,AssessmentSchema,AvailabilitySchema,CompletionSchema } from '../../shared/planning';
export const PlanningStateSchema=z.object({
  profile:ProfileDraftSchema.default(emptyProfile),
  goals:z.array(PreparedGoalSchema).max(200).default([]),
  preparationId:z.string().uuid().nullable().default(null),
  pack:QuestionPackSchema.nullable().default(null),
  questionIndex:z.number().int().min(0).max(8).default(0),
  answers:z.record(z.string().max(80),z.string().max(1500)).default({}),
  assessmentId:z.string().uuid().nullable().default(null),
  assessmentAnswers:z.record(z.string().max(80),z.string().max(1500)).default({}),
  assessment:AssessmentSchema.nullable().default(null),
  availability:AvailabilitySchema.nullable().default(null),
  completed:CompletionSchema.default({}),generated:z.boolean().default(false),
  track:z.enum(['Research','Company']).default('Research'),
});
export type PlanningState=z.infer<typeof PlanningStateSchema>;
export const initialPlanning=PlanningStateSchema.parse({});
