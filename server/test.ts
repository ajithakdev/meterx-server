// TypeScript version of test.js
import http from 'http';
import assert from 'assert';

const SERVER_URL = 'http://localhost:3000';
const TIMEOUT = 5000;

function makeRequest(url: string, method: string = 'GET'): Promise<{statusCode: number, headers: http.IncomingHttpHeaders, data: string}> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode || 0, headers: res.headers, data });
            });
        });
        req.on('error', (error) => { reject(error); });
        req.setTimeout(TIMEOUT, () => {
            req.abort();
            reject(new Error(`Request to ${url} timed out after ${TIMEOUT}ms`));
        });
        req.end();
    });
}

async function runTests() {
    console.log('Starting MeterX server tests...');
    try {
        const pingResponse = await makeRequest(`${SERVER_URL}/ping`);
        assert.strictEqual(pingResponse.statusCode, 200);
        console.log('✅ Ping endpoint test passed!');

        const downloadResponse = await makeRequest(`${SERVER_URL}/test-file/1MB.bin`);
        assert.strictEqual(downloadResponse.statusCode, 200);
        assert(Number(downloadResponse.headers['content-length']) > 0);
        console.log('✅ Download endpoint test passed!');

        const uploadResponse = await makeRequest(`${SERVER_URL}/upload`, 'POST');
        assert.strictEqual(uploadResponse.statusCode, 200);
        console.log('✅ Upload endpoint test passed!');

        console.log('\n🎉 All tests passed successfully!');
    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

async function checkServerRunning() {
    try {
        await makeRequest(`${SERVER_URL}/ping`);
        return true;
    } catch (error) {
        console.error(`❌ Server is not running at ${SERVER_URL}`);
        return false;
    }
}

(async () => {
    const isServerRunning = await checkServerRunning();
    if (isServerRunning) {
        await runTests();
    } else {
        process.exit(1);
    }
})();
