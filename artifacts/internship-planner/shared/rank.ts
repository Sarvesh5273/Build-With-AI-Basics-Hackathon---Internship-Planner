import type { Listing, Preferences, RankedListing } from './schemas';
export const normalize = (value:string) => value.toLowerCase().replace(/\s+/g,' ').trim();
const aliases:Record<string,string[]>={
  'machine learning':['ml','deep learning','ai/ml','ml/ai'],'artificial intelligence':['ai','ai/ml','ml/ai'],'ai':['artificial intelligence','machine learning'],
  'ml':['machine learning'],'computer vision':['cv','image processing','vision'],'natural language processing':['nlp','language model','llm'],
  'nlp':['natural language processing','language model'],'data science':['data scientist','analytics'],'software engineering':['software engineer','software developer','swe'],
  'robotics':['robot','autonomous'],
};
const words=(v:string)=>` ${normalize(v).replace(/[^\p{L}\p{N}/+#]+/gu,' ')} `;
/** null when no topics were given; otherwise whether title, identity quote or topic/skill facts mention one. */
export function topicMatch(listing:Listing,p:Preferences):boolean|null{
  if(!p.topics.length)return null;
  const haystack=words([listing.title,listing.identityQuote,...listing.facts.filter(f=>f.kind==='topic'||f.kind==='skill').map(f=>f.value)].join(' '));
  return p.topics.some(topic=>{const t=normalize(topic);return [t,...(aliases[t]??[])].some(term=>haystack.includes(words(term)));});
}
export function rank(listing:Listing,p:Preferences): RankedListing {
  let earned=0,total=0; const reasons:string[]=[];
  const values=(kind:string)=>listing.facts.filter(f=>f.kind===kind).map(f=>normalize(f.value));
  const match=(words:string[],facts:string[])=>words.some(w=>facts.some(f=>f.includes(normalize(w))));
  const add=(weight:number,active:boolean,met:boolean,label:string,known:boolean)=>{
    if(!active)return; total+=weight; if(met)earned+=weight;
    reasons.push(`${label}: ${met?'matches':known?'does not match':'unknown — no positive credit'}`);
  };
  // Title and the quoted identity sentence are evidence too; a "Machine Learning Intern" matches "machine learning".
  const described=[normalize(listing.title),normalize(listing.identityQuote)];
  add(35,p.topics.length>0,topicMatch(listing,p)===true,'Topics',true);
  const locationMatch=(!p.locations.length||match(p.locations,values('location').concat(described)))&&(p.remote==='any'||values('remote').includes(p.remote));
  add(20,p.locations.length>0||p.remote!=='any',locationMatch,'Location / remote',values('location').length>0||locationMatch);
  add(20,p.funding==='fullyFunded',values('funding').includes('fullyfunded'),'Funding focus',values('funding').length>0);
  add(15,p.needsVisa,values('visa').includes('supported'),'Visa support',values('visa').length>0);
  add(10,p.include.length>0,match(p.include,[normalize(listing.title),...listing.facts.map(f=>normalize(f.value))]),'Included keywords',true);
  const excluded=!p.tracks.includes(listing.track)||match(p.exclude,[normalize(listing.title+' '+listing.organization),...listing.facts.map(f=>normalize(f.value))])||(p.needsVisa&&values('visa').includes('unsupported'));
  if(excluded)reasons.push('Excluded by a stated preference or confirmed visa incompatibility.');
  if(total===0)reasons.push('No weighted preferences supplied; shown for exploration, not a positive fit claim.');
  return {...listing,score:excluded?0:total?Math.round(earned/total*100):0,reasons,excluded};
}
