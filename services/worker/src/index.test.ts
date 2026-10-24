import { describe, it, expect } from 'vitest';
import worker, { type Env } from './index';
import { VERSION } from '@meterx/shared';

const EXT = 'chrome-extension://abcdefghijklmnop';
const call = (path: string, init: RequestInit = {}, env: Env = {}) =>
    worker.fetch(new Request(`https://w.test${path}`, init), env);

describe('worker', () => {
    it('streams an allowed size with CORS and timing headers for extensions', async () => {
        const res = await call('/test-file/1MB.bin', { headers: { Origin: EXT } });
        expect(res.status).toBe(200);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(EXT);
        expect(res.headers.get('Timing-Allow-Origin')).toBe(EXT);
        expect((await res.arrayBuffer()).byteLength).toBe(1024 * 1024);
    });

    it.each(['99MB.bin', '025MB.bin', 'foo.txt'])('rejects %s', async (f) => {
        expect((await call(`/test-file/${f}`)).status).toBe(400);
    });

    it.each(['null', 'https://evil.example'])('sends no CORS headers for origin %s', async (origin) => {
        const res = await call('/ip', { headers: { Origin: origin } });
        expect(res.headers.has('Access-Control-Allow-Origin')).toBe(false);
        expect(res.headers.has('Timing-Allow-Origin')).toBe(false);
    });

    it('drains uploads and checks content type', async () => {
        const ok = await call('/upload', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(4096) });
        expect(ok.status).toBe(200);
        const bad = await call('/upload', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' });
        expect(bad.status).toBe(415);
    });

    it('returns a typed health response', async () => {
        const body = await (await call('/health')).json() as Record<string, unknown>;
        expect(body).toMatchObject({ status: 'ok', server: 'cloudflare-worker', version: VERSION });
        expect(typeof body.timestamp).toBe('number');
    });

    it('answers 429 when the rate limiter says no, but never for /health', async () => {
        const env: Env = { RATE_LIMITER: { limit: async () => ({ success: false }) } as unknown as RateLimit };
        expect((await call('/ping', {}, env)).status).toBe(429);
        expect((await call('/health', {}, env)).status).toBe(200);
    });

    it('404s unknown routes', async () => {
        expect((await call('/nope')).status).toBe(404);
    });
});
