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
  // Only keep the last 2 entries
  localStorage.setItem('meterxHistory', JSON.stringify(history.slice(0, 2)));
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;
  const history = JSON.parse(localStorage.getItem('meterxHistory') || '[]');
  historyList.innerHTML = '';
  
  // Only show the last 2 entries
  history.slice(0, 2).forEach((entry: HistoryEntry) => {
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
    const downloadContainer = document.getElementById('downloadSpeed-container') as HTMLElement;
    const uploadContainer = document.getElementById('uploadSpeed-container') as HTMLElement;
    const pingContainer = document.getElementById('ping-container') as HTMLElement;
    const jitterContainer = document.getElementById('jitter-container') as HTMLElement;
    const statusEl = document.getElementById('status') as HTMLElement;
    const fileSizeSelect = document.getElementById('fileSizeSelect') as HTMLSelectElement;
    // Only one server, so hardcode the URL
    const SERVER_URL = "https://meterx-speedtest-server.onrender.com";

    function resetUI(isStarting = false) {
        downloadSpeedEl.textContent = '-';
        uploadSpeedEl.textContent = '-';
        pingEl.textContent = '-';
        jitterEl.textContent = '-';
        statusEl.textContent = isStarting ? 'Ignition sequence start... 🌠' : 'Click Start to measure!';
        
        // Remove any spinners
        downloadContainer.innerHTML = '<span id="downloadSpeed">-</span>';
        uploadContainer.innerHTML = '<span id="uploadSpeed">-</span>';
        pingContainer.innerHTML = '<span id="ping">-</span>';
        jitterContainer.innerHTML = '<span id="jitter">-</span>';
    }

    startButton.addEventListener('click', () => {
        resetUI(true);
        startButton.disabled = true;

        const selectedSize = fileSizeSelect ? parseInt(fileSizeSelect.value, 10) : 1;
        // @ts-ignore
        chrome.runtime.sendMessage({ action: "startTest", fileSizeMB: selectedSize, serverUrl: SERVER_URL }, (response: any) => {
            // @ts-ignore
            if (chrome.runtime.lastError) {
                // @ts-ignore
                statusEl.textContent = `Error: ${chrome.runtime.lastError.message}`;
                startButton.disabled = false;
            }
        });
    });

    // @ts-ignore
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
        if (message.action === "testProgress") {
            const data = message.data;
            if (data.status) statusEl.textContent = data.status;
            
            // Handle download speed updates
            if (data.downloadSpeed !== undefined) {
                if (data.downloadSpeed === -1) {
                    downloadContainer.innerHTML = '<div class="mini-spinner"></div>';
                } else {
                    downloadContainer.innerHTML = `<span id="downloadSpeed">${data.downloadSpeed.toFixed(2)}</span>`;
                }
            }
            
            // Handle upload speed updates
            if (data.uploadSpeed !== undefined) {
                if (data.uploadSpeed === -1) {
                    uploadContainer.innerHTML = '<div class="mini-spinner"></div>';
                } else {
                    uploadContainer.innerHTML = `<span id="uploadSpeed">${data.uploadSpeed.toFixed(2)}</span>`;
                }
            }
            
            // Handle ping updates
            if (data.ping !== undefined) {
                if (data.ping === -1) {
                    pingContainer.innerHTML = '<div class="mini-spinner"></div>';
                } else {
                    pingContainer.innerHTML = `<span id="ping">${data.ping.toFixed(1)}</span>`;
                }
            }
            
            // Handle jitter updates
            if (data.jitter !== undefined) {
                if (data.jitter === -1) {
                    jitterContainer.innerHTML = '<div class="mini-spinner"></div>';
                } else {
                    jitterContainer.innerHTML = `<span id="jitter">${data.jitter.toFixed(1)}</span>`;
                }
            }
            
            startButton.disabled = true;
        } else if (message.action === "testComplete") {
            const data = message.data;
            
            // Update all values with test results
            if (data.downloadSpeed !== undefined) {
                downloadContainer.innerHTML = `<span id="downloadSpeed">${data.downloadSpeed.toFixed(2)}</span>`;
            } else {
                downloadContainer.innerHTML = '<span id="downloadSpeed">-</span>';
            }
            
            if (data.uploadSpeed !== undefined) {
                uploadContainer.innerHTML = `<span id="uploadSpeed">${data.uploadSpeed.toFixed(2)}</span>`;
            } else {
                uploadContainer.innerHTML = '<span id="uploadSpeed">-</span>';
            }
            
            if (data.ping !== undefined) {
                pingContainer.innerHTML = `<span id="ping">${data.ping.toFixed(1)}</span>`;
            } else {
                pingContainer.innerHTML = '<span id="ping">-</span>';
            }
            
            if (data.jitter !== undefined) {
                jitterContainer.innerHTML = `<span id="jitter">${data.jitter.toFixed(1)}</span>`;
            } else {
                jitterContainer.innerHTML = '<span id="jitter">-</span>';
            }
            
            statusEl.textContent = data.status || "Test complete! 🎉";
            startButton.disabled = false;

            // Save to history
            const fileSize = fileSizeSelect ? fileSizeSelect.value : '1';
            
            // Get the current values from the containers
            const downloadValue = data.downloadSpeed !== undefined ? data.downloadSpeed.toFixed(2) : '-';
            const uploadValue = data.uploadSpeed !== undefined ? data.uploadSpeed.toFixed(2) : '-';
            const pingValue = data.ping !== undefined ? data.ping.toFixed(1) : '-';
            const jitterValue = data.jitter !== undefined ? data.jitter.toFixed(1) : '-';
            
            saveHistory({
              date: new Date().toLocaleString(),
              downloadSpeed: downloadValue,
              uploadSpeed: uploadValue,
              ping: pingValue,
              jitter: jitterValue,
              fileSize,
              server: SERVER_URL
            });
            renderHistory();
        } else if (message.action === "testError") {
            statusEl.textContent = `Error: ${message.error} 😥`;
            
            // Show N/A for all metrics that are still showing spinners
            downloadContainer.innerHTML = '<span id="downloadSpeed">N/A</span>';
            uploadContainer.innerHTML = '<span id="uploadSpeed">N/A</span>';
            pingContainer.innerHTML = '<span id="ping">N/A</span>';
            jitterContainer.innerHTML = '<span id="jitter">N/A</span>';
            
            startButton.disabled = false;
        }
    });
});
