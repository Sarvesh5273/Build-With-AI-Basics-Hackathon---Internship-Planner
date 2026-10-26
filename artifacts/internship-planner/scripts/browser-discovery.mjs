import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const out=resolve('../../generated-artifacts');
await mkdir(out,{recursive:true});
const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser=await chromium.launch({executablePath:execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const result={checks:[],run:null};
const restore=process.argv.includes('--restore-from-cache');
const check=name=>{result.checks.push(name);console.log(`PASS ${name}`);};
try{
  await page.goto(base);
  await page.getByText('Where this scenario comes from',{exact:true}).click();
  assert(await page.locator('blockquote').filter({hasText:'Develop front-end applications'}).isVisible());check('Taste has reviewed source quote');
  for(let i=1;i<=12;i++){
    await page.getByRole('button',{name:new RegExp(`^Scenario ${i}:`)}).click();
    await page.getByRole('button',{name:i%4===0?'Not sure yet':i%3===0?'Not for me':'I would like this',exact:true}).click();
    await page.waitForTimeout(250);
  }
  await page.getByRole('button',{name:'See my direction',exact:true}).click();
  assert(await page.getByRole('heading',{name:/direction/i}).count()||await page.getByText('software',{exact:true}).count());check('All12 reactions reach normalized direction');
  await page.getByRole('button',{name:/preferences/i}).filter({hasText:/preferences/i}).last().click();
  // Use labelled entry list to remove inferred terms, not storage injection.
  const chips=page.getByRole('list',{name:'Topics or roles entries'});
  while(await chips.getByRole('button').count())await chips.getByRole('button').first().click();
  await page.getByLabel(/^Topics or roles/).fill('software');
  await page.getByRole('button',{name:'Add to Topics or roles',exact:true}).click();
  await page.getByLabel('Preferred organizations',{exact:true}).fill('CERN');
  await page.getByRole('button',{name:'Add to Preferred organizations',exact:true}).click();
  const company=page.getByRole('button',{name:'Company',exact:true});
  if(await company.getAttribute('aria-pressed')==='true')await company.click();
  const research=page.getByRole('button',{name:'Research',exact:true});
  if(await research.getAttribute('aria-pressed')==='false')await research.click();
  await page.getByLabel('I understand and want to search',{exact:true}).check();
  let runId,run;
  if(restore){
    // Browser restoration verification from a genuine provider-backed snapshot,
    // not a fake opportunity and not another metered search.
    const previous=JSON.parse(await readFile(resolve(out,'browser-discovery.json'),'utf8'));
    assert(previous.run?.count>0,'First run must have proved live discovery.');
    const cache=JSON.parse(await readFile(resolve('../../private-runtime/usage-and-sources.json'),'utf8'));
    const listing=cache.listings.at(-1)?.listing;assert(listing);
    runId=previous.run.id;result.run=previous.run;
    run={...previous.run,listings:[listing]};
    await page.evaluate(listing=>{
      const key='internship-planner-progress-v1';
      const progress=JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key,JSON.stringify({...progress,screen:'discovery',runId:null,listings:[{...listing,score:0,reasons:[],excluded:false}]}));
    },listing);
    await page.reload();
    check('Restored genuine provider snapshot without a new paid search');
  }else{
    const start=page.waitForResponse(r=>r.url().endsWith('/api/searches')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Search live sources',exact:true}).click();
    const response=await start;
    assert.equal(response.status(),202,await response.text());
    ({runId}=await response.json());
    for(let i=0;i<100;i++){
      await page.waitForTimeout(2000);
      const r=await context.request.get(`${base}/api/searches/${runId}`);assert.equal(r.status(),200);
      run=await r.json();
      if(i%15===0)console.log(JSON.stringify({elapsedSeconds:2*(i+1),status:run.status,stage:run.stage,usage:run.usage,count:run.listings.length}));
      if(process.env.FOCUSED_FIRST_RESULT==='1'&&run.listings.some(l=>l.facts.length>=2)){
        await context.request.post(`${base}/api/searches/${runId}/cancel`);
        run=await (await context.request.get(`${base}/api/searches/${runId}`)).json();
        break;
      }
      if(process.env.DIAGNOSTIC_ONLY==='1'&&run.listings.length===0&&run.errors.some(e=>e.includes('could not produce valid structured output'))){
        await context.request.post(`${base}/api/searches/${runId}/cancel`);
        throw new Error('Stopped after the first structured-output rejection; inspect sanitized shape diagnostics, not provider text.');
      }
      if(['complete','partial','failed','cancelled'].includes(run.status))break;
    }
    result.run={id:runId,status:run.status,usage:run.usage,errors:run.errors,sourceStatus:run.sourceStatus,count:run.listings.length};
  }
  console.log(JSON.stringify(result.run));
  assert(run.listings.length>0,'No genuine source-backed opportunity returned.');
  assert(run.listings.some(l=>!/(OIST|EPFL|HENNGE|Mitacs|DAAD|RISE)/i.test(l.organization)),'Need a real listing outside named examples.');
  if(process.env.FOCUSED_FIRST_RESULT==='1')assert(run.listings.some(l=>l.facts.length>=2),'The focused result must contain validated facts, not just a title.');
  check(restore?'Restored outside-example public source result':'Real outside-example discovery through public API');
  const listing=run.listings[0];
  const card=page.locator('article').filter({has:page.getByRole('heading',{name:listing.title,exact:true})}).first();
  await card.getByRole('button',{name:/^Save$/i}).click();
  let progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')));
  assert(progress.saved.includes(listing.id));assert(!progress.selected.includes(listing.id));check('Save does not select');
  await card.getByRole('button',{name:/^Select/i}).click();
  if(!await page.getByLabel('Search within results',{exact:true}).isVisible())await page.getByRole('button',{name:'Filters and sort',exact:true}).click();
  await page.getByLabel('Search within results',{exact:true}).fill('no-such-listing-123');
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')));
  assert(progress.selected.includes(listing.id));
  assert(await page.getByRole('complementary').getByText(listing.title).isVisible());check('Filters do not change selected basket');
  await page.getByLabel('Search within results',{exact:true}).fill('');
  for(const sort of ['newest','deadline','fit'])await page.getByLabel('Sort',{exact:true}).selectOption(sort);
  for(const [label,value]of [['Funding','unknown'],['Visa','unknown'],['Track','Company'],['Show','saved']]){
    await page.getByLabel(label,{exact:true}).selectOption(value);
    progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')));
    assert(progress.selected.includes(listing.id));
    await page.getByLabel(label,{exact:true}).selectOption(label==='Show'?'visible':'all');
  }
  check('Track funding visa saved filters and all three sorts preserve selection');
  await card.getByRole('button',{name:/^Hide$/i}).click();
  assert(await page.getByRole('dialog').isVisible());await page.getByRole('button',{name:'Cancel',exact:true}).click();
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')));assert(progress.selected.includes(listing.id));
  await card.getByRole('button',{name:/^Hide$/i}).click();
  await page.getByRole('button',{name:'Remove selection and hide',exact:true}).click();
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')));assert(!progress.selected.includes(listing.id)&&progress.hidden.includes(listing.id));
  await page.getByLabel('Show',{exact:true}).selectOption('hidden');
  await card.getByRole('button',{name:/^Unhide$/i}).click();
  await page.getByLabel('Show',{exact:true}).selectOption('visible');
  await card.getByRole('button',{name:/^Select/i}).click();check('Hide-selected conflict cancel and confirm work');
  await page.reload();await page.getByRole('heading',{name:/Live official opportunities/i}).waitFor();
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')));
  assert(progress.selected.includes(listing.id)&&progress.saved.includes(listing.id)&&progress.preferences.organizations.includes('CERN'));check('Reload restores last screen and personal progress');
  await page.getByRole('button',{name:'Start over',exact:true}).click();await page.keyboard.press('Escape');
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('internship-planner-progress-v1')));assert(progress.selected.includes(listing.id));check('Reset cancellation preserves data');
  const isolated=await browser.newContext();
  const other=await isolated.request.get(`${base}/api/searches/${runId}`);assert.equal(other.status(),404);
  assert.equal((await isolated.request.post(`${base}/api/searches/${runId}/cancel`,{data:{},headers:{Origin:base}})).status(),404);
  await isolated.close();check('Anonymous owners cannot read or cancel each other’s run');
  const damaged=await browser.newContext();
  await damaged.addInitScript(()=>localStorage.setItem('internship-planner-progress-v1','{not valid json'));
  const damagedPage=await damaged.newPage();await damagedPage.goto(base);
  assert(await damagedPage.getByRole('alert').filter({hasText:'old data has not been overwritten'}).isVisible());
  assert.equal(await damagedPage.evaluate(()=>localStorage.getItem('internship-planner-progress-v1')),'{not valid json');
  await damaged.close();check('Corrupt browser state warns without overwriting old data');
  for(const width of [390,768,1280]){
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Overflow at ${width}`);
    await page.screenshot({path:resolve(out,`discovery-${width}.jpg`),fullPage:true,type:'jpeg',quality:70});
  }
  await page.emulateMedia({reducedMotion:'reduce'});check('Phone tablet desktop discovery without horizontal overflow');
  assert.deepEqual(errors,[]);check('No browser runtime errors');
}finally{
  await writeFile(resolve(out,'browser-discovery.json'),JSON.stringify(result,null,2));
  await browser.close();
}
