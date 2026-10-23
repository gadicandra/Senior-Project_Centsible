---
title: Catatan Lanjutan Sesi
---

# Task — Catatan Lanjutan Sesi (Fitur AI Teks, Issue #24–#27)

Terakhir diperbarui: 23 Oktober 2026 (perbaikan peringatan Base UI di beranda, cek kesiapan deploy Vercel/Supabase, issue #10 ditutup, Laporan 7).

File ini adalah catatan serah-terima untuk sesi berikutnya. Isinya: apa yang sudah berbeda dari `main`, apa yang sedang berjalan, apa yang belum dikerjakan sampai deploy, dan checklist untuk semuanya.

> File ini ada di `docs/task.md` pada branch `feat/25-ai-text-parser` (PR #46). Ringkasan progres untuk tim ada di `docs/progres.md`.

---

## 1. Posisi sekarang

| Hal | Nilai |
|---|---|
| Repo | `/media/adi/CodingSpace/Kuliah/Senpro/Senior-Project_Centsible` (satu folder saja, tanpa worktree) |
| Branch yang aktif | `feat/25-ai-text-parser` (dibuat dari `main` commit `e5fe716`, sudah di-push) |
| Cara update | Edit file di repo → `git add` → `git commit` → `git push` (otomatis masuk PR #46) |
| Pull request | [#46](https://github.com/gadicandra/Senior-Project_Centsible/pull/46) ke `main`. Status 23 Okt: **OPEN**, `MERGEABLE`/`CLEAN`, CI hijau (lint/typecheck/test/build + deploy preview Vercel), belum ada review dari anggota |
| Issue yang ditutup PR ini | #24, #25, #26, #27 (lewat `Closes #N`) |
| Supabase dev | project ref `cvwkkdzvxivpavqiabsg`. Sempat di-pause, sudah dipulihkan 22 Okt |
| Uji langsung AI | Lulus 23 Okt lewat 9router lokal (`cc/claude-haiku-4-5-20251001`), akun uji dev `e2e-ai+20261023@centsible.test` **masih ada** (dipakai lagi untuk cek beranda; dihapus setelah review, lihat 5.1) |
| Vercel | Fungsi berjalan di **hnd1** (Tokyo), sama dengan Supabase dev (ap-northeast-1). Production memakai project Supabase dev. Preview belum punya env Supabase/database |
| Catatan kerja agent | `.agents/tasks/centsible-ai-text-path/` (design.md, plan.md, review, report-evidence/) |
| Laporan | `../Laporan 5 - Tugas Kelompok - MDG Centsible.docx` (+ .pdf), `../Laporan 6 - ...docx` (+ .pdf), `../Laporan 7 - Tugas Kelompok - MDG Centsible.docx` (+ .pdf, 13 halaman, periode 23–29 Okt) |

---

## 2. Yang berbeda dari `main`

16 commit kode/dokumen sampai `157ae65`, 66 file berubah (+6626 / −58), ditambah commit `docs:` pembaruan checklist ini.

| Commit | Isi |
|---|---|
| `0f72e43` | feat(ai): prompt and output schema (#24) |
| `d8e0021` | feat(ai): /api/ai/parse route (#25) |
| `69c0d56` | feat(ai): store ai_extractions corrections (#27) |
| `03d0103` | feat(ai): confirmation card (#26) |
| `ba81ddd` | fix(ai): log anthropic stop_reason on truncated or refused output (#25) |
| `ffe5add` | chore(ai): restore spacing, document proxy 401 before origin check (#25) |
| `334aa3b` | fix(ai): keep confirmation card open and single-submit while saving (#26) |
| `1f791cd` | docs: add project progress checklist |
| `efa5d8f` | docs: add session handoff task checklist |
| `e63758d` | docs: update task.md for single-checkout workflow |
| `cb4565a` | fix(db): revoke excess grants from authenticated (#27) — migrasi `20261023120000_revoke_extra_grants` |
| `af6def3` | docs: record db grants fix and P2028 findings |
| `7417a5b` | docs: update task checklist (main cleanup, 9router test steps) |
| `b919216` | docs: update task checklist (laporan 6 gambar 3) |
| `106050b` | docs: record live 9router e2e test of ai text path |
| `157ae65` | fix(ui): render home "Lihat transaksi" as a styled link, not Base UI Button |
| (commit ini) | docs: update task checklist (wrap-up 23 okt, laporan 7) |

### File baru / berubah, dikelompokkan

- **Logika AI di server** (`src/server/ai/`): `index.ts` (pemilih penyedia AI dari env), `prompt.ts` (perintah sistem + kamus slang nominal + contoh), `schema.ts` (skema keluaran per pengguna, kategori/dompet = enum milik pengguna), `normalize.ts` (validasi & normalisasi hasil AI), `draft-token.ts` (token bertanda tangan untuk draf hasil AI), `log.ts` (log tanpa data pribadi), `providers/anthropic.ts`, `providers/openai-compatible.ts` (9router, divalidasi Zod + coba ulang 1×), `providers/errors.ts`.
- **Kode bersama** (`src/lib/ai/`): `amount.ts` (gocap, ceban, rb, jt, …; cepek ditandai ambigu), `relative-date.ts` ("kemarin", "tadi pagi", "Senin lalu" sesuai zona waktu pengguna), `corrections.ts` (hanya isian yang diubah pengguna), `request.ts`, `limits.ts`, `types.ts`.
- **Endpoint**: `src/app/api/ai/parse/route.ts` — urutan cek: sesi (401) → Origin (403) → isi request (400) → kuota harian `consume_ai_quota` (429) → AI (batas 8 detik) → validasi → kembalikan usulan. **Tidak pernah menyimpan transaksi.**
- **Layanan & aksi**: `src/server/services/ai-parse.ts`, `src/server/services/transactions.ts` + `src/server/actions/transactions.ts` (Simpan dari kartu menulis `transactions` + `ai_extractions` dalam satu transaksi `withRls`).
- **Konfigurasi**: `src/server/env.ts` (validasi env AI, `getAiDailyLimit()` terpisah), `src/proxy.ts`, `src/server/auth/origin.ts`, `src/server/supabase/routes.ts`.
- **Tampilan**: `src/components/ai-input/` (`ai-capture.tsx`, `ai-text-input.tsx`, `confirm-card.tsx`), penyesuaian `form-field.tsx`, `form-select.tsx`, `home-screen.tsx`, `transaction-form.tsx`, `transaction-dialog.tsx`, `transactions-screen.tsx`, `app-shell.tsx`, `src/app/(app)/page.tsx`.
- **Tes**: banyak `*.test.ts(x)` baru (total 395 unit test lulus) + `tests/db/ai-extractions.test.ts` (tes ke database dev).
- **Dependensi baru** (versi dikunci): `@anthropic-ai/sdk` 1.1.0, `openai` 7.41.0.
- **Env baru** di `.env.example` (nilai kosong saja): `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL`, `ANTHROPIC_API_KEY`, `AI_TEXT_BASE_URL`, `AI_TEXT_API_KEY`, `AI_PARSE_DAILY_LIMIT` (default 100), `AI_DRAFT_SECRET`. Kalau `AI_TEXT_PROVIDER` kosong, AI mati dan form manual tetap jalan.
- **Dokumen**: `docs/arsitektur.md`, `docs/database.md`, `docs/index.md` diselaraskan; `docs/progres.md` baru.

### Di luar repo (tidak di-commit)

- `~/.kiro/settings/mcp.json`: ditambah server **Supabase MCP** (hosted, `project_ref=cvwkkdzvxivpavqiabsg`, `read_only=true`, `features=database,docs,debugging`) di samping Context7.
- Worktree `.worktrees/ai-text-path` sudah dihapus; kerja sekarang langsung di folder repo pada branch `feat/25-ai-text-parser`.
- `main` lokal sudah sama dengan `origin/main` (`e5fe716`); commit `45dae9e` dan stash terkait sudah dibuang (lihat 5.1).
- `.kiro/steering/task-checklist.md`: aturan agar checklist file ini selalu diperbarui.
- Laporan 5, 6, dan 7 (docx + pdf) di folder `Senpro/`. Cadangan Laporan 6 sebelum perbaikan poin "d.": `Laporan 6 … .BACKUP-2026-10-23-c.docx`/`.pdf`.
- Vercel (23 Okt): ditambah env `AI_DRAFT_SECRET` (nilai acak berbeda untuk Preview dan Production, tipe sensitive) dan `AI_PARSE_DAILY_LIMIT=100` (Preview dan Production). Tidak ada redeploy, region tidak diubah.
- GitHub: issue #10 ditutup dengan komentar (23 Okt).

---

## 3. Checklist — sudah selesai

- [x] Desain teknis fitur AI teks (4 putaran review, disetujui) — `design.md`
- [x] Rencana kerja — `plan.md`
- [x] #24 Perintah AI + format keluaran + kamus slang + tanggal relatif
- [x] #25 Endpoint `POST /api/ai/parse` dengan cek sesi, Origin, input, kuota, batas waktu, fallback ke form manual
- [x] #26 Kartu konfirmasi yang bisa dibetulkan langsung, tidak bisa ditutup/diklik dua kali saat menyimpan
- [x] #27 Simpan transaksi + `ai_extractions` sekaligus, koreksi hanya isian yang berubah
- [x] 2 putaran code review, semua temuan diperbaiki (APPROVED)
- [x] Lint, typecheck, 394 unit test, build lolos (lokal dan CI); sejak `157ae65` 395 unit test
- [x] `docs/progres.md` dibuat
- [x] Branch di-push, PR #46 dibuka, CI hijau, deploy preview Vercel jalan
- [x] Laporan 5 (#24, #25) dan Laporan 6 (#27, #26) dibuat dan direview
- [x] Laporan 7 (hak akses database #27, uji langsung AI #25–#27, kesiapan deploy PR #46/#10) dibuat dari template (23 Okt)
- [x] Supabase MCP ditambahkan ke config Kiro

## 4. Checklist — sedang berjalan / menunggu

- [ ] **Supabase MCP aktif di sesi baru.** Config sudah ada, tapi tool baru muncul di sesi chat baru. Pastikan statusnya hijau di panel MCP Servers (login OAuth di browser). Cek 23 Okt: di sesi agent tool Supabase MCP tidak tersedia, Supabase CLI tidak terpasang, dan tidak ada `SUPABASE_ACCESS_TOKEN` di env maupun `.env.local`. **Yang harus dilakukan pengguna** (pilih salah satu): (a) Kiro → panel MCP Servers → server Supabase → selesaikan login OAuth di browser, lalu di sesi baru minta agent membaca log; (b) pasang CLI (`npm i -g supabase`), jalankan `supabase login`, lalu minta agent mengulang cek log; (c) buka Supabase Dashboard → project dev → Logs Explorer → Postgres dan Pooler, rentang 22 Okt 13:20–14:00 UTC.
- [x] **1 tes database gagal** (`pnpm test:db`: 28/29 lulus). Tes yang gagal memastikan pengguna tidak bisa UPDATE/DELETE `ai_extractions`. Penyebab: role `authenticated` di database dev punya hak `UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` yang tidak ada di migrasi (sisa default privileges Supabase lama). Sudah diperbaiki lewat migrasi `20261023120000_revoke_extra_grants`; sekarang **29/29** lulus (lihat 5.1).
- [ ] **PR #46 menunggu review anggota tim.** Harus dilakukan anggota tim (agent tidak boleh approve/merge). Status 23 Okt: OPEN, MERGEABLE, CI hijau.
- [ ] **Pembagian kontribusi di Laporan 5, 6, dan 7** masih perkiraan berdasarkan role (di Laporan 7 ada catatan miring di bawah tabel); perlu dikonfirmasi tim.

## 5. Checklist — belum dikerjakan, sampai deploy

### 5.1 Sebelum merge PR #46

- [x] Rapikan `main` lokal: `main` di-reset ke `origin/main` (`e5fe716`), commit `45dae9e` dibuang, stash `gitignore: hapus baris docs/task.md` dihapus (hash `464557b`, bisa dipulihkan dari reflog bila perlu). Stash lama `WIP on main: 624ca8a` tidak disentuh. (23 Okt)
- [x] Aturan steering `.kiro/steering/task-checklist.md`: `docs/task.md` wajib diperbarui setiap selesai melakukan perubahan. (23 Okt)
- [ ] Di sesi baru, cek lewat Supabase MCP (read-only). MCP belum aktif di sesi 23 Okt, jadi pengecekan hak akses dilakukan dengan query `SELECT` saja ke database dev (skrip sementara di luar repo, sudah dihapus):
  - [x] hak akses tabel `ai_extractions` untuk `authenticated` (`information_schema.role_table_grants`)
  - [x] cek juga tabel lain (`insights`, `ai_usage_daily`, `users`) apakah punya hak berlebih yang sama
  - [ ] log Postgres / pooler untuk penyebab error Prisma **P2028**. Log belum bisa dibaca (tidak ada MCP, tidak tersedia lewat SQL). Dicek ulang 23 Okt: tetap tidak ada akses (tidak ada Supabase CLI maupun `SUPABASE_ACCESS_TOKEN`). Langkah untuk pengguna ada di bagian 4 (OAuth MCP, `supabase login`, atau Logs Explorer 22 Okt 13:20–14:00 UTC).
- [x] Buat migrasi baru di branch PR (additive): `prisma/migrations/20261023120000_revoke_extra_grants/migration.sql`. Sudah diterapkan ke dev dengan `pnpm db:deploy` (`prisma migrate deploy`), `pnpm db:status` menyatakan skema up to date.
- [x] Jalankan ulang `pnpm test:db` sampai **29/29** lulus. Sebelum migrasi 28/29, sesudahnya 29/29 (4 file, 63 detik). Lint, typecheck, dan 394 unit test juga lulus.
  - Dijalankan ulang 23 Okt 10:29 WIB setelah `157ae65`: **29/29** lulus (4 file, 64,8 detik), tanpa P2028.
- [ ] Selidiki/atasi P2028 (koneksi lambat lewat pooler port 6543). Sudah diselidiki (lihat temuan di bawah): kemungkinan besar hanya terjadi saat database baru bangun. Rekomendasi: belum perlu mengubah kode. Tinggal diputuskan bersama tim.

#### Temuan pengecekan 23 Oktober 2026

- **Hak akses.** Masalahnya lebih luas dari `ai_extractions`. Semua tabel di skema `public` (termasuk view `wallet_balances` dan tabel internal `_prisma_migrations`) memberi `anon`, `authenticated`, dan `service_role` kedelapan hak: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN (MAINTAIN baru ada di PostgreSQL 17). Akibat yang paling terasa:
  - `_prisma_migrations` tidak punya RLS, jadi bisa dibaca siapa saja yang memegang publishable key lewat Data API (`GET /rest/v1/_prisma_migrations` → HTTP 200 berisi baris).
  - UPDATE tingkat tabel di `users` dan `insights` membuat pengguna bisa mengubah semua kolom baris miliknya (misalnya `email`), bukan hanya kolom yang diizinkan migrasi 02.
  - `anon` punya semua hak, tapi karena tidak ada policy RLS untuk `anon`, hasil baca tabel aplikasi tetap 0 baris.
- **Penyebab.** Project Supabase lama punya *default privileges* untuk role `postgres` di skema `public`: setiap tabel baru otomatis memberi hak penuh ke `anon`, `authenticated`, dan `service_role`. `prisma migrate deploy` berjalan sebagai `postgres`, sedangkan migrasi 02 hanya menambah GRANT dan tidak pernah mencabut.
- **Migrasi 05 (`20261023120000_revoke_extra_grants`).** Isinya:
  - cabut semua hak `anon` di tabel/view aplikasi, dan cabut `_prisma_migrations` dari `anon` dan `authenticated`;
  - sisakan untuk `authenticated` hanya hak dari migrasi 02: SELECT/INSERT/UPDATE/DELETE di `wallets`, `categories`, `transactions`, `budgets`; SELECT + INSERT di `ai_extractions`; SELECT di `ai_usage_daily` dan `wallet_balances`; SELECT + UPDATE per kolom di `users` (`full_name`, `avatar_url`, `currency`, `timezone`) dan `insights` (`is_read`), dipasang ulang karena REVOKE UPDATE tingkat tabel ikut mencabut hak per kolom;
  - cabut MAINTAIN (dibungkus cek versi supaya tetap jalan di PostgreSQL < 17);
  - `alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated`, supaya tabel baru tidak lagi otomatis dapat hak.
  - Semua perintah aman dijalankan ulang. `service_role` sengaja tidak diubah.
  - Hasil di dev: tidak ada lagi hak `anon` di tabel mana pun, dan `GET /rest/v1/_prisma_migrations` sekarang ditolak (HTTP 401, kode 42501).
- **Default privileges yang masih terbuka.** Migrasi 05 hanya mengubah default untuk *tabel* milik `postgres`. Sequence dan function baru milik `postgres`, serta objek apa pun milik `supabase_admin`, masih otomatis memberi hak ke `anon`/`authenticated`. Setiap migrasi yang membuat sequence atau function baru wajib menulis REVOKE/GRANT-nya sendiri. Kelebihan hak `service_role` (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, tulis ke view, `_prisma_migrations`) dicatat sebagai pekerjaan lanjutan; `service_role` memang melewati RLS dan kuncinya hanya ada di server.
- **P2028.** Prisma 7 punya dua batas yang sama-sama memunculkan P2028: `maxWait` 2 detik (menunggu koneksi + `BEGIN`, ini yang kena di `getProfile` dev server) dan `timeout` 5 detik (seluruh transaksi interaktif, ini yang kena di tes 22 Okt 20:26). Kedua kejadian terjadi dalam 20–35 menit pertama setelah database dipulihkan (Postgres mulai 22 Okt 20:20 WIB). Pada 23 Okt, 3 kali `pnpm test:db` berturut-turut tidak memunculkan P2028 sama sekali. Mulai transaksi butuh ≤ 0,5 detik (sekitar 4× di bawah `maxWait`), satu `withRls` biasa ≤ 0,9 detik.
  - **Rekomendasi:** jangan ubah `withRls` sekarang. Kalau P2028 muncul lagi saat database sudah "hangat", pilihannya (diputuskan bersama tim): naikkan `maxWait` di `withRls` (misalnya 5 detik), pasang `connectionTimeoutMillis` di `pg.Pool`, atau samakan region database dan Vercel.
  - **Catatan region:** host pooler Supabase dev ada di **ap-northeast-1 (Tokyo)**, padahal dokumen dan 5.2 menganggap Supabase di Singapura dekat `sin1`. Perlu dicek sebelum deploy.
- Catatan kerja lengkap: `.agents/tasks/centsible-db-grants/report.md` (tidak di-commit).
- [x] Uji langsung ke LLM **lewat 9router** (belum ada `ANTHROPIC_API_KEY`): jalankan 9router lokal (`npm i -g 9router` → `9router`, dashboard `http://localhost:20128`), hubungkan provider Claude Code (OAuth langganan Claude), salin API key dari dashboard. Isi `.env.local`: `AI_TEXT_PROVIDER=openai-compatible`, `AI_TEXT_BASE_URL=http://localhost:20128/v1`, `AI_TEXT_MODEL=cc/claude-haiku-4-5-20251001` (non-thinking), `AI_TEXT_API_KEY=<key 9router>`, `AI_DRAFT_SECRET` (`openssl rand -hex 32`). Restart `pnpm dev`. Coba beberapa kalimat (gocap, ceban, 25rb, "kemarin", "tadi pagi") → kartu konfirmasi → Simpan → cek baris `ai_extractions`. Hanya untuk dev lokal; Vercel tidak bisa menjangkau `localhost`.
  - **Hasil 23 Okt (pagi), commit `b919216`, tanpa perubahan kode.** UI asli dijalankan dengan Playwright headless (viewport HP, zona waktu Asia/Jakarta) memakai akun uji dev `e2e-ai+20261023@centsible.test` (dibuat lewat Admin API; trigger pendaftaran membuat 1 dompet `Tunai` + 10 kategori).
  - "makan siang gocap tadi pagi" → 50.000, Makan, Tunai, 23 Okt; "bensin ceban kemarin" → 10.000, Transport, 22 Okt, nominal **dibetulkan jadi 12.000** sebelum Simpan; "kopi 25rb" → 25.000, Makan, 23 Okt. Ketiganya 200 dalam ±2 detik (latensi AI 1,1–1,3 detik, 1 percobaan), tersimpan dengan toast "Transaksi disimpan.". "halo apa kabar" → 422 `ai_not_understood` (`low_confidence`), form manual terbuka, tidak ada yang tersimpan.
  - Database dev (query read-only): 3 baris `ai_extractions` terhubung ke 3 transaksi `source=text`; `input_mode=text`, `model_version=openai-compatible:claude-haiku-4-5-20251001@p1`, `latency_ms` dan `parsed_result` terisi; `user_corrections` = `{"amount":{"from":10000,"to":12000}}` hanya untuk bensin, `{}` untuk dua lainnya; `ai_usage_daily.parse_count` = 4 (3 berhasil + 1 fallback, kuota dipotong sebelum AI).
  - Log `pnpm dev`: hanya baris JSON `ai_parse`/`ai_fallback`/`ai_save` tanpa teks pengguna; pencarian kalimat uji, email, dan token draf di log = 0 baris. Logger Server Function bawaan Next (dev) mencetak `signIn({}, {})` dan `saveAiTransaction({}, {})`, jadi tidak ada data yang bocor.
  - Tidak ada fallback karena terjemahan format 9router; semua jawaban lolos validasi skema pada percobaan pertama.
- [x] (Opsional) Ambil screenshot kartu konfirmasi AI yang sungguhan dan ganti keterangan di Laporan 6 yang menyebut "diverifikasi lewat tes otomatis". Screenshot kartu (dipotong ke kartunya saja) ditambahkan sebagai **Gambar 7** baru di #26; Gambar 7–8 lama menjadi 8–9 dan poin "c." lama menjadi "d.". Kalimat "dicek lewat tes otomatis" di Rangkuman, poin b, dan Kendala 3 diganti dengan keterangan uji langsung lewat 9router. PDF dibuat ulang (10 → 11 halaman). Cadangan sebelum edit: `Laporan 6 … .BACKUP-2026-10-23-b.docx`/`.pdf`.
- [ ] Hapus akun uji E2E `e2e-ai+20261023@centsible.test` di dev kalau bukti sudah tidak diperlukan (Admin API `deleteUser`, data ikut terhapus lewat cascade).
- [x] Peringatan dev Base UI di beranda: tombol "Lihat transaksi" (`HomeScreen`) merender non-`<button>` padahal `nativeButton` true. Muncul sebagai "1 Issue" di indikator dev Next. **Diperbaiki di `157ae65` (23 Okt).**
  - Cara: `<Link href="/transaksi" className={buttonVariants({ className: "self-start" })}>`, tidak lagi `Button` Base UI 1.8.0 dengan `render={<Link />}`. `nativeButton={false}` (saran awal) juga menghilangkan peringatan, tetapi Base UI lalu memberi `role="button"` ke `<a>` (mui/base-ui#4021) sehingga pembaca layar mengumumkan tombol, bukan tautan. Tampilan sama, peran tautan tetap.
  - Tes baru di `home-screen.test.tsx`: tautan "Lihat transaksi" → `/transaksi` dan tidak ada `console.error` berisi `nativeButton`. Tes harus berjalan pertama di file karena Base UI hanya mencatat peringatan sekali per proses. Tes ini gagal tanpa perbaikan.
  - Dijalankan: `pnpm lint` (exit 0), `pnpm typecheck` (exit 0), `pnpm test` (27 file, **395** tes lulus), `pnpm build` (exit 0). Cek browser: `pnpm dev` + Chrome headless (Playwright), login akun uji dev (password baru acak lewat Admin API, tidak dicatat) → beranda: 0 error konsol, 0 peringatan `nativeButton`, indikator dev tanpa badge "Issue". Dev server dihentikan setelahnya.
- [x] Laporan 6: sub-judul "d. Pemeriksaan kode dan build…" yang tertinggal sendirian di bawah halaman 8 sekarang ada di atas Gambar 8 (halaman 9). LibreOffice mengabaikan keep-with-next/page break di dalam sel tabel, jadi dipakai 7 paragraf kosong sebelum "d." dan "PERAN ANGGOTA" dimulai di halaman baru (tabelnya tidak lagi terpotong). Isi teks sama persis dengan cadangan (kata-kata hasil `pdftotext` identik), tetap 11 halaman. Cadangan: `Laporan 6 … .BACKUP-2026-10-23-c.docx`/`.pdf`. (23 Okt)
- [x] Perbaiki catatan kosmetik reviewer: Gambar 3 di Laporan 6 terlalu tinggi, sulit dibaca saat dicetak. Screenshot terminal `pnpm test:db` (sebelum restore) disusun ulang dari piksel aslinya: header perintah, 4 blok `FAIL … AuthRetryableFetchError: fetch failed`, dan ringkasan (4 failed, 29 skipped, exit 1); stack trace yang berulang diganti garis putus-putus, baris panjang dipatah. Ukuran di halaman dari 3,2″ × 7″ menjadi 4,6″ × 5″ (huruf ±8,5 pt). Keterangan, nomor gambar, dan isi lain tidak diubah; PDF dibuat ulang (tetap 10 halaman, hanya halaman 4 yang berubah). Cadangan: `Laporan 6 … .BACKUP-2026-10-23.docx`/`.pdf`.
- [x] Update `docs/progres.md` setelah hal di atas selesai (butir uji langsung ke LLM dicentang, 23 Okt).
- [ ] Minta review anggota tim di PR #46, lalu merge (jangan force-push). Harus dilakukan anggota tim.

### 5.2 Konfigurasi deploy (Vercel, Fase 1)

- [ ] Isi env AI di Vercel untuk **Preview** dan **Production**: `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL`, `ANTHROPIC_API_KEY`, `AI_PARSE_DAILY_LIMIT`, `AI_DRAFT_SECRET` (nilai beda per lingkungan, jangan disimpan di repo).
  - [x] `AI_DRAFT_SECRET` (dari `openssl rand -hex 32`, nilai berbeda untuk Preview dan Production, dikirim lewat stdin, tipe sensitive) dan `AI_PARSE_DAILY_LIMIT=100` ditambahkan untuk Preview dan Production (23 Okt). Sebelumnya belum ada.
  - [ ] `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL`, `ANTHROPIC_API_KEY` **sengaja dikosongkan**: belum ada kunci Anthropic, dan 9router di `localhost` tidak bisa dijangkau Vercel. Akibatnya AI di Vercel mati dan form manual tetap jalan. Perlu `ANTHROPIC_API_KEY` dari pemilik akun tim, atau Azure OpenAI (Fase 2).
- [ ] **Keputusan tim: region.** Asumsi lama (`sin1` dekat Supabase Singapura) ternyata salah di dua sisi. Hasil cek 23 Okt: `vercel.json` tidak punya `regions`; setelan project `serverlessFunctionRegion` = **hnd1** (Tokyo), dan semua fungsi di deploy Preview terbaru dan Production berjalan di `hnd1`. Supabase dev (host pooler) ada di **ap-northeast-1** (Tokyo). Jadi fungsi dan database sudah satu region.
  - Rekomendasi: **tetap `hnd1`** selama database di Tokyo. `withRls` butuh beberapa perjalanan bolak-balik ke database per request (BEGIN, `set_config`, query, COMMIT); di region yang sama tiap perjalanan hanya beberapa ms, sedangkan `sin1`→Tokyo sekitar 70–80 ms per perjalanan. Biayanya, pengguna di Indonesia menempuh ±70 ms lebih jauh ke fungsi, tetapi itu hanya sekali per request. Kalau nanti ingin semuanya dekat Indonesia, pindahkan project Supabase ke ap-southeast-1 lalu fungsi ke `sin1` (project baru + migrasi data, usaha lebih besar).
  - Yang perlu diubah: dokumen yang masih menyebut `sin1`/Singapura (`docs/arsitektur.md`, `docs/database.md` bila ada). Region tidak diubah oleh agent.
- [ ] Setelah merge: cek deploy production di https://senior-project-centsible.vercel.app, coba alur AI sekali, cek log Vercel tidak berisi teks mentah pengguna.
- [x] Terapkan migrasi revoke ke database yang dipakai production (kalau berbeda dari dev). Cek 23 Okt (env Production ditarik ke folder sementara di luar repo, dibandingkan, lalu dihapus): `NEXT_PUBLIC_SUPABASE_URL` Production berisi ref project dev `cvwkkdzvxivpavqiabsg`. `DATABASE_URL` bertipe sensitive sehingga nilainya tidak bisa ditarik, tetapi satu project Supabase hanya punya satu database Postgres, jadi Production memakai database dev dan migrasi 05 sudah berlaku. `DIRECT_URL` tidak ada di Vercel (migrasi dijalankan dari lokal).
- [ ] **Keputusan tim: env Preview.** Lingkungan Preview di Vercel tidak punya env Supabase/database sama sekali (hanya `AI_DRAFT_SECRET` dan `AI_PARSE_DAILY_LIMIT` yang baru ditambah). Deploy preview berhasil dibangun, tapi login/data tidak akan jalan. Pilihan: isi env Preview dengan project dev, atau anggap preview hanya untuk cek build.

### 5.3 Setelah merge — sisa fitur

- [ ] #28–#38 mulai setelah PR #46 di-merge.
- [ ] #28 Input suara (rekam → teks → kartu konfirmasi yang sama). Di preview Vercel, Whisper lokal tidak terjangkau → pakai `AI_STT_ENABLED=false` atau endpoint ber-API key.
- [ ] #29 Dataset uji + ukur akurasi AI (target ≥ 85% nominal & kategori), pakai data `ai_extractions`.
- [ ] #30 Halaman ringkasan
- [ ] #31 Batas anggaran per kategori
- [ ] #32 Ringkasan mingguan dari AI (Vercel Cron + `CRON_SECRET`)
- [ ] #33 Deteksi pengeluaran tidak wajar
- [ ] #34 Unduh CSV
- [ ] #35 Tes otomatis (cakupan)
- [ ] #36 PWA + offline
- [x] #10 Tutup issue "Merancang struktur basis data" (dokumennya sudah di-merge lewat PR #39). Dicek dulu: issue OPEN, PR #39 MERGED 25 Sep berisi `docs/database.md`, skema, dan migrasi awal. Ditutup 23 Okt dengan komentar berbahasa Indonesia.
- [ ] Sebelum #37: pindah ke **Fase 2 (Azure)** sesuai `docs/arsitektur.md` §0.3 — Container Apps, Azure OpenAI, Key Vault; jangan pakai 9router untuk uji pengguna
- [ ] Sebelum #37: pertimbangkan role database khusus aplikasi yang bukan pemilik tabel (`docs/database.md` §7.4), supaya query yang lupa `withRls()` gagal, bukan bocor
- [ ] #37 Uji coba pengguna asli (min. 10 orang, 14 hari)
- [ ] #38 Dokumentasi & presentasi akhir
- [x] Laporan 7 (`../Laporan 7 - Tugas Kelompok - MDG Centsible.docx` + .pdf, 13 halaman, 12 gambar dari bukti asli; semua halaman dicek lewat render PNG, tidak ada sub-judul yang terpisah dari gambarnya, tidak ada host/kunci). Pembagian kontribusi masih perkiraan (perlu konfirmasi tim). (23 Okt)
- [ ] Laporan 8 (periode berikutnya)

---

## 6. Cara melanjutkan di sesi berikutnya

1. Buka sesi chat baru (supaya tool Supabase MCP dan Context7 dimuat).
2. Minta agent membaca file ini: `docs/task.md` (branch `feat/25-ai-text-parser`).
3. Mulai dari bagian **5.1**.
4. Semua kerja langsung di folder repo pada branch `feat/25-ai-text-parser` (`git switch feat/25-ai-text-parser` kalau sedang di branch lain), lalu `git add` → `git commit` → `git push` ke PR #46. Jangan membuat worktree baru.

### Aturan yang tetap berlaku

- Jangan membaca atau menampilkan isi `.env.local`. File itu sudah ada di folder repo dan di-ignore git, jadi tidak perlu disalin ke mana-mana.
- Supabase MCP dipakai read-only untuk mengecek; perubahan permanen lewat migrasi di repo.
- Tes database hanya ke project **dev**.
- Baca panduan Next.js di `node_modules/next/dist/docs/` sebelum menulis kode Next.js (lihat `AGENTS.md`).
- Tidak ada force-push, tidak mengubah git config, tidak melewati hook.
