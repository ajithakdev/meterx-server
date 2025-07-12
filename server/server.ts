// TypeScript version of server.js

import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.raw({ type: 'application/octet-stream', limit: '200mb' }));

const testFileDir = path.join(__dirname, 'test-files');
if (!fs.existsSync(testFileDir)) {
    fs.mkdirSync(testFileDir);
}

const DOWNLOAD_FILE_MB_SERVER = 1;
const downloadFileName = `${DOWNLOAD_FILE_MB_SERVER}MB.bin`;
const downloadFilePath = path.join(testFileDir, downloadFileName);

if (!fs.existsSync(downloadFilePath)) {
    console.log(`Generating ${DOWNLOAD_FILE_MB_SERVER}MB dummy file...`);
    try {
        const buffer = Buffer.alloc(DOWNLOAD_FILE_MB_SERVER * 1024 * 1024);
        fs.writeFileSync(downloadFilePath, buffer);
        console.log(`Dummy file generated: ${downloadFilePath}`);
    } catch (e) {
        console.error('File generation failed:', e);
        process.exit(1);
    }
} else {
    console.log(`Dummy file ${downloadFileName} already exists.`);
}


app.get(`/test-file/${downloadFileName}`, (req: Request, res: Response) => {
    if (fs.existsSync(downloadFilePath)) {
        res.sendFile(downloadFilePath);
    } else {
        res.status(404).send(`File ${downloadFileName} not found.`);
    }
});


app.post('/upload', (req: Request, res: Response) => {
    res.status(200).send("Upload received!");
});


app.head('/ping', (req: Request, res: Response) => {
    res.status(200).end();
});
app.get('/ping', (req: Request, res: Response) => {
    res.status(200).send('Pong!');
});

app.listen(PORT, () => {
    console.log(`MeterX Test Server running on http://localhost:${PORT}`);
    console.log(`Download test: http://localhost:${PORT}/test-file/${downloadFileName}`);
});
