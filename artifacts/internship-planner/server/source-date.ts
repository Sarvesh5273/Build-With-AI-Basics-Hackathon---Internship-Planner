import type { Fact } from '../shared/schemas';
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const fullMonths=['january','february','march','april','may','june','july','august','september','october','november','december'];
const monthNumber=(name:string)=>{const lower=name.toLowerCase();if(lower==='sept')return 9;const index=months.indexOf(lower);return index>=0?index+1:fullMonths.indexOf(lower)+1;};
const hasTimezone=(quote:string,zone:string)=>new RegExp(`(?:^|[^\\w/+\\-−])${zone.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=$|[^\\w/+\\-−])`,'i').test(quote);
function quotedDates(quote:string){
  const dates=new Set<string>();
  const add=(y:number,m:number,d:number)=>{const at=new Date(Date.UTC(y,m-1,d));if(at.getUTCFullYear()===y&&at.getUTCMonth()===m-1&&at.getUTCDate()===d)dates.add(at.toISOString().slice(0,10));};
  for(const m of quote.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g))add(+m[1],+m[2],+m[3]);
  for(const m of quote.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)[,\s]+(\d{4})\b/gi)){const month=monthNumber(m[2]);if(month)add(+m[3],month,+m[1]);}
  for(const m of quote.matchAll(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})\b/gi)){const month=monthNumber(m[1]);if(month)add(+m[3],month,+m[2]);}
  return dates;
}
export function supportsDate(fact:Fact){
  const due=fact.due;if(!due)return true;
  if(due.kind==='unknown')return due.at===null&&due.timezone===null;
  if(due.kind==='rolling')return due.at===null&&due.timezone===null&&!quotedDates(fact.quote).size&&/\brolling\b|year[- ]round|throughout the year/i.test(fact.quote);
  if(!due.at)return false;
  if(due.kind==='dateOnly'){const dates=quotedDates(fact.quote);return dates.size===1&&/^\d{4}-\d{2}-\d{2}$/.test(due.at)&&dates.has(due.at)&&(!due.timezone||hasTimezone(fact.quote,due.timezone));}
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(due.at)||!due.timezone||!hasTimezone(fact.quote,due.timezone))return false;
  const instant=new Date(due.at);if(!Number.isFinite(instant.getTime()))return false;
  const offsets:Record<string,number>={UTC:0,GMT:0,CET:60,CEST:120,PST:-480,PDT:-420,EST:-300,EDT:-240,JST:540,HKT:480,SGT:480};
  let date:string,time:string;
  if(due.timezone.toUpperCase() in offsets){
    const local=new Date(instant.getTime()+offsets[due.timezone.toUpperCase()]*60000).toISOString();date=local.slice(0,10);time=local.slice(11,19);
  }else{
    // Ambiguous abbreviations such as IST/CST are deliberately not guessed.
    if(!due.timezone.includes('/'))return false;
    try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:due.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(instant);
      const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';date=`${get('year')}-${get('month')}-${get('day')}`;time=`${get('hour')}:${get('minute')}:${get('second')}`;
    }catch{return false;}
  }
  const times=[...fact.quote.matchAll(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b/gi)].map(m=>{
    let h=+m[1];if(m[4]){if(h<1||h>12)return '';h=h%12+(m[4].toLowerCase()==='pm'?12:0);}
    return h<24&&+m[2]<60&&+(m[3]??0)<60?`${String(h).padStart(2,'0')}:${m[2]}:${m[3]??'00'}`:'';
  });
  const dates=quotedDates(fact.quote),uniqueTimes=new Set(times.filter(Boolean));
  // A multi-event quote cannot prove which date belongs to which time.
  return dates.size===1&&uniqueTimes.size===1&&!instant.getUTCMilliseconds()&&dates.has(date)&&uniqueTimes.has(time);
}
