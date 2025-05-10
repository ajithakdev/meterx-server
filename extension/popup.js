document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const downloadSpeedEl = document.getElementById('downloadSpeed');
    const uploadSpeedEl = document.getElementById('uploadSpeed');
    const pingEl = document.getElementById('ping');
    const jitterEl = document.getElementById('jitter');
    const statusEl = document.getElementById('status');
    const loadingIndicator = document.getElementById('loading-indicator');

    function resetUI(isStarting = false) {
        downloadSpeedEl.textContent = '-';
        uploadSpeedEl.textContent = '-';
        pingEl.textContent = '-';
        jitterEl.textContent = '-';
        if (isStarting) {
            statusEl.textContent = 'Ignition sequence start... 🌠';
        } else {
            statusEl.textContent = 'Click Start to measure!';
        }
    }

    startButton.addEventListener('click', () => {
        resetUI(true);
        startButton.disabled = true;
        loadingIndicator.classList.remove('hidden');

        chrome.runtime.sendMessage({ action: "startTest" }, (response) => {
            if (chrome.runtime.lastError) {
                statusEl.textContent = `Error: ${chrome.runtime.lastError.message}`;
                startButton.disabled = false;
                loadingIndicator.classList.add('hidden');
            } else if (response && response.status) {
                // Initial ack, actual progress comes via listeners
                // statusEl.textContent = response.status; // Can be too quick, rely on testProgress
            }
        });
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "testProgress") {
            const data = message.data;
            if (data.status) statusEl.textContent = data.status;
            if (data.downloadSpeed !== undefined) downloadSpeedEl.textContent = data.downloadSpeed.toFixed(2);
            if (data.uploadSpeed !== undefined) uploadSpeedEl.textContent = data.uploadSpeed.toFixed(2);
            if (data.ping !== undefined) pingEl.textContent = data.ping.toFixed(1);
            if (data.jitter !== undefined) jitterEl.textContent = data.jitter.toFixed(1);
            loadingIndicator.classList.remove('hidden'); // Ensure it's visible during progress
            startButton.disabled = true;
        } else if (message.action === "testComplete") {
            const data = message.data;
            downloadSpeedEl.textContent = data.downloadSpeed !== undefined ? data.downloadSpeed.toFixed(2) : 'N/A';
            uploadSpeedEl.textContent = data.uploadSpeed !== undefined ? data.uploadSpeed.toFixed(2) : 'N/A';
            pingEl.textContent = data.ping !== undefined ? data.ping.toFixed(1) : 'N/A';
            jitterEl.textContent = data.jitter !== undefined ? data.jitter.toFixed(1) : 'N/A';
            statusEl.textContent = data.status || "Test complete! 🎉";
            startButton.disabled = false;
            loadingIndicator.classList.add('hidden');
        } else if (message.action === "testError") {
            statusEl.textContent = `Error: ${message.error} 😥`;
            // Show N/A for unfinished fields if a partial test fails
            if (downloadSpeedEl.textContent === '-') downloadSpeedEl.textContent = 'N/A';
            if (uploadSpeedEl.textContent === '-') uploadSpeedEl.textContent = 'N/A';
            if (pingEl.textContent === '-') pingEl.textContent = 'N/A';
            if (jitterEl.textContent === '-') jitterEl.textContent = 'N/A';
            startButton.disabled = false;
            loadingIndicator.classList.add('hidden');
        }
    });
});