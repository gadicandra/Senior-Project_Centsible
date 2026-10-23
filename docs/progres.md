---
title: Progres Proyek
---

# Progres Proyek Centsible

Halaman ini mencatat tugas yang sudah selesai, yang sedang dikerjakan, dan yang masih direncanakan. Daftar tugas diambil dari pembagian subproyek A–H. Tiap tugas dihubungkan ke issue GitHub-nya. Tanda centang hanya diberikan kalau issue-nya sudah ditutup. Untuk tugas yang dikerjakan lewat PR, PR-nya juga harus sudah di-merge.

Status dicek dari daftar issue dan PR di repositori `gadicandra/Senior-Project_Centsible`.

## Checklist per subproyek

### A. Riset & Validasi Kebutuhan

- [ ] Menyusun daftar pertanyaan dan mewawancarai calon pengguna (belum ada issue)
- [ ] Mengolah hasil wawancara jadi kesimpulan (belum ada issue)
- [x] Menganalisis 3 pesaing (Money Lover, Finansialku, Monefy) — #6
- [x] Menentukan fitur utama dan batas versi awal — #7

### B. Perancangan Sistem

- [x] Menyusun use case diagram — #8
- [x] Menyusun daftar kebutuhan fungsional — #9
- [x] Merancang struktur basis data — #10 (dokumen di-merge lewat PR #39, issue ditutup 23 Okt)
- [x] Merancang arsitektur sistem & memilih teknologi — #11 (diselaraskan lagi lewat PR #41)

### C. Desain Antarmuka

- [x] Menentukan palet warna & aturan desain — #12
- [x] Membuat rancangan kasar tampilan — #13
- [x] Membuat desain jadi & purwarupa — #14
- [x] Membuat komponen tampilan dasar — #15

### D. Fondasi Aplikasi & Infrastruktur

- [x] Menyiapkan repositori & struktur proyek Next.js — #16
- [x] Menyiapkan GitHub Project & alur kerja issue — #17
- [x] Menyiapkan GitHub Actions (CI) — #18 (PR #40 merged)
- [x] Menyiapkan Supabase (login, basis data, keamanan) — #19 (PR #42 merged)
- [x] Menyiapkan proses rilis ke Vercel — #20

### E. Fitur Inti — Pencatatan

- [x] Membuat fitur daftar & masuk (email dan akun Google) — #21 (PR #43 merged)
- [x] Membuat fitur tambah, ubah, hapus transaksi + form manual — #22 (PR #45 merged)
- [x] Membuat pengaturan kategori & dompet — #23 (PR #44 merged)

### F. Fitur AI Agent

- [ ] Menyusun perintah untuk AI & format hasilnya — #24 (di PR ini, menunggu review)
- [ ] Membuat layanan pembaca transaksi — #25 (di PR ini, menunggu review)
- [ ] Membuat kartu konfirmasi yang bisa langsung dibetulkan — #26 (di PR ini, menunggu review)
- [ ] Menyimpan catatan koreksi dari pengguna — #27 (di PR ini, menunggu review)
- [ ] Membuat fitur input suara (rekam → ubah jadi teks) — #28
- [ ] Menyiapkan data uji & mengukur akurasi AI — #29

### G. Analitik & Insight

- [ ] Membuat halaman ringkasan & perhitungan datanya — #30
- [ ] Membuat fitur batas anggaran per kategori — #31
- [ ] Membuat ringkasan mingguan dari AI — #32
- [ ] Membuat deteksi pengeluaran tidak wajar & peringatannya — #33
- [ ] Membuat fitur unduh data ke CSV — #34

### H. Pengujian, Rilis & Dokumentasi

- [ ] Menulis tes otomatis — #35
- [ ] Membuat aplikasi jadi PWA & bisa dipakai offline — #36
- [ ] Uji coba ke pengguna asli — #37
- [ ] Menyusun dokumentasi & bahan presentasi — #38

## Sudah selesai

- Riset pesaing dan penentuan fitur utama (#6, #7).
- Use case diagram, daftar kebutuhan fungsional, struktur basis data, dan arsitektur sistem (#8–#11).
- Desain antarmuka: palet warna, wireframe, purwarupa, dan komponen dasar (#12–#15).
- Fondasi proyek: repositori Next.js, papan GitHub Project, CI, Supabase, dan rilis ke Vercel (#16–#20).
- Fitur inti pencatatan: daftar & masuk, transaksi dengan form manual, serta pengaturan kategori & dompet (#21–#23).

## Sedang dikerjakan / menunggu review

Semua tugas di bawah ada di PR ini (branch `feat/25-ai-text-parser`). Kodenya sudah jadi, tapi belum di-merge.

- #24 Menyusun perintah untuk AI & format hasilnya. AI paham istilah uang sehari-hari seperti gocap dan ceban.
- #25 Membuat layanan pembaca transaksi. Endpoint `/api/ai/parse` memeriksa login, ukuran input, dan kuota. Kalau AI gagal, pengguna dialihkan ke form manual.
- #26 Membuat kartu konfirmasi. Hasil baca AI bisa dibetulkan langsung. Tidak ada data tersimpan sebelum pengguna menekan Simpan.
- #27 Menyimpan catatan koreksi. Transaksi dan catatan di `ai_extractions` disimpan bersamaan dalam satu transaksi database.

## Belum dikerjakan / direncanakan

Urutan di bawah adalah urutan yang direncanakan.

1. #28 Membuat fitur input suara (rekam → ubah jadi teks).
2. #29 Menyiapkan data uji & mengukur akurasi AI. Targetnya minimal 85% untuk nominal dan kategori.
3. Subproyek G (Analitik & Insight):
   - #30 Halaman ringkasan & perhitungan datanya.
   - #31 Batas anggaran per kategori.
   - #32 Ringkasan mingguan dari AI.
   - #33 Deteksi pengeluaran tidak wajar & peringatannya.
   - #34 Unduh data ke CSV.
4. Subproyek H (Pengujian, Rilis & Dokumentasi):
   - #35 Menulis tes otomatis.
   - #36 Membuat aplikasi jadi PWA & bisa dipakai offline.
   - #37 Uji coba ke pengguna asli.
   - #38 Menyusun dokumentasi & bahan presentasi.

## Hal yang perlu dicek sebelum merge

- [x] `pnpm test:db` ke Supabase dev lulus semua (29 dari 29). Sebelumnya 1 tes gagal karena database dev memberi hak lebih dari yang ada di migrasi, di semua tabel (sisa pengaturan bawaan Supabase lama). Hak itu sudah dicabut lewat migrasi baru `20261023120000_revoke_extra_grants`, dan tabel baru tidak lagi otomatis mendapat hak tersebut. Production di Vercel memakai project Supabase yang sama dengan dev, jadi migrasi ini sudah berlaku di sana (dicek 23 Okt).
- [ ] Putuskan bersama tim soal error Prisma P2028 (transaksi database gagal dimulai tepat waktu). Hasil pengecekan: error hanya muncul sesaat setelah database dev dipulihkan dan tidak muncul lagi di 3 kali tes berikutnya. Rekomendasinya belum perlu mengubah kode.
- [x] Uji langsung ke LLM dengan model non-thinking (`claude-haiku-4-5` lewat 9router lokal, 23 Okt). "makan siang gocap tadi pagi", "bensin ceban kemarin", dan "kopi 25rb" terbaca benar (50.000, 10.000, 25.000; tanggal sesuai Asia/Jakarta), ketiganya tersimpan dari kartu konfirmasi bersama baris `ai_extractions`. Kalimat yang bukan transaksi dialihkan ke form manual. Log server tidak memuat teks mentah pengguna. Ini hanya untuk dev lokal; Vercel tetap butuh kunci API penyedia AI.
- [ ] Isi variabel lingkungan AI di Vercel (Preview dan Production). Sebagian sudah: `AI_DRAFT_SECRET` dan `AI_PARSE_DAILY_LIMIT=100` (23 Okt). `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL`, dan kunci API sengaja belum diisi karena belum ada `ANTHROPIC_API_KEY`, jadi AI di Vercel tetap mati dan form manual tetap jalan.
- [x] Buat `AI_DRAFT_SECRET` dengan `openssl rand -hex 32`, lalu simpan di Vercel (nilai berbeda untuk Preview dan Production, 23 Okt). Nilainya tidak disimpan di repositori.
- [x] Peringatan dev Base UI di beranda diperbaiki: "Lihat transaksi" sekarang tautan dengan gaya tombol (23 Okt).
- [ ] Putuskan bersama tim: Preview di Vercel belum punya env Supabase/database sama sekali, jadi deploy preview belum bisa dipakai login.
