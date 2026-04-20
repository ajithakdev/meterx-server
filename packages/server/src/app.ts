/**
 * MeterX Speed Test Server
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 * @version 2026.0.319-MR1.0
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';

const app = express();

// Trust proxy (required behind Render/Cloudflare/nginx reverse proxies)
app.set('trust proxy', 1);

// --- CORS ---
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000'];

app.use(cors({
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin) return callback(null, true);
        if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
            return callback(null, true);
        }
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    }
}));

// --- Rate limiting ---
// Higher buckets to allow multi-stream duration-based tests (4 parallel x ~8s window
// can emit 8-16 requests per test). Ping probes the loaded-ping probe needs room too.
const pingLimiter = rateLimit({ windowMs: 60000, max: 240, standardHeaders: true, legacyHeaders: false, message: 'Too many ping requests.' });
const downloadLimiter = rateLimit({ windowMs: 60000, max: 120, standardHeaders: true, legacyHeaders: false, message: 'Too many download requests.' });
const uploadLimiter = rateLimit({ windowMs: 60000, max: 120, standardHeaders: true, legacyHeaders: false, message: 'Too many upload requests.' });

app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// --- Test files ---
const ALLOWED_FILE_SIZES = [1, 5, 10, 25];
const testFileDir = path.join(__dirname, '..', 'test-files');
if (!fs.existsSync(testFileDir)) fs.mkdirSync(testFileDir, { recursive: true });

function ensureTestFile(sizeMB: number): void {
    const filePath = path.join(testFileDir, `${sizeMB}MB.bin`);
    if (!fs.existsSync(filePath)) {
        try {
            fs.writeFileSync(filePath, Buffer.alloc(sizeMB * 1024 * 1024));
        } catch (e) {
            console.error(`File generation failed for ${sizeMB}MB:`, e);
        }
    }
}

// Pre-generate default
ensureTestFile(parseInt(process.env.DOWNLOAD_FILE_MB || '1', 10));

// --- Endpoints ---

app.get('/test-file/:filename', downloadLimiter, (req: Request, res: Response) => {
    const filename = req.params.filename as string;
    const match = filename.match(/^(\d+)MB\.bin$/);
    if (!match) { res.status(400).send('Invalid file name. Use format: {size}MB.bin'); return; }
    const sizeMB = parseInt(match[1], 10);
    if (!ALLOWED_FILE_SIZES.includes(sizeMB)) { res.status(400).send(`Invalid size. Allowed: ${ALLOWED_FILE_SIZES.join(', ')}MB`); return; }

    const filePath = path.join(testFileDir, String(filename));
    if (!fs.existsSync(filePath)) ensureTestFile(sizeMB);
    if (fs.existsSync(filePath)) { res.sendFile(filePath); }
    else { res.status(500).send('Failed to generate test file.'); }
});

app.post('/upload', uploadLimiter, (req: Request, res: Response) => {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/octet-stream')) {
        res.status(415).send('Unsupported Media Type. Expected application/octet-stream.');
        return;
    }
    res.status(200).send('Upload received.');
});

app.head('/ping', pingLimiter, (_req: Request, res: Response) => { res.status(200).end(); });
app.get('/ping', pingLimiter, (_req: Request, res: Response) => { res.status(200).send('Pong!'); });
app.get('/health', (_req: Request, res: Response) => { res.status(200).json({ status: 'ok', version: '2026.0.319-MR1.0' }); });

app.get('/ip', pingLimiter, (req: Request, res: Response) => {
    const ip = String(req.ip || '');
    const family: 'ipv4' | 'ipv6' | 'unknown' = ip.includes(':') ? 'ipv6' : ip.match(/^\d+\.\d+\.\d+\.\d+$/) ? 'ipv4' : 'unknown';
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Timing-Allow-Origin', '*');
    res.status(200).json({ ip, family });
});

export default app;
