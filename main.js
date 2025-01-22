const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const ejs = require('ejs');
const expressApp = express();

let mainWindow;
let server;

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

// SetScript klasörü yolları
const documentsPath = app.getPath('documents');
const setScriptPath = path.join(documentsPath, 'SetScript');
const savesPath = path.join(setScriptPath, 'Saves');

// Klasörleri oluştur
function createDirectories() {
    try {
        if (!fs.existsSync(setScriptPath)) {
            fs.mkdirSync(setScriptPath, { recursive: true });
        }
        if (!fs.existsSync(savesPath)) {
            fs.mkdirSync(savesPath, { recursive: true });
        }
    } catch (error) {
        console.error('Klasör oluşturma hatası:', error);
    }
}

async function createWindow() {
    createDirectories();

    // Local dosya protokolünü kaydet
    protocol.registerFileProtocol('local-file', (request, callback) => {
        const filePath = request.url.replace('local-file://', '');
        try {
            return callback(decodeURIComponent(filePath));
        } catch (error) {
            console.error(error);
            return callback(404);
        }
    });

    const serverUrl = await startServer();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            sandbox: false,
            devTools: false
        }
    });

    mainWindow.loadURL(serverUrl);

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (server) {
            server.close();
        }
    });
}

app.whenReady().then(() => {
    try {
        // SetScript klasörünü oluştur
        if (!fs.existsSync(setScriptPath)) {
            fs.mkdirSync(setScriptPath, { recursive: true });
            console.log('SetScript klasörü oluşturuldu:', setScriptPath);
        }

        // Saves klasörünü oluştur
        if (!fs.existsSync(savesPath)) {
            fs.mkdirSync(savesPath, { recursive: true });
            console.log('Saves klasörü oluşturuldu:', savesPath);
        }

        // bookmarks.json dosyasını kontrol et
        const jsonPath = path.join(setScriptPath, 'bookmarks.json');
        if (!fs.existsSync(jsonPath)) {
            fs.writeFileSync(jsonPath, JSON.stringify([], null, 2));
            console.log('bookmarks.json oluşturuldu');
        }

        createWindow();
    } catch (error) {
        console.error('Uygulama başlatma hatası:', error);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (server) {
            server.close();
        }
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
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

// Sayfa kaydetme işlemi
ipcMain.on('save-page', async (event, data) => {
    try {
        console.log('Sayfa kaydediliyor:', data);

        if (!data.url) {
            throw new Error('URL bulunamadı');
        }

        // URL'yi kontrol et
        try {
            const parsedUrl = new URL(data.url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Geçersiz URL protokolü');
            }
        } catch (error) {
            throw new Error('Geçersiz URL formatı');
        }

        const timestamp = Date.now();
        let iconPath = '';

        // Eğer ikon varsa kaydet
        if (data.icon && data.icon.includes('base64')) {
            const base64Data = data.icon.split(';base64,').pop();
            if (base64Data) {
                const iconName = `icon_${timestamp}.png`;
                iconPath = path.join(savesPath, iconName);
                fs.writeFileSync(iconPath, base64Data, 'base64');
                iconPath = `local-file://${iconPath}`;
            }
        } else {
            // Varsayılan ikonu kullan
            iconPath = 'images/save-icon.png';
        }
        
        const pageData = {
            name: data.name,
            desc: data.desc || '',
            url: data.url,
            iconPath: iconPath,
            timestamp: timestamp
        };

        console.log('Kaydedilen veri:', pageData);

        // JSON dosyasını oku veya oluştur
        const jsonPath = path.join(setScriptPath, 'bookmarks.json');
        let bookmarks = [];
        
        if (fs.existsSync(jsonPath)) {
            const content = fs.readFileSync(jsonPath, 'utf8');
            if (content) {
                bookmarks = JSON.parse(content);
            }
        }

        // Yeni kaydı ekle
        bookmarks.unshift(pageData);
        fs.writeFileSync(jsonPath, JSON.stringify(bookmarks, null, 2));

        // Başarılı mesajı gönder
        event.reply('save-complete', pageData);
        
        // Tüm kayıtları yeniden yükle
        mainWindow.webContents.send('saved-pages', bookmarks);
    } catch (error) {
        console.error('Kaydetme hatası:', error);
        event.reply('save-error', error.message);
    }
});

// Kaydedilmiş sayfaları getir
ipcMain.on('get-saved-pages', (event) => {
    try {
        console.log('Kaydedilmiş sayfalar istendi');
        
        const jsonPath = path.join(setScriptPath, 'bookmarks.json');
        let bookmarks = [];
        
        if (fs.existsSync(jsonPath)) {
            console.log('bookmarks.json bulundu');
            const content = fs.readFileSync(jsonPath, 'utf8');
            if (content) {
                bookmarks = JSON.parse(content);
                console.log(`${bookmarks.length} kayıt yüklendi`);
            }
        } else {
            console.log('bookmarks.json bulunamadı, yeni dosya oluşturuluyor');
            fs.writeFileSync(jsonPath, JSON.stringify([], null, 2));
        }

        event.reply('saved-pages', bookmarks);
    } catch (error) {
        console.error('Kayıtları getirme hatası:', error);
        event.reply('saved-pages', []);
    }
});

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
        const index = bookmarks.findIndex(bookmark => bookmark.timestamp.toString() === data.id.toString());
        
        if (index === -1) {
            throw new Error('Kayıt bulunamadı');
        }

        // Kaydı güncelle
        bookmarks[index] = {
            ...bookmarks[index],
            name: data.name,
            desc: data.desc
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
        const bookmark = bookmarks.find(b => b.timestamp.toString() === id.toString());
        
        if (!bookmark) {
            throw new Error('Kayıt bulunamadı');
        }

        // İkon dosyasını sil
        if (bookmark.iconPath && bookmark.iconPath.includes('icon_')) {
            const iconPath = bookmark.iconPath.replace('local-file://', '');
            if (fs.existsSync(iconPath)) {
                fs.unlinkSync(iconPath);
            }
        }

        // Kaydı sil
        bookmarks = bookmarks.filter(b => b.timestamp.toString() !== id.toString());

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
