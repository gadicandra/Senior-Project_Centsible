---
title: Catatan Lanjutan Sesi
---

# Task — Catatan Lanjutan Sesi (Setelah PR #46, Menuju Fitur 5.3)

Terakhir diperbarui: 16 November 2026. Semua issue kode selesai: PR terbuka atas nama pengguna: #49, #51 (#36), #55 (#38), #56 (#37 persiapan). Syauqi push 6 PR dari `~/kirim-teman.zip`: #34, #33, #35, #29, #28, #32 (24 commit). PR #52/#53/#54/#57 versi pertama atas nama pengguna ditutup tanpa merge supaya total commit 81 : 35. Akurasi AI 88,9% (target 85%). Sebelumnya: 15 November 2026. PR #47, #48, dan #50 (#31 anggaran, di-push dan di-merge anggota tim) sudah masuk `main` @ `743f4df`. Smoke test Production lulus untuk `/ringkasan`, `/transaksi`, dan dialog di 390 px; Beranda melebar karena email panjang, diperbaiki di PR #49. #36 PWA + offline dibuka sebagai PR #51. #34 CSV selesai dikodekan dan diserahkan ke anggota tim (patch + panduan, `.agents/tasks/centsible-34-csv/`). Supabase dev sempat di-pause lagi dan sudah di-resume pengguna. Sebelumnya: 26 Oktober 2026 (#31: desain anggaran per kategori di branch `feat/31-anggaran`, tanpa migrasi; direvisi ke iterasi 4 sesuai tinjauan iterasi 3 (1 MEDIUM: pesan anggaran tidak ditemukan saat mengubah kini tampil sebagai toast `BUDGET_NOT_FOUND`; 3 NIT tes: dua tombol "Tambah anggaran", uji CHECK `23514` pada Transport bulanan, cek grant lengkap; semua ditangani); tinjauan ulang iterasi 4 **APPROVED** (0 HIGH/MEDIUM, 2 NIT), siap implementasi; belum ada kode). Sebelumnya (#30: garis tepi tombol bulan dan "Lihat ringkasan" diperbaiki di PR [#48](https://github.com/gadicandra/Senior-Project_Centsible/pull/48), commit `f85f6ee`, 448 unit test lulus; nit Laporan 7 dirapikan: Gambar 16 diambil ulang tanpa indikator dev, format rupiah disamakan dengan aplikasi). Sebelumnya hari yang sama: halaman `/ringkasan` selesai, PR #48 dibuka ke `main` dan menunggu review, akun uji dihapus, `docs/progres.md` dan Laporan 7 memuat #30. Sebelumnya, 23 Oktober 2026: PR #46 di-merge, Production dan Preview lulus smoke test dengan AI mati, region diperbaiki ke `hnd1`, log P2028 tidak menunjukkan error server.

File ini adalah catatan serah-terima untuk sesi berikutnya. Isinya: posisi repo dan deploy, apa yang sudah selesai, apa yang masih terbuka, dan urutan fitur berikutnya.

> File ini ada di `docs/task.md`. Ringkasan progres untuk tim ada di `docs/progres.md`.

---

## 1. Posisi sekarang

| Hal | Nilai |
|---|---|
| Repo | `/media/adi/CodingSpace/Kuliah/Senpro/Senior-Project_Centsible` (satu folder saja, tanpa worktree) |
| `main` | `743f4df` (merge PR #50, #31 anggaran). Sebelumnya `8ec1f21` (PR #48) dan PR #47 |
| Branch yang aktif | Satu branch per issue dari `main`. Pengguna: `fix/beranda-overflow` (#49), `feat/36-pwa` (#51), `feat/38-dokumentasi` (#55), `feat/37-uji-coba` (#56). Syauqi (dari patch, berurutan): `feat/34-csv`, `feat/33-anomali`, `feat/35-tes`, `feat/29-eval`, `feat/28-suara`, `feat/32-ringkasan-mingguan`. Lokal: `wip/32-on-syauqi-base` (sumber patch #32, jangan di-push) |
| Pull request | #46–#48, #50 **MERGED**. **OPEN** (CI hijau, menunggu merge pengguna): #49, #51, #55, #56. **CLOSED** tanpa merge (dipindah ke Syauqi): #52, #53, #54, #57 |
| AI di Vercel | **Mati di Preview dan Production, sesuai keputusan.** Belum ada `ANTHROPIC_API_KEY`, dan 9router di `localhost` tidak bisa dijangkau Vercel. `AI_TEXT_PROVIDER` tidak di-set, jadi `/api/ai/parse` menjawab 503 `ai_unavailable` dan form manual terbuka otomatis |
| Vercel | Fungsi di **`hnd1`** (Tokyo), satu region dengan Supabase dev (ap-northeast-1). Production `4d745dc` (`dpl_RmqE67EZy4pYmyNaxDqdF8Djxe62`) dan Preview (`dpl_EWHyi5xasLHLuUKxyhbZTtaSCVAU`) Ready dan lulus smoke test 23 Okt. Keduanya memakai project Supabase dev |
| Supabase dev | project ref `cvwkkdzvxivpavqiabsg`. Sempat di-pause, dipulihkan 22 Okt. Migrasi terakhir: `20261023120000_revoke_extra_grants` |
| Perubahan lokal pengguna | `.gitignore` diubah pengguna dan belum di-commit. Jangan di-stage, di-stash, atau dibuang |
| Catatan kerja agent | `.agents/tasks/centsible-ai-text-path/`, `.agents/tasks/centsible-db-grants/`, `.agents/tasks/centsible-post-merge/`, `.agents/tasks/centsible-30-ringkasan/`, `.agents/tasks/centsible-31-part1/`, `.agents/tasks/centsible-31-anggaran/` (tidak di-commit) |
| Laporan | `../Laporan 5 …`, `../Laporan 6 …`, `../Laporan 7 - Tugas Kelompok - MDG Centsible.docx` (+ .pdf, 18 halaman, periode 23–29 Okt; ditambah bagian deploy setelah merge dan #30 pada 25 Okt, cadangan `.BACKUP-2026-10-25` dan `.BACKUP-2026-10-25-b`; tinjauan dokumen `APPROVED`, nit Gambar 16 dan format rupiah sudah dirapikan). Pembagian kontribusi masih menunggu cek pengguna |

---

## 2. Yang berbeda dari `main`

Branch `chore/post-merge-deploy` hanya berisi perubahan dokumen: `docs/task.md`, `docs/progres.md`, dan perbaikan region di `docs/arsitektur.md`. Tidak ada perubahan kode.

Branch `feat/30-ringkasan` (di atas `chore/post-merge-deploy`) menambah halaman `/ringkasan` beserta tesnya, nav "Ringkasan", tautan di Beranda, dan pembaruan `docs/arsitektur.md` (commit `7699fc0`), perbaikan garis tepi tombol bulan dan "Lihat ringkasan" (commit `f85f6ee`), ditambah catatan #30 di `docs/progres.md` dan `docs/task.md`. Sudah di-push dan dibuka sebagai PR #48 (belum di-merge).

### Di luar repo (tidak di-commit)

- `~/.kiro/settings/mcp.json`: server **Supabase MCP** (hosted, `project_ref=cvwkkdzvxivpavqiabsg`, `read_only=true`) di samping Context7.
- `.kiro/steering/task-checklist.md`: aturan agar checklist file ini selalu diperbarui.
- Vercel (23 Okt): env `AI_DRAFT_SECRET` (nilai berbeda per lingkungan, sensitive) dan `AI_PARSE_DAILY_LIMIT=100` di Preview dan Production; env Supabase/database project dev di Preview; *automation bypass secret* Deployment Protection dibuat otomatis oleh `vercel curl`. Region tidak diubah.
- GitHub: issue #10 ditutup dengan komentar (23 Okt).
- Laporan 5, 6, dan 7 (docx + pdf) di folder `Senpro/`, beserta cadangan `.BACKUP-2026-10-23*` dan `Laporan 7 … .BACKUP-2026-10-25.*` / `.BACKUP-2026-10-25-b.*`.

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
- [ ] **Redirect URL Auth Supabase untuk Preview** belum dicek (15 Nov: agent tidak diizinkan membaca token Supabase CLI dari keyring). Cek manual di Supabase Dashboard → Authentication → URL Configuration: pastikan ada pola sempit untuk URL Preview project (`https://senior-project-centsible-*-garjita-adicandras-projects.vercel.app/**`). Login email+password di Preview jalan; daftar, reset password, dan Google mungkin gagal tanpa itu.
- [x] **Tampilan ponsel** (15 Nov, Production 390×844): `/transaksi`, dialog "Catat transaksi" (358 px), dan `/ringkasan` tidak melebar. Penyebab tepi terpotong ada di **Beranda**: email panjang di `<h1>Halo, …</h1>` tanpa titik putus membuat halaman 489 px dan tombol kirim AI keluar layar. Diperbaiki dengan `break-words` di PR [#49](https://github.com/gadicandra/Senior-Project_Centsible/pull/49) (build lokal: 390 px). Tetap cek di ponsel asli sebelum #37.
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

**Urutan kerja berikutnya (16 Nov):** (1) pengguna merge #49, #51, #56; (2) Syauqi push + merge berurutan #34 → #33 → #35 → #29 → #28 → #32 dari `~/kirim-teman.zip` (#28 butuh #51, #32 butuh #33), Naufal review di Preview; (3) set `CRON_SECRET` di Vercel setelah #32 masuk; (4) merge #55 paling akhir; (5) Fase 2/Azure lalu uji coba #37. **Pembagian commit di `main` setelah semua masuk:** pengguna 81, Syauqi 35, Naufal 2 (pemeriksa).

Tanpa kunci AI:

1. [x] #30 Halaman ringkasan & perhitungan datanya (PR #48 merged).
   - [x] Desain ditulis di `.agents/tasks/centsible-30-ringkasan/design.md` (25 Okt). Keputusan utama: route `/ringkasan` dengan `?month=YYYY-MM` (bulan kalender di zona waktu pengguna, rentang `2020-01` s.d. bulan berjalan). Total saldo dari view `wallet_balances` (dompet aktif saja, sama dengan Beranda). Agregasi lewat Prisma `groupBy` di dalam satu `withRls`. Grafik tren harian pakai SVG biasa tanpa library baru. Tidak ada migrasi dan tidak ada dependensi baru.
   - [x] Temuan skema: belum ada konsep transfer (`entry_kind` hanya `income|expense`), jadi tidak ada yang perlu dikecualikan. `occurred_at` bertipe `date` lokal pengguna, jadi pengelompokan per hari tidak butuh konversi zona waktu. `category_id` wajib, jadi tidak ada transaksi tanpa kategori.
   - [x] Tinjauan mandiri desain (iterasi 2, 25 Okt): grant `wallet_balances` dicek di migrasi 04/05, kode `getSummary` dibuat final (satu `withRls`, error bila kategori hilang), grid total diganti `sm:grid-cols-3` karena 3 kolom tidak muat di 390 px, detail SVG diperjelas.
   - [x] Tinjauan desain oleh subagent (25 Okt): `CHANGES_REQUESTED`, 1 temuan MEDIUM, 8 NIT. Temuan MEDIUM: batang pemasukan dan pengeluaran di grafik hanya dibedakan warna (hijau vs merah), padahal NFR-4 melarang warna sebagai satu-satunya pembeda. Usulan perbaikan: arsiran pada batang pengeluaran dan keterangan posisi kiri/kanan di legenda. Zona waktu, transfer, `wallet_balances`, grant, `withRls`, nama route, dan rencana tes dinyatakan sudah benar. Rinciannya ada di `design-review.md`.
   - [x] Revisi desain sesuai tinjauan (iterasi 3): batang pengeluaran diarsir, legenda menyebut posisi kiri/kanan, urutan kategori ditambah `id` sebagai penentu terakhir, kontrol bulan nonaktif berupa `<span aria-hidden>`, posisi label sumbu dan `className` di `NavLinks` diperjelas.
   - [x] Tinjauan ulang desain iterasi 3 (25 Okt): `APPROVED`, 0 HIGH/MEDIUM, 2 NIT (format tanggal di `<title>` tiap batang belum ditentukan; `gap-4` membuat header mobile sekitar 48 px lebih tinggi, usul `gap-x-4 gap-y-1`). Boleh ditutup saat implementasi.
   - [x] Implementasi + tes (25 Okt, commit `7699fc0`): `src/lib/summary.ts` (bulan, zero-fill harian, persen largest-remainder), `services/summary.ts` (satu `withRls`), route `/ringkasan` + `loading.tsx`, komponen `src/components/ringkasan/`, nav "Ringkasan", tautan "Lihat ringkasan" di Beranda, `docs/arsitektur.md` §4 + baris FR 12. Tes baru: 28 unit `summary`, 3 service (mock), 19 komponen, 2 nav, `tests/db/summary.test.ts` 5/5. Total `pnpm test` 447 lulus, `pnpm test:db` 34/34, lint/typecheck/build lulus. Tanpa migrasi dan dependensi baru.
     - Catatan: `@testing-library/jest-dom` tidak terpasang, jadi cek deskripsi aksesibel grafik membaca `aria-describedby` → `<figcaption>`. Dua NIT tinjauan terakhir ditutup (format `<title>` batang "12 Okt: …", header `gap-x-4 gap-y-1`).
   - [x] Cek tampilan 390 px (25 Okt): `pnpm dev` + Playwright (Chrome headless, 390×844, `Asia/Jakarta`), 2 akun uji sementara di Supabase dev (satu berisi 11 transaksi Sep–Okt + dompet arsip, satu kosong). 6 screenshot di `.agents/tasks/centsible-30-ringkasan/evidence/`, ringkasan di `visual-verify.md`. Cek silang SQL read-only: total saldo, pemasukan/pengeluaran/selisih Oktober, 5 kategori (persen total 100), September, dan akun kosong semuanya cocok. Tidak ada scroll horizontal (`scrollWidth` 390), tidak ada error console.
     - Temuan: tombol bulan yang aktif tidak bergaris tepi, sedangkan placeholder nonaktif bergaris. Dugaan penyebab: `buttonVariants` dipakai tanpa `cn(...)` pada `Link`, jadi `border-transparent` menang atas `border-border`. Hal yang sama ada di tautan "Lihat ringkasan" di Beranda. Belum diperbaiki.
     - [x] 2 akun uji sementara dihapus (25 Okt, Supabase Admin API `deleteUser`). Cek cascade read-only: `auth.users`, `users`, `transactions`, `wallets`, `categories` = 0 untuk kedua id.
   - [x] Dokumen (25 Okt): `docs/progres.md` memuat #30 di "Sedang dikerjakan" (issue belum ditutup, jadi belum dicentang). `docs/arsitektur.md` sudah diperbarui di commit `7699fc0`; `docs/database.md` dan `docs/index.md` tidak diubah karena tidak ada view, fungsi, atau migrasi baru.
   - [x] Laporan 7 (25 Okt, masih periode 23–29 Okt): cadangan `.BACKUP-2026-10-25.docx/.pdf` dibuat dulu. Rangkuman paragraf 2 dan status bagian 1 dan 3 diperbarui (PR #46 sudah di-merge). Bagian baru 4 (merge PR #46, smoke test Production dengan AI mati, env Preview, region `hnd1`, penyebab P2028) dengan Gambar 13, dan bagian baru 5 (#30) dengan Gambar 14–16 dari screenshot asli. Tabel pembagian kontribusi tidak diubah. PDF dibuat ulang, 18 halaman, semua halaman yang berubah dicek lewat `pdftoppm`. Catatan: `.agents/tasks/centsible-30-ringkasan/report-note.md`.
   - [x] Push `feat/30-ringkasan` dan PR [#48](https://github.com/gadicandra/Senior-Project_Centsible/pull/48) `Closes #30` ke `main` (25 Okt). Belum di-merge.
   - [x] CI PR #48 hijau (25 Okt, commit `0f36aa8`): "Lint, Type Check, Test & Build" dan "Deploy ke Vercel (preview)" lulus.
   - [x] PR #47 lalu #48 di-merge (pengguna). Smoke test Production 15 Nov: login, catat transaksi manual (1 baris di DB), `/ringkasan` 200 dengan pengeluaran Rp 25.000 dan grafik tampil, tanpa error console. Akun uji dihapus, cascade 0. Catatan: `.agents/tasks/centsible-cleanup/`.
   - [x] Perbaiki garis tepi tombol bulan dan "Lihat ringkasan" (25 Okt, commit `f85f6ee` di PR #48): kelas `buttonVariants` outline pada `Link` dibungkus `cn(...)`, jadi `border-transparent` tidak lagi menimpa `border-border`. Markup dan aksesibilitas tidak berubah (tautan sebelumnya/berikutnya tetap ber-`aria-label`; `aria-current` tidak dipakai karena tautan itu bukan halaman aktif). Tes baru di `summary-screen.test.tsx` + cek tambahan di `home-screen.test.tsx` (gagal tanpa perbaikan, lulus dengan perbaikan). Lint, typecheck, 448 unit test, build lulus. Dicek di server produksi lokal: garis tepi tampil. Catatan: `.agents/tasks/centsible-31-part1/verification.md`.
   - [x] Nit Laporan 7 (25 Okt): cadangan `.BACKUP-2026-10-25-b.docx/.pdf` dibuat dulu. Gambar 16 diambil ulang dari `pnpm build && pnpm start` (tanpa indikator dev "N"; akun uji sementara di Supabase dev, sudah dihapus, cascade 0). Format rupiah disamakan dengan `formatRupiah` ("Rp" + spasi tak terputus + angka), 6 nominal di bagian 2 dan 5. Kendala 3 bagian 5 diperbarui (perbaikan sudah masuk PR #48). Tabel PERAN ANGGOTA tidak diubah. PDF dibuat ulang, tetap 18 halaman, halaman 6, 16, 17, 18 dicek lewat `pdftoppm`.
   - [ ] **Nama anggota tebakan di Laporan 7, dicek pengguna** bersama pembagian kontribusi: bagian 4 (deploy setelah merge PR #46) menulis Garjita Adicandra dan Muhammad Syauqi Fittuqo; bagian 5 (#30 ringkasan) menulis Garjita Adicandra dan Naufal Dzaky. Gambar 14 dan 15 masih memuat indikator dev "N" (dibiarkan; Gambar 14 dipakai untuk menunjukkan temuan garis tepi).
2. [x] #31 Batas anggaran per kategori (PR #50 merged; di-commit, di-push, dan di-merge oleh anggota tim dari patch + panduan).
   - [x] Desain ditulis di `.agents/tasks/centsible-31-anggaran/design.md` (25 Okt, iterasi 1, belum ditinjau). Keputusan utama: route `/anggaran` + nav "Anggaran" setelah "Transaksi"; tabel `budgets` dipakai apa adanya, **tanpa migrasi** (unique `(user_id, category_id, period)`, CHECK nominal, FK majemuk, RLS, dan grant sudah ada). Mingguan = Senin–Minggu, bulanan = bulan kalender yang sama dengan `/ringkasan`, keduanya menurut `users.timezone`; hanya periode berjalan. Hanya kategori pengeluaran aktif (dijaga service, sesuai `docs/database.md` §17.1). Batas Rp 1.000 s.d. Rp 1 triliun. Status: aman < 80 %, hampir habis 80–99 %, habis/melebihi ≥ 100 %, ditandai ikon + teks + warna. Hapus = `DELETE` dengan dialog konfirmasi; ubah hanya nominal. Kartu ringkas di Beranda (3 anggaran teratas, gagal dimuat tidak merusak Beranda). Tanpa AI dan tanpa dependensi baru.
   - [x] Tinjauan desain iterasi 1 (25 Okt, `.agents/tasks/centsible-31-anggaran/design-review.md`): **CHANGES_REQUESTED**, 0 HIGH, 2 MEDIUM, 7 NIT. MEDIUM: (1) teks status tidak seragam antarbagian ("sisa" vs "Sisa", contoh "sisa Rp 75.000" ternyata 85 % = hampir habis); (2) `getTimezone` di `saveBudget` berada di luar `try`, jadi error DB tidak menjadi pesan umum seperti di B9. Klaim skema, RLS, grant (migrasi 02 dan 05), `monthRange` = bulan `/ringkasan`, dan helper Zod rupiah sudah dicek ke sumber dan benar; tanpa migrasi tetap tepat. Temuan kontras: isian `amber-600` hanya 2,93:1 terhadap trek `bg-muted`.
   - [x] Revisi desain iterasi 2 (25 Okt): kesembilan temuan ditangani, tidak ada yang ditunda. Teks status dibakukan ("Aman · sisa Rp 175.000", spasi tak terputus) dan dipakai sama di A4.8, B4, dan tes; `getTimezone` dipindah ke dalam `try` (gagal → "Gagal menyimpan anggaran. Coba lagi.") plus tes aksi; helper `formatPercent` untuk label dan `aria-valuetext`; isian peringatan jadi `bg-amber-700` (4,63:1 terhadap trek); langkah tes DB dinomori dengan anggaran M (bulanan) dan W (mingguan); cek grant memakai daftar hak; cadangan nav 390 px = padding `px-1`, label tidak dipendekkan; nilai awal form ubah "500.000". Ruang lingkup dan keputusan tanpa migrasi tidak berubah.
   - [x] Tinjauan desain iterasi 2 (25 Okt, `design-review.md` ditimpa): **CHANGES_REQUESTED**, 0 HIGH, 1 MEDIUM, 3 NIT. Semua temuan iterasi 1 terbukti sudah ditangani. MEDIUM: `aria-label` progressbar dan tombol aksi tidak memuat periode, jadi Makan mingguan dan Makan bulanan bernama sama; perbaikannya menambah "(mingguan|bulanan)". NIT: ubah anggaran yang sudah terhapus belum me-revalidate `/anggaran` (bertentangan dengan B12); label opsi kategori tanpa ikon; tes `budgets-screen` perlu mock `next/navigation` untuk `useRouter`. Dicek ulang: tanpa migrasi tetap tepat (grant/revoke `budgets` di migrasi 02 dan 05 sudah sesuai), kontras isian dan teks lulus, nav lima tautan di 390 px terukur 349–351 px dari 358 px (Chromium, font aplikasi), menu Base UI bisa dibuka dengan `fireEvent` di jsdom.
   - [x] Revisi desain iterasi 3 (26 Okt): keempat temuan ditangani, tidak ada yang ditunda. Nama aksesibel progressbar dan tombol aksi kini memuat periode ("Pemakaian anggaran Makan (bulanan)", "Aksi untuk anggaran Makan (bulanan)") plus tes komponen dengan Makan mingguan + bulanan; cabang ubah di `saveBudget` me-revalidate `/anggaran` saat `NOT_FOUND` plus tes aksi; helper `categoryOptionLabel` (tanpa ikon → nama saja); tes `budgets-screen` me-mock `next/navigation` dan mengecek URL "Lihat transaksi". Angka lebar nav di B4/B7 memakai hasil ukur tinjauan. Ruang lingkup dan keputusan tanpa migrasi tidak berubah.
   - [x] Tinjauan desain iterasi 3 (26 Okt, `design-review.md` ditimpa): **CHANGES_REQUESTED**, 0 HIGH, 1 MEDIUM, 3 NIT. Keempat temuan iterasi 2 terbukti sudah ditangani. MEDIUM: `revalidatePath("/anggaran")` pada `NOT_FOUND` di cabang ubah membuat `BudgetItem` (pemilik dialog ubah) di-unmount dalam respons yang sama, jadi pesan form tidak pernah tampil; perbaikannya: pindahkan konstanta ke `src/lib/schemas/budget.ts` (`BUDGET_NOT_FOUND`) dan tampilkan `toast.error` dari pembungkus `useActionState`. NIT: dua tombol "Tambah anggaran" di keadaan kosong (tes pakai `getAllByRole`); target baris uji CHECK di langkah DB 4 belum ditentukan (pakai Transport bulanan, cek kode `23514`); cek grant `anon` baru mencakup 4 hak (tambah `truncate,references,trigger`). Dicek ulang: tanpa migrasi tetap tepat, rentang bulanan sama dengan `/ringkasan`, fakta hari/tanggal dan angka uji benar.
   - [x] Revisi desain iterasi 4 (26 Okt): keempat temuan ditangani, tidak ada yang ditunda. Konstanta pindah ke `src/lib/schemas/budget.ts` sebagai `BUDGET_NOT_FOUND` (aman untuk klien, dipakai service, action, dan `BudgetFormDialog`); `BudgetFormDialog` membungkus `saveBudget` di `useActionState` dan memanggil `toast.error` saat `BUDGET_NOT_FOUND`, jadi pesan tetap tampil walau kartu dan dialognya hilang setelah revalidate (B5.4, B9, B12 diperbarui) plus tes `budgets-screen` yang mengecek `toast.error`. Tes keadaan kosong memakai `getAllByRole` (2 tombol, tidak disabled). Langkah DB 4 memakai Transport bulanan `amountLimit: 0n` dan `pgCode === "23514"`. Cek grant: `anon` tanpa `select,insert,update,delete,truncate,references,trigger`, `authenticated` tanpa `truncate,references,trigger` dan punya CRUD. Ruang lingkup dan keputusan tanpa migrasi tidak berubah.
   - [x] Tinjauan ulang desain iterasi 4 (26 Okt, `design-review.md` ditimpa): **APPROVED**, 0 HIGH, 0 MEDIUM, 2 NIT. Keempat temuan iterasi 3 terbukti sudah ditangani: `BUDGET_NOT_FOUND` aman diimpor klien dan `Toaster` ada di `root-shell.tsx` (di luar `BudgetItem`), jadi toast tetap tampil setelah kartu hilang; kode `23514` sampai ke `pgCode` lewat `originalCode` adapter pg (jalur yang sama dengan `42501` di tes AI); Transport adalah kategori pengeluaran bawaan; matriks grant sesuai migrasi 05. NIT: kepala desain menyebut commit `1d0369e` yang sudah usang; tes komponen belum menulis cara membuka menu aksi Base UI (`fireEvent.click` tombol lalu `findByRole("menuitem")`). Boleh ditutup saat implementasi.
   - [x] Implementasi + tes (3 Nov): sesuai desain iterasi 4. `pnpm test` 514, `pnpm test:db` 43/43 (9 tes baru), lint, typecheck, build lulus. Tanpa migrasi dan dependensi baru. Diserahkan sebagai `anggaran-31.patch` + `PANDUAN-COMMIT.md`.
   - [ ] Cek tampilan nav lima label di 390 px setelah deploy.
3. [ ] #34 Unduh data ke CSV (**di-push Syauqi** dari patch, PR 1 dari 3).
   - [x] Kode + tes (15 Nov): `GET /api/export` (sesi wajib, filter sama dengan `/transaksi`, semua halaman, maks. 10.000 baris), helper CSV RFC 4180 dengan BOM UTF-8 dan penangkal rumus spreadsheet, tombol "Unduh CSV" di `/transaksi`. 455 unit test, `tests/db/export.test.ts` 2/2, build lulus; unduhan dicek di browser. Patch + panduan: `.agents/tasks/centsible-34-csv/` (salinan di `~/kirim-34/`).
4. [ ] #36 PWA + offline (PR [#51](https://github.com/gadicandra/Senior-Project_Centsible/pull/51), menunggu review).
   - [x] Manifest + ikon, Service Worker tanpa library (halaman network-first + salinan offline, aset cache-first, `/api` tidak di-cache, cache halaman dibuang saat Keluar), antrean form manual offline (localStorage per pengguna) + `POST /api/sync` idempoten lewat `client_id` (tanpa migrasi). E2E offline di build lokal lulus (catat offline → antrean → online → 1 baris, kirim ulang tidak dobel). Di luar cakupan: teks AI offline dan Background Sync (butuh IndexedDB).
5. [ ] #35 Tes otomatis + cakupan di CI (**di-push Syauqi** dari patch, PR 3 dari 3).
   - [x] Kode + tes (15–16 Nov): `@vitest/coverage-v8` (dev), `pnpm test:coverage` di CI dengan batas baris/statement 75%, cabang 68%, fungsi 65% (angka sekarang dibulatkan ke bawah; dibuktikan gagal saat tes dihapus). Tes baru: `actions/auth`, `actions/settings`, `services/categories`, `transaction-filters`. Bug ditemukan: email ber-spasi ditolak (validasi sebelum trim), diperbaiki. Cakupan baris 68,5% → 77,5%, cabang 65,5% → 71,7%; gabungan dengan #33/#34/#36 tetap di atas batas (76,2% / 70,0%, 561 tes). Patch + panduan: `.agents/tasks/centsible-35-tes/`, paket `~/kirim-teman.zip`.

Butuh kunci AI atau Azure:

6. [ ] #28 Input suara (**di-push Syauqi**, PR 5 dari 6; PR #57 ditutup). Tombol mikrofon → `/api/ai/transcribe` (Origin, sesi, validasi berkas sebelum kuota `consume_ai_quota('transcribe')`) → teks lewat jalur parse yang sama → kartu konfirmasi. Whisper OpenAI-compatible (Speaches `0.8.3-cpu` lokal; Azure di Fase 2). Mati kecuali `AI_STT_ENABLED=true`; di Vercel tetap mati sampai ada Whisper yang terjangkau.
7. [ ] #29 Dataset + akurasi AI (**di-push Syauqi**, PR 4 dari 6; PR #54 ditutup). `eval/ai-dataset.jsonl` 99 kalimat (slang, tanggal relatif, 10 kategori bawaan, tanpa few-shot prompt). `pnpm eval:ai` (Vitest, `vitest.eval.config.mts`, manual). Haiku 4.5 lewat 9router: nominal 100%, kategori 88,9%, **nominal+kategori 88,9%** (target 85%), p95 1,3 dtk; 11 salah semuanya kategori ambigu. Ukur ulang dengan provider final.
8. [ ] #32 Ringkasan mingguan (**di-push Syauqi**, PR 6 dari 6, setelah #33). `src/lib/weekly.ts` (angka + saran + templat), `src/server/ai/weekly.ts` (AI hanya merangkai angka agregat, wajib "Saran:", fallback templat), job idempoten `insights` per pengguna aktif (klien owner, filter `user_id` eksplisit), `GET /api/cron/weekly` + `CRON_SECRET` (timing-safe; `/api/cron/` dikecualikan dari proxy sesi), Vercel Cron `0 23 * * 0` (Senin 06:00 WIB), kartu di Beranda. Tes DB 2/2, unit 576 di atas tumpukan Syauqi, coverage 76,5%/70,3%. Dicoba lewat 9router: kalimat wajar dalam 2,7 dtk.
9. [ ] #33 Deteksi pengeluaran tidak wajar & peringatannya. Bagian statistik (median + MAD 8 minggu, nominal dan frekuensi, tanpa AI) **di-push Syauqi** dari patch (PR 2 dari 3, "Bagian dari #33"); teks penjelasan AI menyusul.

Sebelum uji pengguna:

- [ ] Pindah ke **Fase 2 (Azure)** sesuai `docs/arsitektur.md` §0.3 (Container Apps, Azure OpenAI, Key Vault); jangan pakai 9router untuk uji pengguna.
- [ ] Pertimbangkan role database khusus aplikasi yang bukan pemilik tabel (`docs/database.md` §7.4), supaya query yang lupa `withRls()` gagal, bukan bocor.
- [ ] #37 Uji coba pengguna asli (min. 10 orang, 14 hari). Persiapan di PR [#56](https://github.com/gadicandra/Senior-Project_Centsible/pull/56): `docs/uji-coba.md` (protokol, prasyarat, templat hasil, etika) + `scripts/uji-coba.sql` (read-only: retensi D14, akurasi AI dari `user_corrections`, ringkasan mingguan). Pelaksanaan menunggu Fase 2.
- [x] #38 Dokumentasi & presentasi (PR [#55](https://github.com/gadicandra/Senior-Project_Centsible/pull/55)): `docs/panduan.md` + `docs/slide.html` di GitHub Pages kelompok.
- [x] Laporan 8 (30 Okt – 15 Nov) dibuat: `../Laporan 8 - Tugas Kelompok - MDG Centsible.docx/.pdf`, 12 halaman, script `.agents/tasks/laporan-8/build_laporan8.py`. Kolom Anggota Terlibat/PERAN ANGGOTA perlu dicek tim.

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
