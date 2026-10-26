import { createHmac, timingSafeEqual } from 'node:crypto';
import { PublicError } from './errors';

const sign = (id: string, secret: string) => createHmac('sha256', secret).update(id).digest('hex');

export function readOwnerCookie(header: string | undefined, secret: string): string | null {
  const raw = header?.split(';').map(s => s.trim()).find(s => s.startsWith('planner_owner='))?.slice(14);
  const [id, signature, extra] = raw?.split('.') ?? [];
  if (!id || !signature || extra || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  return timingSafeEqual(Buffer.from(sign(id, secret)), Buffer.from(signature)) ? id : null;
}

export function ownerCookie(id: string, secret: string, secure: boolean): string {
  // CHIPS retains this HttpOnly marker inside the preview iframe even when
  // unpartitioned third-party cookies are blocked. Nothing is exposed to JS.
  return `planner_owner=${id}.${sign(id, secret)}; HttpOnly; Path=/; Max-Age=86400; SameSite=${secure ? 'None' : 'Lax'}${secure ? '; Secure; Partitioned' : ''}`;
}

export function requireOwnerCookie(present: boolean): void {
  if (!present) throw new PublicError('session_unavailable',
    'Your browser could not keep the search session. Open the app in a new tab, reload it, then try again. Your saved progress is unchanged.', 403);
}
