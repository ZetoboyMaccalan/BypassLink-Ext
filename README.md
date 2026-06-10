# Sumber kode sepenuhnya berasal zetoboymaccalan_01 dan di rewrite ke Extension oleh Claude AI (Sebelumnya Web Version). Boleh di modifikasi asal tidak digunakan untuk tindakan ilegal. Terima kasih.

# SFL Bypass — Chrome Extension

Bypass link sfl.gl tanpa nunggu iklan. Pure client-side, no server.

## Cara Install

1. Buka Chrome → pergi ke `chrome://extensions/`
2. Aktifkan **Developer mode** (toggle kanan atas)
3. Klik **Load unpacked**
4. Pilih folder `sfl-bypass-ext` ini
5. Extension siap dipakai!

## Cara Pakai

1. Klik **icon extension** di toolbar Chrome
2. Toggle **Floating Button** → ON
3. Pergi ke halaman mana saja
4. Klik tombol **ungu mengambang** di pojok kanan bawah
5. Paste link `sfl.gl/...` → klik **Bypass Sekarang**
6. Salin atau langsung buka URL tujuan

## Struktur File

```
sfl-bypass-ext/
├── manifest.json     ← konfigurasi extension
├── background.js     ← logic resolver sfl.gl (service worker)
├── content.js        ← floating button + dialog (inject ke semua halaman)
├── popup.html        ← UI toggle enable/disable
├── popup.js          ← logika popup
└── icons/            ← icon extension
```

## Catatan

- Hanya support **sfl.gl** untuk sekarang
- Logic resolver sama persis dengan `resolve.ts` versi Web
- Tidak butuh internet ke server eksternal (pure extension)
- `host_permissions` di manifest.json yang bypass CORS
