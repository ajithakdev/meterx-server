# MeterX - Your No-Fuss Internet Speed Test Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- Add other badges as you see fit: e.g., version, build status, store links -->
<!-- [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/YOUR_EXTENSION_ID?label=Chrome%20Web%20Store)](https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID) -->
<!-- [![Firefox Add-ons](https://img.shields.io/amo/v/YOUR_ADDON_SLUG?label=Firefox%20Add-ons)](https://addons.mozilla.org/en-US/firefox/addon/YOUR_ADDON_SLUG/) -->

MeterX is a straightforward browser extension and server combo designed for quick and easy internet speed testing. Developed by [ajithakdev](https://github.com/ajithakdev), it aims to provide accurate speed metrics (download, upload, ping) with a clean, developer-friendly approach.

The live speed test server is currently hosted at: `https://meterx-speedtest-server.onrender.com`

## ✨ Features

*   **Instant Speed Tests:** Quickly measure your download speed, upload speed, and latency (ping).
*   **Browser Integration:** Access speed tests directly from your browser toolbar.
*   **Minimalist UI:** Clean and simple interface, focusing on the metrics.
*   **Local History (Optional):** The extension can store a history of your tests locally in your browser.
*   **Customizable Themes (Optional):** Light/Dark mode preferences stored locally.
*   **Self-Hostable Server:** The backend server component is open-source, allowing you to host your own speed test endpoint.
*   **Transparent Data Handling:** Check out our Privacy Policy.

## 🚀 How It Works

MeterX consists of two main components:

1.  **Browser Extension:**
    *   Provides the user interface within your browser.
    *   Initiates test requests to the speed test server.
    *   Calculates and displays download speed by measuring the time taken to download data packets from the server.
    *   Calculates and displays upload speed by measuring the time taken to upload data packets to the server.
    *   Measures ping by sending small requests to the server and timing the round trip.

2.  **Speed Test Server (Node.js/Express):**
    *   Responds to ping requests.
    *   Serves data packets for download tests.
    *   Accepts data packets for upload tests (using `multer` for handling).
    *   Logs basic request information for monitoring and debugging (using `morgan`).

## 🛠️ Installation

### Browser Extension

*(Instructions for official store listings will be added once published.)*

**For Developers (Loading Unpacked Extension):**

1.  Clone this repository:
    ```bash
    git clone https://github.com/ajithakdev/meterx-server.git
    cd MeterX
    ```
2.  Open your browser's extension management page:
    *   **Chrome/Edge:** `chrome://extensions` or `edge://extensions`
    *   **Firefox:** `about:debugging#/runtime/this-firefox` (then "Load Temporary Add-on")
3.  Enable "Developer mode" (usually a toggle switch).
4.  Click "Load unpacked" (Chrome/Edge) or select the `manifest.json` file from the `/extension` directory (Firefox).
5.  Navigate to the `MeterX/extension` directory and select it.

### Speed Test Server (Optional - For Self-Hosting or Development)

1.  **Prerequisites:**
    *   Node.js (LTS version recommended)
    *   npm or yarn

2.  Navigate to the server directory:
    ```bash
    cd MeterX/server
    ```

3.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

4.  Start the server:
    ```bash
    npm start
    # or
    yarn start
    ```
    By default, the server will run on `http://localhost:3000`. You can configure the port in `server/index.js` or via environment variables if you modify the code.

5.  **Important:** If you self-host the server, you'll need to update the `serverUrl` in the extension's configuration (e.g., in `extension/scripts/config.js` or a similar settings file) to point to your server's address.

## 📖 Usage

1.  Click the MeterX extension icon in your browser's toolbar.
2.  The extension popup will appear.
3.  Click the "Start Test" (or similar) button.
4.  Wait for the download, upload, and ping tests to complete.
5.  Results will be displayed in the extension popup.

## 💻 Tech Stack

*   **Browser Extension:**
    *   HTML5
    *   CSS3
    *   JavaScript (Vanilla JS)
    *   WebExtensions API (Manifest V3)
*   **Speed Test Server:**
    *   Node.js
    *   Express.js
    *   `multer` (for handling multipart/form-data, used in upload tests)
    *   `morgan` (for HTTP request logging)
    *   `cors` (for Cross-Origin Resource Sharing)

## 📂 Project Structure

```
MeterX/
├── extension/            # Browser extension code
│   ├── icons/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── scripts/
│   │   ├── background.js (if any)
│   │   └── content.js    (if any)
│   └── manifest.json
├── server/               # Node.js speed test server code
│   ├── node_modules/
│   ├── index.js          # Main server file
│   └── package.json
├── .gitignore
├── LICENSE
├── privacy-policy.md
└── README.md
```

## 🤝 Contributing

Contributions are welcome! If you're a developer and want to help improve MeterX:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -am 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Create a new Pull Request.

Please ensure your code follows the existing style and that any new features are well-documented.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

Created by ajithakdev. Feel free to open an issue on GitHub for bugs, feature requests, or questions.

---

Happy Speed Testing!