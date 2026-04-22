import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app.js';

describe('GET /ping', () => {
    it('returns 200 with Pong', async () => {
        const res = await request(app).get('/ping');
        expect(res.status).toBe(200);
        expect(res.text).toBe('Pong!');
    });
});

describe('HEAD /ping', () => {
    it('returns 200', async () => {
        const res = await request(app).head('/ping');
        expect(res.status).toBe(200);
    });
});

describe('GET /health', () => {
    it('returns ok status', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok', version: '2026.0.319-MR1.0' });
    });
});

describe('GET /test-file/:filename', () => {
    it('serves 1MB.bin', async () => {
        const res = await request(app).get('/test-file/1MB.bin');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/octet-stream/);
    });

    it('rejects invalid filename', async () => {
        const res = await request(app).get('/test-file/foo.txt');
        expect(res.status).toBe(400);
    });

    it('rejects disallowed size', async () => {
        const res = await request(app).get('/test-file/99MB.bin');
        expect(res.status).toBe(400);
    });
});

describe('GET /ip', () => {
    it('returns connecting IP and family', async () => {
        const res = await request(app).get('/ip');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('family');
        expect(['ipv4', 'ipv6', 'unknown']).toContain(res.body.family);
    });

    it('sets Timing-Allow-Origin', async () => {
        const res = await request(app).get('/ip');
        expect(res.headers['timing-allow-origin']).toBe('*');
    });
});

describe('POST /upload', () => {
    it('accepts octet-stream upload', async () => {
        const res = await request(app)
            .post('/upload')
            .set('Content-Type', 'application/octet-stream')
            .send(Buffer.alloc(1024));
        expect(res.status).toBe(200);
    });

    it('rejects wrong content type', async () => {
        const res = await request(app)
            .post('/upload')
            .set('Content-Type', 'text/plain')
            .send('hello');
        expect(res.status).toBe(415);
    });
});
