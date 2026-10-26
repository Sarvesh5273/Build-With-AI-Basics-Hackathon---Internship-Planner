// Records silent, paced footage of the real journey for the demo video.
// Uses live providers (one search, one preparation, one assessment).
// Output: generated-artifacts/demo/ (ignored). Narration is added separately.
import {mkdir,writeFile,readdir,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const out=resolve('../../generated-artifacts/demo');await mkdir(out,{recursive:true});
const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const topic=process.env.DEMO_TOPIC??'machine learning';
const browser=await chromium.launch({executablePath:execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const size={width:1280,height:800};
const context=await browser.newContext({viewport:size,recordVideo:{dir:out,size}});
const page=await context.newPage();
const t0=Date.now(),markers=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const mark=label=>{const s=((Date.now()-t0)/1000).toFixed(1);markers.push({at:Number(s),label});console.log(`[${s}s] ${label}`);};
const pause=ms=>page.waitForTimeout(ms);
const scroll=async(px,steps=6)=>{for(let i=0;i<steps;i++){await page.mouse.wheel(0,px/steps);await pause(180);}};
const toTop=()=>page.evaluate(()=>window.scrollTo({top:0,behavior:'smooth'}));
const json=async r=>{const b=await r.json();if(!r.ok())throw Error(b?.error?.message??`HTTP ${r.status()}`);return b;};
const poll=async(url,done,max=120)=>{let v;for(let i=0;i<max;i++){await pause(2000);v=await json(await context.request.get(url));if(done(v))break;}return v;};
let activeSearch;
const ACTIVE=['queued','searching','reading','interpreting'];
try{
  await page.goto(base);await page.getByRole('heading',{level:1}).first().waitFor();
  mark('Taste test intro');await pause(3500);
  const reactions=['I would like this','I would like this','Not sure yet','I would like this','Not for me','I would like this','Not sure yet','I would like this','Not for me','I would like this','I would like this','Not sure yet'];
  for(let i=1;i<=12;i++){
    await page.getByRole('button',{name:new RegExp(`^Scenario ${i}:`)}).click();
    await pause(i<=2?1800:500);
    await page.getByRole('button',{name:reactions[i-1],exact:true}).click();
  }
  await pause(800);
  await page.getByRole('button',{name:'See my direction',exact:true}).click();
  mark('Direction result');await pause(2500);await scroll(500);await pause(2000);await toTop();await pause(800);
  await page.getByRole('button',{name:/preferences/i}).last().click();
  mark('Preferences');await pause(2000);
  const chips=page.getByRole('list',{name:'Topics or roles entries'});
  while(await chips.getByRole('button').count())await chips.getByRole('button').first().click();
  await page.getByLabel(/^Topics or roles/).pressSequentially(topic,{delay:60});
  await page.getByRole('button',{name:'Add to Topics or roles',exact:true}).click();
  if(process.env.DEMO_ORG!=='none'){await page.getByLabel('Preferred organizations',{exact:true}).pressSequentially(process.env.DEMO_ORG??'CERN',{delay:60});
    await page.getByRole('button',{name:'Add to Preferred organizations',exact:true}).click();}
  await pause(1200);await scroll(400);await pause(1000);
  for(const t of ['Research','Company']){const b=page.getByRole('button',{name:t,exact:true}).first();if(await b.getAttribute('aria-pressed')!=='true'){await b.click();await pause(900);}}
  await pause(1200);
  await page.getByLabel('I understand and want to search',{exact:true}).check();await pause(700);
  const start=page.waitForResponse(r=>r.url().endsWith('/api/searches')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Search live sources',exact:true}).click();
  const {runId}=await json(await start);activeSearch=runId;
  mark('Live discovery started');
  const search=await poll(`${base}/api/searches/${runId}`,s=>!ACTIVE.includes(s.status),300);
  mark(`Discovery results (${search.status}, ${search.listings.length} listings)`);
  if(!search.listings.length)throw Error(`No listings: ${JSON.stringify(search.errors)}`);
  if(ACTIVE.includes(search.status)){await context.request.post(`${base}/api/searches/${runId}/cancel`);}
  activeSearch=undefined;
  await pause(3000);await toTop();await pause(1500);await scroll(700,8);await pause(2500);
  // Use the Track filter to pick one Research and one Company target.
  const trackSel=page.getByLabel('Track',{exact:true});
  const offTopic=page.getByLabel(/Show results that mention none of my topics/);
  const picks=[];
  for(const track of ['Research','Company']){
    await trackSel.scrollIntoViewIfNeeded();await pause(800);
    await trackSel.selectOption(track);await pause(1500);
    let cards=page.locator('article').filter({has:page.getByRole('button',{name:/^Select/i})});
    if(!(await cards.count())&&await offTopic.count()&&!(await offTopic.isChecked())){await offTopic.check();await pause(1200);}
    if(!(await cards.count())){mark(`No ${track} card visible`);continue;}
    const c=cards.first();await c.scrollIntoViewIfNeeded();await pause(2200);
    const head=(await c.getByRole('heading').first().innerText()).trim();
    await c.getByRole('button',{name:/^Select/i}).click();picks.push(head);mark(`Selected ${track}: ${head}`);await pause(1500);
  }
  if(!picks.length)throw Error('No selectable cards visible');
  await trackSel.scrollIntoViewIfNeeded();await trackSel.selectOption('all');await pause(1000);
  await page.getByRole('button',{name:new RegExp(`^Check ${picks.length} target`)}).click();
  mark('Eligibility');await pause(2000);
  const fill=async(re,v)=>{const f=page.getByLabel(re).first();if(await f.count()){await f.click();await f.pressSequentially(v,{delay:45});await pause(300);}};
  await fill(/^Nationality/,'Indian');await fill(/^Year of study/,'3');await fill(/^Grade value/,'8.4');await fill(/^Grade scale/,'10');
  await fill(/^Branch \/ major/,'Computer Engineering');await pause(1500);
  const prepStart=page.waitForResponse(r=>r.url().endsWith('/api/preparations')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Prepare sources',exact:true}).click();
  const prep=await json(await prepStart);
  const preparation=await poll(`${base}/api/preparations/${prep.runId}`,p=>p.status!=='running',100);
  mark(`Sources prepared (${preparation.status})`);await pause(2500);await scroll(800,8);await pause(3000);await toTop();await pause(1000);
  if(!preparation.pack)throw Error(`No readiness pack: ${JSON.stringify(preparation.errors)}`);
  await page.getByRole('button',{name:'Readiness interview',exact:true}).click();
  mark('Readiness interview');await pause(2500);
  // Demo-persona answers: some answered, some honestly skipped to show coverage gaps.
  const answer='I would use a hash map for constant-time lookups instead of scanning a list each time. For a model I split training and test data before preprocessing, and check precision and recall because positives are rare. I have done this in a college project but not at scale.';
  const qs=preparation.pack.questions;
  for(const [i,q] of qs.entries()){
    const box=page.getByLabel('Your answer',{exact:true});
    if(i%2===0){await box.pressSequentially(answer.slice(0,i===0?answer.length:140),{delay:i===0?12:4});}
    await pause(i===0?1500:500);
    await page.getByRole('button',{name:q.id===qs.at(-1).id?'Review':'Next',exact:true}).click();
  }
  await pause(1500);
  await page.getByLabel(/I understand my answer text/).check();
  const aStart=page.waitForResponse(r=>r.url().endsWith('/api/assessments')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Assess answers',exact:true}).click();
  const a=await json(await aStart);
  const assessment=await poll(`${base}/api/assessments/${a.runId}`,x=>x.status!=='running',60);
  mark(`Readiness result (${assessment.status})`);await pause(3000);await scroll(900,9);await pause(3000);await toTop();
  await page.getByRole('button',{name:'Continue to timetable',exact:true}).click();
  mark('Timetable');await pause(2000);
  const hours=page.getByLabel('Free hours per week',{exact:true});await hours.fill('');await hours.pressSequentially('8',{delay:120});
  const exam=page.getByLabel('Any day in the exam week',{exact:true});
  if(await exam.count()){const d=new Date(Date.now()+21*864e5).toISOString().slice(0,10);await exam.fill(d);await pause(600);await page.getByRole('button',{name:'Add week',exact:true}).click();mark('Exam week added');}
  await pause(1500);await scroll(500);await pause(2000);
  await page.getByRole('button',{name:'Generate roadmap',exact:true}).click();
  await page.getByRole('heading',{name:'This week, one thing',exact:true}).waitFor();
  mark('Roadmap overview');await pause(4000);await scroll(900,10);await pause(3500);await toTop();await pause(1000);
  for(const track of ['Research','Company']){
    const open=page.getByRole('button',{name:`Open ${track} timeline`,exact:true});
    if(!(await open.count())||!(await open.isEnabled()))continue;
    await open.click();mark(`${track} timeline`);await pause(3000);await scroll(1000,10);await pause(3000);
    const done=page.getByRole('button',{name:'Mark done',exact:true}).first();
    if(await done.count()){await done.scrollIntoViewIfNeeded();await pause(800);await done.click();mark('Task marked done');await pause(2500);}
    await toTop();await pause(1200);
    const back=page.getByRole('button',{name:/overview/i}).first();if(await back.count()){await back.click();await pause(2000);}
  }
  mark('End');await pause(2000);
}finally{
  if(activeSearch)await context.request.post(`${base}/api/searches/${activeSearch}/cancel`).catch(()=>{});
  await context.close();await browser.close();
  const vids=(await readdir(out)).filter(f=>f.endsWith('.webm')&&f!=='raw-footage.webm');
  if(vids.length)await rename(resolve(out,vids[0]),resolve(out,'raw-footage.webm'));
  await writeFile(resolve(out,'markers.json'),JSON.stringify({markers,errors},null,2));
  console.log(JSON.stringify({markers:markers.length,errors}));
}
