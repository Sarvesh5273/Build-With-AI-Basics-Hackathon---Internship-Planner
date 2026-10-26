import { useEffect, useRef, useState, useMemo } from 'react';
import { z } from 'zod';
import { defaultPreferences, ListingSchema, PreferencesSchema, type Preferences, type RankedListing, type SearchRun } from '../../shared/schemas';
import { direction, type Reaction } from '../../shared/direction';
import { api, ApiError } from './api';
import { PlanningStateSchema,initialPlanning,type PlanningState } from './planning-state';
import { PreparedGoalSchema,QuestionPackSchema,AssessmentSchema,AvailabilitySchema,ProfileSchema,type Profile,type PreparedGoal,type PreparationRun,type AssessmentRun,type Availability } from '../../shared/planning';
import { buildPlan,localDay,plusDays } from '../../shared/scheduler';
import { rank } from '../../shared/rank';
export { api } from './api';
const RankedSchema=ListingSchema.extend({score:z.number().min(0).max(100),reasons:z.array(z.string().max(600)).max(20),excluded:z.boolean()});
const ProgressSchema=z.object({
  version:z.literal(1),screen:z.enum(['taste','direction','preferences','discovery','eligibility','readiness','timetable','overview','timeline']),
  reactions:z.record(z.string().max(80),z.enum(['interested','notForMe','unclear'])),
  preferences:PreferencesSchema,listings:z.array(RankedSchema).max(200),
  selected:z.array(z.string()).max(200),saved:z.array(z.string()).max(200),hidden:z.array(z.string()).max(200),
  runId:z.string().nullable(),
  planning:PlanningStateSchema.default(initialPlanning),
});
export type Progress=z.infer<typeof ProgressSchema>;
const key='internship-planner-progress-v1';
const initial:Progress={version:1,screen:'taste',reactions:{},preferences:defaultPreferences,listings:[],selected:[],saved:[],hidden:[],runId:null,planning:initialPlanning};
function load(){
  let raw:string|null;
  try{raw=localStorage.getItem(key);}
  catch{return {progress:initial,warning:'Browser storage is blocked. You can use this session, but progress will not survive reloading or closing it. Open the app in a new tab before continuing; existing answers cannot transfer automatically.'};}
  try{
    const progress=raw?ProgressSchema.parse(JSON.parse(raw)):initial;
    if(progress.planning.generated&&['overview','timeline'].includes(progress.screen))progress.screen='overview';
    return {progress,warning:''};
  }
  catch{return {progress:initial,warning:'Saved progress could not be read. This session is usable, but the old data has not been overwritten.'};}
}
export function usePlanner(){
  const [loaded]=useState(load);
  const [progress,setProgress]=useState<Progress>(loaded.progress);
  const [storageWarning,setStorageWarning]=useState(loaded.warning);
  const [error,setError]=useState('');
  const [run,setRun]=useState<SearchRun|null>(null);
  const [busy,setBusy]=useState(false);
  const [preparation,setPreparation]=useState<PreparationRun|null>(null);
  const [preparing,setPreparing]=useState(false);
  const [assessing,setAssessing]=useState(false);
  const [now,setNow]=useState(Date.now);
  const planningStart=useRef(false),assessmentStart=useRef(false);
   const [searchUnavailable,setSearchUnavailable]=useState(false);
   const startingSearch=useRef(false);
  const [configuration,setConfiguration]=useState<{tinyfish:boolean;groq:boolean}|null>(null);
  const update=(change:Partial<Progress>)=>setProgress(p=>({...p,...change}));
  const updatePlanning=(change:Partial<PlanningState>)=>setProgress(p=>({...p,planning:{...p.planning,...change,
    ...(change.answers?{assessment:null}:{})}}));
  useEffect(()=>{
    const refresh=()=>setNow(Date.now());
    const timer=setInterval(refresh,60000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  useEffect(()=>{if(loaded.warning)return;try{localStorage.setItem(key,JSON.stringify(progress));setStorageWarning('');}
    catch{setStorageWarning('Browser storage is blocked or full. Progress may not survive closing this tab.');}},[progress,loaded.warning]);
  useEffect(()=>{api<{configuration:{tinyfish:boolean;groq:boolean}}>('/api/bootstrap').then(r=>setConfiguration(r.configuration)).catch(e=>setError(e.message));},[]);
  useEffect(()=>{
     if(!progress.runId)return;
     const pollingId=progress.runId;
    let active=true; let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{try{
      const result=await api<SearchRun>(`/api/searches/${encodeURIComponent(progress.runId!)}`);
      if(!active)return;
      setRun(result); setError('');
      setProgress(p=>({...p,listings:[...new Map([...p.listings,...result.listings].map(l=>[l.id,l])).values()].slice(-200)}));
      if(['queued','searching','reading','interpreting'].includes(result.status)){setBusy(true);timer=setTimeout(poll,1800);}else{setBusy(false);}
     }catch(e){if(active){
       setBusy(false);setError((e as Error).message);
       if(e instanceof ApiError&&e.code==='unknown_run'){
         setSearchUnavailable(true);setRun(null);
         setProgress(p=>p.runId===pollingId?{...p,runId:null}:p);
       }
     }}};
    void poll();return()=>{active=false;clearTimeout(timer);};
  },[progress.runId]);
  useEffect(()=>{
    const id=progress.planning.preparationId;if(!id)return;
    let live=true,timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{try{
      const result=await api<PreparationRun>(`/api/preparations/${id}`);if(!live)return;
      const goals=result.goals.map(g=>PreparedGoalSchema.parse(g)),pack=result.pack?QuestionPackSchema.parse(result.pack):null;
      setPreparation(result);setPreparing(result.status==='running');
      setProgress(p=>{
        const merged=[...new Map([...p.planning.goals,...goals].map(g=>[g.listing.id,g])).values()].slice(-200);
        const listings=p.listings.map(l=>{const g=goals.find(g=>g.listing.id===l.id);return g?rank(g.listing,p.preferences):l;});
        let assessment=p.planning.assessment;
        if(pack&&assessment&&p.planning.pack){
          const old=p.planning.pack;
          const compatible=pack.questions.filter(q=>old.questions.some(o=>o.id===q.id&&o.version===q.version&&JSON.stringify(o.rubrics)===JSON.stringify(q.rubrics)));
          assessment={...assessment,packId:pack.id,packVersion:pack.version,items:assessment.items.filter(i=>compatible.some(q=>q.id===i.questionId))};
        }
        return {...p,listings,planning:{...p.planning,goals:merged,...(pack?{pack,assessment,questionIndex:0}:{} )}};
      });
      if(result.status==='running')timer=setTimeout(poll,1800);
    }catch(e){if(live){setPreparing(false);setError((e as Error).message);updatePlanning({preparationId:null});}}};
    void poll();return()=>{live=false;clearTimeout(timer);};
  },[progress.planning.preparationId]);
  useEffect(()=>{
    const id=progress.planning.assessmentId;if(!id)return;
    let live=true,timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{try{
      const result=await api<AssessmentRun>(`/api/assessments/${id}`);if(!live)return;
      setAssessing(result.status==='running');
      if(result.status==='running')timer=setTimeout(poll,1800);
      else if(result.result)setProgress(p=>{
        const pack=p.planning.pack;
        const current=Object.fromEntries(pack?.questions.map(q=>[q.id,p.planning.answers[q.id]??''])??[]);
        const unchanged=JSON.stringify(current)===JSON.stringify(p.planning.assessmentAnswers);
        if(!unchanged)setError('Answers changed after submission. The older verdict is not applied; explicitly re-assess the preserved current answers.');
        return {...p,planning:{...p.planning,assessment:unchanged?AssessmentSchema.parse(result.result):null,assessmentId:null}};
      });
      else {setError(result.error??'Assessment unavailable. Answers are preserved.');updatePlanning({assessmentId:null});}
    }catch(e){if(live){setAssessing(false);setError((e as Error).message);updatePlanning({assessmentId:null});}}};
    void poll();return()=>{live=false;clearTimeout(timer);};
  },[progress.planning.assessmentId]);
  const selectedGoals:PreparedGoal[]=useMemo(()=>progress.selected.flatMap(id=>{
    const listing=progress.listings.find(l=>l.id===id);if(!listing)return [];
    return [progress.planning.goals.find(g=>g.listing.id===id)??{
      listing,preparedAt:listing.sources[0]?.fetchedAt??new Date(now).toISOString(),
      gaps:['This selected target has not yet received fuller source preparation. Readiness and requirements remain incomplete.'],
      sourceStatus:['Saved discovery snapshot, not a new verification.'],
    }];
  }),[progress.selected,progress.listings,progress.planning.goals]);
  const plan=useMemo(()=>progress.planning.generated&&progress.planning.availability?
    buildPlan(selectedGoals,progress.planning.profile,progress.planning.pack,progress.planning.assessment,
      progress.planning.availability,progress.planning.completed,now):null,
    [selectedGoals,progress.planning,now]);
  async function prepare(continuation?:string){
    if(preparing||planningStart.current||!progress.selected.length)return;
    planningStart.current=true;setPreparing(true);setError('');
    try{
      const session=await api<{sessionAvailable:boolean}>('/api/bootstrap');
      if(!session.sessionAvailable)throw new Error('Your browser cannot retain the source-preparation session. Open the app separately; existing progress remains here.');
      const targets=progress.selected.map(id=>progress.listings.find(l=>l.id===id)).filter(Boolean).map(l=>({id:l!.id,version:l!.version}));
      const response=await api<{runId:string}>('/api/preparations',{targets,continuation:continuation??null});
      updatePlanning({preparationId:response.runId});setPreparation(null);
    }catch(e){setError((e as Error).message);setPreparing(false);}
    finally{planningStart.current=false;}
  }
  async function assess(){
    if(assessing||assessmentStart.current||!progress.planning.pack)return;
    assessmentStart.current=true;setAssessing(true);setError('');
    try{
      const pack=progress.planning.pack;
      const answers=Object.fromEntries(pack.questions.map(q=>[q.id,progress.planning.answers[q.id]??'']));
      const response=await api<{runId:string}>('/api/assessments',{packId:pack.id,answers});
      updatePlanning({assessmentId:response.runId,assessmentAnswers:answers});
    }catch(e){setError((e as Error).message);setAssessing(false);}
    finally{assessmentStart.current=false;}
  }
  async function cancelPreparation(){
    if(!progress.planning.preparationId)return;
    try{await api(`/api/preparations/${progress.planning.preparationId}/cancel`,{});}
    catch(e){setError((e as Error).message);}
  }
  function updateProfile(profile:Profile){
    const checked=ProfileSchema.safeParse(profile);
    if(!checked.success){setError(checked.error.issues.map(i=>i.message).join(' '));return;}
    setError('');
    const {confirmations:oldConfirm,...old}=progress.planning.profile,{confirmations,...next}=profile;
    updatePlanning({profile:{...profile,confirmations:JSON.stringify(old)===JSON.stringify(next)?confirmations:{}}});
  }
  function generate(availability:Availability){
    const parsed=AvailabilitySchema.parse(availability);
    const defaultTarget=plusDays(localDay(now,parsed.timezone),42);
    for(const goal of selectedGoals)if(!goal.listing.facts.some(f=>f.kind==='deadline'&&['fixed','dateOnly'].includes(f.due?.kind??'')&&f.due?.at)&&!parsed.personalTargets[goal.listing.id])
      parsed.personalTargets[goal.listing.id]=defaultTarget;
    setProgress(p=>({...p,screen:'overview',planning:{...p.planning,availability:parsed,generated:true}}));
  }
  function complete(id:string,hours:number){
    const task=plan?.tasks.find(t=>t.id===id);
    updatePlanning({completed:{...progress.planning.completed,[id]:{at:new Date().toISOString(),hours,label:task?.label,goalIds:task?.goalIds}}});
  }
  function reopen(id:string){
    const completed={...progress.planning.completed};delete completed[id];updatePlanning({completed});
  }
  async function search(continuation?:string){
     if(busy||startingSearch.current)return;
     startingSearch.current=true;
     setBusy(true);setError('');
    try{
       const session=await api<{sessionAvailable:boolean}>('/api/bootstrap');
       if(!session.sessionAvailable)throw new ApiError('Your browser could not keep the search session. Open the app in a new tab, reload it, then try again. Your saved progress is unchanged.',403,'session_unavailable');
      const response=await api<{runId:string}>('/api/searches',{preferences:progress.preferences,continuation:continuation??null});
       update({screen:'discovery',runId:response.runId});setRun(null);setSearchUnavailable(false);
     }catch(e){setError((e as Error).message);setBusy(false);}
     finally{startingSearch.current=false;}
  }
  function toggle(list:'selected'|'saved'|'hidden',id:string,resolveConflict=false){
    if(list==='hidden'&&progress.selected.includes(id)&&!resolveConflict)return false;
    setProgress(p=>{
      const next=p[list].includes(id)?p[list].filter(v=>v!==id):[...p[list],id];
      return {...p,[list]:next,
        ...(list==='selected'&&next.includes(id)?{hidden:p.hidden.filter(v=>v!==id)}:{}),
        ...(list==='hidden'&&resolveConflict?{selected:p.selected.filter(v=>v!==id)}:{})};
    });return true;
  }
  function finishTaste(){
    const result=direction(progress.reactions);
    update({screen:'direction',preferences:{...progress.preferences,
      topics:result.topics.map(v=>v.name).slice(0,6),
      tracks:result.tracks.length?result.tracks as Preferences['tracks']:['Research','Company']}});
  }
  function reset(){
    try{localStorage.removeItem(key);}catch{setStorageWarning('Stored progress could not be deleted.');return;}
      loaded.warning='';setProgress(initial);setRun(null);setPreparation(null);setPreparing(false);setAssessing(false);setError('');setStorageWarning('');setSearchUnavailable(false);
  }
   return {progress,update,setProgress,storageWarning,error,setError,run,busy,configuration,searchUnavailable,
     updatePlanning,updateProfile,selectedGoals,prepare,cancelPreparation,preparation,preparing,assess,assessing,generate,plan,complete,reopen,now,
    react:(id:string,reaction:Reaction)=>update({reactions:{...progress.reactions,[id]:reaction}}),
    finishTaste,direction:direction(progress.reactions),search,toggle,reset,
    cancel:async()=>{if(progress.runId)try{await api(`/api/searches/${progress.runId}/cancel`,{});}
      catch(e){setError((e as Error).message);}},
  };
}
export type Planner=ReturnType<typeof usePlanner>;
