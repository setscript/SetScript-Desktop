const { ipcRenderer } = require('electron');
const Store = require('electron-store');
const store = new Store();

// Elements
const webview = document.getElementById('webview');
const offlineContent = document.getElementById('offlineContent');
const settings = document.getElementById('settings');
const homeBtn = document.getElementById('homeBtn');
const offlineBtn = document.getElementById('offlineBtn');
const settingsBtn = document.getElementById('settingsBtn');
const enableNotifications = document.getElementById('enableNotifications');
const enableOfflineMode = document.getElementById('enableOfflineMode');

// Load saved settings
enableNotifications.checked = store.get('notifications', true);
enableOfflineMode.checked = store.get('offlineMode', false);

// Event Listeners
homeBtn.addEventListener('click', () => {
    webview.style.display = 'block';
    offlineContent.style.display = 'none';
    settings.style.display = 'none';
    webview.loadURL('https://setscript.com/');
});

offlineBtn.addEventListener('click', () => {
    webview.style.display = 'none';
    offlineContent.style.display = 'block';
    settings.style.display = 'none';
    loadOfflineContent();
});

settingsBtn.addEventListener('click', () => {
    webview.style.display = 'none';
    offlineContent.style.display = 'none';
    settings.style.display = 'block';
});

enableNotifications.addEventListener('change', (e) => {
    store.set('notifications', e.target.checked);
});

enableOfflineMode.addEventListener('change', (e) => {
    store.set('offlineMode', e.target.checked);
});

// WebView event handlers
webview.addEventListener('dom-ready', () => {
    // Inject custom CSS to match desktop app style
    webview.insertCSS(`
        body {
            overflow: hidden !important;
        }
    `);
});

webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    webview.loadURL(e.url);
});

// Handle offline content
function loadOfflineContent() {
    const savedContent = store.get('savedContent', []);
    const contentContainer = document.getElementById('savedContent');
    contentContainer.innerHTML = savedContent.length
        ? savedContent.map(item => `
            <div class="saved-item">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
            </div>
        `).join('')
        : '<p>Henüz kaydedilmiş içerik bulunmamaktadır.</p>';
}

// IPC event handlers
ipcRenderer.on('open-settings', () => {
    webview.style.display = 'none';
    offlineContent.style.display = 'none';
    settings.style.display = 'block';
});
