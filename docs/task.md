---
title: Catatan Lanjutan Sesi
---

# Task — Catatan Lanjutan Sesi (Fitur AI Teks, Issue #24–#27)

Terakhir diperbarui: 23 Oktober 2026.

File ini adalah catatan serah-terima untuk sesi berikutnya. Isinya: apa yang sudah berbeda dari `main`, apa yang sedang berjalan, apa yang belum dikerjakan sampai deploy, dan checklist untuk semuanya.

> File ini ada di `docs/task.md` pada branch `feat/25-ai-text-parser` (PR #46). Ringkasan progres untuk tim ada di `docs/progres.md`.

---

## 1. Posisi sekarang

| Hal | Nilai |
|---|---|
| Repo | `/media/adi/CodingSpace/Kuliah/Senpro/Senior-Project_Centsible` (satu folder saja, tanpa worktree) |
| Branch yang aktif | `feat/25-ai-text-parser` (dibuat dari `main` commit `e5fe716`, sudah di-push) |
| Cara update | Edit file di repo → `git add` → `git commit` → `git push` (otomatis masuk PR #46) |
| Pull request | [#46](https://github.com/gadicandra/Senior-Project_Centsible/pull/46) ke `main`. Status: **OPEN**, bisa di-merge, CI hijau (lint/typecheck/test/build + deploy preview Vercel), belum ada review dari anggota |
| Issue yang ditutup PR ini | #24, #25, #26, #27 (lewat `Closes #N`) |
| Supabase dev | project ref `cvwkkdzvxivpavqiabsg`. Sempat di-pause, sudah dipulihkan 22 Okt |
| Catatan kerja agent | `.agents/tasks/centsible-ai-text-path/` (design.md, plan.md, review, report-evidence/) |
| Laporan | `../Laporan 5 - Tugas Kelompok - MDG Centsible.docx` (+ .pdf), `../Laporan 6 - ...docx` (+ .pdf) |

---

## 2. Yang berbeda dari `main`

8 commit, 64 file berubah (+6353 / −54).

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

### File baru / berubah, dikelompokkan

- **Logika AI di server** (`src/server/ai/`): `index.ts` (pemilih penyedia AI dari env), `prompt.ts` (perintah sistem + kamus slang nominal + contoh), `schema.ts` (skema keluaran per pengguna, kategori/dompet = enum milik pengguna), `normalize.ts` (validasi & normalisasi hasil AI), `draft-token.ts` (token bertanda tangan untuk draf hasil AI), `log.ts` (log tanpa data pribadi), `providers/anthropic.ts`, `providers/openai-compatible.ts` (9router, divalidasi Zod + coba ulang 1×), `providers/errors.ts`.
- **Kode bersama** (`src/lib/ai/`): `amount.ts` (gocap, ceban, rb, jt, …; cepek ditandai ambigu), `relative-date.ts` ("kemarin", "tadi pagi", "Senin lalu" sesuai zona waktu pengguna), `corrections.ts` (hanya isian yang diubah pengguna), `request.ts`, `limits.ts`, `types.ts`.
- **Endpoint**: `src/app/api/ai/parse/route.ts` — urutan cek: sesi (401) → Origin (403) → isi request (400) → kuota harian `consume_ai_quota` (429) → AI (batas 8 detik) → validasi → kembalikan usulan. **Tidak pernah menyimpan transaksi.**
- **Layanan & aksi**: `src/server/services/ai-parse.ts`, `src/server/services/transactions.ts` + `src/server/actions/transactions.ts` (Simpan dari kartu menulis `transactions` + `ai_extractions` dalam satu transaksi `withRls`).
- **Konfigurasi**: `src/server/env.ts` (validasi env AI, `getAiDailyLimit()` terpisah), `src/proxy.ts`, `src/server/auth/origin.ts`, `src/server/supabase/routes.ts`.
- **Tampilan**: `src/components/ai-input/` (`ai-capture.tsx`, `ai-text-input.tsx`, `confirm-card.tsx`), penyesuaian `form-field.tsx`, `form-select.tsx`, `home-screen.tsx`, `transaction-form.tsx`, `transaction-dialog.tsx`, `transactions-screen.tsx`, `app-shell.tsx`, `src/app/(app)/page.tsx`.
- **Tes**: banyak `*.test.ts(x)` baru (total 394 unit test lulus) + `tests/db/ai-extractions.test.ts` (tes ke database dev).
- **Dependensi baru** (versi dikunci): `@anthropic-ai/sdk` 1.1.0, `openai` 7.41.0.
- **Env baru** di `.env.example` (nilai kosong saja): `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL`, `ANTHROPIC_API_KEY`, `AI_TEXT_BASE_URL`, `AI_TEXT_API_KEY`, `AI_PARSE_DAILY_LIMIT` (default 100), `AI_DRAFT_SECRET`. Kalau `AI_TEXT_PROVIDER` kosong, AI mati dan form manual tetap jalan.
- **Dokumen**: `docs/arsitektur.md`, `docs/database.md`, `docs/index.md` diselaraskan; `docs/progres.md` baru.

### Di luar repo (tidak di-commit)

- `~/.kiro/settings/mcp.json`: ditambah server **Supabase MCP** (hosted, `project_ref=cvwkkdzvxivpavqiabsg`, `read_only=true`, `features=database,docs,debugging`) di samping Context7.
- Worktree `.worktrees/ai-text-path` sudah dihapus; kerja sekarang langsung di folder repo pada branch `feat/25-ai-text-parser`.
- `main` lokal punya 1 commit yang belum di-push (`45dae9e "Add docs to gitignore"`), dan ada stash `gitignore: hapus baris docs/task.md` yang membatalkannya. Perlu dirapikan (lihat 5.1).
- Laporan 5 dan 6 (docx + pdf) di folder `Senpro/`.

---

## 3. Checklist — sudah selesai

- [x] Desain teknis fitur AI teks (4 putaran review, disetujui) — `design.md`
- [x] Rencana kerja — `plan.md`
- [x] #24 Perintah AI + format keluaran + kamus slang + tanggal relatif
- [x] #25 Endpoint `POST /api/ai/parse` dengan cek sesi, Origin, input, kuota, batas waktu, fallback ke form manual
- [x] #26 Kartu konfirmasi yang bisa dibetulkan langsung, tidak bisa ditutup/diklik dua kali saat menyimpan
- [x] #27 Simpan transaksi + `ai_extractions` sekaligus, koreksi hanya isian yang berubah
- [x] 2 putaran code review, semua temuan diperbaiki (APPROVED)
- [x] Lint, typecheck, 394 unit test, build lolos (lokal dan CI)
- [x] `docs/progres.md` dibuat
- [x] Branch di-push, PR #46 dibuka, CI hijau, deploy preview Vercel jalan
- [x] Laporan 5 (#24, #25) dan Laporan 6 (#27, #26) dibuat dan direview
- [x] Supabase MCP ditambahkan ke config Kiro

## 4. Checklist — sedang berjalan / menunggu

- [ ] **Supabase MCP aktif di sesi baru.** Config sudah ada, tapi tool baru muncul di sesi chat baru. Pastikan statusnya hijau di panel MCP Servers (login OAuth di browser).
- [ ] **1 tes database gagal** (`pnpm test:db`: 28/29 lulus). Tes yang gagal memastikan pengguna tidak bisa UPDATE/DELETE `ai_extractions`. Penyebab: role `authenticated` di database dev punya hak `UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` yang tidak ada di migrasi (kemungkinan sisa grant bawaan Supabase lama). Data tetap aman karena tidak ada policy RLS untuk itu.
- [ ] **PR #46 menunggu review anggota tim.**
- [ ] **Pembagian kontribusi di Laporan 5 dan 6** masih perkiraan berdasarkan role; perlu disesuaikan tim.

## 5. Checklist — belum dikerjakan, sampai deploy

### 5.1 Sebelum merge PR #46

- [ ] Rapikan `main` lokal: commit `45dae9e` (menambah `docs/task.md` ke `.gitignore`) tidak dibutuhkan lagi karena `task.md` sekarang ikut di repo. Pilih: buang commit itu (`git branch -f main origin/main` saat sedang di branch lain) dan hapus stash `gitignore: hapus baris docs/task.md`, atau simpan kalau masih perlu.
- [ ] Di sesi baru, cek lewat Supabase MCP (read-only):
  - [ ] hak akses tabel `ai_extractions` untuk `authenticated` (`information_schema.role_table_grants`)
  - [ ] cek juga tabel lain (`insights`, `ai_usage_daily`, `users`) apakah punya hak berlebih yang sama
  - [ ] log Postgres / pooler untuk penyebab error Prisma **P2028** (transaksi gagal dimulai dalam 5 detik)
- [ ] Buat migrasi baru di branch PR (additive), misalnya `prisma/migrations/2026102xxxxxxx_revoke_extra_grants/migration.sql` berisi `revoke update, delete, truncate, references, trigger on public.ai_extractions from authenticated;` (+ tabel lain kalau ternyata sama). Terapkan ke dev dengan `prisma migrate deploy`. Jangan pakai SQL langsung lewat MCP untuk perbaikan permanen.
- [ ] Jalankan ulang `pnpm test:db` sampai **29/29** lulus.
- [ ] Selidiki/atasi P2028 (koneksi lambat lewat pooler port 6543): cek apakah hanya karena database baru bangun; kalau masih terjadi, pertimbangkan `timeout`/`maxWait` di `withRls` atau setelan pooler. Putuskan bersama tim.
- [ ] Uji langsung ke LLM: isi `.env.local` dengan `AI_TEXT_PROVIDER=anthropic`, `AI_TEXT_MODEL=claude-haiku-4-5` (model yang tidak "thinking"), `ANTHROPIC_API_KEY`, `AI_DRAFT_SECRET` (`openssl rand -hex 32`). Coba beberapa kalimat (gocap, ceban, 25rb, "kemarin", "tadi pagi") → kartu konfirmasi → Simpan → cek baris `ai_extractions`.
- [ ] (Opsional) Ambil screenshot kartu konfirmasi AI yang sungguhan dan ganti keterangan di Laporan 6 yang menyebut "diverifikasi lewat tes otomatis".
- [ ] Perbaiki catatan kosmetik reviewer: Gambar 3 di Laporan 6 terlalu tinggi, sulit dibaca saat dicetak.
- [ ] Update `docs/progres.md` setelah hal di atas selesai.
- [ ] Minta review anggota tim di PR #46, lalu merge (jangan force-push).

### 5.2 Konfigurasi deploy (Vercel, Fase 1)

- [ ] Isi env AI di Vercel untuk **Preview** dan **Production**: `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL`, `ANTHROPIC_API_KEY`, `AI_PARSE_DAILY_LIMIT`, `AI_DRAFT_SECRET` (nilai beda per lingkungan, jangan disimpan di repo).
- [ ] Pastikan region Vercel Functions tetap `sin1` (dekat Supabase Singapura).
- [ ] Setelah merge: cek deploy production di https://senior-project-centsible.vercel.app, coba alur AI sekali, cek log Vercel tidak berisi teks mentah pengguna.
- [ ] Terapkan migrasi revoke ke database yang dipakai production (kalau berbeda dari dev).

### 5.3 Setelah merge — sisa fitur

- [ ] #28 Input suara (rekam → teks → kartu konfirmasi yang sama). Di preview Vercel, Whisper lokal tidak terjangkau → pakai `AI_STT_ENABLED=false` atau endpoint ber-API key.
- [ ] #29 Dataset uji + ukur akurasi AI (target ≥ 85% nominal & kategori), pakai data `ai_extractions`.
- [ ] #30 Halaman ringkasan
- [ ] #31 Batas anggaran per kategori
- [ ] #32 Ringkasan mingguan dari AI (Vercel Cron + `CRON_SECRET`)
- [ ] #33 Deteksi pengeluaran tidak wajar
- [ ] #34 Unduh CSV
- [ ] #35 Tes otomatis (cakupan)
- [ ] #36 PWA + offline
- [ ] #10 Tutup issue "Merancang struktur basis data" (dokumennya sudah di-merge lewat PR #39)
- [ ] Sebelum #37: pindah ke **Fase 2 (Azure)** sesuai `docs/arsitektur.md` §0.3 — Container Apps, Azure OpenAI, Key Vault; jangan pakai 9router untuk uji pengguna
- [ ] Sebelum #37: pertimbangkan role database khusus aplikasi yang bukan pemilik tabel (`docs/database.md` §7.4), supaya query yang lupa `withRls()` gagal, bukan bocor
- [ ] #37 Uji coba pengguna asli (min. 10 orang, 14 hari)
- [ ] #38 Dokumentasi & presentasi akhir
- [ ] Laporan mingguan berikutnya (Laporan 7 dst.)

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
