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

- [x] Menyusun perintah untuk AI & format hasilnya — #24 (PR #46 merged)
- [x] Membuat layanan pembaca transaksi — #25 (PR #46 merged)
- [x] Membuat kartu konfirmasi yang bisa langsung dibetulkan — #26 (PR #46 merged)
- [x] Menyimpan catatan koreksi dari pengguna — #27 (PR #46 merged)
- [ ] Membuat fitur input suara (rekam → ubah jadi teks) — #28 (kode selesai, di-push Syauqi)
- [ ] Menyiapkan data uji & mengukur akurasi AI — #29 (kode selesai, akurasi 88,9%, di-push Syauqi)

### G. Analitik & Insight

- [x] Membuat halaman ringkasan & perhitungan datanya — #30 (PR #48)
- [x] Membuat fitur batas anggaran per kategori — #31 (PR #50)
- [ ] Membuat ringkasan mingguan dari AI — #32 (kode selesai, di-push Syauqi setelah #33)
- [ ] Membuat deteksi pengeluaran tidak wajar & peringatannya — #33 (bagian statistik selesai, di-push Syauqi; teks AI menyusul)
- [ ] Membuat fitur unduh data ke CSV — #34 (kode selesai, di-push Syauqi)

### H. Pengujian, Rilis & Dokumentasi

- [ ] Menulis tes otomatis — #35 (kode selesai, di-push Syauqi)
- [ ] Membuat aplikasi jadi PWA & bisa dipakai offline — #36 (PR #51)
- [ ] Uji coba ke pengguna asli — #37 (protokol & alat ukur di PR #56; pelaksanaan setelah Fase 2)
- [ ] Menyusun dokumentasi & bahan presentasi — #38 (PR #55)

## Sudah selesai

- Riset pesaing dan penentuan fitur utama (#6, #7).
- Use case diagram, daftar kebutuhan fungsional, struktur basis data, dan arsitektur sistem (#8–#11).
- Desain antarmuka: palet warna, wireframe, purwarupa, dan komponen dasar (#12–#15).
- Fondasi proyek: repositori Next.js, papan GitHub Project, CI, Supabase, dan rilis ke Vercel (#16–#20).
- Fitur inti pencatatan: daftar & masuk, transaksi dengan form manual, serta pengaturan kategori & dompet (#21–#23).
- Halaman ringkasan bulanan `/ringkasan` (#30, PR #48) dan batas anggaran per kategori `/anggaran` (#31, PR #50). Smoke test Production 15 Nov: login, catat transaksi, dan `/ringkasan` jalan, angka cocok dengan database.
- Fitur AI teks: perintah & format hasil AI, layanan pembaca transaksi `/api/ai/parse`, kartu konfirmasi, dan catatan koreksi di `ai_extractions` (#24–#27, PR #46 merged 23 Okt). Production dan Preview di Vercel sudah dicek jalan (23 Okt), dengan AI sengaja dimatikan karena belum ada kunci API; pengguna langsung dialihkan ke form manual.

## Sedang dikerjakan / menunggu review

- PR #49 (perbaikan Beranda di ponsel), #51 (#36 PWA + offline), #56 (#37 protokol uji coba), #55 (#38 panduan + slide): CI hijau, menunggu digabung.
- Di-push Syauqi berurutan, Naufal memeriksa di Preview: #34 unduh CSV, #33 peringatan pengeluaran tidak wajar, #35 tes + cakupan di CI, #29 dataset + akurasi AI (**88,9%**, target 85%), #28 input suara, #32 ringkasan mingguan dari AI (Vercel Cron Senin 06:00 WIB).

Pekerjaan berikutnya dimulai dari daftar di bawah, satu branch dari `main` dan satu PR per issue.

## Belum dikerjakan / direncanakan

1. Pindah ke Fase 2 (Azure OpenAI + Whisper) supaya AI dan input suara bisa dinyalakan di Production.
2. #37 Uji coba 14 hari dengan ≥ 10 mahasiswa, mengikuti [protokol uji coba](uji-coba.md).

## Hal yang masih perlu dicek

- [x] `pnpm test:db` ke Supabase dev lulus semua (29 dari 29). Sebelumnya 1 tes gagal karena database dev memberi hak lebih dari yang ada di migrasi, di semua tabel (sisa pengaturan bawaan Supabase lama). Hak itu sudah dicabut lewat migrasi baru `20261023120000_revoke_extra_grants`, dan tabel baru tidak lagi otomatis mendapat hak tersebut. Production di Vercel memakai project Supabase yang sama dengan dev, jadi migrasi ini sudah berlaku di sana (dicek 23 Okt).
- [ ] Putuskan bersama tim soal error Prisma P2028 (transaksi database gagal dimulai tepat waktu). Hasil pengecekan: error hanya muncul sesaat setelah database dev dipulihkan dan tidak muncul lagi di tes-tes berikutnya. Log database dan pooler Supabase pada jam kejadian sudah dibaca (23 Okt): database baru saja dipulihkan dan sempat menyala ulang 3 kali, setelah itu tidak ada error, timeout, atau antrean koneksi di sisi server. Jadi error ini terjadi karena aplikasi menunggu terlalu lama saat database baru bangun. Rekomendasinya belum perlu mengubah kode.
- [x] Uji langsung ke LLM dengan model non-thinking (`claude-haiku-4-5` lewat 9router lokal, 23 Okt). "makan siang gocap tadi pagi", "bensin ceban kemarin", dan "kopi 25rb" terbaca benar (50.000, 10.000, 25.000; tanggal sesuai Asia/Jakarta), ketiganya tersimpan dari kartu konfirmasi bersama baris `ai_extractions`. Kalimat yang bukan transaksi dialihkan ke form manual. Log server tidak memuat teks mentah pengguna. Ini hanya untuk dev lokal; Vercel tetap butuh kunci API penyedia AI.
- [ ] Isi kunci AI di Vercel (Preview dan Production). `AI_DRAFT_SECRET` dan `AI_PARSE_DAILY_LIMIT=100` sudah ada (23 Okt). `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL`, dan kunci API sengaja belum diisi karena belum ada `ANTHROPIC_API_KEY`, jadi AI di Vercel tetap mati dan form manual tetap jalan.
- [x] Peringatan dev Base UI di beranda diperbaiki: "Lihat transaksi" sekarang tautan dengan gaya tombol (23 Okt).
- [x] Preview di Vercel diisi env Supabase/database project dev, dan login di deploy Preview sudah dicoba berhasil (23 Okt).
- [x] Production setelah merge PR #46 dicek: login, form manual, dan penyimpanan ke database jalan; AI menjawab "tidak tersedia" lalu membuka form manual; log tidak memuat data pengguna (23 Okt).
- [x] Region: fungsi Vercel di `hnd1` (Tokyo), satu region dengan database Supabase dev (Tokyo). Tetap di `hnd1`; dokumen arsitektur sudah diperbaiki.
- [ ] Di ponsel, halaman daftar transaksi dan dialog "Catat transaksi" tampak lebih lebar dari layar. Perlu dicek di ponsel asli.
- [ ] Pembagian kontribusi di Laporan 5–7 masih perkiraan, dicek pengguna nanti.
- [x] Tampilan ponsel (15 Nov, Production, 390×844): `/transaksi`, dialog "Catat transaksi", dan `/ringkasan` tidak melebar. Beranda melebar karena email panjang di sapaan; diperbaiki di PR #49.
- [ ] Redirect URL Auth Supabase untuk Preview (daftar, reset password, Google) belum dicek; perlu dicek manual di Supabase Dashboard.
