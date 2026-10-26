import { z } from 'zod';
const text = (max = 120) => z.string().trim().max(max);
export const PreferencesSchema = z.strictObject({
  topics: z.array(text()).max(6), locations: z.array(text()).max(6),
  tracks: z.array(z.enum(['Research', 'Company'])).min(1).max(2),
  remote: z.enum(['any', 'remote', 'onsite']),
  funding: z.enum(['fullyFunded', 'any']),
  citizenship: text(60), needsVisa: z.boolean(),
  include: z.array(text(60)).max(6), exclude: z.array(text(60)).max(6),
  organizations: z.array(text()).max(6),
});
export type Preferences = z.infer<typeof PreferencesSchema>;
export const RuleSchema = z.strictObject({
  field: z.enum(['year', 'grade', 'nationality', 'branch', 'institute', 'degree', 'english', 'remainingSemesters', 'degreeDate', 'ageThreshold', 'other']),
  operator: z.enum(['min', 'max', 'oneOf', 'confirm']),
  number: z.number().finite().nullable(), scale: text(40).nullable(),
  values: z.array(text()).max(30),
});
export const FactSchema = z.strictObject({
  kind: z.enum(['topic', 'location', 'remote', 'funding', 'fundingBenefit', 'fundingExclusion', 'fee', 'visa', 'deadline', 'cycle', 'skill', 'document', 'external', 'submission', 'stage', 'eligibility', 'review']),
  value: text(1200), quote: z.string().min(8).max(1200), sourceId: text(80),
  rule: RuleSchema.nullable(),
  due: z.strictObject({
    kind: z.enum(['fixed', 'dateOnly', 'rolling', 'unknown']),
    at: text(80).nullable(), timezone: text(80).nullable(),
  }).nullable(),
});
export type Fact = z.infer<typeof FactSchema>;
export const DraftSchema = z.strictObject({
  organization: z.string().min(2).max(160), title: z.string().min(3).max(240),
  track: z.enum(['Research', 'Company']), identityQuote: z.string().min(8).max(1200),
  cycleKey: text(100), facts: z.array(FactSchema).max(32),
});
export const ExtractionSchema = z.strictObject({ opportunities: z.array(DraftSchema).max(3) });
export type Draft = z.infer<typeof DraftSchema>;
const httpsUrl=z.string().url().max(2000).refine(raw=>{try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}},'Only HTTPS source links are accepted');
export const SourceSchema = z.strictObject({
  id: text(80), url: httpsUrl, title: text(300),
  fetchedAt: z.string().datetime(), interpretedAt: z.string().datetime(),
  freshness: text(300), ownership: text(600),
  /** false = quoted text from a page not corroborated as the organization's own (aggregator, news, third party). */
  official: z.boolean().default(true),
});
export type Source = z.infer<typeof SourceSchema>;
export const ListingSchema = DraftSchema.extend({
  id: text(80), version: text(80), canonicalUrl: httpsUrl,
  sources: z.array(SourceSchema).max(8),
});
export type Listing = z.infer<typeof ListingSchema>;
export interface RankedListing extends Listing {
  score: number; reasons: string[]; excluded: boolean;
}
export interface SearchRun {
  id: string; status: 'queued' | 'searching' | 'reading' | 'interpreting' | 'complete' | 'partial' | 'failed' | 'cancelled';
  stage: string; coverage: { query: string; page: number }[];
  usage: { searches: number; fetchedUrls: number; modelCalls: number; agentRuns?: number; agentCostUsd?: number };
  listings: RankedListing[]; errors: string[]; sourceStatus: {url: string; state: string}[];
  continuation: string | null; startedAt: string;
}
export const defaultPreferences: Preferences = {
  topics: [], locations: [], tracks: ['Research', 'Company'], remote: 'any',
  funding: 'fullyFunded', citizenship: '', needsVisa: false, include: [], exclude: [], organizations: [],
};
