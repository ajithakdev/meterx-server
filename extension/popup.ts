interface HistoryEntry {
  date: string;
  downloadSpeed: string;
  uploadSpeed: string;
  ping: string;
  jitter: string;
  fileSize: string;
  server: string;
}

function saveHistory(entry: HistoryEntry) {
  const history = JSON.parse(localStorage.getItem('meterxHistory') || '[]');
  history.unshift(entry);
  localStorage.setItem('meterxHistory', JSON.stringify(history.slice(0, 10)));
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;
  const history = JSON.parse(localStorage.getItem('meterxHistory') || '[]');
  historyList.innerHTML = '';
  history.forEach((entry: HistoryEntry) => {
    const li = document.createElement('li');
    li.textContent = `${entry.date}: DL ${entry.downloadSpeed} Mbps, UL ${entry.uploadSpeed} Mbps, Ping ${entry.ping} ms, Jitter ${entry.jitter} ms, Size ${entry.fileSize}MB, Server: ${entry.server}`;
    historyList.appendChild(li);
  });
}
// TypeScript version of popup.js
// TODO: Refactor logic to use types and interfaces


document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
    const startButton = document.getElementById('startButton') as HTMLButtonElement;
    const downloadSpeedEl = document.getElementById('downloadSpeed') as HTMLElement;
    const uploadSpeedEl = document.getElementById('uploadSpeed') as HTMLElement;
    const pingEl = document.getElementById('ping') as HTMLElement;
    const jitterEl = document.getElementById('jitter') as HTMLElement;
    const statusEl = document.getElementById('status') as HTMLElement;
    const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    const fileSizeSelect = document.getElementById('fileSizeSelect') as HTMLSelectElement;
    // Only one server, so hardcode the URL
    const SERVER_URL = "https://meterx-speedtest-server.onrender.com";

    function resetUI(isStarting = false) {
        downloadSpeedEl.textContent = '-';
        uploadSpeedEl.textContent = '-';
        pingEl.textContent = '-';
        jitterEl.textContent = '-';
        statusEl.textContent = isStarting ? 'Ignition sequence start... 🌠' : 'Click Start to measure!';
    }

    startButton.addEventListener('click', () => {
        resetUI(true);
        startButton.disabled = true;
        loadingIndicator.classList.remove('hidden');

        const selectedSize = fileSizeSelect ? parseInt(fileSizeSelect.value, 10) : 1;
        // @ts-ignore
        chrome.runtime.sendMessage({ action: "startTest", fileSizeMB: selectedSize, serverUrl: SERVER_URL }, (response: any) => {
            // @ts-ignore
            if (chrome.runtime.lastError) {
                // @ts-ignore
                statusEl.textContent = `Error: ${chrome.runtime.lastError.message}`;
                startButton.disabled = false;
                loadingIndicator.classList.add('hidden');
            }
        });
    });

    // @ts-ignore
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
        if (message.action === "testProgress") {
            const data = message.data;
            if (data.status) statusEl.textContent = data.status;
            if (data.downloadSpeed !== undefined) downloadSpeedEl.textContent = data.downloadSpeed.toFixed(2);
            if (data.uploadSpeed !== undefined) uploadSpeedEl.textContent = data.uploadSpeed.toFixed(2);
            if (data.ping !== undefined) pingEl.textContent = data.ping.toFixed(1);
            if (data.jitter !== undefined) jitterEl.textContent = data.jitter.toFixed(1);
            loadingIndicator.classList.remove('hidden');
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

            // Save to history
            const fileSize = fileSizeSelect ? fileSizeSelect.value : '1';
            saveHistory({
              date: new Date().toLocaleString(),
              downloadSpeed: downloadSpeedEl.textContent || '-',
              uploadSpeed: uploadSpeedEl.textContent || '-',
              ping: pingEl.textContent || '-',
              jitter: jitterEl.textContent || '-',
              fileSize,
              server: SERVER_URL
            });
            renderHistory();
        } else if (message.action === "testError") {
            statusEl.textContent = `Error: ${message.error} 😥`;
            if (downloadSpeedEl.textContent === '-') downloadSpeedEl.textContent = 'N/A';
            if (uploadSpeedEl.textContent === '-') uploadSpeedEl.textContent = 'N/A';
            if (pingEl.textContent === '-') pingEl.textContent = 'N/A';
            if (jitterEl.textContent === '-') jitterEl.textContent = 'N/A';
            startButton.disabled = false;
            loadingIndicator.classList.add('hidden');
        }
    });
});
