Nama Kelompok: MDG (My Duit Gweh) <br><br>
Ketua Kelompok: Garjita Adicandra - 24/535330/TK/59377 <br>
Anggota 1: Muhammad Syauqi Fittuqo - 24/543713/TK/60433 <br>
Anggota 2: Naufal Dzaky - 24/543697/TK/60431 <br>

# Project Senior Project TI
Departemen Teknik Elektro dan Teknologi Informasi <br>
Fakultas Teknik <br>
Universitas Gadjah Mada <br>

---

# Centsible

---

## 🎯 Permasalahan yang Dipecahkan

### Latar Belakang

Survei Nasional Literasi dan Inklusi Keuangan (SNLIK) 2025 yang dilaksanakan OJK bersama BPS terhadap 10.800 responden usia 15–79 tahun di 34 provinsi dan 120 kabupaten/kota mencatat indeks literasi keuangan nasional **66,46%** dan indeks inklusi keuangan **80,51%** [1].

Menariknya, kelompok usia 18–25 tahun — rentang usia mahasiswa — justru mencatat indeks literasi **73,22%** (tertinggi kedua setelah kelompok 26–35 tahun) dan indeks inklusi tertinggi di antara seluruh kelompok usia, yaitu **89,96%** [1][2].

Angka tersebut menyampaikan satu pesan penting untuk perumusan masalah proyek ini: mahasiswa Indonesia bukan kelompok yang *"tidak tahu"* soal keuangan, dan bukan pula kelompok yang *"tidak punya akses"* ke produk keuangan. Mereka tahu, dan mereka punya akses paling luas. Yang bermasalah adalah **eksekusi harian**: kemampuan mengubah pengetahuan menjadi kebiasaan mencatat, mengevaluasi, dan mengendalikan pengeluaran.

Solusi "aplikasi pencatat keuangan" bukan hal baru. Money Lover, Finansialku, Monefy, Spendee, dan puluhan aplikasi sejenis sudah tersedia gratis di Play Store. Persoalannya adalah **retensi**: kategori aplikasi finansial termasuk yang paling cepat ditinggalkan.

Akar penyebabnya dapat dirumuskan sebagai **friction biaya kognitif per transaksi**. Untuk mencatat satu transaksi pada aplikasi konvensional, pengguna harus:

1. Membuka aplikasi
2. Menekan tombol tambah
3. Memilih dompet/rekening
4. Memilih kategori dari daftar panjang
5. Mengetik nominal
6. Mengetik catatan
7. Memilih tanggal
8. Menyimpan

Delapan langkah, sekitar 20–40 detik, dikalikan 5–10 transaksi per hari. Beban ini bertahan beberapa hari, lalu ditinggalkan. Setelah 2–3 hari terlewat, data menjadi tidak akurat, dan ketidakakuratan itu sendiri menjadi alasan untuk berhenti total.

Dengan populasi mahasiswa Indonesia yang mencapai sekitar **10 juta orang** pada 2025 [4], ukuran pasar untuk solusi yang benar-benar menyelesaikan masalah friction ini sangat signifikan.

### Rumusan Permasalahan

> Mahasiswa Indonesia gagal mengendalikan keuangan pribadinya bukan karena tidak memiliki aplikasi pencatat keuangan atau tidak memahami konsep keuangan, melainkan karena biaya kognitif pencatatan manual per transaksi terlalu tinggi untuk dipertahankan sebagai kebiasaan harian, sehingga aplikasi ditinggalkan sebelum data terkumpul cukup untuk menghasilkan wawasan yang berguna.

---

## 💡 Ide Solusi yang Diusulkan Beserta Rancangan Fitur

### Solusi

**Centsible** adalah aplikasi web (PWA) pencatat keuangan pribadi untuk mahasiswa Indonesia yang memindahkan seluruh beban strukturisasi data dari pengguna ke AI agent.

> **Prinsip desain inti:** pengguna hanya bertugas menyampaikan apa yang terjadi; sistem bertugas mengubahnya menjadi data terstruktur.

Setelah data terkumpul, AI agent berganti peran dari pencatat menjadi penasihat: mendeteksi anomali pengeluaran, meringkas pola mingguan dalam bahasa manusia, dan memberi rekomendasi anggaran yang spesifik dan dapat ditindaklanjuti.

> **Prinsip penting:** AI tidak pernah menyimpan transaksi tanpa konfirmasi pengguna. Selalu ada langkah konfirmasi satu ketukan yang menampilkan hasil ekstraksi dan memungkinkan koreksi inline. Ini menjaga akurasi data, membangun kepercayaan pada domain sensitif (uang), dan sekaligus menghasilkan data koreksi untuk evaluasi & perbaikan model.

### Rancangan Fitur Solusi

| Fitur | Keterangan |
|---|---|
| **Teks natural language** | Mengelompokkan data nominal berdasarkan deskripsi panjang |
| **Form manual** | Formulir konvensional (fallback & koreksi) untuk keamanan dan input manual data keuangan |
| **Voice (add-on)** | Tekan mikrofon, ucapkan *"beli bensin gocap"* |

---

## 🔍 Analisis Kompetitor (Minimal 3 Kompetitor)

### Kompetitor 1: Money Lover — Money Manager (Finsify, Vietnam)

| Aspek | Detail |
|---|---|
| **Jenis Kompetitor** | Direct |
| **Jenis Produk** | Aplikasi mobile (Android/iOS) + web, model freemium |
| **Target Customer** | Pengguna umum Asia Tenggara yang ingin melacak pengeluaran pribadi; usia 20–40 tahun |

**Kelebihan**
- Fitur sangat lengkap dan matang: multi-dompet, anggaran, utang-piutang, tagihan berulang, perencana tabungan, multi-mata uang
- Tersedia layanan linked wallet yang menghubungkan rekening bank di beberapa negara termasuk Indonesia
- Basis pengguna besar dan reputasi mapan

**Kekurangan**
- Tidak memahami bahasa alami Indonesia; tidak ada AI agent untuk ekstraksi transaksi dari kalimat bebas
- Banyak fitur inti (dompet tak terbatas, ekspor CSV, lampiran gambar) terkunci di balik premium
- Aplikasi terasa berat dan padat fitur bagi mahasiswa yang hanya ingin mencatat cepat; kurva belajar tinggi

**Key Competitive Advantage & Unique Value**
Kelengkapan fitur pengelolaan keuangan pribadi tingkat lanjut dan kematangan produk lintas platform, ditopang basis pengguna besar di Asia Tenggara serta integrasi rekening di beberapa negara.

---

### Kompetitor 2: Finansialku

| Aspek | Detail |
|---|---|
| **Jenis Kompetitor** | Direct |
| **Jenis Produk** | Aplikasi mobile + platform web, freemium dengan langganan premium |
| **Target Customer** | Masyarakat Indonesia usia produktif yang ingin merencanakan keuangan; cenderung ke segmen pekerja dan keluarga, bukan spesifik mahasiswa |

**Kelebihan**
- Cakupan luas: pencatatan, anggaran, perencanaan keuangan, pengelolaan investasi, hingga laporan keuangan
- Menyediakan konsultasi dengan perencana keuangan bersertifikat pada paket premium
- Mendukung lampiran foto dan lokasi pada setiap transaksi

**Kekurangan**
- Berbayar untuk fitur inti; batasan jumlah transaksi dan rekening pada versi gratis merupakan hambatan besar bagi mahasiswa dengan anggaran terbatas
- Pencatatan tetap manual berbasis form; tidak ada input suara maupun ekstraksi bahasa alami
- Antarmuka relatif padat; time-to-first-value untuk pengguna baru cukup panjang

**Key Competitive Advantage & Unique Value**
Kombinasi aplikasi pencatatan dengan layanan perencanaan keuangan bersertifikat dan konten edukasi berbahasa Indonesia — menjual keahlian manusia, bukan sekadar perangkat lunak.

---

### Kompetitor 3: Monefy — Budget & Expense Tracker (Aimbity AG)

| Aspek | Detail |
|---|---|
| **Jenis Kompetitor** | Direct |
| **Jenis Produk** | Aplikasi mobile (Android/iOS), freemium |
| **Target Customer** | Orang-orang yang ingin mencatat pengeluaran dengan super cepat dan gampang |

**Kelebihan**
- Sangat cepat: paling cepat untuk urusan mencatat, memakai menu bentuk lingkaran sehingga hanya butuh sekitar 4 kali sentuh/klik untuk mencatat pengeluaran
- Ringan & praktis: aplikasinya enteng, loading cepat, dan langsung bisa dimengerti tanpa perlu baca panduan
- Tampilan rapi; versi berbayar (Pro) mendukung pencadangan data ke Google Drive atau Dropbox

**Kekurangan**
- Kurang pintar: tidak ada fitur otomatis sama sekali — tidak bisa mengelompokkan pengeluaran otomatis, tidak ada saran keuangan, dan tidak bisa mendeteksi pengeluaran aneh
- Laporan standar: laporan keuangannya sangat biasa (hanya berupa diagram lingkaran/pie chart)
- Fitur dibatasi: menyambungkan ke lebih dari satu HP atau membuat banyak "dompet" mengharuskan upgrade ke versi Pro

**Key Competitive Advantage & Unique Value**
Kesederhanaan. Andalan utama aplikasi ini adalah "bisa mencatat dengan klik paling sedikit". Mereka fokus membuat proses catat-mencatat jadi sangat praktis, walaupun efeknya fitur aplikasi ini jadi kurang lengkap dibanding yang lain.
