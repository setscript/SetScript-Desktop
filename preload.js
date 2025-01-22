const { contextBridge, ipcRenderer } = require('electron');

// Ana process ile iletişim için API tanımla
contextBridge.exposeInMainWorld('electronAPI', {
    // Kaydetme işlemleri
    savePage: (data) => ipcRenderer.send('save-page', data),
    onSaveComplete: (callback) => ipcRenderer.on('save-complete', (event, data) => callback(event, data)),
    onSaveError: (callback) => ipcRenderer.on('save-error', (event, error) => callback(event, error)),
    
    // Kaydedilmiş sayfaları getir
    getSavedPages: () => ipcRenderer.send('get-saved-pages'),
    onSavedPages: (callback) => ipcRenderer.on('saved-pages', (event, data) => callback(event, data)),
    
    // Silme işlemleri
    deleteBookmark: (id) => ipcRenderer.send('delete-bookmark', id),
    onBookmarkDeleted: (callback) => ipcRenderer.on('bookmark-deleted', (event, id) => callback(event, id)),
    
    // Düzenleme işlemleri
    editBookmark: (data) => ipcRenderer.send('edit-bookmark', data),
    onBookmarkEdited: (callback) => ipcRenderer.on('bookmark-edited', (event, data) => callback(event, data))
});
