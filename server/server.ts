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

// Generate test files of different sizes
const fileSizes = [1, 10, 25]; // MB sizes
fileSizes.forEach(size => {
    const fileName = `${size}MB.bin`;
    const filePath = path.join(testFileDir, fileName);
    
    if (!fs.existsSync(filePath)) {
        console.log(`Generating ${size}MB dummy file...`);
        try {
            const buffer = Buffer.alloc(size * 1024 * 1024);
            fs.writeFileSync(filePath, buffer);
            console.log(`Dummy file generated: ${filePath}`);
        } catch (e) {
            console.error(`File generation failed for ${fileName}:`, e);
        }
    } else {
        console.log(`Dummy file ${fileName} already exists.`);
    }
});

// Serve all test files
app.get('/test-file/:fileName', (req: Request, res: Response) => {
    const fileName = req.params.fileName;
    const filePath = path.join(testFileDir, fileName);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send(`File ${fileName} not found.`);
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
