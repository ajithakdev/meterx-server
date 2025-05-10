// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// const PORT = 3000;
const PORT = process.env.PORT || 3000; // New line

app.use(cors());
app.use(express.raw({ type: 'application/octet-stream', limit: '200mb' })); // Increased limit

const testFileDir = path.join(__dirname, 'test-files');
if (!fs.existsSync(testFileDir)){
    fs.mkdirSync(testFileDir);
}

// --- ADJUST THIS TO MATCH background.js ---
const DOWNLOAD_FILE_MB_SERVER = 1; // Match DOWNLOAD_FILE_MB in background.js
// --- ---

const downloadFileName = `${DOWNLOAD_FILE_MB_SERVER}MB.bin`; // Use server's file size
const downloadFilePath = path.join(testFileDir, downloadFileName);

if (!fs.existsSync(downloadFilePath)) {
    console.log(`Generating ${DOWNLOAD_FILE_MB_SERVER}MB dummy file... This might take a moment.`);
    try {
        const buffer = Buffer.alloc(DOWNLOAD_FILE_MB_SERVER * 1024 * 1024);
        // Optionally fill with some pattern if pure zeros cause issues with some proxies/AVs (unlikely for local)
        // for (let i = 0; i < buffer.length; i++) buffer[i] = i % 256;
        fs.writeFileSync(downloadFilePath, buffer);
        console.log(`Dummy file generated: ${downloadFilePath}`);
    } catch (e) {
        console.error("File generation failed:", e); // More descriptive error
        process.exit(1); // Exit server if file creation fails
    }
} else {
    console.log(`Dummy file ${downloadFileName} already exists.`);
}

// Endpoint for Download Test
app.get(`/test-file/${downloadFileName}`, (req, res) => {
    console.log("Download request received!"); 
    if (fs.existsSync(downloadFilePath)) {
        res.sendFile(downloadFilePath);
    } else {
        res.status(404).send(`File ${downloadFileName} not found. Please restart server to generate.`);
    }
});

app.post('/upload', (req, res) => {
    res.status(200).send('Upload received by devMama\'s awesome server! 😉');
});

app.head('/ping', (req, res) => {
    res.status(200).end();
});
app.get('/ping', (req, res) => {
    res.status(200).send('Pong from devMama! 🏓');
});

app.listen(PORT, () => {
    console.log(`MeterX Test Server (devMama edition) running on http://localhost:${PORT}`);
    console.log(`Download test: http://localhost:${PORT}/test-file/${downloadFileName}`);
});