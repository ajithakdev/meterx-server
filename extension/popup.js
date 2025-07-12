function saveHistory(entry) {
    var history = JSON.parse(localStorage.getItem('meterxHistory') || '[]');
    history.unshift(entry);
    localStorage.setItem('meterxHistory', JSON.stringify(history.slice(0, 10)));
}
function renderHistory() {
    var historyList = document.getElementById('historyList');
    if (!historyList)
        return;
    var history = JSON.parse(localStorage.getItem('meterxHistory') || '[]');
    historyList.innerHTML = '';
    history.forEach(function (entry) {
        var li = document.createElement('li');
        li.textContent = "".concat(entry.date, ": DL ").concat(entry.downloadSpeed, " Mbps, UL ").concat(entry.uploadSpeed, " Mbps, Ping ").concat(entry.ping, " ms, Jitter ").concat(entry.jitter, " ms, Size ").concat(entry.fileSize, "MB, Server: ").concat(entry.server);
        historyList.appendChild(li);
    });
}
// TypeScript version of popup.js
// TODO: Refactor logic to use types and interfaces
document.addEventListener('DOMContentLoaded', function () {
    renderHistory();
    var startButton = document.getElementById('startButton');
    var downloadSpeedEl = document.getElementById('downloadSpeed');
    var uploadSpeedEl = document.getElementById('uploadSpeed');
    var pingEl = document.getElementById('ping');
    var jitterEl = document.getElementById('jitter');
    var statusEl = document.getElementById('status');
    var loadingIndicator = document.getElementById('loading-indicator');
    var fileSizeSelect = document.getElementById('fileSizeSelect');
    // Only one server, so hardcode the URL
    var SERVER_URL = "https://meterx-speedtest-server.onrender.com";
    function resetUI(isStarting) {
        if (isStarting === void 0) { isStarting = false; }
        downloadSpeedEl.textContent = '-';
        uploadSpeedEl.textContent = '-';
        pingEl.textContent = '-';
        jitterEl.textContent = '-';
        statusEl.textContent = isStarting ? 'Ignition sequence start... 🌠' : 'Let's see how your internet flows today!';
    }
    startButton.addEventListener('click', function () {
        resetUI(true);
        startButton.disabled = true;
        loadingIndicator.classList.remove('hidden');
        var selectedSize = fileSizeSelect ? parseInt(fileSizeSelect.value, 10) : 1;
        // @ts-ignore
        chrome.runtime.sendMessage({ action: "startTest", fileSizeMB: selectedSize, serverUrl: SERVER_URL }, function (response) {
            // @ts-ignore
            if (chrome.runtime.lastError) {
                // @ts-ignore
                statusEl.textContent = "Error: ".concat(chrome.runtime.lastError.message);
                startButton.disabled = false;
                loadingIndicator.classList.add('hidden');
            }
        });
    });
    // @ts-ignore
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (message.action === "testProgress") {
            var data = message.data;
            if (data.status)
                statusEl.textContent = data.status;
            if (data.downloadSpeed !== undefined)
                downloadSpeedEl.textContent = data.downloadSpeed.toFixed(2);
            if (data.uploadSpeed !== undefined)
                uploadSpeedEl.textContent = data.uploadSpeed.toFixed(2);
            if (data.ping !== undefined)
                pingEl.textContent = data.ping.toFixed(1);
            if (data.jitter !== undefined)
                jitterEl.textContent = data.jitter.toFixed(1);
            loadingIndicator.classList.remove('hidden');
            startButton.disabled = true;
        }
        else if (message.action === "testComplete") {
            var data = message.data;
            downloadSpeedEl.textContent = data.downloadSpeed !== undefined ? data.downloadSpeed.toFixed(2) : 'N/A';
            uploadSpeedEl.textContent = data.uploadSpeed !== undefined ? data.uploadSpeed.toFixed(2) : 'N/A';
            pingEl.textContent = data.ping !== undefined ? data.ping.toFixed(1) : 'N/A';
            jitterEl.textContent = data.jitter !== undefined ? data.jitter.toFixed(1) : 'N/A';
            statusEl.textContent = data.status || "Test complete! 🎉";
            startButton.disabled = false;
            loadingIndicator.classList.add('hidden');
            // Save to history
            var fileSize = fileSizeSelect ? fileSizeSelect.value : '1';
            saveHistory({
                date: new Date().toLocaleString(),
                downloadSpeed: downloadSpeedEl.textContent || '-',
                uploadSpeed: uploadSpeedEl.textContent || '-',
                ping: pingEl.textContent || '-',
                jitter: jitterEl.textContent || '-',
                fileSize: fileSize,
                server: SERVER_URL
            });
            renderHistory();
        }
        else if (message.action === "testError") {
            statusEl.textContent = "Error: ".concat(message.error, " \uD83D\uDE25");
            if (downloadSpeedEl.textContent === '-')
                downloadSpeedEl.textContent = 'N/A';
            if (uploadSpeedEl.textContent === '-')
                uploadSpeedEl.textContent = 'N/A';
            if (pingEl.textContent === '-')
                pingEl.textContent = 'N/A';
            if (jitterEl.textContent === '-')
                jitterEl.textContent = 'N/A';
            startButton.disabled = false;
            loadingIndicator.classList.add('hidden');
        }
    });
});
