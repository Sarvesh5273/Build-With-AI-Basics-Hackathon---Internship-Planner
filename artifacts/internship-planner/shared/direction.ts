import { genreQuestions } from '../data/genre-questions';
export type Reaction = 'interested'|'notForMe'|'unclear';
export function direction(reactions: Record<string, Reaction>) {
  const proportion = (key:'genre'|'track') => {
    const groups = new Map<string,{total:number;interested:number}>();
    for(const q of genreQuestions) {
      const item=groups.get(q[key])??{total:0,interested:0};
      item.total++; if(reactions[q.id]==='interested')item.interested++;
      groups.set(q[key],item);
    }
    return [...groups].map(([name,v])=>({name,interest:v.interested/v.total})).filter(v=>v.interest>0).sort((a,b)=>b.interest-a.interest);
  };
  const tracks=proportion('track');
  return {topics:proportion('genre'),tracks:tracks.filter(t=>t.interest===tracks[0]?.interest).map(t=>t.name),
    explore:genreQuestions.filter(q=>reactions[q.id]==='unclear').map(q=>q.title),
    skills:[...new Set(genreQuestions.filter(q=>reactions[q.id]==='interested').map(q=>q.skill))]};
}
