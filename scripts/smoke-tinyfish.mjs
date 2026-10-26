// One bounded Search + Fetch check. Credentials are used only by this process.
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
const directory = new URL('../private-runtime/', import.meta.url);
await mkdir(directory, { recursive: true, mode: 0o700 });
const counterPath = new URL('smoke-usage.json', directory);
let usage = { day: new Date().toISOString().slice(0, 10), searches: 0, fetchedUrls: 0 };
try {
  const saved = JSON.parse(await readFile(counterPath, 'utf8'));
  if (saved.day === usage.day) usage = saved;
} catch (error) {
  if (error.code !== 'ENOENT') throw new Error('Operational usage file unreadable; no provider call made.');
}
if (!process.env.TINYFISH_API_KEY) throw new Error('TinyFish is not configured.');
if (usage.searches >= 3 || usage.fetchedUrls >= 3) throw new Error('Smoke-test allowance exhausted.');
usage.searches++;
usage.fetchedUrls++;
const temporary = new URL('smoke-usage.tmp', directory);
await writeFile(temporary, JSON.stringify(usage), { mode: 0o600 });
await rename(temporary, counterPath);
const headers = { 'X-API-Key': process.env.TINYFISH_API_KEY };
const searchUrl = new URL('https://api.search.tinyfish.ai/');
searchUrl.search = new URLSearchParams({
  query: 'CERN summer student programme software engineering internship funding official',
  purpose: 'Verify a real student internship outside the previously researched examples.',
  language: 'en', include_domains: 'home.cern,careers.cern', page: '0',
}).toString();
const search = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(30000) });
console.log(JSON.stringify({ stage: 'search', status: search.status,
  retryAfter: search.headers.get('retry-after'),
  remaining: search.headers.get('x-ratelimit-remaining') }));
if (!search.ok) {
  process.exitCode = 1;
} else {
  const result = await search.json();
  const candidates = Array.isArray(result.results) ? result.results.filter(item => {
    try {
      const url = new URL(item.url);
      return url.protocol === 'https:' && !url.username && !url.password &&
        ['careers.cern', 'home.cern'].includes(url.hostname);
    } catch { return false; }
  }) : [];
  console.log(JSON.stringify({ count: candidates.length, leads: candidates.slice(0, 4).map(({title,url})=>({title,url})) }));
  if (!candidates.length) throw new Error('No official CERN result returned.');
  const page = await fetch('https://api.fetch.tinyfish.ai/', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({urls:[candidates[0].url],format:'markdown',links:true,ttl:0,per_url_timeout_ms:25000}),
    signal: AbortSignal.timeout(30000),
  });
  console.log(JSON.stringify({stage:'fetch',status:page.status,retryAfter:page.headers.get('retry-after')}));
  if (!page.ok) process.exitCode = 1;
  else {
    const fetched = await page.json();
    const first = fetched.results?.[0];
    console.log(JSON.stringify({success:typeof first?.text==='string' && first.text.length>0,
      source:first?.final_url ?? first?.url,characters:first?.text?.length,
      excerpt:first?.text?.slice(0,1800),errors:fetched.errors?.map(({status,error})=>({status,error})),
      freshness:'Requested ttl:0; TinyFish may still supply origin-valid or pinned cached content.'}));
    if (!first?.text) process.exitCode = 1;
  }
}
