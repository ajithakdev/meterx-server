# Privacy Policy for MeterX

**Last Updated:** July 26, 2024

Hey there, developer! This privacy policy explains how MeterX ("we," "us," or "our"), created by ajithakdev, handles your information when you use the MeterX browser extension and its associated speed test server (`https://meterx-speedtest-server.onrender.com`). We've aimed for clarity and directness.

## 1. What Information We Collect

We collect information in two main ways:

### a. MeterX Extension (Client-Side)

*   **Speed Test Results (Local Display):** When you run a speed test, the extension temporarily holds results (download speed, upload speed, ping/latency) to display them to you within the extension.
*   **User Preferences (Local Storage):** The extension uses your browser's local `storage` permission to save your preferences, such as theme settings or a local history of your past tests. This data stays *on your device* and is not automatically transmitted to our servers.
*   **Alarms:** The `alarms` permission might be used to schedule periodic tasks, like refreshing data or background checks if implemented. Any network activity triggered by alarms would follow the server-side interaction policies below.

### b. Speed Test Server Interaction (Server-Side)

When you initiate a speed test, the extension communicates with our server. Here's what's involved:

*   **IP Address:** Your IP address is necessarily sent to our server to establish a connection and return test results. This is standard for internet communication.
*   **Speed Test Data Payloads:**
    *   **Download Test:** Our server sends temporary data packets to your extension.
    *   **Upload Test:** Your extension sends temporary data packets to our server. We use `multer` on the server to handle this incoming data purely for the purpose of calculating upload speed. This data is not stored beyond the immediate test processing.
*   **Server Logs (`morgan`):** Our Express server uses `morgan` for HTTP request logging. These logs are standard for server operations and typically include:
    *   Your IP address
    *   Request timestamp
    *   HTTP method and path
    *   HTTP status code
    *   Response size
    *   User-Agent string (identifies your browser and OS)
    *   Referrer (if applicable)
    These logs are used for monitoring server health, debugging, and basic analytics (e.g., request volume).
*   **No Tracking Cookies:** We do not use cookies for cross-site tracking or advertising. Any cookies, if used by the server framework, would be strictly functional for session management during the test itself, though this is not a primary feature.

## 2. How We Use Your Information

*   **To Provide the Service:** The core use is to perform internet speed tests and display the results to you.
*   **To Maintain and Improve MeterX:**
    *   Server logs help us monitor server performance, diagnose technical issues, and ensure the stability of the service.
    *   We might analyze *aggregated and anonymized* speed test data (e.g., average speeds, peak times, without linking to individual IPs) to understand usage patterns and guide improvements.
*   **For Security:** To detect and prevent abuse, unauthorized access, or other malicious activity.

## 3. Data Sharing and Disclosure

*   **No Sale of Data:** We do not sell your personal information. Period.
*   **Hosting Provider:** Our speed test server is hosted on Render. Render may have access to server operational data (like logs) as part of their hosting services, governed by Render's own privacy policies.
*   **Legal Requirements:** We may disclose your information if required by law, subpoena, or other legal process, or if we have a good faith belief that disclosure is necessary to protect our rights, your safety, or the safety of others, investigate fraud, or respond to a government request.

## 4. Data Retention

*   **Local Extension Data:** Data stored by the extension locally (preferences, local history) remains on your device until you clear your browser's storage for the extension or uninstall it.
*   **Server Logs:** Server logs (containing IP addresses, etc.) are retained for a limited period necessary for security, monitoring, and operational analysis, typically not exceeding 30-90 days, after which they are cycled out or anonymized.
*   **Speed Test Payloads:** The actual data packets used for speed measurement are not stored post-test. Only the calculated results and associated log entries are retained as described above.

## 5. Data Security

We implement reasonable technical measures to protect the information we handle. Communication between the MeterX extension and our server is secured using HTTPS. However, keep in mind that no method of transmission over the internet or electronic storage is 100% secure.

## 6. Your Choices

*   **Extension Data:** You can manage data stored by the extension via your browser's extension management settings or by clearing browsing data.
*   **Using the Service:** You choose when to initiate a speed test. If you prefer not to have your IP address logged by our server for a test, you should not use the service.

## 7. Children's Privacy

MeterX is not designed for or intentionally targeted at children under the age of 13 (or the relevant age of digital consent in your jurisdiction). We do not knowingly collect personal information from children.

## 8. Changes to This Privacy Policy

We might update this privacy policy from time to time if MeterX's functionality or data handling practices change. The "Last Updated" date at the top will reflect the latest version. We'll make reasonable efforts to inform you of significant changes, perhaps through an update note in the extension or on its store page.

## 9. Contact Us

If you have any questions or concerns about this privacy policy or MeterX's data practices, feel free to reach out:

*   **Project Author:** ajithakdev
*   **Preferred Contact:** [Consider adding a GitHub repository issues link here, or an email address if you prefer, e.g., `cseajithak@gmail.com` or `via GitHub issues at https://github.com/ajithakdev/meterx-server/issues`]

---

This policy is intended to be as transparent as possible for fellow developers. If something isn't clear, let us know!