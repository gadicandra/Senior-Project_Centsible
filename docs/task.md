---
title: Catatan Lanjutan Sesi
---

# Task — Catatan Lanjutan Sesi (Setelah PR #46, Menuju Fitur 5.3)

Terakhir diperbarui: 23 Oktober 2026 (PR #46 sudah di-merge, Production dan Preview lulus smoke test dengan AI mati, dokumen region diperbaiki ke `hnd1`, log Supabase untuk P2028 terbaca dan tidak menunjukkan error di sisi server, checklist dirapikan untuk fitur berikutnya).

File ini adalah catatan serah-terima untuk sesi berikutnya. Isinya: posisi repo dan deploy, apa yang sudah selesai, apa yang masih terbuka, dan urutan fitur berikutnya.

> File ini ada di `docs/task.md`. Ringkasan progres untuk tim ada di `docs/progres.md`.

---

## 1. Posisi sekarang

| Hal | Nilai |
|---|---|
| Repo | `/media/adi/CodingSpace/Kuliah/Senpro/Senior-Project_Centsible` (satu folder saja, tanpa worktree) |
| `main` | `4d745dc` (merge PR #46; lokal sama dengan `origin/main`) |
| Branch yang aktif | `chore/post-merge-deploy` (dari `main` `4d745dc`), hanya berisi perubahan dokumen sesi ini |
| Pull request | [#46](https://github.com/gadicandra/Senior-Project_Centsible/pull/46) **MERGED** ke `main` (23 Okt), menutup #24, #25, #26, #27 |
| AI di Vercel | **Mati di Preview dan Production, sesuai keputusan.** Belum ada `ANTHROPIC_API_KEY`, dan 9router di `localhost` tidak bisa dijangkau Vercel. `AI_TEXT_PROVIDER` tidak di-set, jadi `/api/ai/parse` menjawab 503 `ai_unavailable` dan form manual terbuka otomatis |
| Vercel | Fungsi di **`hnd1`** (Tokyo), satu region dengan Supabase dev (ap-northeast-1). Production `4d745dc` (`dpl_RmqE67EZy4pYmyNaxDqdF8Djxe62`) dan Preview (`dpl_EWHyi5xasLHLuUKxyhbZTtaSCVAU`) Ready dan lulus smoke test 23 Okt. Keduanya memakai project Supabase dev |
| Supabase dev | project ref `cvwkkdzvxivpavqiabsg`. Sempat di-pause, dipulihkan 22 Okt. Migrasi terakhir: `20261023120000_revoke_extra_grants` |
| Perubahan lokal pengguna | `.gitignore` diubah pengguna dan belum di-commit. Jangan di-stage, di-stash, atau dibuang |
| Catatan kerja agent | `.agents/tasks/centsible-ai-text-path/`, `.agents/tasks/centsible-db-grants/`, `.agents/tasks/centsible-post-merge/` (tidak di-commit) |
| Laporan | `../Laporan 5 …`, `../Laporan 6 …`, `../Laporan 7 - Tugas Kelompok - MDG Centsible.docx` (+ .pdf, 13 halaman, periode 23–29 Okt) |

---

## 2. Yang berbeda dari `main`

Branch `chore/post-merge-deploy` hanya berisi perubahan dokumen: `docs/task.md`, `docs/progres.md`, dan perbaikan region di `docs/arsitektur.md`. Tidak ada perubahan kode.

### Di luar repo (tidak di-commit)

- `~/.kiro/settings/mcp.json`: server **Supabase MCP** (hosted, `project_ref=cvwkkdzvxivpavqiabsg`, `read_only=true`) di samping Context7.
- `.kiro/steering/task-checklist.md`: aturan agar checklist file ini selalu diperbarui.
- Vercel (23 Okt): env `AI_DRAFT_SECRET` (nilai berbeda per lingkungan, sensitive) dan `AI_PARSE_DAILY_LIMIT=100` di Preview dan Production; env Supabase/database project dev di Preview; *automation bypass secret* Deployment Protection dibuat otomatis oleh `vercel curl`. Region tidak diubah.
- GitHub: issue #10 ditutup dengan komentar (23 Okt).
- Laporan 5, 6, dan 7 (docx + pdf) di folder `Senpro/`, beserta cadangan `.BACKUP-2026-10-23*`.

---

## 3. Sudah selesai

### PR #46 — fitur AI teks (#24–#27), di-merge 23 Okt

- #24 perintah AI + skema keluaran per pengguna (kategori/dompet = enum milik pengguna) + kamus slang nominal (gocap, ceban, rb, jt) + tanggal relatif sesuai zona waktu.
- #25 `POST /api/ai/parse`: cek sesi (401) → Origin (403) → input (400) → kuota harian (429) → AI dengan batas 8 detik → validasi; kalau gagal dialihkan ke form manual. Tidak pernah menyimpan transaksi.
- #26 kartu konfirmasi yang bisa dibetulkan langsung, tidak bisa ditutup/diklik dua kali saat menyimpan.
- #27 transaksi + `ai_extractions` disimpan dalam satu transaksi `withRls`, koreksi hanya isian yang berubah.
- 2 putaran code review (APPROVED); lint, typecheck, 395 unit test, build lulus; `pnpm test:db` 29/29.
- Migrasi `20261023120000_revoke_extra_grants`: mencabut hak berlebih `anon`/`authenticated` di semua tabel `public` (sisa *default privileges* Supabase lama) dan mengubah default untuk tabel baru. Sudah berlaku di dev, yang juga dipakai Production. Catatan lengkap: `.agents/tasks/centsible-db-grants/report.md`.
  - Masih terbuka (pekerjaan lanjutan): sequence/function baru milik `postgres` dan objek milik `supabase_admin` masih otomatis memberi hak ke `anon`/`authenticated`, jadi migrasi yang membuat sequence/function wajib menulis REVOKE/GRANT sendiri. Hak berlebih `service_role` belum dirapikan.
- Uji langsung ke LLM lewat 9router lokal (`cc/claude-haiku-4-5-20251001`, non-thinking): gocap, ceban, 25rb terbaca benar dan tersimpan bersama `ai_extractions`; kalimat bukan transaksi dialihkan ke form manual; log tanpa teks pengguna. Akun uji sudah dihapus.
- Perbaikan peringatan Base UI di beranda (`157ae65`): "Lihat transaksi" jadi tautan bergaya tombol.
- Laporan 5, 6, 7 dibuat dan direview.

### Setelah merge (23 Okt)

- [x] Sinkronisasi git: `main` di-pull `--ff-only` ke `4d745dc`, branch `feat/25-ai-text-parser` dihapus aman (`git branch -d`), branch `chore/post-merge-deploy` dibuat.
- [x] #10 ditutup (dokumen basis data sudah di-merge lewat PR #39).
- [x] Aturan steering `.kiro/steering/task-checklist.md`.

---

## 4. Masih terbuka

- [ ] **Pembagian kontribusi di Laporan 5, 6, dan 7** masih perkiraan berdasarkan role. **Dicek pengguna nanti** setelah pekerjaan lain selesai.
- [ ] **P2028 (Prisma, transaksi database gagal dimulai tepat waktu).** Log Postgres dan Supavisor 22 Okt 13:00–14:30 UTC **sudah dibaca** 23 Okt (Supabase CLI login + Management API `analytics/endpoints/logs`, ClickHouse SQL; endpoint lama `logs.all` sudah dihapus). Tinggal keputusan tim.
  - Hasil log: Postgres dipulihkan dari pause dan **restart 3 kali** pada 13:19:40–13:20:05 UTC (20:19–20:20 WIB), beberapa menit sebelum P2028 pertama (run tes 20:26 WIB). Setelah itu hanya ada error yang memang dipicu tes negatif (RLS, FK, unique, check, kuota). **Tidak ada** statement timeout, lock wait, deadlock, atau batas koneksi. Supavisor hanya mencatat `info`; pool-nya dimatikan saat idle dan dibuat ulang saat ada koneksi baru (koneksi backend baru tiap kali).
  - Kesimpulan: tidak ada penyebab di sisi server. P2028 berasal dari batas waktu di sisi klien (Prisma) saat database dan pooler baru bangun setelah pemulihan. Log tidak mencatat durasi query, jadi bagian yang paling lambat tidak bisa dipastikan. Catatan: `.agents/tasks/centsible-post-merge/p2028-logs.md`.
  - Yang sudah diketahui: Prisma 7 punya dua batas yang sama-sama memunculkan P2028, yaitu `maxWait` 2 detik (menunggu koneksi + `BEGIN`) dan `timeout` 5 detik (seluruh transaksi interaktif). Kedua kejadian terjadi dalam 20–35 menit pertama setelah database dipulihkan (22 Okt). Sesudahnya `pnpm test:db` 3× berturut-turut dan 1× lagi setelah `157ae65` lulus tanpa P2028; mulai transaksi ≤ 0,5 detik, satu `withRls` ≤ 0,9 detik.
  - **Rekomendasi:** jangan ubah `withRls` sekarang. Kalau P2028 muncul lagi saat database sudah "hangat", pilihannya: naikkan `maxWait` di `withRls` (misalnya 5 detik) atau pasang `connectionTimeoutMillis` di `pg.Pool`. Region sudah sama (`hnd1` ↔ ap-northeast-1), jadi itu bukan penyebabnya.
- [ ] **Kunci AI untuk Vercel.** `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL`, dan kunci API sengaja belum diisi di Preview dan Production. Butuh `ANTHROPIC_API_KEY` dari pemilik akun tim, atau Azure OpenAI (Fase 2). `AI_DRAFT_SECRET` dan `AI_PARSE_DAILY_LIMIT=100` sudah ada.
- [ ] **Redirect URL Auth Supabase untuk Preview** belum dicek. Login email+password di Preview jalan; daftar, reset password, dan Google mungkin gagal kalau URL `*.vercel.app` Preview belum ada di allow-list. Cek lewat Supabase CLI (`npx supabase login`) + Management API, tambahkan pola sempit untuk URL Preview project bila perlu.
- [ ] **Tampilan ponsel:** di screenshot smoke test production, halaman `/transaksi` dan dialog "Catat transaksi" tampak lebih lebar dari layar (tepi terpotong); beranda normal. Cek di ponsel asli sebelum #37.
- [ ] **Supabase MCP di sesi agent** belum aktif (tool tidak muncul). Sebagai gantinya, **Supabase CLI sudah login** di laptop ini (23 Okt, `npx supabase@latest login`, token tersimpan di keyring sistem, tidak di repo). Log dibaca lewat Management API `analytics/endpoints/logs` dengan ClickHouse SQL (tabel `logs`, filter kolom `source`). Token bisa dicabut di Supabase Dashboard → Account → Access Tokens kalau tidak diperlukan.
- [ ] **Automation bypass secret Vercel.** Saat smoke test Preview (23 Okt), `vercel curl` otomatis membuat *automation bypass secret* Deployment Protection di project Vercel. Nilainya tidak dicatat. Kalau tidak diperlukan lagi, hapus di Vercel → Settings → Deployment Protection.

---

## 5. Konfigurasi deploy (Vercel, Fase 1)

- [x] `AI_DRAFT_SECRET` (`openssl rand -hex 32`, berbeda per lingkungan, sensitive) dan `AI_PARSE_DAILY_LIMIT=100` di Preview dan Production (23 Okt).
- [ ] `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL`, `ANTHROPIC_API_KEY` di Preview/Production: **sengaja kosong** (lihat bagian 4).
- [x] **Region: tetap `hnd1`.** Dicek 23 Okt: `vercel.json` tidak punya `regions`; setelan project `serverlessFunctionRegion` = `hnd1` (Tokyo); Supabase dev (host pooler) di ap-northeast-1 (Tokyo). Fungsi dan database sudah satu region. `withRls` butuh beberapa perjalanan bolak-balik ke database per request (BEGIN, `set_config`, query, COMMIT); dalam satu region tiap perjalanan hanya beberapa ms, sedangkan `sin1`→Tokyo sekitar 70–80 ms per perjalanan. Kalau nanti ingin semuanya dekat Indonesia, pindahkan project Supabase ke ap-southeast-1 dulu, baru fungsi ke `sin1`. Setelan region tidak diubah.
  - [x] Dokumen yang menyebut `sin1`/Singapura untuk Fase 1 diperbaiki: `docs/arsitektur.md` §0.2 butir 4, ditambah catatan di §4.3 bahwa rencana region Singapore Fase 2 hanya tepat kalau project Supabase dipindah (kalau tidak, Container Apps di Japan East). `docs/database.md` tidak menyebut region.
- [x] **Smoke test production `4d745dc`** (23 Okt, Playwright headless, viewport ponsel, Asia/Jakarta, akun sementara `e2e-prod+20261023@centsible.test`):
  - [x] Deploy `dpl_RmqE67EZy4pYmyNaxDqdF8Djxe62` **Ready**, target production, alias domain utama, fungsi `hnd1`.
  - [x] Login dan beranda jalan (login 200, beranda tampil saldo + dompet "Tunai").
  - [x] **AI mati dikonfirmasi**: `POST /api/ai/parse` 503 `ai_unavailable` + `prefill`, `Cache-Control: no-store`, bukan 500. Form manual terbuka otomatis dengan pesan "Fitur AI sedang tidak tersedia. Silakan isi form manual.". Tanpa sesi: 401.
  - [x] **Form manual jalan**: Simpan → "Transaksi disimpan.", daftar 0 → 1.
  - [x] **Production menulis ke database dev**: 1 baris `transactions` milik akun uji, 0 `ai_extractions`.
  - [x] Log Vercel (50 entri): tidak ada error/500, 0 kecocokan untuk teks, nominal, dan email uji. Log AI hanya `{"evt":"ai_fallback","outcome":"ai_unavailable","code":"env","prompt":"p1"}`.
  - [x] Akun uji dihapus, cascade dicek (`auth.users`, `users`, `transactions`, `wallets`, `categories` = 0).
- [x] **Migrasi revoke berlaku di Production**: `NEXT_PUBLIC_SUPABASE_URL` Production berisi ref project dev, dan satu project Supabase hanya punya satu database, jadi migrasi 05 sudah berlaku.
- [x] **Env Preview** diisi project dev (23 Okt): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL` untuk semua branch Preview. Tanpa `AI_TEXT_*`.
  - [x] Deploy Preview `dpl_EWHyi5xasLHLuUKxyhbZTtaSCVAU` dari branch `chore/post-merge-deploy` (lewat API Vercel, karena push tidak memicu deploy untuk commit yang sudah pernah dideploy), Ready, `hnd1`.
  - [x] Smoke test login Preview lulus (akun sementara `e2e-preview+20261023@centsible.test` → beranda, konsol tanpa error), akun dihapus, cascade `0,0,0,0,0`.
- Catatan kerja + screenshot: `.agents/tasks/centsible-post-merge/` (`prod-smoke.md`, `preview-env.md`, `p2028-logs.md`, tidak di-commit).

---

## 6. Fitur berikutnya (5.3)

Urutan yang disarankan: fitur yang **tidak butuh kunci AI** dulu, karena bisa dikerjakan, dites, dan dideploy sekarang. Fitur AI menyusul setelah ada `ANTHROPIC_API_KEY` atau Azure OpenAI (Fase 2). Satu branch dari `main` dan satu PR per issue.

Tanpa kunci AI:

1. [ ] #30 Halaman ringkasan & perhitungan datanya.
2. [ ] #31 Batas anggaran per kategori.
3. [ ] #34 Unduh data ke CSV.
4. [ ] #36 PWA + offline.
5. [ ] #35 Tes otomatis (cakupan), sambil jalan di tiap PR dan dirapikan di akhir.

Butuh kunci AI atau Azure:

6. [ ] #28 Input suara (rekam → teks → kartu konfirmasi yang sama). Whisper lokal tidak terjangkau dari Vercel → `AI_STT_ENABLED=false` di Preview/Production, atau endpoint ber-API key.
7. [ ] #29 Dataset uji + ukur akurasi AI (target ≥ 85% nominal & kategori), pakai data `ai_extractions`. Bisa disiapkan datasetnya dulu, diukur lewat 9router lokal; angka akhir diukur ulang di penyedia final.
8. [ ] #32 Ringkasan mingguan dari AI (Vercel Cron + `CRON_SECRET`).
9. [ ] #33 Deteksi pengeluaran tidak wajar & peringatannya (perhitungannya bisa tanpa AI; teks penjelasan dari AI).

Sebelum uji pengguna:

- [ ] Pindah ke **Fase 2 (Azure)** sesuai `docs/arsitektur.md` §0.3 (Container Apps, Azure OpenAI, Key Vault); jangan pakai 9router untuk uji pengguna.
- [ ] Pertimbangkan role database khusus aplikasi yang bukan pemilik tabel (`docs/database.md` §7.4), supaya query yang lupa `withRls()` gagal, bukan bocor.
- [ ] #37 Uji coba pengguna asli (min. 10 orang, 14 hari).
- [ ] #38 Dokumentasi & presentasi akhir.
- [ ] Laporan 8 (periode berikutnya).

---

## 7. Cara melanjutkan di sesi berikutnya

1. Buka sesi chat baru (supaya tool MCP dimuat), lalu minta agent membaca `docs/task.md`.
2. Pastikan `chore/post-merge-deploy` sudah di-merge ke `main` (PR dokumen). Lalu `git switch main` → `git pull --ff-only`.
3. Untuk tiap issue di bagian 6, buat branch baru dari `main`, misalnya `git switch -c feat/30-ringkasan`. Satu issue = satu branch = satu PR, dengan `Closes #N` di deskripsi PR.
4. Kerjakan → `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (dan `pnpm test:db` kalau menyentuh database) → `git add` → `git commit` → `git push` → PR ke `main`. Cek deploy Preview PR sebelum merge.
5. Perbarui `docs/task.md` dan `docs/progres.md` di PR yang sama.
6. Jangan membuat worktree baru. Jangan menyentuh perubahan `.gitignore` milik pengguna yang belum di-commit.

### Aturan yang tetap berlaku

- Jangan membaca atau menampilkan isi `.env.local`. File itu sudah ada di folder repo dan di-ignore git.
- Supabase MCP/CLI dipakai read-only untuk mengecek; perubahan permanen lewat migrasi di repo.
- Tes database hanya ke project **dev** (`cvwkkdzvxivpavqiabsg`).
- Baca panduan Next.js di `node_modules/next/dist/docs/` sebelum menulis kode Next.js (lihat `AGENTS.md`).
- Tidak ada force-push, tidak mengubah git config, tidak melewati hook.
