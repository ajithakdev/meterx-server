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
    const statusEl = document.getElementById('status') as HTMLElement;
    const downloadSpinner = document.querySelector('.download-spinner') as HTMLElement;
    const uploadSpinner = document.querySelector('.upload-spinner') as HTMLElement;
    const pingSpinner = document.querySelector('.ping-spinner') as HTMLElement;
    const jitterSpinner = document.querySelector('.jitter-spinner') as HTMLElement;
    const fileSizeSelect = document.getElementById('fileSizeSelect') as HTMLSelectElement;
    // Only one server, so hardcode the URL
    const SERVER_URL = "https://meterx-speedtest-server.onrender.com";

    function resetUI(isStarting = false) {
        downloadSpeedEl.textContent = '-';
        uploadSpeedEl.textContent = '-';
        pingEl.textContent = '-';
        jitterEl.textContent = '-';
        statusEl.textContent = isStarting ? 'Ignition sequence start... 🌠' : 'Click Start to measure!';
        
        // Hide all spinners
        downloadSpinner.classList.add('hidden');
        uploadSpinner.classList.add('hidden');
        pingSpinner.classList.add('hidden');
        jitterSpinner.classList.add('hidden');
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
                    downloadSpeedEl.textContent = '-';
                    downloadSpinner.classList.remove('hidden');
                } else {
                    downloadSpeedEl.textContent = data.downloadSpeed.toFixed(2);
                    downloadSpinner.classList.add('hidden');
                }
            }
            
            // Handle upload speed updates
            if (data.uploadSpeed !== undefined) {
                if (data.uploadSpeed === -1) {
                    uploadSpeedEl.textContent = '-';
                    uploadSpinner.classList.remove('hidden');
                } else {
                    uploadSpeedEl.textContent = data.uploadSpeed.toFixed(2);
                    uploadSpinner.classList.add('hidden');
                }
            }
            
            // Handle ping updates
            if (data.ping !== undefined) {
                if (data.ping === -1) {
                    pingEl.textContent = '-';
                    pingSpinner.classList.remove('hidden');
                } else {
                    pingEl.textContent = data.ping.toFixed(1);
                    pingSpinner.classList.add('hidden');
                }
            }
            
            // Handle jitter updates
            if (data.jitter !== undefined) {
                if (data.jitter === -1) {
                    jitterEl.textContent = '-';
                    jitterSpinner.classList.remove('hidden');
                } else {
                    jitterEl.textContent = data.jitter.toFixed(1);
                    jitterSpinner.classList.add('hidden');
                }
            }
            
            startButton.disabled = true;
        } else if (message.action === "testComplete") {
            const data = message.data;
            downloadSpeedEl.textContent = data.downloadSpeed !== undefined ? data.downloadSpeed.toFixed(2) : '-';
            uploadSpeedEl.textContent = data.uploadSpeed !== undefined ? data.uploadSpeed.toFixed(2) : '-';
            pingEl.textContent = data.ping !== undefined ? data.ping.toFixed(1) : '-';
            jitterEl.textContent = data.jitter !== undefined ? data.jitter.toFixed(1) : '-';
            statusEl.textContent = data.status || "Test complete! 🎉";
            startButton.disabled = false;
            
            // Hide all spinners
            downloadSpinner.classList.add('hidden');
            uploadSpinner.classList.add('hidden');
            pingSpinner.classList.add('hidden');
            jitterSpinner.classList.add('hidden');

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
            
            // Hide all spinners
            downloadSpinner.classList.add('hidden');
            uploadSpinner.classList.add('hidden');
            pingSpinner.classList.add('hidden');
            jitterSpinner.classList.add('hidden');
        }
    });
});
