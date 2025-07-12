interface HistoryEntry {
  date: string;
  downloadSpeed: string;
  uploadSpeed: string;
  ping: string;
  jitter: string;
  fileSize: string;
  server: string;
}

function formatDate(dateString: string): { date: string, time: string } {
  const date = new Date(dateString);
  
  // Format date as "Month Day, Year"
  const dateFormatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  // Format time as "HH:MM AM/PM"
  const timeFormatted = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return { date: dateFormatted, time: timeFormatted };
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
    
    // Format the date
    const formattedDateTime = formatDate(entry.date);
    
    // Create HTML structure for the history entry
    li.innerHTML = `
      <div class="history-entry">
        <div class="history-date">${formattedDateTime.date} • ${formattedDateTime.time}</div>
        <div class="history-stats">
          <span>↓ ${entry.downloadSpeed} Mbps</span>
          <span>↑ ${entry.uploadSpeed} Mbps</span>
          <span>Ping: ${entry.ping} ms</span>
          <span>Jitter: ${entry.jitter} ms</span>
        </div>
      </div>
    `;
    
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
            if (data.downloadSpeed !== undefined) {
                downloadSpeedEl.textContent = data.downloadSpeed === -1 ? '-' : data.downloadSpeed.toFixed(2);
            }
            if (data.uploadSpeed !== undefined) {
                uploadSpeedEl.textContent = data.uploadSpeed === -1 ? '-' : data.uploadSpeed.toFixed(2);
            }
            if (data.ping !== undefined) {
                pingEl.textContent = data.ping === -1 ? '-' : data.ping.toFixed(1);
            }
            if (data.jitter !== undefined) {
                jitterEl.textContent = data.jitter === -1 ? '-' : data.jitter.toFixed(1);
            }
            loadingIndicator.classList.remove('hidden');
            startButton.disabled = true;
        } else if (message.action === "testComplete") {
            const data = message.data;
            downloadSpeedEl.textContent = data.downloadSpeed !== undefined ? data.downloadSpeed.toFixed(2) : '-';
            uploadSpeedEl.textContent = data.uploadSpeed !== undefined ? data.uploadSpeed.toFixed(2) : '-';
            pingEl.textContent = data.ping !== undefined ? data.ping.toFixed(1) : '-';
            jitterEl.textContent = data.jitter !== undefined ? data.jitter.toFixed(1) : '-';
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
