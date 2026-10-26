import { describe, it, expect } from 'vitest';
import { rank, topicMatch } from '../shared/rank';
import { defaultPreferences, type Listing } from '../shared/schemas';

const listing=(title:string,identityQuote=`${title} for students.`):Listing=>({organization:'Org',title,track:'Company',identityQuote,cycleKey:'',facts:[],id:title,version:'v',canonicalUrl:'https://org.example/job',sources:[]});
const prefs={...defaultPreferences,topics:['machine learning','computer vision'],funding:'any' as const};

describe('topic relevance uses the title and identity quote, not only extracted topic facts',()=>{
  it('credits a title match even when the model extracted no topic fact',()=>{
    expect(topicMatch(listing('Machine Learning Intern 2027 (Toronto)'),prefs)).toBe(true);
    expect(rank(listing('Machine Learning Intern 2027 (Toronto)'),prefs).score).toBe(100);
  });
  it('recognises common abbreviations',()=>{
    expect(topicMatch(listing('AI/ML Engineer Intern'),prefs)).toBe(true);
    expect(topicMatch(listing('AI Research Intern (PhD) – 3D Computer Vision'),prefs)).toBe(true);
  });
  it('flags an unrelated role as off-topic with zero topic credit',()=>{
    const store=listing('Summer Store Management Internship 2027');
    expect(topicMatch(store,prefs)).toBe(false);
    expect(rank(store,prefs).score).toBe(0);
    expect(rank(store,prefs).reasons[0]).toBe('Topics: does not match');
  });
  it('does not match a topic inside another word',()=>{
    expect(topicMatch(listing('Retail Intern','Maintain displays.'),{...prefs,topics:['ai']})).toBe(false);
  });
  it('returns null when no topics were given',()=>expect(topicMatch(listing('Anything'),{...prefs,topics:[]})).toBeNull());
});
