# deltasrv: website jualan panel Pterodactyl

Website Next.js (App Router) untuk menjual server Pterodactyl. Pembayaran lewat Kasera Pay (QRIS dan Virtual Account). Setelah pembayaran diterima lewat webhook, server dibuat otomatis di panel.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Deploy ke Vercel

1. Push project ke GitHub.
2. Import repository di Vercel.
3. Isi semua environment variable dari `.env.example` di Project Settings, lalu deploy.
4. Buat endpoint webhook di dashboard Kasera Pay dengan URL `https://domainkamu/api/payment/webhook`, pilih event `payment.paid`, lalu isi `KASERA_WEBHOOK_SECRET`.

## Catatan

- `PTERO_ENVIRONMENT` harus berisi variable yang wajib pada egg yang kamu jual. Cek di halaman egg di panel.
- Pelanggan yang baru dibuatkan akun tidak menerima password dari sistem. Mereka cukup memakai fitur "Lupa Password" di panel dengan email yang didaftarkan. Fitur ini membutuhkan konfigurasi email di panel Pterodactyl.
- Ganti nama brand "deltasrv" di `app/page.tsx` dan `app/layout.tsx`.

## Membuat dan memasang API key Pterodactyl

Project ini hanya membutuhkan **Application API key** (diawali `ptla_`). Client API key (`ptlc_`) tidak dipakai.

### Membuat Application API key (plta)

1. Login ke panel Pterodactyl sebagai admin.
2. Buka **Admin Area**, lalu pilih **Application API** di sidebar.
3. Klik **Create New**, beri nama misalnya `deltasrv`.
4. Beri izin berikut:
   - Users: Read & Write
   - Servers: Read & Write
   - Locations: Read
   - Nodes: Read
   - Eggs: Read
   - Allocations: Read
5. Klik **Create**, lalu salin token `ptla_...`. Token hanya ditampilkan sekali.

### Memasang token

- Untuk pengembangan lokal, isi di `.env.local`:
  ```
  PTERO_URL=https://panel.domainkamu.com
  PTERO_API_KEY=ptla_xxxxxxxx
  ```
- Untuk Vercel, buka Project Settings → Environment Variables, lalu tambahkan `PTERO_URL` dan `PTERO_API_KEY`. Setelah menambah variable, lakukan Redeploy.

Jangan pernah menaruh token ini di file yang di-commit ke GitHub.
