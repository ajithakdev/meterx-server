/**
 * MeterX self-host speed test server (same API contract as the Worker).
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Readable } from 'stream';
import {
    VERSION, TEST_FILE_RE, MAX_UPLOAD_BYTES, isExtensionOrigin, ipFamily,
    type HealthResponse, type IpInfo,
} from '@meterx/shared';

const app = express();

// Trust one proxy hop (Render, Cloudflare, nginx) so req.ip is the client.
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());

// Disallowed origins get no CORS headers (the browser blocks them), not a 500 (#81).
app.use(cors({ origin: (origin, cb) => cb(null, !origin || isExtensionOrigin(origin) || ALLOWED_ORIGINS.includes(origin)) }));

// Lets the extension read DNS timing on every route (#82).
app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && res.getHeader('Access-Control-Allow-Origin') === origin) res.setHeader('Timing-Allow-Origin', origin);
    res.setHeader('Cache-Control', 'no-store');
    next();
});

// Sized for one test (about 150 requests) plus a retry within the minute.
const limiter = (max: number) => rateLimit({ windowMs: 60_000, limit: max, standardHeaders: true, legacyHeaders: false, message: 'Too many requests.' });
const pingLimiter = limiter(240);
const downloadLimiter = limiter(120);
const uploadLimiter = limiter(600);

const CHUNK = Buffer.alloc(64 * 1024);

app.get('/test-file/:filename', downloadLimiter, (req: Request, res: Response) => {
    const name = String(req.params.filename);
    if (!TEST_FILE_RE.test(name)) { res.status(400).send('Invalid file. Use 1MB.bin, 5MB.bin, 10MB.bin or 25MB.bin.'); return; }
    let left = parseInt(name, 10) * 1024 * 1024;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(left));
    Readable.from((function* () {
        while (left > 0) { const n = Math.min(CHUNK.length, left); left -= n; yield n === CHUNK.length ? CHUNK : CHUNK.subarray(0, n); }
    })()).pipe(res);
});

// Drain the body without buffering it (#85).
app.post('/upload', uploadLimiter, (req: Request, res: Response) => {
    if (!(req.headers['content-type'] || '').includes('application/octet-stream')) {
        res.status(415).send('Unsupported Media Type. Expected application/octet-stream.');
        return;
    }
    let received = 0;
    req.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_UPLOAD_BYTES && !res.headersSent) { res.status(413).send('Payload too large'); req.destroy(); }
    });
    req.on('end', () => { if (!res.headersSent) res.status(200).send('Upload received.'); });
});

app.head('/ping', pingLimiter, (_req: Request, res: Response) => { res.status(200).end(); });
app.get('/ping', pingLimiter, (_req: Request, res: Response) => { res.status(200).send('Pong!'); });

app.get('/health', (_req: Request, res: Response) => {
    const body: HealthResponse = { status: 'ok', server: 'express', version: VERSION, timestamp: Date.now() };
    res.json(body);
});

app.get('/ip', pingLimiter, (req: Request, res: Response) => {
    const ip = String(req.ip || '');
    const info: IpInfo = { ip, family: ipFamily(ip) };
    res.json(info);
});

export default app;
