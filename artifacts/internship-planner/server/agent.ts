import { z } from 'zod';
import type { PublicPage } from './providers';
import { delay } from './providers';
import { reserveAgent, settleAgent, type AgentReservation } from './store';
import { normalizedHost, safeUrl } from './safe-url';
import { PublicError, publicMessage } from './errors';

/**
 * Paid TinyFish Agent fallback: a real browser reads a public page that TinyFish
 * Fetch could not read. Opt-in via TINYFISH_AGENT_FALLBACK=on, capped per run,
 * per day (store ledger) and per account wallet; never tops up the wallet.
 * The captured text goes through the same quote/ownership validation as Fetch.
 */
export const AGENT_STEP_MICRO_USD = 16_000; // $0.016 per step, TinyFish pricing page (checked 2026-10-24)
/** max_steps is beta-gated (403 for non-beta keys), so duration bounds a run; reserve 25 steps first. */
const RESERVE_STEPS = 25;
const MIN_WALLET_USD = 1;
const BASE = 'https://agent.tinyfish.ai';
let active = 0;

export function agentEnabled() { return process.env.TINYFISH_AGENT_FALLBACK === 'on' && !!process.env.TINYFISH_API_KEY; }

const Wallet = z.object({ available_balance: z.string(), currency: z.string(), auto_reload: z.object({ state: z.string() }).passthrough() }).passthrough();
const Created = z.object({ run_id: z.string().min(1).max(200).nullable(), error: z.unknown().nullable().optional() }).passthrough();
const Run = z.object({
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  num_of_steps: z.number().int().min(0).nullable().optional(),
  result: z.unknown().nullable().optional(),
  error: z.object({ code: z.string().optional(), category: z.string().optional() }).passthrough().nullable().optional(),
}).passthrough();
const Captured = z.object({
  title: z.string().max(400).default(''),
  url: z.string().max(2000),
  text: z.string().max(20000),
  links: z.array(z.object({ text: z.string().max(400).default(''), url: z.string().max(2000) })).max(40).default([]),
});
const outputSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    url: { type: 'string' },
    text: { type: 'string' },
    links: { type: 'array', maxItems: 12, items: { type: 'object', properties: { text: { type: 'string' }, url: { type: 'string' } }, required: ['url'] } },
  },
  required: ['title', 'url', 'text', 'links'],
};
export function agentGoal() {
  return [
    'You are reading a public internship, studentship or careers page on behalf of a student.',
    'Do not sign in, create an account, apply, upload anything or submit any form. Only dismiss a cookie banner if it hides the content.',
    'Wait for the page content to load. If it lists openings or programmes, scroll until the whole list has loaded.',
    'Return: title (the page title); url (the final page URL); text (the visible main-content text copied verbatim, not summarised or reworded, up to about 3500 characters, prioritising programme description, eligibility, funding or stipend, deadlines, how to apply and listed internship titles);',
    'links (up to 12 links to individual internship, programme or eligibility pages, with their visible text and full URL).',
    'If the page has no relevant content, return an empty text.',
  ].join(' ');
}

async function call(path: string, init: RequestInit, signal: AbortSignal, timeoutMs = 20000) {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new PublicError('configuration', 'TinyFish is not configured.');
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers: { 'X-API-Key': key, 'Content-Type': 'application/json' }, signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new PublicError('provider_network', 'TinyFish Agent could not be reached.');
  }
  const text = await response.text();
  if (!response.ok) {
    console.warn(JSON.stringify({ stage: 'provider', operation: 'TinyFish Agent', path: path.replace(/[0-9a-f-]{16,}/gi, ':id'), status: response.status }));
    throw new PublicError(response.status === 402 ? 'provider_payment' : response.status === 429 ? 'provider_limit' : 'agent_failed',
      response.status === 402 ? 'TinyFish Agent requires wallet funds. No wallet top-up was made.' :
      response.status === 403 ? 'TinyFish Agent access is not enabled for this key.' :
      response.status === 429 ? 'TinyFish Agent is at its concurrency or rate limit.' : `TinyFish Agent could not run (HTTP ${response.status}).`);
  }
  try { return JSON.parse(text) as unknown; } catch { throw new PublicError('agent_failed', 'TinyFish Agent returned an unreadable response.'); }
}

/** Refuses Agent work unless the wallet can pay without any automatic top-up. */
export async function walletAllowsAgent(signal: AbortSignal): Promise<string | null> {
  const wallet = Wallet.safeParse(await call('/v1/wallet', { method: 'GET' }, signal));
  if (!wallet.success) return 'TinyFish wallet state could not be verified; Agent was not started.';
  if (wallet.data.auto_reload.state === 'on') return 'TinyFish wallet auto-reload is on; Agent stays off so no top-up can be triggered.';
  const balance = Number(wallet.data.available_balance);
  if (wallet.data.currency !== 'USD' || !Number.isFinite(balance) || balance < MIN_WALLET_USD) return 'TinyFish wallet balance is below the safe minimum; Agent was not started. No top-up was made.';
  return null;
}

export interface AgentRead { page: PublicPage | null; error: string | null; steps: number | null; costUsd: number | null }

export async function readWithAgent(url: string, signal: AbortSignal, options: { maxSeconds: number; stealth?: boolean; runId?: string; deadlineAt?: number }): Promise<AgentRead> {
  const none = (error: string): AgentRead => ({ page: null, error, steps: null, costUsd: null });
  if (!agentEnabled()) return none('TinyFish Agent fallback is off.');
  const seconds = Math.floor(Math.min(120, options.maxSeconds));
  if (seconds < 45) return none('Too little run time remained for a capped Agent read.');
  if (active >= 2) return none('Both TinyFish Agent slots are busy; Agent was not started.');
  active++;
  let runId: string | null = null, reservation: AgentReservation | null = null;
  try {
    const requested = await safeUrl(url);
    const walletProblem = await walletAllowsAgent(signal);
    if (walletProblem) return none(walletProblem);
    reservation = await reserveAgent(RESERVE_STEPS * AGENT_STEP_MICRO_USD);
    const created = Created.parse(await call('/v1/automation/run-async', { method: 'POST', body: JSON.stringify({
      url: requested, goal: agentGoal(), output_schema: outputSchema,
      browser_profile: options.stealth ? 'stealth' : 'lite',
      agent_config: { max_duration_seconds: seconds },
    }) }, signal));
    runId = created.run_id;
    if (!runId) return none('TinyFish Agent did not start a run.');
    // TinyFish runs observed to overrun max_duration_seconds (e.g. 140s for 5 steps); the caller's deadline wins.
    const localDeadline = Math.min(Date.now() + (seconds + 45) * 1000, options.deadlineAt ?? Infinity);
    let run: z.infer<typeof Run> | null = null;
    while (Date.now() < localDeadline) {
      await delay(4000, signal);
      const polled = Run.safeParse(await call(`/v1/runs/${encodeURIComponent(runId)}`, { method: 'GET' }, signal));
      if (polled.success && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(polled.data.status)) { run = polled.data; break; }
    }
    if (!run) {
      const steps = await cancelAndCount(runId, reservation); runId = null; reservation = null;
      return { ...none('TinyFish Agent did not finish inside this run’s time limit and was cancelled.'), steps, costUsd: steps === null ? null : steps * AGENT_STEP_MICRO_USD / 1_000_000 };
    }
    runId = null;
    const steps = run.num_of_steps ?? null, micro = steps === null ? null : steps * AGENT_STEP_MICRO_USD;
    await settleAgent(reservation, micro); reservation = null;
    const costUsd = micro === null ? null : micro / 1_000_000;
    console.log(JSON.stringify({ stage: 'agent', runId: options.runId, status: run.status, steps, costUsd, code: run.error?.code ?? null }));
    if (run.status !== 'COMPLETED') return { ...none(run.error?.code === 'SITE_BLOCKED' ? 'The site also blocked TinyFish Agent.' : `TinyFish Agent ended as ${run.status.toLowerCase()}.`), steps, costUsd };
    const captured = Captured.safeParse(run.result);
    if (!captured.success || captured.data.text.trim().length < 40) return { ...none('TinyFish Agent returned no usable page text.'), steps, costUsd };
    let finalUrl = requested;
    try { const candidate = await safeUrl(new URL(captured.data.url, requested).href); if (normalizedHost(candidate) === normalizedHost(requested)) finalUrl = candidate; } catch { /* keep requested URL */ }
    const links = captured.data.links.flatMap(l => { try { const u = new URL(l.url, finalUrl); return u.protocol === 'https:' ? [u.href] : []; } catch { return []; } }).slice(0, 40);
    const page: PublicPage = {
      url: finalUrl, title: captured.data.title.slice(0, 300), text: captured.data.text.slice(0, 24000), links,
      fetchedAt: new Date().toISOString(),
      freshness: `Read by TinyFish Agent in a real browser after Fetch could not read it (${steps ?? '?'} steps). Text is as captured by the Agent; quotes are still checked against it.`,
    };
    return { page, error: null, steps, costUsd };
  } catch (error) {
    if (runId) await cancelAndCount(runId, reservation);
    if (signal.aborted) throw error;
    return none(publicMessage(error));
  } finally {
    // A reservation that never settled stays counted: unknown spend is assumed spent.
    active--;
  }
}

/** Cancels a run, then settles its reported steps; if they cannot be read the reservation stays counted. */
async function cancelAndCount(runId: string, reservation: AgentReservation | null): Promise<number | null> {
  const fresh = new AbortController().signal, path = `/v1/runs/${encodeURIComponent(runId)}`;
  try { await call(`${path}/cancel`, { method: 'POST' }, fresh, 10000); } catch { /* Best effort; the server-side duration limit still applies. */ }
  try {
    const run = Run.safeParse(await call(path, { method: 'GET' }, fresh, 10000));
    const steps = run.success && run.data.status !== 'PENDING' && run.data.status !== 'RUNNING' ? run.data.num_of_steps ?? null : null;
    if (reservation && steps !== null) await settleAgent(reservation, steps * AGENT_STEP_MICRO_USD);
    console.log(JSON.stringify({ stage: 'agent', status: 'CANCELLED_BY_APP', steps }));
    return steps;
  } catch { return null; }
}
