import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { defaultPreferences } from '../shared/schemas.ts';
import { genreQuestions } from '../data/genre-questions.ts';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const out = resolve('../../generated-artifacts');
await mkdir(out, { recursive: true });
const cache = JSON.parse(await readFile(resolve('../../private-runtime/usage-and-sources.json'), 'utf8'));
const listing = cache.listings[0]?.listing;
assert(listing, 'Use a genuine public-source snapshot from an earlier live search.');
const key = 'internship-planner-progress-v1';
const preferences = {...defaultPreferences, topics:['software'], organizations:['CERN'], tracks:['Research'], funding:'any'};
const progress = {
  version:1, screen:'discovery',
  reactions:Object.fromEntries(genreQuestions.map(q => [q.id, 'interested'])),
  preferences, listings:[{...listing,score:0,reasons:[],excluded:false}],
  selected:[listing.id], saved:[listing.id], hidden:[], runId:randomUUID(),
};
const results = {checks:[],live:null};
const check = name => {results.checks.push(name);console.log(`PASS ${name}`);};
const browser = await chromium.launch({
  executablePath:execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),
  headless:true, args:['--no-sandbox','--disable-dev-shm-usage','--test-third-party-cookie-phaseout'],
});
const errors = [];

async function openApp(embedded, seed = progress) {
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(({key,seed}) => {
    try {
      if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(seed));
    } catch(e) { if(e.name!=='SecurityError')throw e; }
  }, {key,seed});
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  if (embedded) {
    await context.route('https://preview-host.invalid/', r => r.fulfill({
      contentType:'text/html',
      body:`<style>body{margin:0}iframe{width:100%;height:100vh;border:0}</style><iframe title="Embedded app" src="${base}"></iframe>`,
    }));
    await page.goto('https://preview-host.invalid/');
  } else await page.goto(base);
  let app;
  for (let i=0;i<100;i++) {
    app = embedded ? page.frames().find(f=>f.url().startsWith(base)) : page.mainFrame();
    if (app) break;
    await page.waitForTimeout(100);
  }
  assert(app,'App frame must load.');
  await app.locator('h1').waitFor();
  if(embedded) {
    await app.getByRole('alert').filter({hasText:'Browser storage is blocked'}).waitFor();
    for(let i=1;i<=12;i++) {
      await app.getByRole('button',{name:new RegExp(`^Scenario ${i}:`)}).click();
      await app.getByRole('button',{name:'I would like this',exact:true}).click();
      await page.waitForTimeout(250);
    }
    await app.getByRole('button',{name:'See my direction',exact:true}).click();
    await app.getByRole('button',{name:/preferences/i}).last().click();
    const chips=app.getByRole('list',{name:'Topics or roles entries'});
    while(await chips.getByRole('button').count())await chips.getByRole('button').first().click();
    await app.getByLabel('Topics or roles',{exact:true}).fill('software');
    await app.getByRole('button',{name:'Add to Topics or roles',exact:true}).click();
    await app.getByLabel('Preferred organizations',{exact:true}).fill('CERN');
    await app.getByRole('button',{name:'Add to Preferred organizations',exact:true}).click();
    const company=app.getByRole('button',{name:'Company',exact:true});
    if(await company.getAttribute('aria-pressed')==='true')await company.click();
    await app.getByRole('button',{name:'Broaden to any',exact:true}).click();
    await app.getByLabel('I understand and want to search',{exact:true}).check();
  } else await app.getByRole('heading',{name:seed.screen==='preferences'?/Tell the search what matters/:/Live official opportunities/}).waitFor();
  return {context,page,app};
}

try {
  const noCookie = await browser.newContext();
  const rejected = await noCookie.request.post(`${base}/api/searches`,{
    data:{preferences,continuation:null},headers:{Origin:base},
  });
  assert.equal(rejected.status(),403);
  assert.equal((await rejected.json()).error.code,'session_unavailable');
  await noCookie.close();
  check('Server rejects a missing retained session before metered search work');

  for (const embedded of [false,true]) {
    const {context,page,app} = await openApp(embedded);
    const sessions = await app.evaluate(async () => {
      const a = await (await fetch('/api/bootstrap')).json();
      const b = await (await fetch('/api/bootstrap')).json();
      return [a.sessionAvailable,b.sessionAvailable];
    });
    assert.deepEqual(sessions,[true,true]);
    const cookie = (await context.cookies()).find(c=>c.name==='planner_owner');
    assert(cookie?.httpOnly && cookie.secure && cookie.sameSite==='None');
    if (embedded) assert(cookie.partitionKey,'Embedded marker must be partitioned.');
    check(`${embedded?'Embedded':'Top-level'} browser retains recognized ownership with third-party-cookie blocking`);

    if(!embedded) {
    await app.getByRole('heading',{name:'Previous search unavailable'}).waitFor();
    const before = await app.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    assert.equal(before.runId,null);
    for (const field of ['preferences','listings','saved','selected','hidden','reactions']) assert.deepEqual(before[field],progress[field]);
    await app.getByRole('button',{name:'Start a new search',exact:true}).waitFor();
    check('Expired run clears only its reference, preserves personal progress and offers explicit recovery');
    let automaticSearches=0;
    context.on('request',r=>{if(r.url()===`${base}/api/searches`&&r.method()==='POST')automaticSearches++;});
    await page.reload();
    const reloadedApp = embedded ? page.frames().find(f=>f.url().startsWith(base)) : page.mainFrame();
    await reloadedApp.getByRole('button',{name:'Start a new search',exact:true}).waitFor();
    await page.waitForTimeout(300);
    assert.equal(automaticSearches,0);
    const after = await reloadedApp.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    assert.deepEqual(after.saved,progress.saved);assert.deepEqual(after.selected,progress.selected);
    check('Reload does not revive the expired reference or automatically incur another search');
    for (const width of [390,768,1280]) {
      await page.setViewportSize({width,height:900});
      assert(await reloadedApp.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    }
    await page.screenshot({path:resolve(out,'session-recovery.jpg'),type:'jpeg',quality:70});
    } else {
      for (const width of [390,768,1280]) {
        await page.setViewportSize({width,height:900});
        assert(await app.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
      }
      check('Embedded app stays usable when all local storage is blocked and explicitly warns about lost persistence');
      if (process.argv.includes('--live')) {
        const start = page.waitForResponse(r=>r.url()===`${base}/api/searches`&&r.request().method()==='POST');
        await app.getByRole('button',{name:'Search live sources',exact:true}).click();
        const response = await start;
        assert.equal(response.status(),202,await response.text());
        const {runId} = await response.json();
        let run;
        for (let i=0;i<100;i++) {
          await page.waitForTimeout(2000);
          const received = await app.evaluate(async id=>{
            const response=await fetch(`/api/searches/${id}`);
            return {status:response.status,body:await response.json()};
          },runId);
          assert.equal(received.status,200,'Embedded browser must retain access to its own live run.');
          run=received.body;
          if (['complete','partial','failed','cancelled'].includes(run.status)) break;
        }
        assert(run && !['queued','searching','reading','interpreting'].includes(run.status));
        results.live={status:run.status,count:run.listings.length,usage:run.usage};
        console.log('LIVE',JSON.stringify(results.live));
        check('Real embedded search starts and remains accessible through its terminal status');
        const outsider = await browser.newContext();
        assert.equal((await outsider.request.get(`${base}/api/searches/${runId}`)).status(),404);
        assert.equal((await outsider.request.post(`${base}/api/searches/${runId}/cancel`,{data:{},headers:{Origin:base}})).status(),404);
        await outsider.close();
        check('Another anonymous owner cannot read or cancel the live run');
      }
    }
    await context.close();
  }

  const blocked = await openApp(false,{...progress,screen:'preferences',runId:null});
  let paidPosts=0;
  blocked.context.on('request',r=>{if(r.url()===`${base}/api/searches`&&r.method()==='POST')paidPosts++;});
  await blocked.context.route('**/api/bootstrap',r=>r.fulfill({json:{sessionAvailable:false,configuration:{tinyfish:true,groq:true}}}));
  await blocked.app.getByLabel('I understand and want to search',{exact:true}).check();
  await blocked.app.getByRole('button',{name:'Search live sources',exact:true}).click();
  await blocked.app.getByRole('alert').filter({hasText:'Open the app in a new tab'}).waitFor();
  assert.equal(paidPosts,0);
  const retained = await blocked.app.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  assert.deepEqual(retained.saved,progress.saved);assert.deepEqual(retained.selected,progress.selected);
  check('Simulated unavailable-cookie response stops client search without a paid POST or progress loss');
  await blocked.context.close();
  assert.deepEqual(errors,[]);
  check('Recovery UI fits phone/tablet/desktop and has no browser runtime errors');
} finally {
  await writeFile(resolve(out,'browser-session.json'),JSON.stringify(results,null,2));
  await browser.close();
}
