import { genreQuestions } from '../data/genre-questions';
const ids=new Set();
for(const q of genreQuestions){
  if(ids.has(q.id)||!q.scenario||!q.source.quote||new URL(q.source.url).protocol!=='https:')throw Error('Invalid genre question');
  ids.add(q.id);
}
if(genreQuestions.length<10||genreQuestions.length>12)throw Error('Taste test must have 10–12 reviewed scenarios.');
console.log(`Validated ${ids.size} source-grounded app-authored genre scenarios.`);
