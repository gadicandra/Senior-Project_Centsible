---
title: Uji Coba Pengguna
---

# Uji Coba Pengguna (Issue #37)

Protokol, alat ukur, dan templat laporan uji coba 14 hari. Hasil diisi di bagian 5 setelah uji coba selesai.

## 1. Tujuan dan target

Diambil dari tujuan terukur di [halaman proyek](index.md) (§a).

| Tujuan | Indikator | Cara ukur |
|---|---|---|
| Penggunanya bertahan | **≥ 60%** peserta masih mencatat di hari ke-13 atau ke-14 | `scripts/uji-coba.sql` bagian 2 |
| AI-nya akurat | **≥ 85%** transaksi AI tersimpan tanpa koreksi nominal & kategori | bagian 3 (dari `ai_extractions.user_corrections`) |
| Mencatat jadi cepat | Waktu mencatat **≤ 10 detik** | latensi AI p95 (bagian 3) + observasi 1× sesi tatap muka |
| Datanya berguna | Tiap peserta aktif dapat ringkasan mingguan dengan ≥ 1 saran | bagian 4 |

## 2. Peserta

- **Minimal 10 mahasiswa** (target 12, untuk cadangan yang berhenti di tengah). Prioritas responden wawancara Subproyek A.
- Bukan anggota tim. Akun tim dan akun uji **tidak** dimasukkan ke daftar email saat menghitung.
- Setiap peserta menyetujui *informed consent* singkat (bagian 6) sebelum mulai.

## 3. Prasyarat sebelum hari ke-1

1. **Pindah ke Fase 2** sesuai [arsitektur §0.3](arsitektur.md): AI dengan SLA (Azure OpenAI) dan Whisper yang terjangkau dari aplikasi. Gateway pribadi tidak dipakai untuk data peserta.
2. Production memakai project Supabase **terpisah dari dev**, dengan migrasi terbaru.
3. Env Production: `AI_TEXT_*`, `AI_STT_*` (`AI_STT_ENABLED=true`), `AI_DRAFT_SECRET`, `CRON_SECRET`, `AI_PARSE_DAILY_LIMIT`.
4. Redirect URL Supabase Auth untuk domain Production sudah diatur (daftar, reset password, Google).
5. Smoke test: daftar → catat lewat kalimat, suara, dan form → ringkasan → anggaran → unduh CSV → pasang di HP → catat offline.
6. Jalankan `pnpm eval:ai` dengan provider final; simpan hasilnya di `eval/results/` sebagai pembanding.

## 4. Jalannya uji coba

| Hari | Kegiatan |
|---|---|
| 0 | Sesi pengantar 15 menit (daring/luring): pasang PWA, daftar, catat 3 transaksi contoh. Ukur waktu mencatat 1 transaksi dengan stopwatch. |
| 1–14 | Peserta mencatat seperti biasa. Tidak ada pengingat dari tim selain notifikasi di grup pada hari ke-1 dan ke-8. |
| 7 | Cek tengah: jalankan `scripts/uji-coba.sql`, catat peserta yang belum aktif di minggu ke-2 (jangan dihubungi khusus; ini data retensi). |
| 15 | Kuesioner penutup (5 menit) + jalankan `scripts/uji-coba.sql` untuk angka akhir. |

Menjalankan pengukuran (read-only, dari laptop tim):

```bash
psql "$DIRECT_URL" -v start="'2026-12-01'" -v emails="'a@mail.ugm.ac.id,b@mail.ugm.ac.id'" -f scripts/uji-coba.sql
```

Kuesioner penutup: (1) seberapa mudah mencatat (1–5), (2) seberapa sering hasil AI perlu dibetulkan (1–5), (3) fitur yang paling dipakai, (4) alasan berhenti (jika berhenti), (5) apakah akan tetap memakai setelah uji coba.

## 5. Hasil

*Diisi setelah hari ke-15.*

| Indikator | Target | Hasil | Lulus |
|---|---|---|---|
| Retensi hari ke-14 | ≥ 60% | | |
| Akurasi AI (nominal + kategori, data nyata) | ≥ 85% | | |
| Waktu mencatat (median sesi hari ke-0) | ≤ 10 dtk | | |
| Latensi AI p95 | ≤ 3 dtk | | |
| Peserta aktif yang dapat ringkasan + saran | 100% | | |

Temuan kualitatif dari kuesioner, kategori yang paling sering dibetulkan, dan keputusan perbaikan ditulis di bawah tabel ini.

## 6. Etika & data

- Peserta diberi tahu bahwa kalimat yang diketik/diucapkan diproses oleh penyedia AI, audio tidak disimpan, dan tim hanya membaca **angka agregat** (bukan isi transaksi) untuk laporan.
- Peserta bisa berhenti kapan saja dan menghapus akun beserta seluruh datanya dari menu Akun.
- Laporan hanya memuat angka agregat; nama dan email peserta tidak dicantumkan.
