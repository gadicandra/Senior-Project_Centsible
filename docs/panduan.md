---
title: Panduan Pengguna & Pengembang
---

# Panduan Centsible

Halaman ini menjelaskan cara memakai Centsible, cara menjalankannya sendiri, dan cara mengujinya. Rancangan teknis ada di [Arsitektur Sistem](arsitektur.md) dan [Rancangan Basis Data](database.md); status pekerjaan ada di [Progres Proyek](progres.md). Bahan presentasi akhir: [Slide](slide.html).

## 1. Untuk pengguna

| Fitur | Cara pakai | FR |
|---|---|---|
| **Daftar & masuk** | Email + kata sandi atau akun Google. Lupa kata sandi → "Lupa kata sandi" di halaman masuk. Hapus akun di menu Akun (ketik `HAPUS`), seluruh data ikut terhapus. | FR 1 |
| **Catat dengan kalimat** | Ketik di kolom bawah layar, mis. *"beli bensin gocap kemarin"*. AI membaca nominal, kategori, dompet, dan tanggal, lalu menampilkan **kartu konfirmasi**. Tidak ada yang tersimpan sebelum kamu menekan **Simpan**, dan setiap isian bisa dibetulkan. | FR 2–5 |
| **Catat dengan suara** | Tekan ikon mikrofon, ucapkan transaksinya (maks. 30 detik), tekan lagi untuk berhenti. Teksnya diproses sama seperti ketikan dan tetap berakhir di kartu konfirmasi. Tombol hanya tampil kalau fitur suara aktif dan sedang online. | FR 6 |
| **Form manual** | Tombol **Catat manual** di halaman Transaksi. Selalu tersedia, juga saat AI mati. | FR 7 |
| **Transaksi** | Lihat, ubah, hapus, dan saring berdasarkan tanggal, jenis, kategori, dan dompet. **Unduh CSV** mengunduh transaksi sesuai saringan. | FR 8, 15 |
| **Kategori & dompet** | Menu Pengaturan. Kategori bawaan untuk mahasiswa sudah ada; kategori/dompet yang sudah dipakai hanya bisa diarsipkan. | FR 9–10 |
| **Anggaran** | Menu Anggaran: batas mingguan atau bulanan per kategori, dengan status Aman / Hampir habis / Melebihi. | FR 11 |
| **Ringkasan** | Menu Ringkasan: saldo, pemasukan, pengeluaran, pembagian per kategori, dan tren harian per bulan. | FR 12 |
| **Ringkasan mingguan** | Setiap Senin pagi Beranda menampilkan ringkasan minggu lalu beserta satu saran anggaran. | FR 13 |
| **Pengeluaran tidak biasa** | Beranda memberi peringatan bila pengeluaran sebuah kategori minggu ini jauh di atas kebiasaanmu 8 minggu terakhir. | FR 14 |
| **Pasang di HP & offline** | Di browser HP pilih "Tambahkan ke layar utama". Saat offline, halaman yang pernah dibuka tetap tampil dan transaksi dari form manual disimpan di perangkat, lalu terkirim otomatis saat online. | FR 16 |

Data setiap pengguna terkunci di tingkat basis data (Row Level Security): pengguna lain tidak bisa membaca atau mengubahnya (FR 17).

## 2. Menjalankan sendiri

Prasyarat: Node.js 22, pnpm 10, satu project Supabase.

```bash
pnpm install
cp .env.example .env.local     # isi URL & key Supabase, DATABASE_URL, DIRECT_URL, AI_DRAFT_SECRET
pnpm db:deploy                 # terapkan migrasi ke database
pnpm dev                       # http://localhost:3000
```

Fitur AI bersifat opsional. Tanpa variabel `AI_TEXT_*`, kolom kalimat langsung membuka form manual.

| Variabel | Untuk | Contoh |
|---|---|---|
| `AI_TEXT_PROVIDER`, `AI_TEXT_MODEL` | Pembaca kalimat | `anthropic` + `claude-haiku-4-5`, atau `openai-compatible` + gateway lokal |
| `ANTHROPIC_API_KEY` / `AI_TEXT_BASE_URL` + `AI_TEXT_API_KEY` | Kunci penyedia | — |
| `AI_STT_ENABLED`, `AI_STT_BASE_URL`, `AI_STT_MODEL` | Input suara (Whisper OpenAI-compatible) | `true`, `http://localhost:8000/v1`, `Systran/faster-whisper-small` |
| `CRON_SECRET` | Melindungi `/api/cron/weekly` (Vercel Cron, Senin 06:00 WIB) | string acak ≥ 16 karakter |
| `AI_PARSE_DAILY_LIMIT` | Kuota AI per pengguna per hari | `100` |

Whisper lokal untuk input suara:

```bash
docker run --rm -d -p 8000:8000 --name speaches -v hf-hub-cache:/home/ubuntu/.cache/huggingface/hub \
  ghcr.io/speaches-ai/speaches:0.8.3-cpu
curl -X POST http://localhost:8000/v1/models/Systran/faster-whisper-small
```

## 3. Pengujian

| Perintah | Isi | Kapan |
|---|---|---|
| `pnpm test` | Tes unit & komponen (Vitest + Testing Library) | setiap perubahan |
| `pnpm test:coverage` | Tes + cakupan; **gagal bila cakupan di bawah batas** (baris 75%, cabang 68%) | otomatis di CI tiap PR |
| `pnpm test:db` | Tes integrasi ke Supabase dev: RLS, hak akses, constraint | perubahan yang menyentuh database |
| `pnpm eval:ai` | Akurasi AI pada 99 kalimat berlabel (`eval/ai-dataset.jsonl`), target ≥ 85% nominal **dan** kategori | setiap ganti prompt atau model |

Hasil evaluasi AI pertama (`claude-haiku-4-5`): nominal **100%**, kategori **88,9%**, nominal + kategori **88,9%** (target 85%), p95 1,3 detik. Rinciannya di `eval/results/`.

## 4. Alur kerja tim

Satu issue = satu branch dari `main` = satu PR dengan `Closes #N`. CI (GitHub Actions) menjalankan lint, typecheck, tes + cakupan, dan build; Vercel membuat deploy Preview untuk setiap PR. Anggota tim memeriksa fitur di Preview sebelum PR digabung. Catatan serah-terima antar sesi ada di [`docs/task.md`](task.md).
