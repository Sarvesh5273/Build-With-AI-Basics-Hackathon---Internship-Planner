import type { Preferences } from '../shared/schemas';

export interface QueryTask {
  query: string;
  intent: 'organization' | 'posting' | 'programme' | 'careers';
  purpose: string;
  organization?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
}
export const ATS_DOMAINS = ['boards.greenhouse.io','job-boards.greenhouse.io','jobs.lever.co','jobs.eu.lever.co','jobs.ashbyhq.com','myworkdayjobs.com','careers.smartrecruiters.com','apply.workable.com'];
const exclusions = ['linkedin.com','indeed.com','glassdoor.com','internshala.com','opportunitydesk.org'];
const join = (...parts:string[]) => parts.filter(Boolean).join(' ').replace(/\s+/g,' ').trim();

// Interleave research and company searches so one track cannot consume the
// entire primary plan. Named organizations are priorities, never a whitelist.
export function queryPlan(p:Preferences):QueryTask[] {
  const topics=p.topics.length?p.topics:['engineering'];
  const places=p.locations.length?p.locations:['international'];
  const modifiers=join(p.remote==='remote'?'remote':'',p.include.join(' '));
  const tasks:QueryTask[]=p.organizations.map(organization=>({
    query:join(organization,topics[0],'student internship official careers research funding',modifiers),
    intent:'organization',organization,excludeDomains:exclusions,
    purpose:'Find this organization’s official internship programmes, career surface or public job board.',
  }));
  for(let i=0;i<Math.max(topics.length,places.length);i++){
    const topic=topics[i%topics.length],place=places[i%places.length];
    if(p.tracks.includes('Company'))tasks.push({
      query:join(topic,'intern',place,modifiers),intent:'posting',includeDomains:ATS_DOMAINS,
      purpose:'Find individual student internship postings or public employer ATS boards, not experienced jobs.',
    });
    if(p.tracks.includes('Research'))tasks.push({
      query:join(topic,'undergraduate research internship',place,p.funding==='fullyFunded'?'fully funded stipend':'',modifiers),
      intent:'programme',excludeDomains:exclusions,
      purpose:'Find official university, laboratory and institution programmes with eligibility, funding and application details.',
    });
    if(p.tracks.includes('Company'))tasks.push({
      query:join(topic,'student internship official careers apply',place,modifiers),intent:'careers',excludeDomains:exclusions,
      purpose:'Find official employer careers pages and discover their linked internship postings.',
    });
    if(p.tracks.includes('Research'))tasks.push({
      query:join(topic,'summer studentship programme official eligibility apply',place,modifiers),intent:'programme',excludeDomains:exclusions,
      purpose:'Find official programme indexes and application or eligibility pages, including rolling opportunities.',
    });
  }
  // Broader combinations remain genuinely searchable on continuation.
  for(const topic of topics)for(const place of places)for(const track of p.tracks)tasks.push({
    query:join(topic,track==='Research'?'research internship official programme funding':'student internship official careers',place,modifiers),
    intent:track==='Research'?'programme':'careers',excludeDomains:exclusions,
    purpose:'Explore another requested topic/location combination using official sources.',
  });
  const seen=new Set<string>();
  return tasks.filter(t=>{const key=t.query.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});
}
