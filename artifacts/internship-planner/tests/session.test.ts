import { afterEach, describe, expect, it, vi } from 'vitest';
import { ownerCookie, readOwnerCookie, requireOwnerCookie } from '../server/owner';
import { ApiError, api } from '../src/lib/api';

const fixtureKey = 'not-a-live-key-only-a-unit-test-fixture';
const id = 'ac3d83ca-b759-4918-a058-41f0c5c79cac';
const pair = () => ownerCookie(id, fixtureKey, true).split(';')[0];

describe('embedded search ownership', () => {
  it('uses a secure partitioned HttpOnly cookie with no Domain attribute', () => {
    const header = ownerCookie(id, fixtureKey, true);
    expect(header).toContain('; Secure; Partitioned');
    expect(header).toContain('; HttpOnly; Path=/; Max-Age=86400; SameSite=None');
    expect(header).not.toContain('Domain=');
  });
  it('retains local HTTP testing without invalid secure cookie attributes', () => {
    const header = ownerCookie(id, fixtureKey, false);
    expect(header).toContain('SameSite=Lax');
    expect(header).not.toContain('Secure');
    expect(header).not.toContain('Partitioned');
  });
  it('recognizes the signed marker among other cookies', () => {
    expect(readOwnerCookie(`other=value; ${pair()}; third=value`, fixtureKey)).toBe(id);
  });
  it('rejects a marker signed with another key', () => {
    expect(readOwnerCookie(pair(), 'another-unit-test-fixture')).toBeNull();
  });
  it('rejects a changed identifier even with the old signature', () => {
    expect(readOwnerCookie(pair().replace(id, 'bc3d83ca-b759-4918-a058-41f0c5c79cac'), fixtureKey)).toBeNull();
  });
  it.each([undefined, '', 'planner_owner=bad', 'planner_owner=../../etc/passwd.signature', `${pair()}.extra`])('rejects missing or malformed cookies', header => {
    expect(readOwnerCookie(header, fixtureKey)).toBeNull();
  });
  it('fails closed before metered work when no retained cookie was recognized', () => {
    expect(() => requireOwnerCookie(false)).toThrowError(expect.objectContaining({code:'session_unavailable',status:403}));
    expect(() => requireOwnerCookie(true)).not.toThrow();
  });
});

describe('search recovery error contract', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('retains the unavailable-run code rather than only a generic message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:'unknown_run',message:'Search unavailable'}}),{status:404})));
    await expect(api('/api/searches/missing')).rejects.toMatchObject({code:'unknown_run',status:404,message:'Search unavailable'});
  });
  it('handles a non-JSON proxy response without leaking the response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private proxy diagnostics',{status:502})));
    await expect(api('/api/bootstrap')).rejects.toBeInstanceOf(ApiError);
    await expect(api('/api/bootstrap')).rejects.toMatchObject({code:'invalid_response',status:502,message:'The server response could not be read. Your progress is preserved.'});
  });
  it('keeps API requests same-origin and credentials in cookies, not JS tokens', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({runId:'test'})));
    vi.stubGlobal('fetch', request);
    await api('/api/searches',{preferences:{}});
    expect(request).toHaveBeenCalledWith('/api/searches',expect.objectContaining({method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'}}));
  });
});
