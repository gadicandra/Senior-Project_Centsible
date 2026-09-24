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

---

## 🔧 Metodologi SDLC

### Metodologi yang Digunakan

**Agile — Scrumban** (gabungan Scrum dan Kanban: jadwal rutin dan pertemuan rutin diambil dari Scrum, papan kerja dan batas jumlah tugas diambil dari Kanban)

### Alasan Pemilihan Metodologi

1. **Waktu luang tim naik-turun dan sulit ditebak — ini alasan utamanya.** Kami bertiga mahasiswa aktif yang juga punya tugas besar mata kuliah lain, praktikum, dan UTS/UAS. Scrum murni mengharuskan tim berjanji menyelesaikan sejumlah tugas dalam satu sprint. Janji itu baru masuk akal kalau waktu luang tiap minggu kira-kira sama. Pada tim kami, waktu luang bisa tiba-tiba habis karena deadline mata kuliah lain, jadi sprint yang gagal bukan karena cara kerjanya salah, tapi karena jadwal kuliah. Kalau targetnya sering meleset, angka kecepatan tim jadi tidak berguna untuk merencanakan sprint berikutnya. Scrumban membuang janji sprint tadi. Sebagai gantinya, tugas **diambil sendiri** oleh anggota saat dia benar-benar punya waktu, bukan **dibagikan di awal** berdasarkan tebakan.

2. **Bagian AI-nya belum bisa dipastikan dari awal.** Fitur andalan Centsible adalah AI yang mengubah kalimat bebas seperti *"beli bensin gocap"* jadi data transaksi. Seberapa akurat AI-nya baru ketahuan setelah dicoba dan diukur, lalu diperbaiki berulang kali. Karena itu Waterfall tidak cocok — Waterfall mengunci spesifikasi sebelum kami punya bukti. Pekerjaan coba-coba seperti ini juga sulit ditebak lamanya, jadi makin tidak cocok dipaksa masuk sprint dengan target tetap.

3. **Prioritas harus bisa diubah kapan saja.** Di Scrum, daftar tugas dikunci selama sprint berjalan. Padahal hasil uji coba ke pengguna atau hasil pengukuran akurasi AI bisa mengubah prioritas di tengah jalan, dan menunggu sprint berikutnya berarti membuang waktu yang sudah sempit. Di Scrumban, urutan tugas boleh diatur ulang kapan saja selama tugasnya belum mulai dikerjakan.

4. **Batas jumlah tugas menjaga pekerjaan tetap selesai.** Karena tidak ada deadline sprint, ada risiko pekerjaan jadi mengambang. Kanban mengatasinya bukan dengan deadline, tapi dengan **batas jumlah tugas yang boleh dikerjakan bersamaan**: satu orang tidak boleh ambil tugas baru sebelum tugasnya yang sekarang selesai. Untuk tim yang perhatiannya terbagi dengan mata kuliah lain, aturan ini lebih ampuh daripada deadline karena mencegah kebiasaan "mulai empat fitur, tidak ada satu pun yang kelar" — kegagalan yang paling sering terjadi di proyek mahasiswa.

5. **Hasil dirilis bertahap dan tetap berguna.** Tiap tahap sudah bisa dipakai sendiri: form manual dulu, lalu input teks dengan AI, lalu input suara, lalu fitur insight. Kalau ada satu fitur yang terpaksa dilepas karena kehabisan waktu, aplikasinya tetap utuh dan tetap bisa didemokan.

6. **Cocok dengan alat yang kami pakai.** Papan `Backlog → Ready → In Progress → In Review → Done` di GitHub Project itu memang papan Kanban. Dengan memakai Scrumban, cara kerja yang kami tulis di dokumen sama persis dengan alat yang benar-benar kami pakai sehari-hari.

### Cara Kerja Tim

**Bagian yang diambil dari Kanban:**

| Unsur | Penerapan |
|---|---|
| Papan kerja | GitHub Project dengan kolom `Backlog → Ready → In Progress → In Review → Done` |
| Batas jumlah tugas (WIP limit) | Maksimal **2 kartu** per orang di kolom *In Progress*; maksimal **4 kartu** untuk satu tim di kolom *In Review* |
| Ambil sendiri (*pull*) | Anggota mengambil kartu paling atas dari kolom *Ready* saat dia sedang punya waktu — tidak ada pembagian tugas paksa di awal |
| Syarat siap dikerjakan (*Definition of Ready*) | Kartu boleh masuk kolom *Ready* kalau tujuannya sudah jelas, tugas yang jadi syaratnya sudah selesai, dan ukurannya cukup kecil untuk selesai dalam ±1 minggu |
| Syarat selesai (*Definition of Done*) | Kode sudah digabung ke `main`, CI hijau, sudah dites, dan dokumentasinya sudah diperbarui |

**Bagian yang diambil dari Scrum:**

| Unsur | Penerapan |
|---|---|
| Ritme tetap | Siklus **1 minggu**, mengikuti jadwal pertemuan praktikum supaya ritme proyek tidak bergantung pada kedisiplinan tambahan |
| Rapat isi ulang tugas | Tiap minggu, untuk mengisi kolom *Ready* dan menata ulang urutan prioritas |
| Review | Demo hasil kerja yang sudah selesai di tiap pertemuan mingguan |
| Retrospective | Evaluasi cara kerja tiap 2 minggu, fokus mencari apa yang menghambat, bukan menghitung target tercapai atau tidak |
| Laporan harian tanpa rapat | Update lewat komentar di issue GitHub, karena rapat harian tidak realistis dengan jadwal kuliah yang berbeda-beda |

**Yang kami pantau:** *cycle time* (berapa lama satu kartu dari mulai dikerjakan sampai selesai) dan *throughput* (berapa kartu yang selesai per minggu). Keduanya dipakai menggantikan *velocity* karena tetap berguna walaupun waktu luang tim naik-turun.

---

## 📐 Perancangan Tahap 1–3 SDLC

### a. Tujuan Produk

Membuat pencatatan keuangan harian mahasiswa jadi jauh lebih ringan: dari sekitar 8 langkah (20–40 detik) per transaksi menjadi **satu kalimat + satu kali ketuk untuk konfirmasi**. Dengan begitu kebiasaan mencatat bisa bertahan lama, datanya terkumpul cukup banyak, lalu diolah jadi ringkasan pola pengeluaran dan saran anggaran yang bisa langsung dijalankan.

Tujuan terukur (target akhir semester):

| Tujuan | Indikator |
|---|---|
| Mencatat jadi cepat | Waktu mencatat satu transaksi ≤ 10 detik (dari mulai mengetik sampai tersimpan) |
| AI-nya akurat | ≥ 85% transaksi tersimpan tanpa perlu dibetulkan manual pada bagian nominal & kategori |
| Penggunanya bertahan | ≥ 60% pengguna uji coba masih mencatat sampai hari ke-14 |
| Datanya berguna | Tiap pengguna aktif dapat ringkasan mingguan & minimal 1 saran anggaran yang jelas |

### b. Pengguna Potensial dan Kebutuhannya

| Segmen Pengguna | Karakteristik | Kebutuhan Utama |
|---|---|---|
| **Mahasiswa perantau (pengguna utama)** | Dapat uang saku bulanan/mingguan dari orang tua, 5–10 transaksi kecil per hari (makan, kos, transport, jajan) | Ingin tahu uangnya cukup atau tidak sampai kiriman berikutnya; ingin mencatat tanpa harus berhenti dari kegiatan yang sedang dilakukan |
| **Mahasiswa yang punya penghasilan sendiri** (freelance, part-time, asisten praktikum) | Pemasukan tidak tetap dan waktunya tidak menentu, pengeluaran pribadi bercampur dengan keperluan kerja | Ingin memisahkan pengeluaran per kategori, melihat uang masuk dan keluar tiap periode, dan tahu bulan mana yang boncos |
| **Mahasiswa yang sedang menabung** | Sedang mengumpulkan uang untuk laptop, KKN, atau jalan-jalan | Ingin menetapkan batas pengeluaran per kategori, dapat peringatan kalau boros, dan tahu perkiraan kapan target tabungannya tercapai |
| **Bendahara kelompok/organisasi** (pengguna tambahan) | Mengurus uang kas kegiatan yang nanti harus dilaporkan | Ingin mencatat cepat saat di lapangan, dan punya riwayat lengkap yang bisa dicek ulang serta diunduh |

Ada tiga kebutuhan yang muncul di semua kelompok pengguna dan menjadi patokan seluruh desain: **mencatat harus bisa dilakukan sambil berdiri di kasir**, **data harus bisa dibetulkan**, dan **AI tidak boleh menyimpan apa pun tanpa persetujuan pengguna**.

### c. Use Case Diagram

<pre class="mermaid">
flowchart LR
    U(("👤 Mahasiswa<br/>(Pengguna)"))

    subgraph SYS["Sistem Centsible"]
        direction TB

        subgraph G1["Akses"]
            UC1(["UC-01 Registrasi &amp; Login"])
            UC14(["UC-14 Instal PWA &amp; akses offline"])
        end

        subgraph G2["Mencatat Transaksi"]
            UC2(["UC-02 Catat transaksi lewat teks biasa"])
            UC3(["UC-03 Catat transaksi lewat suara"])
            UC4(["UC-04 Catat transaksi lewat form manual"])
            UCT(["UC-T Ubah suara jadi teks"])
            UCX(["UC-X AI membaca isi transaksi"])
            UC5(["UC-05 Cek &amp; betulkan hasil baca AI"])
        end

        subgraph G3["Mengelola Data"]
            UC6(["UC-06 Kelola transaksi (ubah/hapus)"])
            UC7(["UC-07 Kelola kategori &amp; dompet"])
            UC8(["UC-08 Menetapkan anggaran per kategori"])
            UC13(["UC-13 Ekspor data (CSV)"])
        end

        subgraph G4["Melihat Hasil &amp; Saran"]
            UC9(["UC-09 Melihat dashboard &amp; laporan"])
            UC10(["UC-10 Terima ringkasan mingguan"])
            UC11(["UC-11 Terima saran anggaran"])
            UC12(["UC-12 Terima peringatan pengeluaran tidak wajar"])
        end
    end

    S(("🔐 Layanan Auth<br/>(Supabase)"))
    A(("🤖 AI Agent<br/>(LLM Provider)"))

    U --- UC1
    U --- UC14
    U --- UC2
    U --- UC3
    U --- UC4
    U --- UC5
    U --- UC6
    U --- UC7
    U --- UC8
    U --- UC13
    U --- UC9
    U --- UC10
    U --- UC11
    U --- UC12

    UC1 -.->|"&lt;&lt;include&gt;&gt;"| S
    UC2 -.->|"&lt;&lt;include&gt;&gt;"| UCX
    UC3 -.->|"&lt;&lt;include&gt;&gt;"| UCT
    UCT -.->|"&lt;&lt;include&gt;&gt;"| UCX
    UCX -.->|"&lt;&lt;include&gt;&gt;"| UC5
    UC4 -.->|"&lt;&lt;extend&gt;&gt;"| UC5
    UCX -.->|"&lt;&lt;include&gt;&gt;"| A
    UC10 -.->|"&lt;&lt;include&gt;&gt;"| A
    UC11 -.->|"&lt;&lt;include&gt;&gt;"| A
    UC12 -.->|"&lt;&lt;include&gt;&gt;"| A

    classDef actor fill:#1f2937,stroke:#111827,stroke-width:2px,color:#f9fafb
    classDef usecase fill:#eef2ff,stroke:#4f46e5,stroke-width:1.5px,color:#1e1b4b
    classDef internal fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#451a03
    class U,A,S actor
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10,UC11,UC12,UC13,UC14 usecase
    class UCX,UCT internal
</pre>

> Catatan: UC-04 (form manual) adalah jalur cadangan kalau AI gagal atau pengguna ingin mengisi sendiri. Semua cara input — teks, suara, maupun manual — sama-sama berakhir di UC-05 (konfirmasi), jadi **tidak ada transaksi yang tersimpan tanpa disetujui pengguna**.

### d. Functional Requirements

| FR | Deskripsi |
|---|---|
| **FR 1** | Pengguna bisa mendaftar dan masuk memakai email/password atau akun Google, bisa mengatur ulang password yang lupa, serta bisa menghapus akun beserta seluruh datanya. |
| **FR 2** | Pengguna bisa mencatat transaksi dengan mengetik kalimat biasa dalam bahasa Indonesia, termasuk istilah sehari-hari untuk nominal seperti *gocap*, *ceban*, atau *25rb*, lewat satu kolom isian saja. |
| **FR 3** | Sistem membaca kalimat tersebut dan memecahnya menjadi data: nominal, jenis (pemasukan/pengeluaran), kategori, dompet, keterangan, dan tanggal — termasuk kalau pengguna menulis *"kemarin"* atau *"tadi pagi"*. |
| **FR 4** | Sebelum disimpan, sistem menampilkan kartu berisi hasil pembacaan AI dan **wajib** menunggu pengguna menekan tombol simpan. Setiap isian pada kartu itu bisa langsung dibetulkan di tempat. |
| **FR 5** | Setiap kali pengguna membetulkan hasil AI, sistem menyimpan nilai sebelum dan sesudah dibetulkan sebagai bahan untuk mengukur dan memperbaiki akurasi AI. |
| **FR 6** | Pengguna bisa mencatat lewat suara: rekam, lalu suaranya diubah jadi teks, lalu diproses dengan cara yang sama seperti FR 3–FR 4. |
| **FR 7** | Sistem menyediakan form isian biasa yang selalu tersedia dan tetap berfungsi walaupun layanan AI sedang mati. |
| **FR 8** | Pengguna bisa melihat, mengubah, dan menghapus transaksi yang sudah tersimpan, serta menyaringnya berdasarkan tanggal, kategori, dompet, dan jenis transaksi. |
| **FR 9** | Sistem menyediakan kategori bawaan yang sesuai untuk mahasiswa (Makan, Transport, Kos, Kuliah, Hiburan, Kesehatan, Lain-lain), dan pengguna bisa menambah, mengubah, atau menonaktifkan kategori. |
| **FR 10** | Sistem mendukung beberapa dompet sekaligus (tunai, rekening bank, e-wallet). Saldo tiap dompet dihitung otomatis dari transaksinya. |
| **FR 11** | Pengguna bisa menetapkan batas pengeluaran per kategori untuk tiap minggu atau bulan, lengkap dengan indikator seberapa banyak yang sudah terpakai. |
| **FR 12** | Sistem menampilkan halaman ringkasan berisi total saldo, total pemasukan dan pengeluaran periode berjalan, pembagian pengeluaran per kategori, dan grafik tren harian. |
| **FR 13** | Sistem membuat ringkasan pola pengeluaran mingguan dalam bahasa yang mudah dipahami, disertai minimal satu saran anggaran yang jelas dan bisa langsung dijalankan. |
| **FR 14** | Sistem mendeteksi pengeluaran yang tidak wajar (nominal atau frekuensi kategori yang jauh berbeda dari kebiasaan pengguna) lalu memberi peringatan. |
| **FR 15** | Pengguna bisa mengunduh riwayat transaksinya dalam bentuk file CSV untuk rentang tanggal yang dipilih. |
| **FR 16** | Aplikasi berjalan sebagai PWA yang bisa dipasang di layar utama HP. Transaksi tetap bisa dicatat saat tidak ada internet, lalu otomatis tersinkron saat koneksi kembali. |
| **FR 17** | Data tiap pengguna terpisah dan terkunci: seorang pengguna hanya bisa mengakses datanya sendiri. Pembatasan ini diterapkan langsung di tingkat basis data lewat Row Level Security. |

### e. Entity Relationship Diagram

<pre class="mermaid">
erDiagram
    USERS ||--o{ WALLETS : "memiliki"
    USERS ||--o{ CATEGORIES : "mendefinisikan"
    USERS ||--o{ TRANSACTIONS : "mencatat"
    USERS ||--o{ BUDGETS : "menetapkan"
    USERS ||--o{ INSIGHTS : "menerima"
    WALLETS ||--o{ TRANSACTIONS : "menjadi sumber"
    CATEGORIES ||--o{ TRANSACTIONS : "mengklasifikasi"
    CATEGORIES ||--o{ BUDGETS : "dibatasi oleh"
    TRANSACTIONS ||--o| AI_EXTRACTIONS : "berasal dari"

    USERS {
        uuid id PK
        string email UK
        string full_name
        string avatar_url
        string currency "default IDR"
        string timezone
        timestamp created_at
    }
    WALLETS {
        uuid id PK
        uuid user_id FK
        string name
        enum type "cash|bank|ewallet"
        bigint initial_balance
        boolean is_archived
        timestamp created_at
    }
    CATEGORIES {
        uuid id PK
        uuid user_id FK
        string name
        enum kind "income|expense"
        string icon
        string color
        boolean is_default
        boolean is_archived
    }
    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        uuid wallet_id FK
        uuid category_id FK
        bigint amount "minor unit (rupiah)"
        enum type "income|expense"
        string description
        date occurred_at
        enum source "text|voice|manual"
        timestamp created_at
        timestamp updated_at
    }
    AI_EXTRACTIONS {
        uuid id PK
        uuid transaction_id FK
        text raw_input
        enum input_mode "text|voice"
        jsonb parsed_result
        jsonb user_corrections
        float confidence
        string model_version
        int latency_ms
        timestamp created_at
    }
    BUDGETS {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        bigint amount_limit
        enum period "weekly|monthly"
        date start_date
        boolean is_active
    }
    INSIGHTS {
        uuid id PK
        uuid user_id FK
        enum kind "weekly_summary|anomaly|budget_recommendation"
        text content
        jsonb payload
        boolean is_read
        timestamp generated_at
    }
</pre>

**Beberapa keputusan penting pada rancangan basis data:**

- Nominal (`transactions.amount`) disimpan sebagai bilangan bulat rupiah (`bigint`), bukan bilangan desimal (`float`). Bilangan desimal rawan salah pembulatan, dan pada aplikasi keuangan selisih kecil pun tidak bisa ditoleransi.
- Saldo dompet **tidak** disimpan sebagai angka tersendiri, tapi selalu dihitung dari saldo awal + seluruh transaksinya. Dengan begitu saldo tidak mungkin berbeda dari riwayat transaksinya.
- Tabel `ai_extractions` sengaja dipisah dari `transactions` karena fungsinya beda: `transactions` adalah data milik pengguna, sedangkan `ai_extractions` adalah catatan kerja AI untuk bahan evaluasi. Kolom `user_corrections` di situlah yang dipakai mengukur dan memperbaiki akurasi AI (FR 5).
- Kategori yang tidak dipakai lagi hanya ditandai nonaktif (`is_archived`), bukan benar-benar dihapus. Kalau dihapus, transaksi lama akan kehilangan kategorinya.

### f. Low-fidelity Wireframe

<pre class="mermaid">
flowchart TD
    subgraph W1["① Dashboard (Home)"]
        direction TB
        A1["┌──────────────────────────────┐<br/>│  Halo, Adi          [profil]  │<br/>│                               │<br/>│   SALDO TOTAL                 │<br/>│   Rp 1.240.000                │<br/>│   ▲ masuk 500rb  ▼ keluar 260rb│<br/>│                               │<br/>│  [ Pengeluaran per kategori ] │<br/>│  ▓▓▓▓▓▓▓▓ Makan      45%      │<br/>│  ▓▓▓▓▓ Transport     28%      │<br/>│  ▓▓▓ Jajan           17%      │<br/>│                               │<br/>│  Transaksi terbaru            │<br/>│  • Bensin        -Rp 50.000   │<br/>│  • Makan siang   -Rp 18.000   │<br/>│                               │<br/>│  ╭─────────────────────────╮  │<br/>│  │ Ketik transaksi…    🎤 │  │<br/>│  ╰─────────────────────────╯  │<br/>│  [🏠] [📊] [＋] [🎯] [⚙]      │<br/>└──────────────────────────────┘"]
    end

    subgraph W2["② Kartu Konfirmasi AI"]
        direction TB
        A2["┌──────────────────────────────┐<br/>│  ‟beli bensin gocap”          │<br/>│                               │<br/>│  ┌─ Hasil baca AI ──────────┐ │<br/>│  │ Nominal    Rp 50.000  ✎  │ │<br/>│  │ Jenis      Pengeluaran ✎ │ │<br/>│  │ Kategori   Transport   ✎ │ │<br/>│  │ Dompet     Tunai       ✎ │ │<br/>│  │ Tanggal    Hari ini    ✎ │ │<br/>│  └──────────────────────────┘ │<br/>│                               │<br/>│  [ Batal ]    [ SIMPAN ✓ ]    │<br/>│  ↳ Ubah ke form manual        │<br/>└──────────────────────────────┘"]
    end

    subgraph W3["③ Laporan & Anggaran"]
        direction TB
        A3["┌──────────────────────────────┐<br/>│  ‹ Sep 2026 ›     [Minggu|Bulan]│<br/>│  ▁▃▅▂▇▄▁ tren harian          │<br/>│                               │<br/>│  ANGGARAN                     │<br/>│  Makan     ▓▓▓▓▓▓░░ 620/800rb │<br/>│  Transport ▓▓▓▓▓▓▓▓ 310/300rb⚠│<br/>│                               │<br/>│  ╭ Ringkasan AI ─────────────╮│<br/>│  │ Transport naik 40% dari   ││<br/>│  │ rata-rata 4 minggu lalu.  ││<br/>│  │ Saran: naikkan pagu ke    ││<br/>│  │ Rp 350rb atau kurangi 2   ││<br/>│  │ perjalanan/minggu.        ││<br/>│  ╰───────────────────────────╯│<br/>│  [ Ekspor CSV ]               │<br/>└──────────────────────────────┘"]
    end

    W1 -->|"kirim input teks/suara"| W2
    W2 -->|"simpan ✓"| W1
    W1 -->|"tab 📊"| W3
    W3 -->|"kembali"| W1
</pre>

Tiga layar di atas adalah alur paling penting dalam aplikasi. Dua hal yang dijaga: kolom input selalu berada di posisi yang mudah dijangkau ibu jari di semua layar, dan kartu konfirmasi tidak pernah bisa dilewati lewat jalur mana pun.

### g. Gantt-Chart Pengerjaan Proyek (1 Semester / 12 Pertemuan)

| Kegiatan | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Brainstorming & riset masalah | █ | █ |  |  |  |  |  |  |  |  |  |  |
| Analisis kompetitor & validasi ide |  | █ | █ |  |  |  |  |  |  |  |  |  |
| Perancangan SDLC (use case, FR, ERD) |  |  | █ | █ |  |  |  |  |  |  |  |  |
| Desain UI/UX (Lo-Fi → Hi-Fi) |  |  |  | █ | █ |  |  |  |  |  |  |  |
| Setup repositori, CI/CD & papan Kanban |  |  |  | █ |  |  |  |  |  |  |  |  |
| Iterasi 1 — Auth, skema DB, CRUD manual |  |  |  |  | █ | █ |  |  |  |  |  |  |
| Iterasi 2 — AI baca teks & konfirmasi |  |  |  |  |  | █ | █ | █ |  |  |  |  |
| Iterasi 3 — Dashboard, anggaran, laporan |  |  |  |  |  |  |  | █ | █ |  |  |  |
| Iterasi 4 — Voice input & PWA/offline |  |  |  |  |  |  |  |  | █ | █ |  |  |
| Iterasi 5 — Insight & deteksi anomali |  |  |  |  |  |  |  |  |  | █ | █ |  |
| Pengujian (unit, integrasi, UAT) |  |  |  |  |  |  | █ |  |  | █ | █ |  |
| Deployment & evaluasi akurasi model |  |  |  |  |  |  |  |  |  |  | █ | █ |
| Dokumentasi & presentasi akhir |  |  |  |  |  |  |  |  |  |  | █ | █ |

<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
</script>
