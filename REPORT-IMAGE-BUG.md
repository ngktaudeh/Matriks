# Report — Kehilangan Fitur Gambar di Refactor Matriks

Tanggal: 2026-08-15
Status: Teridentifikasi & sedang diperbaiki

## Ringkasan

Setelah refactor `App.js` monolitik (3108 baris) menjadi 37 file modular, **seluruh
fitur gambar hilang**. Tidak ada upload, tidak ada tampilan gambar di kartu item,
tidak ada lightbox, dan tombol "upload gambar" saat membuat menu baru juga tidak ada.

## Akar Masalah

Fitur gambar sebelumnya hidup di dalam `App.js` (komponen `ItemModal` + `ItemCard`):

- `compressImage()` — resize/re-encode sebelum upload
- `supabase.storage.from("item-images").upload(...)` — upload ke bucket storage
- `image_url` — kolom di tabel `items` (dari migration `0002_item_image_subtitle.sql`)
- `<img src={item.image_url}>` di `ItemCard` + `ImageLightbox` + `CopyImageButton`

File refactor baru yang menggantikannya **tidak menyertakan logika gambar sama sekali**:

| File baru | Masalah |
|---|---|
| `components/Vault/ItemEditor.jsx` | Tidak ada field upload gambar, tidak ada `image_url` di state `form` |
| `components/Vault/ItemCard.jsx` | Tidak me-render `item.image_url` |
| `hooks/useItems.js` | Tidak menangani upload ke storage |
| `pages/VaultPage.jsx` | Tidak ada `ImageLightbox` / lightbox state |
| `components/Vault/` | Tidak ada `CopyImageButton` / lightbox komponen |

## Bukti Teknis

1. `git show cb61648:frontend/src/App.js` → berisi `supabase.storage.from("item-images")`,
   `compressImage`, `image_url`, `ImageLightbox`, `CopyImageButton`.
2. `grep -i "image" frontend/src/components/Vault/ItemEditor.jsx` → **0 hasil**.
3. `grep -i "image" frontend/src/components/Vault/ItemCard.jsx` → **0 hasil**.
4. Schema database masih punya kolom `image_url` dan `subtitle` (migration
   `0002_item_image_subtitle.sql`) — jadi data gambar lama **tidak hilang**, hanya
   tidak dirender lagi oleh UI baru.

## Dampak

- Gambar yang sudah tersimpan tetap ada di Supabase storage + kolom `image_url`,
  tetapi **tidak muncul** di aplikasi.
- User **tidak bisa upload gambar baru** saat membuat/mengedit item.
- Tidak ada lightbox/preview/copy gambar.

## Rencana Perbaikan (sedang dikerjakan)

1. Tambah field `image_url` + upload (compress → storage) di `ItemEditor.jsx`.
2. Render `item.image_url` di `ItemCard.jsx` + tombol hapus gambar.
3. Tambah `ImageLightbox` component + state di `VaultPage.jsx`.
4. Pastikan `useItems.js` menyimpan/menghapus `image_url` dengan benar.
5. Migrasi storage sudah ada (`0002_item_image_subtitle.sql`) — tinggal pastikan
   bucket `item-images` public dibuat di Supabase dashboard.
