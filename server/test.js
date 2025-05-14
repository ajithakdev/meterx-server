const http = require('http');
const assert = require('assert');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const TIMEOUT = 5000; // 5 seconds

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(TIMEOUT, () => {
      req.abort();
      reject(new Error(`Request to ${url} timed out after ${TIMEOUT}ms`));
    });
    
    req.end();
  });
}

// Test cases
async function runTests() {
  console.log('Starting MeterX server tests...');
  
  try {
    // Test 1: Ping endpoint
    console.log('\nTest 1: Testing ping endpoint...');
    const pingResponse = await makeRequest(`${SERVER_URL}/ping`);
    assert.strictEqual(pingResponse.statusCode, 200, 'Ping endpoint should return 200 status code');
    console.log('✅ Ping endpoint test passed!');
    
    // Test 2: Download file endpoint
    console.log('\nTest 2: Testing download file endpoint...');
    const downloadResponse = await makeRequest(`${SERVER_URL}/test-file/1MB.bin`);
    assert.strictEqual(downloadResponse.statusCode, 200, 'Download endpoint should return 200 status code');
    assert(downloadResponse.headers['content-length'] > 0, 'Download file should have content');
    console.log('✅ Download endpoint test passed!');
    
    // Test 3: Upload endpoint
    console.log('\nTest 3: Testing upload endpoint...');
    const uploadResponse = await makeRequest(`${SERVER_URL}/upload`, 'POST');
    assert.strictEqual(uploadResponse.statusCode, 200, 'Upload endpoint should return 200 status code');
    console.log('✅ Upload endpoint test passed!');
    
    console.log('\n🎉 All tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running before starting tests
async function checkServerRunning() {
  try {
    await makeRequest(`${SERVER_URL}/ping`);
    return true;
  } catch (error) {
    console.error(`❌ Server is not running at ${SERVER_URL}`);
    console.error('Please start the server with "node server.js" before running tests');
    return false;
  }
}

// Main execution
(async () => {
  const isServerRunning = await checkServerRunning();
  if (isServerRunning) {
    await runTests();
  } else {
    process.exit(1);
  }
})();