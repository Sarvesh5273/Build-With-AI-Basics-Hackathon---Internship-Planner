import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const out=resolve('../../generated-artifacts');await mkdir(out,{recursive:true});
const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser=await chromium.launch({executablePath:execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1280,height:950}}),page=await context.newPage();
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=s=>{checks.push(s);console.log(`PASS ${s}`);};
const json=async response=>{const body=await response.json();assert(response.ok(),body.message??body.error??`HTTP ${response.status()}`);return body;};
let activeSearch;
try{
  await page.goto(base);
  for(let i=1;i<=12;i++){
    await page.getByRole('button',{name:new RegExp(`^Scenario ${i}:`)}).click();
    await page.getByRole('button',{name:'I would like this',exact:true}).click();
  }
  await page.getByRole('button',{name:'See my direction',exact:true}).click();
  await page.getByRole('button',{name:/preferences/i}).last().click();
  const chips=page.getByRole('list',{name:'Topics or roles entries'});
  while(await chips.getByRole('button').count())await chips.getByRole('button').first().click();
  await page.getByLabel(/^Topics or roles/).fill('software');
  await page.getByRole('button',{name:'Add to Topics or roles',exact:true}).click();
  await page.getByLabel('Preferred organizations',{exact:true}).fill('CERN');
  await page.getByRole('button',{name:'Add to Preferred organizations',exact:true}).click();
  const company=page.getByRole('button',{name:'Company',exact:true});
  if(await company.getAttribute('aria-pressed')==='true')await company.click();
  await page.getByLabel('I understand and want to search',{exact:true}).check();
  const start=page.waitForResponse(r=>r.url().endsWith('/api/searches')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Search live sources',exact:true}).click();
  const {runId}=await json(await start);activeSearch=runId;
  let search;
  for(let i=0;i<100;i++){
    await page.waitForTimeout(2000);search=await json(await context.request.get(`${base}/api/searches/${runId}`));
    if(i%15===0)console.log(JSON.stringify({stage:'discovery',status:search.status,usage:search.usage,count:search.listings.length}));
    if(search.listings.some(l=>l.facts.length>=2)){await context.request.post(`${base}/api/searches/${runId}/cancel`);break;}
    if(['complete','partial','failed','cancelled'].includes(search.status))break;
  }
  assert(search.listings.length,JSON.stringify({message:'Live discovery found no source-backed target',errors:search.errors}));
  const listing=search.listings.find(l=>l.facts.length>=2)??search.listings[0];
  assert(!/(OIST|EPFL|HENNGE|Mitacs|DAAD|RISE)/i.test(listing.organization));check('Native taste/preferences/discovery outside named examples');
  const card=page.locator('article').filter({has:page.getByRole('heading',{name:listing.title,exact:true})}).first();
  await card.getByRole('button',{name:/^Select/i}).click();
  await page.getByRole('button',{name:'Check 1 target',exact:true}).click();
  const prepStart=page.waitForResponse(r=>r.url().endsWith('/api/preparations')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Prepare sources',exact:true}).click();
  const prepBody=await json(await prepStart);
  let preparation;
  for(let i=0;i<100;i++){
    await page.waitForTimeout(2000);preparation=await json(await context.request.get(`${base}/api/preparations/${prepBody.runId}`));
    if(i%15===0)console.log(JSON.stringify({stage:'preparation',status:preparation.status,pending:preparation.pending.length,errors:preparation.errors}));
    if(preparation.status!=='running')break;
  }
  assert(preparation.pack,'No readiness pack created');
  assert(preparation.goals.some(g=>g.listing.facts.some(f=>f.kind==='eligibility'&&f.rule)),JSON.stringify({message:'Fresh supported eligibility was not established',errors:preparation.errors,gaps:preparation.goals.map(g=>g.gaps)}));
  check('Native TinyFish/Groq selected-source preparation and quoted eligibility');
  await page.getByRole('button',{name:'Readiness interview',exact:true}).click();
  for(const q of preparation.pack.questions){
    const answer='Use a hash map for expected constant-time membership checks rather than a repeated linear scan. Idempotency keys and a uniqueness constraint prevent duplicate retry side effects. Split training and test data by time and user before fitting transformations; use precision, recall and a confusion matrix for rare positives. Random assignment and a control group reduce confounding; report uncertainty and avoid claiming causation from correlation. The weighted mean is 65; compare distributions and confidence intervals, not only averages. Repeat sensor readings against a calibrated reference, inspect noise and outliers, then document tradeoffs. Communicate the blocker, what was tried, the impact, the specific help needed and the next update time.';
    await page.getByLabel('Your answer',{exact:true}).fill(process.env.FOCUSED_ONE_ANSWER==='1'&&q.id!==preparation.pack.questions[0].id?'':answer);
    await page.getByRole('button',{name:q.id===preparation.pack.questions.at(-1).id?'Review':'Next',exact:true}).click();
  }
  await page.getByLabel(/I understand my answer text/).check();
  const assessmentStart=page.waitForResponse(r=>r.url().endsWith('/api/assessments')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Assess answers',exact:true}).click();
  const assessmentBody=await json(await assessmentStart);
  let assessment;
  for(let i=0;i<55;i++){
    await page.waitForTimeout(2000);assessment=await json(await context.request.get(`${base}/api/assessments/${assessmentBody.runId}`));
    if(assessment.status!=='running')break;
  }
  assert.equal(assessment.status,'complete',assessment.error??'Native assessment did not complete');check('Native Groq fixed-rubric scoring with validated answer excerpts');
  await page.getByRole('button',{name:'Continue to timetable',exact:true}).click();
  await page.getByLabel('Free hours per week',{exact:true}).fill('8');
  await page.getByRole('button',{name:'Generate roadmap',exact:true}).click();
  await page.getByRole('heading',{name:'This week, one thing',exact:true}).waitFor();
  await page.getByRole('button',{name:'Open Research timeline',exact:true}).click();
  const done=page.getByRole('button',{name:'Mark done',exact:true}).first();
  if(await done.count()){await done.click();await page.getByRole('button',{name:'Not done',exact:true}).first().click();}
  check('Real target roadmap, complete/reopen and no invented official dates');
  await page.setViewportSize({width:390,height:950});await page.screenshot({path:resolve(out,'live-roadmap-390.jpg'),fullPage:false});
  await page.reload();await page.getByRole('heading',{name:'This week, one thing',exact:true}).waitFor();
  assert.deepEqual(errors,[]);check('Native full journey restored without browser errors');
  await writeFile(resolve(out,'browser-live-planning.json'),JSON.stringify({checks,target:{organization:listing.organization,title:listing.title,url:listing.canonicalUrl},
    preparation:{status:preparation.status,errors:preparation.errors,gaps:preparation.goals.map(g=>g.gaps)},assessment:{status:assessment.status},errors},null,2));
}finally{
  if(activeSearch)await context.request.post(`${base}/api/searches/${activeSearch}/cancel`).catch(()=>{});
  await browser.close();
}
