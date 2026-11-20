---
title: Migrasi ke Azure (Fase 2)
---

# Migrasi ke Azure (Fase 2)

Tutorial ini menyalakan **AI baca transaksi (parse)**, **suara ke teks (STT)**, dan **ringkasan mingguan versi AI** di Production memakai Azure. Bagian terakhir membahas pemindahan hosting aplikasi dari Vercel ke **Azure Container Apps**.

> **Kabar baik: tidak perlu mengubah kode.** Azure OpenAI punya **API v1** yang kompatibel dengan OpenAI (`https://<resource>.openai.azure.com/openai/v1/`). Centsible sudah punya jalur `openai-compatible` untuk AI teks dan Whisper, jadi cukup mengganti **variabel env**.
>
> Jangan isi `AI_TEXT_PROVIDER=azure`. Nilai itu dicadangkan untuk login tanpa kunci (Managed Identity) dan belum diimplementasikan. Pakai `openai-compatible`.

## Daftar isi

1. [Gambaran & urutan kerja](#1-gambaran--urutan-kerja)
2. [Persiapan akun Azure](#2-persiapan-akun-azure)
3. [Membuat resource Azure OpenAI (Foundry)](#3-membuat-resource-azure-openai-foundry)
4. [Deploy model AI Parse](#4-deploy-model-ai-parse)
5. [Deploy model AI STT](#5-deploy-model-ai-stt)
6. [Uji coba di komputer sendiri](#6-uji-coba-di-komputer-sendiri)
7. [Nyalakan di Production (Vercel)](#7-nyalakan-di-production-vercel)
8. [Opsional: pindah hosting ke Azure Container Apps](#8-opsional-pindah-hosting-ke-azure-container-apps)
9. [Biaya & batas pemakaian](#9-biaya--batas-pemakaian)
10. [Masalah umum](#10-masalah-umum)
11. [Rollback](#11-rollback)

---

## 1. Gambaran & urutan kerja

Ada dua tingkat migrasi. **Tingkat A sudah cukup** untuk uji coba pengguna (#37).

| | Tingkat A: **AI di Azure, aplikasi tetap di Vercel** (disarankan dulu) | Tingkat B: **semuanya di Azure** |
|---|---|---|
| Yang dipindah | AI Parse, STT, ringkasan AI | + hosting aplikasi & cron |
| Perubahan kode | **Tidak ada** | `Dockerfile` + `output: "standalone"` |
| Waktu | ±1 jam | ±setengah hari |
| Bagian tutorial | 2–7 | 2–8 |

```
Tingkat A                                       Tingkat B
Browser ─► Vercel (Next.js) ─► Supabase         Browser ─► Container App (Next.js) ─► Supabase
              │                                                │
              └─► Azure OpenAI (gpt-4o-mini, whisper)          ├─► Azure OpenAI
                                                               └─ Container Apps Job (cron) ─► /api/cron/weekly
```

---

## 2. Persiapan akun Azure

1. **Buat akun.** Mahasiswa bisa memakai **Azure for Students** (kredit tanpa kartu kredit, daftar dengan email `@mail.ugm.ac.id`) di https://azure.microsoft.com/free/students
2. **Pasang Azure CLI** (dibutuhkan untuk bagian 8, opsional untuk bagian 3–7):
   ```bash
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   az login
   az account show --query "{nama:name, id:id}" -o table
   ```
3. **Buat Resource Group.** Satu wadah untuk semua resource Centsible, supaya mudah dihapus sekaligus:
   ```bash
   az group create --name rg-centsible --location japaneast
   ```
   > **Kenapa Japan East?** Database Supabase dan Vercel Functions ada di Tokyo. Aplikasi sangat sering bolak-balik ke database, jadi di Tingkat B aplikasinya **harus** satu region dengan database. Untuk Azure OpenAI region boleh berbeda (lihat bagian 3).

---

## 3. Membuat resource Azure OpenAI (Foundry)

1. Buka **https://ai.azure.com** (Microsoft Foundry) dan login.
2. **Create new** → pilih **Azure OpenAI resource** atau **Foundry resource**. Keduanya bisa.
   - **Subscription:** subscription kamu · **Resource group:** `rg-centsible`
   - **Name:** `centsible-ai` (dipakai di URL, harus unik global)
   - **Region:** pilih region yang **menyediakan model chat DAN model transkripsi sekaligus** (bagian 4–5).

     > Cara mengecek: di Foundry buka **Model catalog**, cari `whisper` (atau `gpt-4o-mini-transcribe`), klik **Deploy**. Dialognya menampilkan region dan tipe deployment yang tersedia untuk resource kamu. Kalau region pilihanmu tidak muncul, buat resource di region lain. Ketersediaan region berubah-ubah, jadi selalu cek di portal, jangan dari tutorial ini.

     Latensi dari Tokyo ke region lain hanya ±100–200 ms per panggilan AI, masih jauh di bawah batas waktu 8 detik.
3. Setelah jadi, buka resource → **Keys and Endpoint**. Catat:
   - **Endpoint:** `https://centsible-ai.openai.azure.com/`
   - **Key 1**: rahasia, simpan di password manager, jangan di-commit

**Base URL** yang dipakai Centsible adalah endpoint ditambah `openai/v1/`:
```
https://centsible-ai.openai.azure.com/openai/v1/
```
(Format `https://<nama>.services.ai.azure.com/openai/v1/` juga diterima.)

---

## 4. Deploy model AI Parse

AI Parse mengubah kalimat seperti *"beli bensin gocap kemarin"* menjadi JSON. Ringkasan mingguan memakai model yang sama.

1. Foundry → **Model catalog** → cari **`gpt-4o-mini`** → **Deploy**.
   - **Deployment name:** `parse` (nama ini yang dipakai sebagai `AI_TEXT_MODEL`, bukan nama model)
   - **Deployment type:** *Global Standard* (paling murah dan paling banyak kuotanya), atau *Standard* kalau datanya harus tetap di region itu
   - **Rate limit:** cukup 10–30K tokens per minute untuk uji coba
2. **Pilih model yang tepat:**

   | Model | Cocok? | Alasan |
   |---|---|---|
   | `gpt-4o-mini` | ✅ **disarankan** | Murah, cepat, mendukung *structured outputs* (`json_schema`), `temperature`, `max_tokens` |
   | `gpt-4.1-mini` / `gpt-4.1-nano` | ✅ | Sama-sama didukung, coba kalau akurasi kurang atau ingin lebih murah |
   | `o1`/`o3`/`o4-mini`, `gpt-5*` (model *reasoning*) | ❌ | Tidak menerima `max_tokens`/`temperature` dan lebih lambat. Kode memakai keduanya |

3. **Cek cepat** dari terminal (ganti `<KEY>`):
   ```bash
   curl https://centsible-ai.openai.azure.com/openai/v1/chat/completions \
     -H "Content-Type: application/json" -H "api-key: <KEY>" \
     -d '{"model":"parse","messages":[{"role":"user","content":"Balas: ok"}],"max_tokens":5}'
   ```
   Kalau berhasil, keluar JSON berisi `"content":"ok"`.

---

## 5. Deploy model AI STT

STT mengubah rekaman suara menjadi teks, lalu teks itu diproses AI Parse.

1. Foundry → **Model catalog** → cari **`whisper`** → **Deploy**.
   - **Deployment name:** `stt` (dipakai sebagai `AI_STT_MODEL`)
   - **Alternatif:** `gpt-4o-mini-transcribe`, biasanya lebih akurat untuk bahasa campuran. Pastikan endpoint `/audio/transcriptions`-nya menerima parameter `language` dan `prompt` (cek di halaman modelnya).
2. **Cek cepat** dengan rekaman apa saja (`.wav`, `.webm`, `.mp3`, maksimal 25 MB):
   ```bash
   curl https://centsible-ai.openai.azure.com/openai/v1/audio/transcriptions \
     -H "api-key: <KEY>" \
     -F file=@rekaman.wav -F model=stt -F language=id \
     -F "prompt=gocap, ceban, goceng, 25rb, kos"
   ```
   Hasilnya `{"text":"..."}`.

   > Butuh rekaman uji? Nyalakan Speaches lokal lalu pakai TTS-nya, atau rekam 5 detik dengan HP.
   >
   > Kalau curl ini menjawab **404**, berarti region/deployment itu belum melayani audio lewat API v1. Coba deployment di region lain, atau kabari tim. Kode perlu penyesuaian kecil kalau harus memakai path lama (`/openai/deployments/stt/audio/transcriptions?api-version=…`).

---

## 6. Uji coba di komputer sendiri

Sebelum menyentuh Production, buktikan dulu di laptop. Ubah `.env.local` (simpan nilai lamanya kalau mau kembali ke gateway/Speaches lokal):

```env
# --- AI Parse (Azure OpenAI v1, jalur openai-compatible) ---
AI_TEXT_PROVIDER=openai-compatible
AI_TEXT_BASE_URL=https://centsible-ai.openai.azure.com/openai/v1/
AI_TEXT_MODEL=parse                 # nama DEPLOYMENT, bukan nama model
AI_TEXT_API_KEY=<KEY Azure>

# --- AI STT (Whisper di Azure) ---
AI_STT_ENABLED=true
AI_STT_BASE_URL=https://centsible-ai.openai.azure.com/openai/v1/
AI_STT_MODEL=stt                    # nama DEPLOYMENT
AI_STT_API_KEY=<KEY Azure>          # WAJIB untuk Azure (Speaches lokal tidak butuh)
```

Lalu:

```bash
pnpm dev                    # http://localhost:3000
```

1. **Parse:** tekan **+**, ketik *"bayar kos 850k senin lalu via bca"*. Kartu konfirmasi harus muncul (Rp 850.000 · Kos).
2. **STT:** tekan mikrofon, ucapkan *"makan siang dua puluh lima ribu"*. Teks muncul, lalu kartu konfirmasi Rp 25.000 · Makan.
3. **Akurasi:** jalankan evaluasi dengan penyedia final. Hasilnya tertulis di `eval/results/parse.md`, commit file itu.
   ```bash
   pnpm eval:ai
   ```
   Target tetap **≥ 85%** nominal dan kategori. Hasil sebelumnya (Claude Haiku 4.5) 88,9%. Kalau gpt-4o-mini di bawah 85%, coba `gpt-4.1-mini`.
4. **Ringkasan mingguan versi AI** (butuh `CRON_SECRET` di `.env.local` dan ada transaksi minggu lalu):
   ```bash
   curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/weekly
   ```
   Respons `"ai": 1` atau lebih berarti ringkasan ditulis oleh AI, bukan templat.

---

## 7. Nyalakan di Production (Vercel)

1. **Vercel** → project `senior-project-centsible` → **Settings → Environment Variables**. Tambahkan untuk **Preview** dulu:

   | Nama | Nilai | Sensitif |
   |---|---|---|
   | `AI_TEXT_PROVIDER` | `openai-compatible` | |
   | `AI_TEXT_BASE_URL` | `https://centsible-ai.openai.azure.com/openai/v1/` | |
   | `AI_TEXT_MODEL` | `parse` | |
   | `AI_TEXT_API_KEY` | Key Azure | ✅ |
   | `AI_STT_ENABLED` | `true` | |
   | `AI_STT_BASE_URL` | `https://centsible-ai.openai.azure.com/openai/v1/` | |
   | `AI_STT_MODEL` | `stt` | |
   | `AI_STT_API_KEY` | Key Azure | ✅ |

   `AI_DRAFT_SECRET`, `AI_PARSE_DAILY_LIMIT`, dan `CRON_SECRET` **sudah ada**, jadi jangan diubah.
2. **Redeploy Preview.** Env baru hanya terbaca saat build. Caranya: Deployments → deploy Preview terbaru → ⋯ → **Redeploy**.
3. **Uji di URL Preview:** kalimat, suara (izinkan mikrofon, butuh https, dan Preview sudah https), lalu cek bahwa form manual tetap jalan.
4. Ulangi langkah 1–2 untuk **Production**.
5. **Smoke test Production:**
   - Catat 3 transaksi lewat kalimat dan 1 lewat suara di HP.
   - Vercel → **Logs**: tidak ada `ai_fallback` dengan `code: "env"` (artinya env belum terbaca) dan tidak ada 5xx.
   - Senin pagi berikutnya: cek kartu "Ringkasan minggu lalu" di Beranda, yang sekarang ditulis AI.
6. **Tutup issue** #28 (suara) dan #32 (ringkasan AI) dengan komentar hasil uji.

---

## 8. Opsional: pindah hosting ke Azure Container Apps

Lakukan ini hanya kalau memang ingin seluruh aplikasi di Azure (misalnya syarat mata kuliah). Untuk uji coba pengguna, **Tingkat A sudah cukup**.

### 8.1 Perubahan kecil di repo (sekali)

**a. `next.config.ts`**: tambahkan `output: "standalone"` supaya image Docker kecil:
```ts
const nextConfig: NextConfig = {
  output: "standalone",
  async headers() { /* … tetap … */ },
};
```

**b. `Dockerfile`** di root repo (pola resmi Next.js *with-docker*, disesuaikan untuk pnpm + Prisma):
```dockerfile
ARG NODE_VERSION=22-slim

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* dibaca saat BUILD, jadi wajib diberikan sebagai build arg (bukan rahasia).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm db:generate && pnpm build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir .next && chown node:node .next
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

**c. `.dockerignore`**: jangan sampai rahasia ikut masuk image:
```
node_modules
.next
.git
.env*
!.env.example
.agents
coverage
eval/results
```

Cek di laptop dulu:
```bash
docker build -t centsible:local \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… .
docker run --rm -p 3000:3000 --env-file .env.local centsible:local
```
Buka http://localhost:3000, lalu login dan catat satu transaksi.

### 8.2 Registry & build image

```bash
RG=rg-centsible; LOC=japaneast; ACR=centsibleacr$RANDOM   # nama ACR harus unik global
az acr create -g $RG -n $ACR --sku Basic -l $LOC
az acr build -r $ACR -t centsible:$(git rev-parse --short HEAD) \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… .
```
`az acr build` membangun image di Azure, jadi Docker di laptop tidak dipakai.

### 8.3 Container Apps environment & aplikasi

```bash
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

az containerapp env create -g $RG -n cae-centsible -l $LOC

TAG=$(git rev-parse --short HEAD)
az containerapp create -g $RG -n centsible --environment cae-centsible \
  --image $ACR.azurecr.io/centsible:$TAG --registry-server $ACR.azurecr.io \
  --registry-identity system \
  --target-port 3000 --ingress external \
  --min-replicas 1 --max-replicas 3 --cpu 0.5 --memory 1Gi \
  --secrets \
     database-url='<DATABASE_URL>' supabase-secret='<SUPABASE_SECRET_KEY>' \
     ai-key='<KEY Azure>' draft-secret='<AI_DRAFT_SECRET>' cron-secret='<CRON_SECRET>' \
  --env-vars \
     NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
     DATABASE_URL=secretref:database-url SUPABASE_SECRET_KEY=secretref:supabase-secret \
     AI_TEXT_PROVIDER=openai-compatible AI_TEXT_MODEL=parse \
     AI_TEXT_BASE_URL=https://centsible-ai.openai.azure.com/openai/v1/ AI_TEXT_API_KEY=secretref:ai-key \
     AI_STT_ENABLED=true AI_STT_MODEL=stt \
     AI_STT_BASE_URL=https://centsible-ai.openai.azure.com/openai/v1/ AI_STT_API_KEY=secretref:ai-key \
     AI_DRAFT_SECRET=secretref:draft-secret AI_PARSE_DAILY_LIMIT=100 CRON_SECRET=secretref:cron-secret

az containerapp show -g $RG -n centsible --query properties.configuration.ingress.fqdn -o tsv
```

> `--min-replicas 1` mencegah *cold start* (aplikasi tidur lalu bangun lambat). Kalau ingin hemat kredit, isi `0`, tapi permintaan pertama setelah sepi bisa butuh beberapa detik.
>
> Rahasia ditaruh di `--secrets`, lalu dirujuk dengan `secretref:`, jadi nilainya tidak tampil di konfigurasi. Versi yang lebih ketat memakai **Key Vault** + Managed Identity (`docs/arsitektur.md` §4).

### 8.4 Cron ringkasan mingguan (pengganti Vercel Cron)

Job kecil yang memanggil endpoint yang sama dengan Vercel Cron. Cron Container Apps memakai **UTC**, jadi `0 23 * * 0` sama dengan Senin 06:00 WIB.

```bash
APP=https://$(az containerapp show -g $RG -n centsible --query properties.configuration.ingress.fqdn -o tsv)
az containerapp job create -g $RG -n job-weekly --environment cae-centsible \
  --trigger-type Schedule --cron-expression "0 23 * * 0" \
  --replica-timeout 300 --replica-retry-limit 1 --parallelism 1 --replica-completion-count 1 \
  --image curlimages/curl:8.11.1 --cpu 0.25 --memory 0.5Gi \
  --secrets cron-secret='<CRON_SECRET>' --env-vars CRON_SECRET=secretref:cron-secret APP_URL=$APP \
  --command "/bin/sh" --args "-c" 'curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/weekly"'

az containerapp job start -g $RG -n job-weekly              # uji sekarang
az containerapp job execution list -g $RG -n job-weekly -o table
```
Job aman dijalankan berulang kali, karena ringkasan per minggu tidak pernah dobel.

### 8.5 Domain, Supabase, dan pemindahan

1. **Supabase → Authentication → URL Configuration:** tambahkan `https://<fqdn-container-app>/**` (dan domain kustom kalau ada). Ubah *Site URL* kalau domain utama pindah.
2. **Domain kustom (opsional):** `az containerapp hostname add` + sertifikat terkelola (Portal → Container App → *Custom domains*).
3. **Uji** sesuai bagian 7 langkah 5 di URL Container App.
4. **Matikan Vercel Cron** supaya ringkasan tidak dibuat dua kali: hapus blok `crons` di `vercel.json` (lewat PR), atau nonaktifkan cron di Dashboard Vercel.
5. **CI/CD:** tambahkan job di `.github/workflows/main.yml` yang menjalankan `az acr build` lalu `az containerapp update --image …:$SHA` setelah tes lulus di `main`. Login Azure dari GitHub Actions memakai OIDC (`azure/login`), tanpa menyimpan password.

---

## 9. Biaya & batas pemakaian

| Item | Perkiraan untuk uji coba (±10–20 pengguna, 14 hari) |
|---|---|
| gpt-4o-mini | Sangat kecil: satu kalimat ±1–2 ribu token, jadi ratusan kalimat per hari tetap di bawah ±US$1/hari |
| Whisper / transcribe | Dihitung per menit audio, rekaman ≤ 30 detik |
| Container Apps (Tingkat B) | Paket *Consumption* punya kuota gratis bulanan. `min-replicas 1` memakai sebagian kecil kredit |
| ACR Basic | ±US$5/bulan |

Angka di atas hanya perkiraan. Harga resmi ada di halaman *Azure OpenAI pricing*.

**Pengaman biaya:**
- `AI_PARSE_DAILY_LIMIT=100` membatasi panggilan AI per pengguna per hari (berlaku untuk parse dan suara).
- Azure Portal → **Cost Management → Budgets**: buat budget (misalnya US$20) dengan alert email di 50%, 80%, 100%.
- Setelah uji coba selesai, **hapus semuanya** dengan `az group delete -n rg-centsible`. Seluruh resource di grup itu ikut terhapus.

---

## 10. Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| Kalimat selalu jatuh ke form manual, log `ai_fallback` `code: "env"` | Env AI belum terbaca | Cek ejaan nama env, lalu **redeploy** |
| Log `invalid_env` `AI_TEXT_BASE_URL` | URL bukan https atau salah format | Harus `https://…/openai/v1/` |
| 404 `DeploymentNotFound` | `AI_TEXT_MODEL`/`AI_STT_MODEL` diisi nama model | Isi **nama deployment** (`parse`, `stt`) |
| 400 soal `max_tokens` / `temperature` | Deployment memakai model *reasoning* (o-series/gpt-5) | Ganti ke `gpt-4o-mini` / `gpt-4.1-mini` |
| 401 | Kunci salah, atau `AI_STT_API_KEY` kosong | Isi kunci Azure di kedua env kunci |
| 429 | Kuota tokens-per-minute deployment habis | Naikkan rate limit deployment, atau tunggu 1 menit |
| Mikrofon: "Input suara belum tersedia" | `AI_STT_ENABLED` bukan `true` atau env STT tidak valid | Cek ketiga env STT, lalu redeploy |
| Mikrofon: "Input suara sedang tidak tersedia" | Panggilan ke Whisper gagal | Coba curl bagian 5. 404 artinya region/deployment |
| Ringkasan mingguan masih templat (`"ai": 0`) | AI gagal atau env tidak terbaca di job | Cek log, lalu curl bagian 6 langkah 4 |
| Container App tidak bisa login Supabase | Redirect URL belum ditambahkan | Bagian 8.5 langkah 1 |

---

## 11. Rollback

- **Tingkat A:** di Vercel, hapus atau kosongkan `AI_TEXT_PROVIDER` dan isi `AI_STT_ENABLED=false`, lalu redeploy. Aplikasi kembali ke form manual dan tidak ada data yang hilang.
- **Tingkat B:** arahkan domain kembali ke Vercel, aktifkan lagi Vercel Cron, lalu matikan Container App (`az containerapp update --min-replicas 0 --max-replicas 0`) atau hapus resource group-nya.

Data pengguna tetap di Supabase dan tidak ikut dipindah, jadi rollback tidak berisiko kehilangan data.
