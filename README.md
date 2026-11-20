# Centsible

**Jaga uangmu.** Pencatat keuangan untuk mahasiswa Indonesia. Kamu cukup mengetik atau mengucapkan *"beli bensin gocap kemarin"*, lalu AI yang menyusun transaksinya.

[![CI](https://github.com/gadicandra/Senior-Project_Centsible/actions/workflows/main.yml/badge.svg)](https://github.com/gadicandra/Senior-Project_Centsible/actions/workflows/main.yml)

- **Aplikasi:** https://senior-project-centsible.vercel.app
- **Dokumentasi proyek (GitHub Pages):** https://gadicandra.me/Senior-Project_Centsible/ · [Panduan](https://gadicandra.me/Senior-Project_Centsible/panduan) · [Slide](https://gadicandra.me/Senior-Project_Centsible/slide.html)

Kelompok **MDG (My Duit Gweh)**, Praktikum Senior Project Gasal 2026, DTETI FT UGM

| Peran | Nama | NIM |
|---|---|---|
| Ketua · Project Manager & AI Engineer | Garjita Adicandra | 24/535330/TK/59377 |
| Cloud Engineer & Software Engineer | Muhammad Syauqi Fittuqo | 24/543713/TK/60433 |
| UI/UX Designer & Software Engineer | Naufal Dzaky | 24/543697/TK/60431 |

---

## Daftar isi

1. [Masalah yang diselesaikan](#1-masalah-yang-diselesaikan)
2. [Fitur](#2-fitur)
3. [Cara kerja AI](#3-cara-kerja-ai)
4. [Arsitektur & teknologi](#4-arsitektur--teknologi)
5. [Menjalankan di komputer sendiri](#5-menjalankan-di-komputer-sendiri)
6. [Menyalakan AI teks](#6-menyalakan-ai-teks)
7. [Menyalakan input suara (Whisper)](#7-menyalakan-input-suara-whisper)
8. [Pengujian](#8-pengujian)
9. [Deploy](#9-deploy)
10. [Struktur repo](#10-struktur-repo)
11. [Keamanan & privasi](#11-keamanan--privasi)
12. [Status & rencana](#12-status--rencana)

---

## 1. Masalah yang diselesaikan

Aplikasi pencatat keuangan sudah banyak, tapi kebanyakan ditinggalkan dalam beberapa minggu. Penyebab utamanya adalah **proses mencatat itu sendiri**: sekitar 8 langkah dan 20–40 detik per transaksi, hanya untuk jajan Rp 5.000. Selain itu, aplikasi yang ada tidak paham bahasa sehari-hari mahasiswa seperti *gocap*, *ceban*, *25rb*, atau *kemarin lusa*.

Centsible memangkas proses itu menjadi **satu kalimat dan satu ketukan konfirmasi**. Setelah data terkumpul, aplikasi berganti peran menjadi penasihat: memberi ringkasan mingguan, memperingatkan pengeluaran yang tidak biasa, dan membantu mengatur anggaran.

| Tujuan | Target | Hasil saat ini |
|---|---|---|
| Mencatat cepat | ≤ 10 detik per transaksi | Kalimat → kartu konfirmasi ±1 detik (p95 1,3 dtk) |
| AI akurat | ≥ 85% nominal **dan** kategori tanpa koreksi | **88,9%** pada 99 kalimat uji, nominal **100%** |
| Pengguna bertahan | ≥ 60% masih mencatat di hari ke-14 | Diukur saat uji coba ([protokol](docs/uji-coba.md)) |

Latar belakang, analisis kompetitor, dan kebutuhan fungsional lengkapnya ada di [`docs/index.md`](docs/index.md).

---

## 2. Fitur

### Mencatat
- **Catat dengan kalimat (FR 2–4).** Ketik di layar **Tambah** (tombol **+**), misalnya *"makan siang 25rb"* atau *"bayar kos 850k senin lalu via bca"*. AI membaca nominal, jenis, kategori, dompet, keterangan, dan tanggal relatif, lalu menampilkan **kartu konfirmasi**. Tidak ada yang tersimpan sebelum kamu menekan **Simpan**, dan setiap isian bisa dibetulkan.
- **Catat dengan suara (FR 6).** Tekan mikrofon, bicara maksimal 30 detik. Whisper mengubahnya jadi teks, lalu teks itu diproses persis seperti ketikan dan tetap berakhir di kartu konfirmasi.
- **Form manual (FR 7).** Selalu tersedia, juga saat AI mati. Nominal ditampilkan besar dan kategori berupa grid ikon.
- **Catatan koreksi (FR 5).** Setiap kali hasil AI dibetulkan, isian sebelum dan sesudahnya disimpan sebagai bahan pengukuran akurasi.
- **Offline & PWA (FR 16).** Aplikasi bisa dipasang di layar utama HP. Saat offline, halaman yang pernah dibuka tetap tampil dan transaksi dari form manual disimpan di perangkat, lalu **terkirim otomatis tanpa dobel** saat online lagi.

### Mengelola
- **Transaksi (FR 8).** Lihat, ubah, hapus, dan saring berdasarkan tanggal, jenis, kategori, dan dompet.
- **Kategori & dompet (FR 9–10).** Kategori bawaan untuk mahasiswa (Makan, Transport, Kos, Kuliah, Hiburan, Kesehatan, Uang Saku, Freelance, …) dan banyak dompet (tunai, bank, e-wallet). Saldo dihitung otomatis.
- **Unduh CSV (FR 15).** Mengunduh transaksi sesuai saringan aktif. Aman dibuka di Excel: UTF-8 dengan BOM dan penangkal *formula injection*.

### Menganalisis
- **Ringkasan bulanan (FR 12).** Total saldo, pemasukan, pengeluaran, pembagian per kategori, dan grafik tren harian.
- **Anggaran per kategori (FR 11).** Batas mingguan atau bulanan, dengan status *Aman*, *Hampir habis*, atau *Melebihi* (ikon + teks + warna, tidak hanya warna).
- **Peringatan pengeluaran tidak biasa (FR 14).** Pengeluaran minggu ini dibandingkan dengan kebiasaanmu 8 minggu terakhir (median + MAD), baik dari sisi nominal maupun frekuensi. Batasnya mengikuti kebiasaan tiap pengguna.
- **Ringkasan mingguan (FR 13).** Setiap Senin 06:00 WIB dibuat ringkasan minggu lalu beserta satu saran anggaran. Angkanya dihitung sistem, AI hanya merangkai kalimat. Kalau AI mati, dipakai kalimat templat yang tetap memuat saran.

### Akun & keamanan
- **Daftar & masuk (FR 1).** Email + kata sandi atau Google, reset kata sandi, dan hapus akun beserta seluruh datanya.
- **Data terkunci per pengguna (FR 17).** Row Level Security di semua tabel. Basis data yang menolak akses lintas pengguna, bukan sekadar filter di kode.

---

## 3. Cara kerja AI

```
"beli bensin gocap kemarin"  ──┐
🎤 suara ── Whisper ── teks ───┤
                               ▼
              POST /api/ai/parse  (sesi · Origin · kuota harian · batas 8 dtk)
                               │
              LLM + skema JSON khusus pengguna
              (kategori & dompet = enum milik pengguna)
                               │
              Validasi Zod + cek silang nominal slang (deterministik)
                               │
                      Kartu konfirmasi ── Simpan ──► transactions + ai_extractions
                               │
                   (gagal / AI mati) ──► form manual berisi isian awal
```

- **AI tidak bisa mengarang kategori.** Skema keluarannya dibuat per pengguna, jadi kategori dan dompet hanya bisa dipilih dari daftar milik pengguna itu.
- **Nominal dicek dua kali.** Pengurai slang deterministik (gopek 500, seceng 1.000, goceng 5.000, ceban 10.000, gocap 50.000; `rb`/`k`/`jt`; "2 ceban") membandingkan angka dari AI. Kalau berbeda atau ambigu (*cepek* bisa Rp 100 atau Rp 100.000), isian ditandai ⚠ di kartu konfirmasi.
- **Tanggal relatif** (kemarin, semalam, senin lalu, minggu lalu) dihitung menurut zona waktu pengguna, bukan zona waktu server.
- **Penyedia bisa diganti lewat env:** Anthropic (SDK resmi, Structured Outputs), gateway OpenAI-compatible, atau Azure OpenAI di Fase 2. Semua panggilan AI ada di satu modul, `src/server/ai/`.

---

## 4. Arsitektur & teknologi

| Lapisan | Teknologi |
|---|---|
| Aplikasi | **Next.js 16** (App Router, Server Actions, Turbopack), React 19, TypeScript |
| Tampilan | Tailwind CSS 4, Base UI / shadcn, lucide-react, font Plus Jakarta Sans |
| Data | **Supabase** (Postgres + Auth), **Prisma 7** (`@prisma/adapter-pg`), Zod 4 |
| AI teks | `@anthropic-ai/sdk` atau `openai` (endpoint OpenAI-compatible) |
| AI suara | Whisper lewat endpoint OpenAI-compatible: **Speaches** (faster-whisper) lokal, atau Azure Whisper |
| PWA | Web App Manifest + Service Worker buatan sendiri (`public/sw.js`), tanpa library |
| Hosting | **Vercel** (region `hnd1`), Vercel Cron, GitHub Actions, GitHub Pages untuk dokumentasi |
| Tes | Vitest 5, Testing Library, `@vitest/coverage-v8`, Playwright untuk smoke test |

```
Browser / PWA ──► Vercel (Next.js) ──► withRls() ──► Supabase Postgres (RLS)
                     │       │
                     │       └──► LLM (Anthropic / gateway)  ·  Whisper (Speaches / Azure)
                     └── Vercel Cron (Senin 06:00 WIB) ──► /api/cron/weekly
```

- **Semua query pengguna lewat `withRls()`**, yaitu satu transaksi yang berganti ke role `authenticated` dengan klaim JWT pengguna, jadi kebijakan RLS ikut berlaku. Job terjadwal memakai `asService()`.
- **Fase 1** (sekarang): Vercel + Supabase. **Fase 2**: Azure (Container Apps, Azure OpenAI, Whisper, Key Vault) sebelum uji coba dengan pengguna nyata.

Detailnya: [`docs/arsitektur.md`](docs/arsitektur.md) (keputusan desain, ADR) dan [`docs/database.md`](docs/database.md) (skema, RLS, grant, migrasi).

---

## 5. Menjalankan di komputer sendiri

### Prasyarat
- **Node.js 22** dan **pnpm 10** (`corepack enable` sudah cukup karena versinya dikunci di `package.json`)
- Satu **project Supabase** (yang gratis cukup)
- Opsional: **Docker**, untuk input suara (bagian 7)

### Langkah

```bash
git clone https://github.com/gadicandra/Senior-Project_Centsible.git
cd Senior-Project_Centsible
pnpm install                     # juga menjalankan `prisma generate`
cp .env.example .env.local
```

Isi `.env.local`. Minimal tiga bagian ini supaya aplikasi bisa jalan:

| Variabel | Dari mana | Contoh |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys → *publishable* | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys → *secret* (hanya server, untuk hapus akun) | `sb_secret_…` |
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** (port **6543**) | `postgres://postgres.<ref>:<pw>@<pooler>:6543/postgres` |
| `DIRECT_URL` | Supabase → Connect → **Session pooler** (port **5432**), untuk migrasi | `postgres://postgres.<ref>:<pw>@<pooler>:5432/postgres` |
| `AI_DRAFT_SECRET` | `openssl rand -hex 32` (≥ 32 karakter) | |

Terapkan skema basis data, lalu jalankan:

```bash
pnpm db:deploy     # terapkan semua migrasi di prisma/migrations
pnpm dev           # http://localhost:3000
```

Daftar akun baru. Kategori bawaan dan dompet "Tunai" dibuat otomatis oleh trigger basis data.

**Supabase Auth:** di Dashboard → Authentication → URL Configuration, isi *Site URL* dan tambahkan `http://localhost:3000/**` ke *Redirect URLs*. Untuk login Google, aktifkan provider Google di Authentication → Providers.

> Tanpa variabel `AI_*` aplikasi tetap berjalan penuh: kolom kalimat langsung membuka form manual, dan mikrofon menampilkan "Input suara belum tersedia".

---

## 6. Menyalakan AI teks

Pilih salah satu penyedia, isi di `.env.local`, lalu jalankan ulang `pnpm dev`.

**A. Anthropic (disarankan)**
```env
AI_TEXT_PROVIDER=anthropic
AI_TEXT_MODEL=claude-haiku-4-5
ANTHROPIC_API_KEY=sk-ant-…
```

**B. Gateway OpenAI-compatible** (mis. gateway lokal di `localhost`)
```env
AI_TEXT_PROVIDER=openai-compatible
AI_TEXT_MODEL=<nama model di gateway>
AI_TEXT_BASE_URL=http://localhost:20128/v1     # https wajib, kecuali localhost
AI_TEXT_API_KEY=<kunci gateway>
```

Opsional: `AI_PARSE_DAILY_LIMIT=100`, yaitu kuota panggilan AI per pengguna per hari.

> **Pakai model yang tidak "thinking" secara default** (mis. Claude Haiku 4.5). Model *thinking* menghabiskan batas token sebelum JSON selesai, sehingga semua kalimat jatuh ke form manual (di log terlihat `stop_reason: max_tokens`).

Coba: tekan **+**, ketik *"beli bensin gocap kemarin"*, lalu kartu konfirmasi muncul dengan Rp 50.000 · Transport · tanggal kemarin.

---

## 7. Menyalakan input suara (Whisper)

Suara diubah jadi teks oleh **Whisper** lewat endpoint **OpenAI-compatible** (`/v1/audio/transcriptions`). Untuk lokal dipakai **[Speaches](https://github.com/speaches-ai/speaches)** (faster-whisper) di Docker. Tidak butuh GPU dan tidak butuh kunci API.

### 7.1 Jalankan Speaches (sekali)

```bash
# Image CPU, versi dikunci. Model disimpan di volume supaya tidak diunduh ulang.
docker run -d --name speaches -p 8000:8000 \
  -v hf-hub-cache:/home/ubuntu/.cache/huggingface/hub \
  ghcr.io/speaches-ai/speaches:0.8.3-cpu

# Tunggu sampai siap
until curl -sf http://localhost:8000/health; do sleep 2; done

# Unduh model Whisper (±500 MB, sekali saja)
curl -X POST http://localhost:8000/v1/models/Systran/faster-whisper-small
curl -s http://localhost:8000/v1/models     # harus memuat Systran/faster-whisper-small
```

Sesudahnya cukup `docker start speaches` / `docker stop speaches`.

| Model | Ukuran | Catatan |
|---|---|---|
| `Systran/faster-whisper-small` | ±500 MB | **Dipakai sekarang.** ±4 detik per rekaman di CPU laptop |
| `Systran/faster-whisper-medium` | ±1,5 GB | Lebih akurat, lebih lambat |
| `Systran/faster-whisper-large-v3` | ±3 GB | Paling akurat, sebaiknya dengan GPU (`…:0.8.3-cuda`) |

### 7.2 Hubungkan ke aplikasi

Tambahkan ke `.env.local`, lalu jalankan ulang `pnpm dev`:

```env
AI_STT_ENABLED=true
AI_STT_BASE_URL=http://localhost:8000/v1
AI_STT_MODEL=Systran/faster-whisper-small
# AI_STT_API_KEY=        # opsional; Speaches lokal tidak butuh kunci
```

Input suara **juga butuh AI teks aktif** (bagian 6), karena hasil transkripsi diproses oleh parser yang sama.

### 7.3 Coba

1. Buka http://localhost:3000, tekan **+**, lalu ikon **mikrofon**. Izinkan akses mikrofon di browser (di `localhost` diizinkan tanpa https).
2. Ucapkan *"makan siang dua puluh lima ribu"*, lalu tekan lagi untuk berhenti.
3. Teks hasil Whisper masuk ke kolom, lalu kartu konfirmasi muncul dengan Rp 25.000 · Makan.

Cek langsung ke Speaches tanpa aplikasi:
```bash
curl http://localhost:8000/v1/audio/transcriptions \
  -F file=@rekaman.wav -F model=Systran/faster-whisper-small -F language=id \
  -F "prompt=gocap, ceban, goceng, 25rb, kos"
```

**Cara kerjanya:** rekaman (≤ 30 detik, ≤ 2 MB) dikirim ke `POST /api/ai/transcribe`. Server memeriksa sesi, Origin, ukuran, dan kuota harian, lalu meneruskan ke Whisper dengan `language: "id"` dan prompt kamus slang supaya *gocap* tidak ditulis "go cap". Audio **tidak disimpan** dan tidak dicatat di log.

**Hasil uji (16 Nov 2026, `faster-whisper-small`, CPU):** 3 dari 4 kalimat benar sepenuhnya dan nominal benar di keempatnya. Waktu dari suara sampai kartu ±5 detik.

> **Kenapa suara mati di Production?** Vercel tidak bisa menjangkau `localhost:8000`. Di Production dibutuhkan Whisper yang bisa diakses dari internet (Azure OpenAI Whisper di Fase 2, atau Speaches di server sendiri **dengan** API key). Selama itu belum ada, tombol mikrofon tetap tampil dan menjelaskan bahwa suara belum tersedia.

---

## 8. Pengujian

| Perintah | Isi | Kapan |
|---|---|---|
| `pnpm lint` · `pnpm typecheck` | ESLint, TypeScript | setiap perubahan |
| `pnpm test` | ±590 tes unit & komponen (Vitest + Testing Library, jsdom) | setiap perubahan |
| `pnpm test:coverage` | Tes + cakupan. **Gagal bila di bawah batas** (baris 75%, cabang 68%, fungsi 65%) | otomatis di CI setiap PR |
| `pnpm test:db` | Tes integrasi ke **Supabase dev**: RLS antar pengguna, grant, constraint, idempotensi, role aplikasi | perubahan yang menyentuh basis data |
| `pnpm eval:ai` | Akurasi AI pada 99 kalimat berlabel (`eval/ai-dataset.jsonl`). Laporannya ditulis ke `eval/results/` | setiap ganti prompt atau model |
| `pnpm build` | Build produksi | sebelum PR |

> `pnpm test:db` dan `pnpm eval:ai` memakai `.env.local` sungguhan (database dev dan penyedia AI), jadi tidak dijalankan di CI. **Jangan arahkan `test:db` ke database produksi**, karena tes ini membuat dan menghapus akun uji.

---

## 9. Deploy

- **CI (GitHub Actions):** setiap PR ke `main` menjalankan lint → typecheck → tes + cakupan → build, lalu deploy **Preview** ke Vercel. Push ke `main` men-deploy **Production**.
- **Env di Vercel:** sama dengan `.env.local`, ditambah:
  - `CRON_SECRET` (≥ 16 karakter, `openssl rand -hex 32`). Melindungi `/api/cron/weekly`, yang dipanggil Vercel Cron setiap Senin 06:00 WIB (`vercel.json`).
  - **Setelah menambah atau mengubah env, redeploy.** Env baru hanya terbaca saat build.
- **Role database khusus aplikasi** (disarankan sebelum ada pengguna nyata): migrasi 06–07 membuat role `centsible_app` yang **tidak punya akses tabel langsung**, sehingga query yang lupa `withRls()` gagal, bukan membocorkan data. Cara mengaktifkan:
  1. `alter role centsible_app with password '<acak>';` di SQL Editor Supabase
  2. `DATABASE_URL` → `postgres://centsible_app.<ref>:<pw>@<pooler>:6543/postgres`. `DIRECT_URL` tetap `postgres`.
  3. Redeploy. Lihat [`docs/database.md` §7.4](docs/database.md).
- **Redirect URL Supabase** untuk Preview: `https://senior-project-centsible-*-<team>.vercel.app/**`. Polanya sempit, jangan `*.vercel.app`.

---

## 10. Struktur repo

```
src/
  app/
    (app)/           halaman setelah login: Beranda, ringkasan, transaksi, anggaran, pengaturan, akun
    (auth)/          masuk, daftar, reset & ubah kata sandi
    api/
      ai/parse/      kalimat → usulan transaksi
      ai/transcribe/ rekaman suara → teks (Whisper)
      export/        unduh CSV
      sync/          kirim antrean transaksi offline
      cron/weekly/   job ringkasan mingguan (Vercel Cron)
  components/        komponen UI per fitur (ai-input, home, transaksi, anggaran, ringkasan, …)
  lib/               logika murni yang bisa dites: uang, tanggal, anggaran, anomali, ringkasan, CSV, skema Zod
  server/
    ai/              satu-satunya tempat yang tahu penyedia AI: prompt, skema, provider, transkripsi
    actions/         Server Actions (form)
    services/        akses data; semua query pengguna lewat withRls()
    db/              Prisma client, withRls(), asService()
prisma/migrations/   skema, RLS, grant, fungsi, role aplikasi
public/sw.js         Service Worker (PWA/offline)
tests/db/            tes integrasi basis data
eval/                dataset & runner evaluasi akurasi AI
docs/                dokumen proyek (juga diterbitkan di GitHub Pages)
```

---

## 11. Keamanan & privasi

- **Row Level Security** di semua tabel pengguna. `anon` tidak punya akses apa pun. Dibuktikan oleh `pnpm test:db`.
- **Server Action & Route Handler** selalu memverifikasi sesi (JWT), tidak hanya mengandalkan *middleware*. Route Handler juga memeriksa Origin.
- **AI dibatasi:** kuota per pengguna per hari, panjang kalimat dibatasi, batas waktu 8 detik, dan hasil AI tidak pernah tersimpan tanpa konfirmasi pengguna.
- **Privasi:** audio tidak disimpan. Ke AI untuk ringkasan mingguan hanya dikirim **angka agregat**, bukan daftar transaksi. Log tidak memuat teks pengguna.
- **Rahasia** hanya ada di `.env.local` (di-*ignore* git) dan env Vercel. Jangan menaruh kunci di repo.

Menemukan celah keamanan? Laporkan ke ketua kelompok secara pribadi, bukan lewat issue publik.

---

## 12. Status & rencana

**Sudah berjalan di Production:** semua fitur di bagian 2, kecuali AI teks, suara, dan ringkasan mingguan versi AI. Ketiganya menunggu kunci penyedia AI. Sementara itu, kolom kalimat jatuh ke form manual dan ringkasan mingguan memakai templat. Ketiganya sudah bisa dicoba penuh di komputer sendiri (bagian 6–7).

**Berikutnya:**
1. **Fase 2 (Azure):** Azure OpenAI + Whisper supaya AI teks dan suara aktif di Production. Setelah itu jalankan ulang `pnpm eval:ai`.
2. **Uji coba 14 hari** dengan minimal 10 mahasiswa ([`docs/uji-coba.md`](docs/uji-coba.md)) untuk mengukur retensi dan akurasi AI dari data nyata.

Progres per tugas: [`docs/progres.md`](docs/progres.md). Catatan serah-terima antarsesi: [`docs/task.md`](docs/task.md).
