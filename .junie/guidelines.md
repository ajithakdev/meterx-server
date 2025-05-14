# MeterX Development Guidelines

This document provides essential information for developers working on the MeterX project. It includes build/configuration instructions, testing information, and additional development details.

## Build and Configuration Instructions

### Server Setup

1. **Prerequisites**:
   - Node.js (LTS version recommended)
   - npm or yarn

2. **Installation**:
   ```powershell
   # Navigate to the server directory
   cd server
   
   # Install dependencies
   npm install
   ```

3. **Configuration**:
   - The server uses port 3000 by default
   - You can modify the port by changing the `PORT` environment variable or updating the `PORT` constant in `server.js`
   - Test files are stored in the `test-files` directory
   - The server automatically generates test files of different sizes (1MB, 10MB, 25MB) if they don't exist

4. **Running the Server**:
   ```powershell
   # Start the server
   npm start
   
   # Or directly with Node.js
   node server.js
   ```

### Extension Setup

1. **Prerequisites**:
   - Chrome, Edge, or Firefox browser

2. **Loading the Extension**:
   - Chrome/Edge:
     ```
     1. Open chrome://extensions or edge://extensions
     2. Enable "Developer mode"
     3. Click "Load unpacked"
     4. Select the "extension" directory
     ```
   - Firefox:
     ```
     1. Open about:debugging#/runtime/this-firefox
     2. Click "Load Temporary Add-on"
     3. Select the manifest.json file in the "extension" directory
     ```

3. **Configuration**:
   - The extension is configured to use the live server at `https://meterx-speedtest-server.onrender.com`
   - To use a local server, modify `TEST_SERVER_BASE_URL` in `extension/background.js`:
     ```javascript
     // Change this:
     const TEST_SERVER_BASE_URL = 'https://meterx-speedtest-server.onrender.com';
     // To this:
     const TEST_SERVER_BASE_URL = 'http://localhost:3000';
     ```

## Testing Information

### Server Testing

1. **Running Tests**:
   ```powershell
   # Navigate to the server directory
   cd server
   
   # Start the server in one terminal
   npm start
   
   # Run tests in another terminal
   npm test
   ```

2. **Test Coverage**:
   - The test script (`test.js`) verifies the following endpoints:
     - `/ping`: Checks server responsiveness
     - `/test-file/1MB.bin`: Verifies download functionality
     - `/upload`: Confirms upload endpoint works

3. **Adding New Tests**:
   - Add new test cases to the `runTests()` function in `test.js`
   - Follow the existing pattern:
     ```javascript
     // Test example: New endpoint
     console.log('\nTest 4: Testing new endpoint...');
     const response = await makeRequest(`${SERVER_URL}/new-endpoint`);
     assert.strictEqual(response.statusCode, 200, 'New endpoint should return 200 status code');
     console.log('✅ New endpoint test passed!');
     ```

4. **Testing Different File Sizes**:
   - The server supports multiple file sizes (1MB, 10MB, 25MB)
   - To test different file sizes, modify the URL in the test:
     ```javascript
     // Change this:
     const downloadResponse = await makeRequest(`${SERVER_URL}/test-file/1MB.bin`);
     // To this:
     const downloadResponse = await makeRequest(`${SERVER_URL}/test-file/10MB.bin`);
     ```

### Extension Testing

The extension doesn't have automated tests. Manual testing can be performed as follows:

1. Load the extension in your browser
2. Click the extension icon to open the popup
3. Click "Start Test" to run the speed test
4. Verify the results display correctly

## Code Style and Development Guidelines

1. **JavaScript Style**:
   - The project uses ESLint for code quality
   - ECMAScript 2021 features are supported
   - Run linting with:
     ```powershell
     # From the project root
     npm run lint:fix
     ```

2. **Project Structure**:
   - `server/`: Contains the Node.js/Express server
     - `server.js`: Main server implementation
     - `test.js`: Server tests
     - `test-files/`: Binary files for download tests
     - `uploads/`: Directory for upload test files
   - `extension/`: Contains the browser extension
     - `background.js`: Background script for the extension
     - `popup.html`, `popup.css`, `popup.js`: Extension UI
     - `manifest.json`: Extension configuration
   - `.junie/`: Development guidelines and documentation

3. **Debugging Tips**:
   - Server logs are output to the console
   - For extension debugging:
     - Chrome/Edge: Right-click the extension icon → "Inspect popup"
     - Firefox: Navigate to about:debugging → "Inspect" on the extension

4. **Performance Considerations**:
   - The download test uses a 1MB file by default
   - For more accurate results with faster connections, consider using larger test files (10MB or 25MB)
   - The server has rate limiting to prevent abuse

## Deployment

1. **Server Deployment**:
   - The server can be deployed to any Node.js hosting service
   - Current production server: `https://meterx-speedtest-server.onrender.com`
   - Required environment variables: None (but `PORT` can be set if needed)

2. **Extension Publishing**:
   - Chrome Web Store:
     1. Create a ZIP file of the `extension` directory
     2. Upload to the Chrome Developer Dashboard
   - Firefox Add-ons:
     1. Create a ZIP file of the `extension` directory
     2. Upload to the Firefox Add-on Developer Hub