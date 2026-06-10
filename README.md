«Sumber kode sepenuhnya berasal dari zetoboymaccalan_01 dan di-rewrite menjadi Extension oleh Claude AI (sebelumnya Web Version). Boleh dimodifikasi asal tidak digunakan untuk tindakan ilegal. Terima kasih.»

SFL Bypass — Chrome Extension

Bypass link "sfl.gl" tanpa nunggu iklan. Pure client-side, no server.

Fitur

Auto Bypass

- Buka link "sfl.gl" langsung di browser
- Extension otomatis mendeteksi halaman
- Proses bypass berjalan otomatis
- Redirect ke URL tujuan tanpa perlu klik tombol

Manual Bypass

- Klik icon extension, aktifkan fitur floating button
- Klik floating button
- Tempel link "sfl.gl"
- Klik Bypass Sekarang
- Salin atau buka URL hasil bypass

Cara Install

1. Buka Chrome → pergi ke "chrome://extensions/"
2. Aktifkan Developer Mode (toggle kanan atas)
3. Klik Load unpacked
4. Pilih folder "sfl-bypass-ext" ini
5. Extension siap dipakai!

**Catatan untuk pengguna HP (Android):**  
Extension ini juga dapat digunakan di browser berbasis Chromium yang mendukung ekstensi desktop, seperti:
- **Lemur Browser**
- **Kiwi Browser**
- **Quetta Browser**

Cukup install extension dengan metode "Load unpacked" di browser tersebut, lalu aktifkan mode Auto Bypass untuk pengalaman terbaik.

Cara Pakai

Manual Bypass

1. Klik icon extension di toolbar Chrome
2. Toggle Floating Button → ON
3. Pergi ke halaman mana saja
4. Klik tombol ungu mengambang di pojok kanan bawah
5. Paste link "sfl.gl/..." → klik Bypass Sekarang
6. Salin atau langsung buka URL tujuan

Auto Bypass

1. Pastikan extension aktif
2. Buka link "sfl.gl/..."
3. Extension akan otomatis menjalankan proses bypass
4. Kamu akan langsung diarahkan ke URL tujuan

Struktur File

sfl-bypass-ext/

├── manifest.json    ← konfigurasi extension

├── background.js    ← logic resolver sfl.gl (service worker)

├── content.js       ← floating button + dialog (inject ke semua halaman)

├── popup.html       ← UI toggle enable/disable

├── popup.js         ← logika popup

└── icons/           ← icon extension

Catatan

- Hanya support sfl.gl untuk sekarang
- Logic resolver sama persis dengan "resolve.ts" versi Web
- Tidak butuh server eksternal (pure extension)
- "host_permissions" di "manifest.json" yang bypass CORS