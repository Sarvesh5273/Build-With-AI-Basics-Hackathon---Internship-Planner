import type { PreparedGoal,Profile,Availability,Completions,QuestionPack,Assessment,Plan,PlannedTask,Allocation } from './planning';
import { eligibility } from './eligibility';
import { readiness,skillAreas } from './question-bank';
const DAY=86400000,EPS=1e-7;
export function localDay(at:number,timezone:string){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);
  const get=(name:string)=>parts.find(p=>p.type===name)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function plusDays(day:string,count:number){return new Date(Date.parse(day+'T00:00:00Z')+count*DAY).toISOString().slice(0,10);}
export function weekOf(day:string){const n=new Date(day+'T00:00:00Z').getUTCDay();return plusDays(day,-((n+6)%7));}
export function localMidnight(day:string,timezone:string){
  const wanted=Date.parse(day+'T00:00:00Z');let at=wanted;
  for(let i=0;i<3;i++){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(at);
    const get=(s:string)=>Number(parts.find(p=>p.type===s)!.value);
    const represented=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'),get('second'));
    at-=represented-wanted;
  }
  return at;
}
export function deadline(goal:PreparedGoal,a:Availability,now:number){
  const facts=goal.listing.facts.filter(f=>f.kind==='deadline'&&f.due);
  const fixed=facts.filter(f=>f.due?.kind==='fixed'&&f.due.at).map(f=>Date.parse(f.due!.at!)).filter(Number.isFinite);
  const dates=facts.filter(f=>f.due?.kind==='dateOnly'&&f.due.at&&/^\d{4}-\d{2}-\d{2}$/.test(f.due.at)).map(f=>Date.parse(f.due!.at!+'T00:00:00Z'));
  // Earliest possible start of a date in UTC+14 is conservative; latest end in UTC-12
  // is used only to assert expiry. Neither is claimed to be the official time.
  const cutoffs=[...fixed,...dates.map(d=>d-14*3600000)];
  const closed=goal.listing.facts.some(f=>f.kind==='cycle'&&f.value==='closed')||
    fixed.some(d=>d<=now)||dates.some(d=>d+36*3600000<=now);
  const official=cutoffs.length?Math.min(...cutoffs):null;
  const personalDay=a.personalTargets[goal.listing.id];
  const personal=personalDay?localMidnight(plusDays(personalDay,1),a.timezone):null;
  const due=official===null?(personal??localMidnight(plusDays(localDay(now,a.timezone),42),a.timezone)):
    Math.min(official-a.bufferDays*DAY,personal??Infinity);
  const dateOnly=official!==null&&dates.some(d=>d-14*3600000===official);
  return {closed,official,personal,due,dateOnly,dateKey:dateOnly?new Date(Math.min(...dates)).toISOString().slice(0,10):null,label:official===null?'Personal preparation/application target — not an official deadline':
    dateOnly?'Conservative date-only preparation cutoff; official time/timezone unknown':'Before quoted official cutoff, with personal buffer'};
}
function taskPatterns(goals:PreparedGoal[],p:Profile,pack:QuestionPack|null,assessment:Assessment|null,a:Availability,c:Completions,now:number){
  const compatible=(text:string)=>{
    let x=2166136261,y=5381;
    for(const ch of text.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim()){
      x=Math.imul(x^ch.charCodeAt(0),16777619);y=Math.imul(y,33)^ch.charCodeAt(0);
    }
    return (x>>>0).toString(16)+(y>>>0).toString(16);
  };
  const map=new Map<string,PlannedTask>(),states:Plan['goalStates']={},conditional:Plan['conditionalStages']=[];
  const levels=pack?readiness(pack,assessment):[];
  const add=(id:string,label:string,hours:number,g:PreparedGoal,d:ReturnType<typeof deadline>,quote:string,sourceId:string,dependencies:string[]=[],waitDays=0,kind:PlannedTask['kind']='work',officialConstraint=true)=>{
    const old=map.get(id),ref={goalId:g.listing.id,sourceId,quote};
    if(old){
      if(!old.goalIds.includes(g.listing.id))old.goalIds.push(g.listing.id);
      if(!old.sourceRefs.some(r=>r.goalId===ref.goalId&&r.quote===ref.quote))old.sourceRefs.push(ref);
      if(d.due<old.due){old.due=d.due;old.dueLabel=d.label;}
      old.hours=Math.max(old.hours,hours);return id;
    }
    map.set(id,{id,label,hours,goalIds:[g.listing.id],sourceRefs:quote?[ref]:[],dependencies,waitDays,kind,due:d.due,dueLabel:d.label,
      officialConstraint,guidance:'App preparation guidance and conservative effort estimate, not official wording or a guarantee.'});return id;
  };
  for(const g of goals){
    const goalId=g.listing.id,check=eligibility(g,p),d=deadline(g,a,now);
    const id=goalId;
    states[id]={cycle:d.closed?'closed':d.official===null?'unknown':'active',eligibility:check.status,overdue:!d.closed&&d.personal!==null&&d.personal<now};
    const active=!d.closed&&check.status!=='failsCriteria';
    const personal={...d,due:d.closed||check.status==='failsCriteria'?localMidnight(plusDays(localDay(now,a.timezone),42),a.timezone):d.due,
      label:d.closed?'General preparation; no invented next official cycle':d.label};
    if(check.status==='needsConfirmation'){
      const f=g.listing.facts.find(f=>f.kind==='eligibility');
      add(`review-${id}`,'Review unresolved eligibility and linked conditions',0.5,g,personal,f?.quote??'',f?.sourceId??'',[],0,'review',false);
    }
    const appDeps:string[]=[];
    for(let i=0;i<g.listing.facts.length;i++){
      const f=g.listing.facts[i],text=f.value+' '+f.quote;
      const specific=`${id}-${compatible(f.kind+'|'+f.quote)}`;
      if(f.kind==='stage'){
        conditional.push({goalId:id,sourceId:f.sourceId,quote:f.quote,label:f.value,date:f.due?.at??null});
        if(active||(d.closed&&c[`submit-${id}`]&&f.due?.at)){
          const at=f.due?.kind==='fixed'&&f.due.at?Date.parse(f.due.at):
            f.due?.kind==='dateOnly'&&f.due.at?Date.parse(f.due.at+'T00:00:00Z')-14*3600000:null;
          const stageDue=at!==null&&Number.isFinite(at)?{...d,due:at-availabilityBuffer(a),label:'Preparation before the quoted selection-stage date'}:d;
          add(`stage-prep-${specific}`,`Prepare for sourced selection stage: ${f.value}`,2,g,stageDue,f.quote,f.sourceId,[],0,'work',true);
        }
      }
      if(f.kind==='skill'||f.kind==='topic'){
        if(f.kind==='skill'){
          const evidence=add(`skill-evidence-${compatible(f.value)}`,`Record an example and verify practical readiness for: ${f.value}`,1,g,personal,f.quote,f.sourceId,[],0,'review',false);
          if(active)appDeps.push(evidence);
        }
        const areas=skillAreas(text);
        for(const area of areas){
          if(levels.find(l=>l.area===area)?.status==='Ready')continue;
          const tid=add(`practice-${area.toLowerCase().replace(/[^a-z]+/g,'-')}`,
            `Practice ${area.toLowerCase()} and record a small example`,4,g,personal,f.quote,f.sourceId,[],0,'work',false);
          if(active&&f.kind==='skill')appDeps.push(tid);
        }
        if(f.kind==='skill'&&!areas.length){
          const tid=add(`skill-review-${specific}`,`Review preparation for: ${f.value}`,1,g,personal,f.quote,f.sourceId,[],0,'review',false);
          if(active)appDeps.push(tid);
        }
      }
      if(!active)continue;
      if(f.kind==='document'){
        if(/\b(cv|resume|résumé|curriculum vitae)\b/i.test(text)){
          const core=add('cv-core','Build or update reusable CV content',2,g,d,f.quote,f.sourceId);
          appDeps.push(add(`cv-format-${specific}`,'Check this programme’s CV language, format and limits',0.5,g,d,f.quote,f.sourceId,[core]));
        }else if(/\b(letter|letters)\b/i.test(text)&&/\b(recommend|reference|referee)\w*/i.test(text)){
          const request=add(`letter-request-${specific}`,'Request the required recommendation letter',1,g,d,f.quote,f.sourceId,[],0,'external');
          appDeps.push(add(`letter-received-${specific}`,'Check and confirm the required letter was received/submitted',0.25,g,d,f.quote,f.sourceId,[request],14,'external'));
        }else if(/\b(statement|essay|motivation|cover letter)\b/i.test(text)){
          appDeps.push(add(`statement-${specific}`,'Prepare this programme’s distinct statement/essay',4,g,d,f.quote,f.sourceId));
        }else if(/\b(transcript|academic record)\b/i.test(text)){
          appDeps.push(add(`transcript-${specific}`,'Obtain and check the required academic record',1,g,d,f.quote,f.sourceId,[],0,'external'));
        }else{
          appDeps.push(add(`document-${specific}`,`Review and obtain: ${f.value}`,1,g,d,f.quote,f.sourceId,[],0,'review'));
        }
      }
      if(f.kind==='external'){
        if(/\b(acceptance|approval|agreement)\b/i.test(text)&&/\b(professor|supervisor|faculty|host)\b/i.test(text)){
          const request=add(`host-request-${specific}`,'Seek the explicitly required host acceptance',1,g,d,f.quote,f.sourceId,[],0,'external');
          appDeps.push(add(`host-confirmed-${specific}`,'Check and confirm the required host acceptance',0.25,g,d,f.quote,f.sourceId,[request],14,'external'));
        }else appDeps.push(add(`external-${specific}`,`Confirm external requirement: ${f.value}`,0.5,g,d,f.quote,f.sourceId,[],0,'external'));
      }
      if(f.kind==='review')add(`source-review-${specific}`,`Review unsupported/optional source detail: ${f.value}`,0.5,g,d,f.quote,f.sourceId,[],0,'review',false);
    }
    const submission=g.listing.facts.find(f=>f.kind==='submission');
    if(active&&submission)add(`submit-${id}`,'Review requirements and complete this programme’s application',1,g,d,submission.quote,submission.sourceId,[...new Set(appDeps)],0,'external');
    if(active&&!submission)add(`application-review-${id}`,'Confirm the official application process before submitting',0.5,g,d,'','',[...new Set(appDeps)],0,'review',false);
  }
  return {tasks:[...map.values()],states,conditional};
}
export function buildPlan(goals:PreparedGoal[],profile:Profile,pack:QuestionPack|null,assessment:Assessment|null,availability:Availability,completed:Completions,now=Date.now()):Plan{
  const {tasks,states,conditional}=taskPatterns(goals,profile,pack,assessment,availability,completed,now);
  const first=weekOf(localDay(now,availability.timezone));
  const buckets=Array.from({length:26},(_,i)=>{
    const week=plusDays(first,i*7),start=localMidnight(week,availability.timezone),end=localMidnight(plusDays(week,7),availability.timezone);
    const spent=Object.values(completed).filter(c=>weekOf(localDay(Date.parse(c.at),availability.timezone))===week).reduce((n,c)=>n+c.hours,0);
    const exam=availability.examWeeks.includes(week);
    const prorated=availability.hoursPerWeek*Math.max(0,(end-Math.max(now,start))/(end-start));
    return {week,start,end,capacity:exam?0:Math.max(0,Math.min(prorated,availability.hoursPerWeek-spent)),used:0,exam,completed:spent,slots:[] as {start:number;end:number}[]};
  });
  const allocations:Allocation[]=[],risk:Plan['risk']=[],finish=new Map<string,number>(),blocked=new Set<string>();
  const pending=tasks.filter(t=>!completed[t.id]).sort((a,b)=>a.due-b.due||a.id.localeCompare(b.id));
  for(const task of tasks)if(completed[task.id])finish.set(task.id,Date.parse(completed[task.id].at));
  while(pending.length){
    let index=pending.findIndex(t=>t.dependencies.every(id=>finish.has(id)||blocked.has(id)));
    if(index<0)index=0;
    const task=pending.splice(index,1)[0];
    if(task.dependencies.some(id=>!finish.has(id)||blocked.has(id))){
      blocked.add(task.id);risk.push({taskId:task.id,goalIds:task.goalIds,reason:'A prerequisite is not feasible or requires source confirmation.',remainingHours:task.hours});continue;
    }
    const dependencyAt=task.dependencies.length?Math.max(...task.dependencies.map(id=>finish.get(id)!)):now;
    const earliest=Math.max(now,dependencyAt+task.waitDays*DAY);
    if(earliest>task.due){
      blocked.add(task.id);risk.push({taskId:task.id,goalIds:task.goalIds,reason:'The required waiting/dependency time extends beyond the preparation cutoff.',remainingHours:task.hours});continue;
    }
    if(!task.hours){finish.set(task.id,earliest);continue;}
    let remaining=task.hours,last=earliest;
    for(const b of buckets){
      if(remaining<=EPS)break;
      if(b.exam||b.used>=b.capacity-EPS)continue;
      const start=Math.max(b.start,now,earliest),end=Math.min(b.end,task.due);
      if(end<=start)continue;
      let cursor=start;
      const density=availability.hoursPerWeek/(b.end-b.start);
      if(!density)continue;
      const intervals=[...b.slots].sort((x,y)=>x.start-y.start);
      const gaps:{start:number;end:number}[]=[];
      for(const slot of intervals){
        if(slot.end<=cursor)continue;
        if(slot.start>=end)break;
        if(slot.start>cursor)gaps.push({start:cursor,end:Math.min(slot.start,end)});
        cursor=Math.max(cursor,slot.end);
      }
      if(cursor<end)gaps.push({start:cursor,end});
      for(const gap of gaps){
        const hours=Math.min(remaining,b.capacity-b.used,(gap.end-gap.start)*density);
        if(hours<=EPS)continue;
        const slotEnd=Math.min(gap.end,gap.start+hours/density);
        allocations.push({taskId:task.id,week:b.week,hours,start:gap.start,end:slotEnd});
        b.slots.push({start:gap.start,end:slotEnd});b.used+=hours;remaining-=hours;last=slotEnd;
        if(remaining<=EPS)break;
      }
    }
    if(remaining>EPS){blocked.add(task.id);risk.push({taskId:task.id,goalIds:task.goalIds,reason:`Needs about ${task.hours.toFixed(1)} hours; ${Math.max(0,task.hours-remaining).toFixed(1)} fit before its cutoff under the shared budget.`,remainingHours:remaining});}
    else finish.set(task.id,last);
  }
  const thisWeek=buckets[0],next=tasks.filter(t=>!completed[t.id]&&!thisWeek.exam&&t.due>=now&&
    t.dependencies.every(id=>completed[id])&&Math.max(now,(t.dependencies.length?Math.max(...t.dependencies.map(id=>Date.parse(completed[id].at))):now)+t.waitDays*DAY)<=thisWeek.end&&
    (t.hours===0||allocations.some(a=>a.taskId===t.id&&a.week===thisWeek.week)))
    .sort((a,b)=>a.due-b.due||a.id.localeCompare(b.id))[0]??null;
  return {tasks,allocations,risk,goalStates:states,next,conditionalStages:conditional,weeks:buckets.map(({slots,start,end,...w})=>w)};
}
function availabilityBuffer(a:Availability){return a.bufferDays*DAY;}
