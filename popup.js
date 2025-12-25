document.addEventListener("DOMContentLoaded", async () => {
    
    // get saved settings from chrome storage
    const settings = await chrome.storage.sync.get({
        enabled: true,
        autoRefresh: true,
        sectorOrIndustry: "sector",
    })

    // apply saved settings to UI
    document.getElementById("enableExtension").checked = settings.enabled;
    document.getElementById("autoRefresh").checked = settings.autoRefresh;
    document.getElementById("toggleSectorOrIndustry").value = settings.sectorOrIndustry;
});

// save settings when changed
document.getElementById("enableExtension").addEventListener("change", async(e) => {
    await chrome.storage.sync.set({ enabled: e.target.checked });
    showStatus("Settings saved!", 'success');

    // tell content script to enable or disable
    sendMessageToActiveTab({ action: 'toggle', enabled: e.target.checked })
});

document.getElementById("autoRefresh").addEventListener("change", async(e) => {
    await chrome.storage.sync.set({ autoRefresh: e.target.checked });
    showStatus("Settings saved!", 'success');
});

document.getElementById("toggleSectorOrIndustry").addEventListener("change", async(e) => {
    await chrome.storage.sync.set({ sectorOrIndustry: e.target.value }); // Fixed: was e.target.checked
    showStatus("Settings saved!", 'success');

    // tell content script to reload data
    sendMessageToActiveTab({ action: 'reloadData', source: e.target.value }); // Fixed: was 'enabled'
});

// Refresh button
document.getElementById("refreshButton").addEventListener("click", () => {
    sendMessageToActiveTab({ action: 'refresh' });
    showStatus('Refreshing...', 'success');
});

// clear cache button
document.getElementById("clearCache").addEventListener("click", async () => {
    await chrome.storage.local.clear();
    showStatus('Cache cleared!', 'success');
});

// helper function to show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById("status");
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;

    setTimeout(() => {
        statusDiv.className = "status"
    }, 3000);
}

// helper function to send messages to active tab
async function sendMessageToActiveTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if(tab) {
        chrome.tabs.sendMessage(tab.id, message);
    }
}