const { contextBridge, ipcRenderer } = require('electron');

// Sayfa kaydetme işlemleri
contextBridge.exposeInMainWorld('electronAPI', {
    savePage: (pageData) => ipcRenderer.invoke('save-page', pageData),
    getSavedPages: () => ipcRenderer.invoke('get-saved-pages'),
    onSavedPages: (callback) => ipcRenderer.on('saved-pages', callback),
    
    // Ayarlar
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
    getSettings: () => ipcRenderer.send('get-settings'),
    onSettingsLoaded: (callback) => ipcRenderer.on('settings-loaded', callback)
});
