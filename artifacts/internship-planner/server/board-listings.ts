/**
 * Listings built directly from an employer's public job-board data (Greenhouse,
 * Lever, Ashby, Workday). One board read yields many internships without an AI
 * call: every fact is a verbatim line or sentence of the posting text the board
 * publishes, and still passes the same quote validation as AI-read pages.
 */
import type { Draft, Fact } from '../shared/schemas';
import type { Board } from './source-boards';
import type { PublicPage } from './providers';
import { evidenceListing, hash } from './evidence';
import { safeUrl } from './safe-url';
import { PublicError } from './errors';

export interface BoardPosting {
  url: string; title: string; organization: string; location: string; workplace: string;
  description: string; deadline: string | null; compensation: string;
}
export const internTitle = /\b(intern(?:ship|ships|s)?|studentship|summer student|co[- ]?op|student placement|working student|werkstudent|praktikum|stagiaire|trainee)\b/i;
const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', bull: '•' };
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
  return named[e.toLowerCase()] ?? m;
});
/** Plain text from (possibly entity-encoded) posting HTML. Markup is dropped, never rendered. */
export function htmlText(html: string) {
  const markup = /&lt;\/?[a-z]/i.test(html) ? decode(html) : html;
  return decode(markup
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<li[^>]*>/gi, '\n- ').replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/ul|\/ol|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .split('\n').map(line => line.replace(/[ \t\u00a0]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
const obj = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const str = (v: unknown, max = 2000) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const DESCRIPTION_MAX = 12000;


/** Postings from a Greenhouse, Lever or Ashby public feed (already fetched as JSON). */
export function feedPostings(board: Board, value: unknown): BoardPosting[] {
  const data = obj(value);
  const rows = board.platform === 'lever' ? value : data?.jobs;
  if (!Array.isArray(rows)) return [];
  const out: BoardPosting[] = [];
  for (const row of rows.slice(0, 3000)) {
    const job = obj(row); if (!job || job.isListed === false) continue;
    const title = str(job.title ?? job.text, 240);
    if (!internTitle.test(title)) continue;
    if (board.platform === 'greenhouse') out.push({
      url: str(job.absolute_url), title, organization: str(job.company_name, 160), location: str(obj(job.location)?.name, 300), workplace: '',
      description: htmlText(str(job.content, 60000)).slice(0, DESCRIPTION_MAX), deadline: str(job.application_deadline, 40) || null, compensation: '',
    });
    else if (board.platform === 'lever') {
      const lists = Array.isArray(job.lists) ? job.lists.map(obj).filter(Boolean).map(l => `${str(l!.text, 200)}\n${htmlText(str(l!.content, 20000))}`).join('\n\n') : '';
      out.push({
        url: str(job.hostedUrl), title, organization: '', location: str(obj(job.categories)?.location, 300), workplace: str(job.workplaceType, 40),
        description: [str(job.descriptionPlain, 30000), lists, str(job.additionalPlain, 20000)].filter(Boolean).join('\n\n').slice(0, DESCRIPTION_MAX), deadline: null, compensation: '',
      });
    } else if (board.platform === 'ashby') out.push({
      url: str(job.jobUrl), title, organization: '', location: str(job.location, 300), workplace: str(job.workplaceType, 40) || (job.isRemote === true ? 'Remote' : ''),
      description: str(job.descriptionPlain, 30000).slice(0, DESCRIPTION_MAX), deadline: null, compensation: str(obj(job.compensation)?.compensationTierSummary, 300),
    });
  }
  return out.filter(p => p.url.startsWith('https://'));
}

/** Workday's public career-site search (POST) has no GET feed. Its URL is derived from a validated board address. */
export function workdayBase(board: Board) {
  const url = new URL(board.url);
  if (!url.hostname.endsWith('.myworkdayjobs.com')) return null;
  const site = url.pathname.split('/').filter(Boolean).filter(p => !/^[a-z]{2}(-[A-Z]{2})?$/.test(p)).pop();
  if (!site || !/^[A-Za-z0-9_-]{1,100}$/.test(site) || !/^[a-z0-9-]{1,63}$/.test(board.tenant)) return null;
  return `https://${url.hostname}/wday/cxs/${board.tenant}/${site}`;
}
const BOARD_BYTES = 8_000_000;
/**
 * Documented public job-board JSON (fixed platform hosts built from a validated
 * tenant): read directly, with DNS safety, no redirects, a time limit and a
 * streamed size cap. Large boards exceed the page reader's response limit.
 */
async function boardJson(url: string, signal: AbortSignal, body?: unknown) {
  await safeUrl(url);
  let response: Response;
  try {
    response = await fetch(url, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
      headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new PublicError('provider_network', 'A public job board could not be reached.');
  }
  if (!response.ok) throw new PublicError('provider_failed', `A public job board returned HTTP ${response.status}.`);
  const chunks: Uint8Array[] = []; let bytes = 0;
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const next = await reader.read(); if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > BOARD_BYTES) { await reader.cancel(); throw new PublicError('provider_payload', 'A public job board returned more data than the safe limit.'); }
        chunks.push(next.value);
      }
    } catch (error) {
      if (signal.aborted || error instanceof PublicError) throw error;
      throw new PublicError('provider_network', 'A public job board response could not be read.');
    } finally { reader.releaseLock(); }
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; } catch { throw new PublicError('provider_payload', 'A public job board returned unreadable data.'); }
}
type Rank = (title: string, location: string) => number;
async function inBatches<T, R>(items: T[], size: number, signal: AbortSignal, task: (item: T) => Promise<R>) {
  const out: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.allSettled(items.slice(i, i + size).map(task)));
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  }
  return out;
}
/**
 * Internship postings from one public board: the internship titles on the
 * board (total) and full posting text for the most relevant `max` of them.
 */
export async function readBoardPostings(board: Board, signal: AbortSignal, rank: Rank, max = 12): Promise<{ total: number; postings: BoardPosting[] }> {
  const top = <T,>(rows: T[], title: (r: T) => string, location: (r: T) => string) => rows.sort((a, b) => rank(title(b), location(b)) - rank(title(a), location(a))).slice(0, max);
  if (board.platform === 'workday') {
    const base = workdayBase(board);
    if (!base) return { total: 0, postings: [] };
    const list = obj(await boardJson(`${base}/jobs`, signal, { appliedFacets: {}, limit: 20, offset: 0, searchText: 'intern' }));
    const rows = (Array.isArray(list?.jobPostings) ? list.jobPostings : []).map(obj)
      .filter((j): j is Record<string, unknown> => !!j && internTitle.test(str(j.title, 240)) && /^\/job\/[^?#]{1,400}$/.test(str(j.externalPath, 500)));
    const chosen = top(rows, r => str(r.title), r => str(r.locationsText));
    const host = new URL(board.url).hostname, postings: BoardPosting[] = [];
    for (const detail of await inBatches(chosen, 4, signal, row => boardJson(`${base}${str(row.externalPath, 500)}`, signal))) {
      const info = detail.status === 'fulfilled' ? obj(obj(detail.value)?.jobPostingInfo) : null;
      const title = str(info?.title, 240), url = str(info?.externalUrl);
      if (!info || !internTitle.test(title) || !url.startsWith(`https://${host}/`)) continue;
      postings.push({ url, title, organization: '', location: str(info.location, 300), workplace: '', description: htmlText(str(info.jobDescription, 80000)).slice(0, DESCRIPTION_MAX), deadline: null, compensation: '' });
    }
    return { total: rows.length, postings };
  }
  if (board.platform === 'greenhouse') {
    const list = obj(await boardJson(`https://boards-api.greenhouse.io/v1/boards/${board.tenant}/jobs`, signal));
    const rows = (Array.isArray(list?.jobs) ? list.jobs : []).map(obj)
      .filter((j): j is Record<string, unknown> => !!j && internTitle.test(str(j.title, 240)) && Number.isInteger(j.id));
    const chosen = top(rows, r => str(r.title), r => str(obj(r.location)?.name));
    const details = await inBatches(chosen, 4, signal, row => boardJson(`https://boards-api.greenhouse.io/v1/boards/${board.tenant}/jobs/${row.id}`, signal));
    return { total: rows.length, postings: feedPostings(board, { jobs: details.flatMap(d => d.status === 'fulfilled' ? [d.value] : []) }) };
  }
  if (board.platform === 'lever' || board.platform === 'ashby') {
    if (!board.feedUrl) return { total: 0, postings: [] };
    const all = feedPostings(board, await boardJson(board.feedUrl, signal));
    return { total: all.length, postings: top(all, p => p.title, p => p.location) };
  }
  return { total: 0, postings: [] };
}

/** Organization display name: the feed's own company name, a requested organization matching the board, or the board name as written in the posting. */
export function boardOrganization(board: Board, posting: BoardPosting, requested: string[]) {
  // A board's own title ("US Internships Public Careers Site") is not an organization name.
  const generic = /\b(careers?|jobs?|site|board|internships?|hiring|recruit\w*|openings|opportunities)\b/i;
  if (posting.organization.length >= 2 && !generic.test(posting.organization)) return posting.organization;
  if (/(careers?|jobs|site|board|internships|hiring|recruit)/i.test(board.tenant) && board.tenant.length > 12) {
    // Neither the feed nor the board address names the employer; say so rather than guess from free text.
    return `Employer not named by the board (“${(posting.organization || board.tenant).slice(0, 80)}”)`;
  }
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tenant = flat(board.tenant);
  const asked = requested.find(o => flat(o) === tenant);
  if (asked) return asked;
  const escaped = board.tenant.replace(/[^a-zA-Z0-9]/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const written = escaped.length >= 2 ? posting.description.match(new RegExp(`\\b${escaped}\\b`, 'i'))?.[0] : undefined;
  if (written && written !== written.toLowerCase()) return written;
  return board.tenant.length <= 4 ? board.tenant.toUpperCase() : board.tenant.charAt(0).toUpperCase() + board.tenant.slice(1);
}

const sentences = (text: string) => text.split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(s => s.length >= 12 && s.length <= 400);
const negativeVisa = /\b(no|not|cannot|unable|without|do not|does not|will not|won't|isn't|is not|are not)\b.{0,50}\b(visa|support|sponsor|assist|provid)\w*\b|\bvisas?\b.{0,60}\b(not|cannot|unavailable|won't|will not)\b/i;
const positiveVisa = /visa.{0,60}(support|sponsor|assist|provid)|(?:support|sponsor|assist|provid).{0,60}visa/i;
const pay = /(?:[$€£¥₹]\s?\d|\b\d[\d,.]*\s?(?:USD|EUR|GBP|CHF|JPY|INR|SGD|CAD)\b|\bper hour\b|\/\s?(?:hr|hour)\b|\bhourly (?:rate|pay|wage)\b|\bstipend\b|\bpaid internship\b|\bsalary range\b|\bpay range\b|\bbase pay\b)/i;

/** Quoted facts derived deterministically from the composed posting text. */
export function postingDraft(posting: BoardPosting, organization: string, sourceId: string): { draft: Draft; text: string } | null {
  const header = `${posting.title} · ${organization}`;
  const lines = [header, `Organization: ${organization}`];
  if (posting.location) lines.push(`Location: ${posting.location}`);
  if (posting.workplace) lines.push(`Workplace: ${posting.workplace}`);
  const deadlineDay = posting.deadline?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  if (deadlineDay) lines.push(`Application deadline: ${deadlineDay}`);
  if (posting.compensation) lines.push(`Compensation: ${posting.compensation}`);
  const text = `${lines.join('\n')}\n\n${posting.description}`;
  const fact = (kind: Fact['kind'], value: string, quote: string, due: Fact['due'] = null): Fact => ({ kind, value, quote: quote.slice(0, 400), sourceId, rule: null, due });
  const facts: Fact[] = [];
  if (posting.location) facts.push(fact('location', posting.location, `Location: ${posting.location}`));
  const where = `${posting.workplace} ${posting.location}`;
  const whereQuote = posting.workplace ? `Workplace: ${posting.workplace}` : `Location: ${posting.location}`;
  if (/\bremote\b/i.test(where)) facts.push(fact('remote', 'remote', whereQuote));
  else if (/\bhybrid\b/i.test(where)) facts.push(fact('remote', 'hybrid', whereQuote));
  else if (/\bon-?site\b|\bin[- ]office\b/i.test(where)) facts.push(fact('remote', 'onsite', whereQuote));
  if (deadlineDay) facts.push(fact('deadline', `Application deadline ${deadlineDay}`, `Application deadline: ${deadlineDay}`, { kind: 'dateOnly', at: deadlineDay, timezone: null }));
  const all = sentences(posting.description);
  const visa = all.find(s => /\bvisa|\bsponsor/i.test(s) && (negativeVisa.test(s) || positiveVisa.test(s)));
  if (visa) facts.push(fact('visa', negativeVisa.test(visa) ? 'unsupported' : 'supported', visa));
  const paid = posting.compensation ? `Compensation: ${posting.compensation}` : all.find(s => pay.test(s));
  if (paid) facts.push(fact('funding', 'partial', paid), fact('fundingBenefit', 'Paid position: pay or stipend stated', paid));
  const year = posting.title.match(/\b20\d{2}\b/)?.[0] ?? '';
  return { text, draft: { organization, title: posting.title, track: 'Company', identityQuote: header, cycleKey: year, facts: facts.slice(0, 8) } };
}

export function postingListing(posting: BoardPosting, board: Board, organization: string, ownership: string, official: boolean, fetchedAt: string) {
  const page: PublicPage = { url: posting.url, title: posting.title, text: '', links: [], fetchedAt, freshness: `Read from ${organization}'s public ${board.platform} job-board data at the time shown; postings can close without notice.` };
  // evidenceListing binds the source id from the page URL.
  const composed = postingDraft(posting, organization, hash(posting.url));
  if (!composed) return null;
  page.text = composed.text;
  return { page, listing: evidenceListing(composed.draft, page, ownership, official, { singlePosting: true }) };
}
