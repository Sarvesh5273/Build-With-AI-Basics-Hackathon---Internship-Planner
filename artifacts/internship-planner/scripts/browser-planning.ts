// UI integration fixtures only; this does not claim live-provider verification.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {defaultPreferences,type Listing} from '../shared/schemas';
import {rank} from '../shared/rank';
import {buildQuestions} from '../shared/question-bank';
import {genreQuestions} from '../data/genre-questions';
import {localDay,weekOf,plusDays} from '../shared/scheduler';
const out=resolve('../../generated-artifacts');await mkdir(out,{recursive:true});
const now=Date.now(),source={id:'source',url:'https://example.edu/internship',title:'UI test fixture — not live evidence',
  fetchedAt:new Date(now).toISOString(),interpretedAt:new Date(now).toISOString(),freshness:'UI fixture',ownership:'Test only',official:true};
const listing=(id:string,track:'Research'|'Company'):Listing=>({
  id,version:'fixture-1',organization:'UI Fixture Organization',title:`${track} UI Internship`,track,canonicalUrl:source.url,cycleKey:'',identityQuote:'Test fixture internship',
  sources:[source],facts:[
    {kind:'eligibility',value:'Academic year 3+',quote:'Applicants must be in academic year 3 or later.',sourceId:'source',due:null,rule:{field:'year',operator:'min',number:3,scale:null,values:[]}},
    {kind:'document',value:'CV',quote:'A CV is required.',sourceId:'source',rule:null,due:null},
    {kind:'skill',value:'Software reasoning',quote:'Software reasoning is required.',sourceId:'source',rule:null,due:null},
    {kind:'submission',value:'Official form',quote:'Submit through the official application form.',sourceId:'source',rule:null,due:null},
  ],
});
const goals=['Research','Company'].map((track,i)=>({listing:listing(`fixture-${i}`,track as 'Research'|'Company'),preparedAt:new Date(now).toISOString(),gaps:[],sourceStatus:['UI fixture, not live']}));
const pack=buildQuestions(goals,'11111111-1111-4111-8111-111111111111');
const runId='22222222-2222-4222-8222-222222222222',assessmentId='33333333-3333-4333-8333-333333333333';
const browser=await chromium.launch({executablePath:execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
const errors:string[]=[],checks:string[]=[];page.on('pageerror',e=>errors.push(e.message));
let preparationCalls=0,assessmentCalls=0,failAssessment=true;
const check=(s:string)=>{checks.push(s);console.log(`PASS ${s}`);};
await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),body=route.request().postDataJSON(),path=url.pathname;
  let data:unknown;
  if(path==='/api/bootstrap')data={sessionAvailable:true,groq:true,tinyfish:true,agent:false};
  else if(path==='/api/preparations'&&route.request().method()==='POST'){
    preparationCalls++;assert.deepEqual(Object.keys(body).sort(),['continuation','targets']);data={runId};
  }else if(path===`/api/preparations/${runId}`)data={id:runId,status:'complete',stage:'UI preparation fixture complete',startedAt:new Date(now).toISOString(),goals,pack,pending:[],errors:[]};
  else if(path==='/api/assessments'&&route.request().method()==='POST'){
    assessmentCalls++;assert.deepEqual(Object.keys(body).sort(),['answers','packId']);data={runId:assessmentId};
  }else if(path===`/api/assessments/${assessmentId}`)data={
    id:assessmentId,status:failAssessment?'failed':'complete',startedAt:new Date(now).toISOString(),error:failAssessment?'Provider fixture failure. Answers preserved.':null,
    result:failAssessment?null:{packId:pack.id,packVersion:pack.version,assessedAt:new Date(now).toISOString(),
      items:pack.questions.flatMap(q=>q.rubrics.map(r=>({questionId:q.id,rubricId:r.id,status:'met',reason:'UI fixture rubric result',excerpt:'Fixture answer'})))},
  };
  else throw new Error(`Unexpected API in fixture: ${path}`);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
});
try{
  await page.goto(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  // Restoration entry is intentional; the existing native discovery script tests taste/search separately.
  const progress={version:1,screen:'discovery',reactions:Object.fromEntries(genreQuestions.map(q=>[q.id,'interested'])),
    preferences:{...defaultPreferences,funding:'any'},listings:goals.map(g=>rank(g.listing,{...defaultPreferences,funding:'any'})),
    selected:goals.map(g=>g.listing.id),saved:[],hidden:[],runId:null};
  await page.evaluate(p=>localStorage.setItem('internship-planner-progress-v1',JSON.stringify(p)),progress);
  await page.reload();
  await page.getByRole('button',{name:'Check 2 targets'}).click();
  await page.getByLabel('Year of study',{exact:false}).fill('2');
  assert.equal(await page.getByText('Not eligible',{exact:true}).count(),2);check('Lower study year changes both preliminary verdicts');
  await page.getByLabel('Year of study',{exact:false}).fill('3');
  await page.getByRole('button',{name:'Prepare sources',exact:true}).click();
  await page.getByText('Question pack ready: 6 questions.').waitFor();
  assert.equal(preparationCalls,1);check('Explicit source preparation and local-only academic profile');
  await page.getByRole('button',{name:'Readiness interview',exact:true}).click();
  for(let i=0;i<pack.questions.length;i++){
    await page.getByLabel('Your answer',{exact:true}).fill('Fixture answer: a hash map supports constant-time lookups and idempotency deduplicates retries.');
    await page.getByRole('button',{name:i===pack.questions.length-1?'Review':'Next',exact:true}).click();
  }
  assert(await page.getByRole('button',{name:'Assess answers',exact:true}).isDisabled());check('Assessment consent required');
  await page.getByLabel(/I understand my answer text/).check();
  await page.getByRole('button',{name:'Assess answers',exact:true}).click();
  await page.getByText('Provider fixture failure. Answers preserved.').waitFor();
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')!).planning.answers)).constructor,Object);
  failAssessment=false;await page.getByRole('button',{name:'Assess answers',exact:true}).click();
  await page.getByRole('button',{name:'Continue to timetable',exact:true}).waitFor();check('Scoring failure preserves answers; explicit retry works');
  await page.getByRole('button',{name:'Question 1, answered',exact:true}).click();
  await page.getByLabel('Your answer',{exact:true}).fill('Edited fixture answer; previous assessment must not apply.');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')!).planning.assessment),null);
  await page.getByRole('button',{name:'Sum',exact:true}).click();check('Editing an answer invalidates its older score');
  await page.getByRole('button',{name:'Continue without assessment',exact:true}).click();
  await page.getByLabel('Free hours per week', {exact:true}).fill('14');
  await page.getByLabel('Any day in the exam week', {exact:true}).fill(localDay(now,'UTC'));
  await page.getByRole('button',{name:'Add week',exact:true}).click();
  await page.getByRole('button',{name:'Generate roadmap',exact:true}).click();
  await page.getByText('No step this week.',{exact:true}).waitFor();check('Exam week honest empty action');
  await page.getByRole('button',{name:'Edit timetable',exact:true}).click();
  await page.getByRole('button',{name:/Remove exam week/}).click();
  await page.getByRole('button',{name:'Update roadmap',exact:true}).click();
  await page.getByRole('button',{name:'Open Research timeline',exact:true}).click();
  const task=page.locator('article.task').filter({has:page.getByRole('heading',{name:'Build or update reusable CV content',exact:true})}).first();
  await task.getByRole('button',{name:'Mark done',exact:true}).click();
  await page.getByRole('button',{name:'Not done',exact:true}).first().click();check('Shared CV completion and reopening');
  await page.getByRole('button',{name:'Company',exact:true}).click();
  await page.getByRole('heading',{name:'Company week by week',exact:true}).waitFor();check('Both track timelines from one budget');
  for(const width of [390,768,1280]){
    await page.setViewportSize({width,height:950});await page.waitForTimeout(200);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
    await page.screenshot({path:resolve(out,`planning-${width}.jpg`),fullPage:false});
  }check('Phone tablet desktop without horizontal overflow');
  await page.reload();await page.getByRole('heading',{name:'This week, one thing',exact:true}).waitFor();
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')!));
  assert.equal(restored.planning.profile.studyYear,3);
  assert.equal(Object.keys(restored.planning.answers).length,pack.questions.length);
  assert(Object.keys(restored.planning.availability.personalTargets).length===2);check('Restored overview, answers and stable personal targets');
  assert.equal(preparationCalls,1);assert.equal(assessmentCalls,2);assert.deepEqual(errors,[]);check('No automatic metered work after reload; no browser runtime errors');
  await writeFile(resolve(out,'browser-planning.json'),JSON.stringify({mode:'API fixtures — not live provider verification',checks,errors},null,2));
}finally{await browser.close();}
