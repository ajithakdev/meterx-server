import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { VERSION } from '@meterx/shared';
import app from './app';

const EXT = 'chrome-extension://abcdefghijklmnop';

describe('GET/HEAD /ping', () => {
    it('GET returns Pong', async () => {
        const res = await request(app).get('/ping');
        expect(res.status).toBe(200);
        expect(res.text).toBe('Pong!');
    });

    it('HEAD returns 200', async () => {
        expect((await request(app).head('/ping')).status).toBe(200);
    });
});

describe('GET /health', () => {
    it('matches the shared HealthResponse shape', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'ok', server: 'express', version: VERSION });
        expect(typeof res.body.timestamp).toBe('number');
    });
});

describe('GET /test-file/:filename', () => {
    it('streams 1MB.bin', async () => {
        const res = await request(app).get('/test-file/1MB.bin').buffer(true).parse((r, cb) => {
            let n = 0; r.on('data', (c: Buffer) => { n += c.length; }); r.on('end', () => cb(null, n));
        });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/octet-stream/);
        expect(res.body).toBe(1024 * 1024);
    });

    it.each(['foo.txt', '99MB.bin', '025MB.bin'])('rejects %s with 400', async (f) => {
        expect((await request(app).get(`/test-file/${f}`)).status).toBe(400);
    });
});

describe('CORS', () => {
    it('allows extension origins and sends Timing-Allow-Origin', async () => {
        const res = await request(app).get('/ping').set('Origin', EXT);
        expect(res.headers['access-control-allow-origin']).toBe(EXT);
        expect(res.headers['timing-allow-origin']).toBe(EXT);
    });

    it.each(['https://evil.example', 'null'])('blocks %s without a 500', async (origin) => {
        const res = await request(app).get('/ping').set('Origin', origin);
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});

describe('GET /ip', () => {
    it('returns connecting IP and family', async () => {
        const res = await request(app).get('/ip');
        expect(res.status).toBe(200);
        expect(['ipv4', 'ipv6', 'unknown']).toContain(res.body.family);
    });
});

describe('POST /upload', () => {
    it('accepts octet-stream upload', async () => {
        const res = await request(app).post('/upload').set('Content-Type', 'application/octet-stream').send(Buffer.alloc(1024));
        expect(res.status).toBe(200);
    });

    it('rejects wrong content type', async () => {
        const res = await request(app).post('/upload').set('Content-Type', 'text/plain').send('hello');
        expect(res.status).toBe(415);
    });
});
