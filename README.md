# SetScript Masaüstü

![SetScript Banner](https://socialify.git.ci/setscript/SetScript-Desktop/image?description=1&font=Inter&forks=1&language=1&name=1&owner=1&pattern=Floating+Cogs&stargazers=1&theme=Dark)

SetScript Desktop, yeni nesil kod paylaşım platformu SetScript'in resmi masaüstü uygulamasıdır. ![https://setscript.com](https://setscript.com)'un tüm özelliklerine ekstra olarak masa üstü programına özel özellikleri ve çevrimdışı destek ile masaüstünüzde deneyimleyin.

## Özellikler

- İşlevsel sidebar
- Kaydetme özelliği
- Web sitesinin tüm özelliklerine masaüstünden erişim
- Çevrimdışı mod desteği
- Sistem bildirimleri
- Özelleştirilebilir ayarlar
- Modern ve kullanıcı dostu arayüz

##### Downloads
| Version | Type | Download Link |
| ---- | ---- | ----------- |
| v0.0.1 | Alpha | This version is closed for download |

## Star History
<a href="https://star-history.com/#setscript/SetScript-Desktop&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=setscript/SetScript-Desktop&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=setscript/SetScript-Desktop&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=setscript/SetScript-Desktop&type=Date" />
 </picture>
</a>


## Teknoloji Altyapısı

- **Framework**: Electron.js
- **Backend**: Express.js
- **Template Engine**: EJS
- **UI Kütüphaneleri**: React, @emotion/react, Framer Motion
- **Build Aracı**: Webpack

## Başlangıç

### Gereksinimler

- Node.js (En son LTS sürümü)
- npm (Node.js ile birlikte gelir)
- Git

### Kurulum

1. Projeyi klonlayın
```bash
git clone https://github.com/SetScript/SetScript.git
cd SetScript
```

2. Bağımlılıkları yükleyin
```bash
npm install
```

3. Uygulamayı başlatın
```bash
npm start
```

## Geliştirme

Uygulamayı geliştirme modunda çalıştırmak için:

```bash
npm start
```

Windows için kurulum dosyası oluşturmak için:

```bash
npm run build
```

## Proje Yapısı

```
SetScript/
├── assets/         # Uygulama görselleri ve ikonları
├── public/         # Statik dosyalar
├── src/           # Kaynak kodları
├── views/         # EJS şablonları
├── main.js        # Ana Electron işlemi
└── preload.js     # Electron preload scripti
```

> [!NOTE]
> - Uygulama, kullanıcı verilerini saklamak için Belgeler klasörünüzde bir SetScript klasörü oluşturur
> - Sistem bildirimleri için uygun izinler gereklidir
> - İlk kurulum ve senkronizasyon için internet bağlantısı gereklidir
> - Bazı özellikler SetScript hesabı gerektirebilir

## Güvenlik

- Tüm kullanıcı verileri şifrelenmiş formatta yerel olarak saklanır
- API iletişimleri modern şifreleme standartları ile güvence altındadır
- Düzenli güvenlik güncellemeleri sağlanır

## Katkıda Bulunma

Katkılarınızı bekliyoruz! Pull Request göndermekten çekinmeyin.

## Lisans

Bu proje MIT Lisansı ile lisanslanmıştır - detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

<p align="center">
  github@parsherr tarafından ❤️ ile yapıldı
</p>
