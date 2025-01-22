const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const ejs = require('ejs');
const expressApp = express();

let mainWindow;
let server;

// SetScript klasörü yolları
const documentsPath = app.getPath('documents');
const setScriptPath = path.join(documentsPath, 'SetScript');
const savesPath = path.join(setScriptPath, 'Saves');
const offlinePagesPath = path.join(setScriptPath, 'OfflinePages');
const settingsPath = path.join(setScriptPath, 'settings.json');

// Varsayılan ayarlar
const defaultSettings = {
    isFullscreen: false,
    isAlwaysOnTop: false
};

// Ayarları yükle
function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            console.log('Ayarlar yüklendi:', settings);
            return { ...defaultSettings, ...settings };
        }
    } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error);
    }
    return defaultSettings;
}

// Ayarları kaydet
function saveSettings(settings) {
    try {
        if (!fs.existsSync(setScriptPath)) {
            fs.mkdirSync(setScriptPath, { recursive: true });
        }
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        console.log('Ayarlar kaydedildi:', settings);
        return true;
    } catch (error) {
        console.error('Ayarlar kaydedilirken hata:', error);
        return false;
    }
}

// Ayarları uygula
function applySettings(settings) {
    if (!mainWindow) return;

    console.log('Ayarlar uygulanıyor:', settings);

    // Tam ekran ayarı
    mainWindow.setFullScreen(settings.isFullscreen);
    
    // Her zaman üstte ayarı
    mainWindow.setAlwaysOnTop(settings.isAlwaysOnTop);

    // Ayarları kaydet
    saveSettings(settings);
}

async function createWindow() {
    // Klasörleri oluştur
    if (!fs.existsSync(setScriptPath)) {
        fs.mkdirSync(setScriptPath, { recursive: true });
    }
    if (!fs.existsSync(savesPath)) {
        fs.mkdirSync(savesPath, { recursive: true });
    }
    if (!fs.existsSync(offlinePagesPath)) {
        fs.mkdirSync(offlinePagesPath, { recursive: true });
    }

    // Ayarları yükle
    const settings = loadSettings();
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: true,
        autoHideMenuBar: true,
        fullscreen: settings.isFullscreen,
        alwaysOnTop: settings.isAlwaysOnTop,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            sandbox: false,
            devTools: true
        }
    });

    const serverUrl = await startServer();
    await mainWindow.loadURL(serverUrl);

    // Sayfa yüklendikten sonra ayarları uygula
    mainWindow.webContents.on('did-finish-load', () => {
        applySettings(settings);
    });

    // Pencere boyutu değiştiğinde
    mainWindow.on('resize', () => {
        if (!mainWindow.isFullScreen()) {
            const currentSettings = loadSettings();
            if (currentSettings.isAlwaysOnTop) {
                const [width, height] = mainWindow.getSize();
                saveSettings({ ...currentSettings, width, height });
            }
        }
    });

    // Tam ekran değiştiğinde
    mainWindow.on('enter-full-screen', () => {
        const currentSettings = loadSettings();
        currentSettings.isFullscreen = true;
        saveSettings(currentSettings);
    });

    mainWindow.on('leave-full-screen', () => {
        const currentSettings = loadSettings();
        currentSettings.isFullscreen = false;
        saveSettings(currentSettings);
    });

    // Pencere kapanmadan önce son ayarları kaydet
    mainWindow.on('close', () => {
        const currentSettings = loadSettings();
        if (!mainWindow.isFullScreen()) {
            const [width, height] = mainWindow.getSize();
            saveSettings({ ...currentSettings, width, height });
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (server) {
            server.close();
        }
    });
}

// Express.js ayarları
expressApp.set('view engine', 'ejs');
expressApp.set('views', path.join(__dirname, 'views'));
expressApp.use(express.static(path.join(__dirname, 'public')));

// Express route
expressApp.get('/', (req, res) => {
    res.render('index');
});

// Express sunucusunu başlat
function startServer() {
    return new Promise((resolve, reject) => {
        server = expressApp.listen(0, () => {
            const port = server.address().port;
            console.log(`Express server çalışıyor: http://localhost:${port}`);
            resolve(`http://localhost:${port}`);
        });
    });
}

// Ayarlar event handler'ları
ipcMain.on('save-settings', (event, settings) => {
    try {
        // Ayarları kaydet
        if (saveSettings(settings)) {
            // Ayarları uygula
            applySettings(settings);
            // Başarılı mesajı gönder
            event.sender.send('settings-saved', { success: true });
        } else {
            event.sender.send('settings-saved', { success: false, error: 'Ayarlar kaydedilemedi' });
        }
    } catch (error) {
        console.error('Ayarlar kaydedilirken hata:', error);
        event.sender.send('settings-saved', { success: false, error: error.message });
    }
});

ipcMain.on('get-settings', (event) => {
    try {
        const settings = loadSettings();
        event.sender.send('settings-loaded', settings);
    } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error);
        event.sender.send('settings-loaded', defaultSettings);
    }
});

// Sayfa kaydetme işlemi
ipcMain.handle('save-page', async (event, pageData) => {
    try {
        // SetScript klasörünü kontrol et
        if (!fs.existsSync(setScriptPath)) {
            fs.mkdirSync(setScriptPath, { recursive: true });
        }

        // bookmarks.json dosyasını oku veya oluştur
        const bookmarksPath = path.join(setScriptPath, 'bookmarks.json');
        let bookmarks = [];
        
        if (fs.existsSync(bookmarksPath)) {
            const data = fs.readFileSync(bookmarksPath, 'utf8');
            bookmarks = JSON.parse(data);
        }

        // Yeni kayıt için ID oluştur
        const newBookmark = {
            id: Date.now().toString(),
            name: pageData.name,
            url: pageData.url,
            desc: pageData.desc || '',
            icon: pageData.icon || '',
            createdAt: new Date().toISOString()
        };

        // Yeni kaydı listeye ekle
        bookmarks.push(newBookmark);

        // Dosyaya kaydet
        fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));

        // Tüm pencerelere güncel listeyi gönder
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send('saved-pages', bookmarks);
        });

        return { success: true, bookmark: newBookmark };
    } catch (error) {
        console.error('Sayfa kaydetme hatası:', error);
        throw error;
    }
});

// Kaydedilen sayfaları getir
ipcMain.handle('get-saved-pages', async () => {
    try {
        const bookmarksPath = path.join(setScriptPath, 'bookmarks.json');
        if (fs.existsSync(bookmarksPath)) {
            const data = fs.readFileSync(bookmarksPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Kaydedilen sayfalar getirilirken hata:', error);
        throw error;
    }
});

// Belirli bir sayfayı getir
ipcMain.handle('get-page', async (event, pageId) => {
    try {
        const bookmarksPath = path.join(setScriptPath, 'bookmarks.json');
        if (fs.existsSync(bookmarksPath)) {
            const data = fs.readFileSync(bookmarksPath, 'utf8');
            const pages = JSON.parse(data);
            return pages.find(page => page.id === pageId);
        }
        return null;
    } catch (error) {
        console.error('Sayfa getirilirken hata:', error);
        throw error;
    }
});

// Sayfa silme işlemi
ipcMain.handle('delete-page', async (event, pageId) => {
    try {
        const bookmarksPath = path.join(setScriptPath, 'bookmarks.json');
        if (fs.existsSync(bookmarksPath)) {
            let bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
            bookmarks = bookmarks.filter(page => page.id !== pageId);
            fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));

            // Tüm pencerelere güncel listeyi gönder
            BrowserWindow.getAllWindows().forEach(window => {
                window.webContents.send('saved-pages', bookmarks);
            });

            return { success: true };
        }
        return { success: false, error: 'Bookmarks dosyası bulunamadı' };
    } catch (error) {
        console.error('Sayfa silme hatası:', error);
        throw error;
    }
});

// WebView URL'ini al
ipcMain.handle('get-webview-url', async (event) => {
    const webContents = event.sender;
    return webContents.getURL();
});

// WebView güvenlik ayarları
app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
        // Güvenlik ayarları
        contents.on('will-navigate', (event, url) => {
            console.log('WebView navigasyon:', url);
            const parsedUrl = new URL(url);
            // Sadece http ve https protokollerine izin ver
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                event.preventDefault();
            }
        });

        // Yeni pencere açılmasını engelle
        contents.setWindowOpenHandler(({ url }) => {
            console.log('Yeni pencere engellendi:', url);
            return { action: 'deny' };
        });

        // Hata durumunda
        contents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('WebView yükleme hatası:', errorCode, errorDescription);
        });
    }
});

// Sayfayı çevrimdışı kaydet
async function savePageOffline(url, id) {
    try {
        const settings = loadSettings();
        if (!settings.isAlwaysOnTop) return;

        const response = await fetch(url);
        const html = await response.text();
        
        const pagePath = path.join(offlinePagesPath, `${id}.html`);
        fs.writeFileSync(pagePath, html);

        // Eğer otomatik önizleme açıksa
        if (settings.isAlwaysOnTop) {
            // Webview kullanarak sayfanın ekran görüntüsünü al
            const view = new BrowserView({
                webPreferences: {
                    offscreen: true
                }
            });
            
            mainWindow.setBrowserView(view);
            view.setBounds({ x: 0, y: 0, width: 1200, height: 800 });
            view.webContents.loadURL(url);
            
            // Sayfa yüklendiğinde ekran görüntüsü al
            view.webContents.on('did-finish-load', async () => {
                const image = await view.webContents.capturePage();
                const previewPath = path.join(offlinePagesPath, `${id}.png`);
                fs.writeFileSync(previewPath, image.toPNG());
                
                // Temizlik
                mainWindow.removeBrowserView(view);
            });
        }

        return true;
    } catch (error) {
        console.error('Sayfa çevrimdışı kaydedilirken hata:', error);
        return false;
    }
}

// Çevrimdışı sayfayı yükle
function loadOfflinePage(id) {
    try {
        const pagePath = path.join(offlinePagesPath, `${id}.html`);
        if (fs.existsSync(pagePath)) {
            return fs.readFileSync(pagePath, 'utf8');
        }
        return null;
    } catch (error) {
        console.error('Çevrimdışı sayfa yüklenirken hata:', error);
        return null;
    }
}

// Düzenleme işlemi
ipcMain.on('edit-bookmark', async (event, data) => {
    try {
        console.log('Düzenleme başlatıldı:', data);
        const jsonPath = path.join(setScriptPath, 'bookmarks.json');
        
        // JSON dosyasını oku
        let bookmarks = [];
        if (fs.existsSync(jsonPath)) {
            const content = fs.readFileSync(jsonPath, 'utf8');
            if (content) {
                bookmarks = JSON.parse(content);
            }
        }

        // Düzenlenecek kaydı bul
        const index = bookmarks.findIndex(bookmark => bookmark.id.toString() === data.id.toString());
        
        if (index === -1) {
            throw new Error('Kayıt bulunamadı');
        }

        // Kaydı güncelle
        bookmarks[index] = {
            ...bookmarks[index],
            name: data.name,
            description: data.description
        };

        // JSON dosyasını güncelle
        fs.writeFileSync(jsonPath, JSON.stringify(bookmarks, null, 2));

        // Başarılı mesajı gönder
        event.reply('bookmark-edited', bookmarks[index]);
        
        // Tüm kayıtları yeniden yükle
        mainWindow.webContents.send('saved-pages', bookmarks);
    } catch (error) {
        console.error('Düzenleme hatası:', error);
        event.reply('bookmark-edited-error', error.message);
    }
});

// Silme işlemi
ipcMain.on('delete-bookmark', async (event, id) => {
    try {
        console.log('Silme başlatıldı:', id);
        const jsonPath = path.join(setScriptPath, 'bookmarks.json');
        
        // JSON dosyasını oku
        let bookmarks = [];
        if (fs.existsSync(jsonPath)) {
            const content = fs.readFileSync(jsonPath, 'utf8');
            if (content) {
                bookmarks = JSON.parse(content);
            }
        }

        // Silinecek kaydı bul
        const bookmark = bookmarks.find(b => b.id.toString() === id.toString());
        
        if (!bookmark) {
            throw new Error('Kayıt bulunamadı');
        }

        // İkon dosyasını sil
        if (bookmark.icon && bookmark.icon.includes('icon_')) {
            const iconPath = bookmark.icon.replace('local-file://', '');
            if (fs.existsSync(iconPath)) {
                fs.unlinkSync(iconPath);
            }
        }

        // Kaydı sil
        bookmarks = bookmarks.filter(b => b.id.toString() !== id.toString());

        // JSON dosyasını güncelle
        fs.writeFileSync(jsonPath, JSON.stringify(bookmarks, null, 2));

        // Başarılı mesajı gönder
        event.reply('bookmark-deleted', id);
        
        // Tüm kayıtları yeniden yükle
        mainWindow.webContents.send('saved-pages', bookmarks);
    } catch (error) {
        console.error('Silme hatası:', error);
        event.reply('bookmark-deleted-error', error.message);
    }
});

// Sayfa güncelleme işlemi
ipcMain.handle('update-page', async (event, pageData) => {
    try {
        const bookmarksPath = path.join(setScriptPath, 'bookmarks.json');
        let bookmarks = [];

        if (fs.existsSync(bookmarksPath)) {
            const data = fs.readFileSync(bookmarksPath, 'utf8');
            bookmarks = JSON.parse(data);
        }

        const pageIndex = bookmarks.findIndex(page => page.id === pageData.id);
        if (pageIndex !== -1) {
            // Mevcut sayfayı güncelle
            bookmarks[pageIndex] = {
                ...bookmarks[pageIndex],
                name: pageData.name,
                description: pageData.description,
                updatedAt: new Date().toISOString()
            };

            fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
            return { success: true };
        } else {
            throw new Error('Sayfa bulunamadı');
        }
    } catch (error) {
        console.error('Sayfa güncelleme hatası:', error);
        throw error;
    }
});

// Uygulama başlatıldığında
app.whenReady().then(async () => {
    try {
        await createWindow();
    } catch (error) {
        console.error('Uygulama başlatma hatası:', error);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
