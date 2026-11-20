---
title: Migrasi ke Azure (Fase 2)
---

# Migrasi ke Azure (Fase 2) dengan Azure for Students

Tutorial ini menyalakan **AI baca transaksi (parse)**, **suara ke teks (STT)**, dan **ringkasan mingguan versi AI** di Production memakai langganan **Azure for Students**. Setelah itu ada bagian opsional untuk memindahkan hosting dari Vercel ke **Azure Container Apps**.

Ada dua jalur yang hasilnya sama, jadi pilih salah satu:
- **[Jalur GUI](#4-jalur-gui-portal-web)**: semua langkah lewat browser (Azure Portal + Microsoft Foundry).
- **[Jalur CLI](#5-jalur-cli-azure-cli)**: semua langkah lewat Azure CLI, bisa disalin sebagai skrip.

> **Kode tidak perlu diubah.** Azure OpenAI punya **API v1** yang kompatibel dengan OpenAI (`https://<resource>.openai.azure.com/openai/v1/`). Centsible sudah punya jalur `openai-compatible` untuk AI teks dan Whisper, jadi cukup mengganti **variabel env**. Jangan isi `AI_TEXT_PROVIDER=azure`, karena nilai itu dicadangkan untuk login tanpa kunci dan belum diimplementasikan.

## Daftar isi

1. [Apa saja yang tersedia di Azure for Students](#1-apa-saja-yang-tersedia-di-azure-for-students)
2. [Gambaran & keputusan](#2-gambaran--keputusan)
3. [Nama & nilai yang dipakai](#3-nama--nilai-yang-dipakai)
4. [Jalur GUI (portal web)](#4-jalur-gui-portal-web)
5. [Jalur CLI (Azure CLI)](#5-jalur-cli-azure-cli)
6. [Uji coba di komputer sendiri](#6-uji-coba-di-komputer-sendiri)
7. [Nyalakan di Production (Vercel)](#7-nyalakan-di-production-vercel)
8. [Biaya & pengaman kredit](#8-biaya--pengaman-kredit)
9. [Masalah umum](#9-masalah-umum)
10. [Rollback & bersih-bersih](#10-rollback--bersih-bersih)
11. [Verifikasi terhadap dokumentasi](#11-verifikasi-terhadap-dokumentasi)

---

## 1. Apa saja yang tersedia di Azure for Students

Azure for Students memberi **kredit (±US$100, berlaku 12 bulan, tanpa kartu kredit)**. Semua pemakaian dipotong dari kredit itu. Kalau kredit habis, resource **dihentikan**, bukan ditagih, kecuali kamu sendiri meng-upgrade ke Pay-As-You-Go. Langganan ini juga punya beberapa batasan:

| Kebutuhan Centsible | Di Azure for Students | Catatan |
|---|---|---|
| **AI Parse** (`gpt-4.1-mini`) | ✅ Tersedia | Langganan baru atau berbasis kredit biasanya berada di **quota tier "Free tier" (Tier 0)**. Tier ini menyediakan `gpt-4.1-mini` Global Standard sampai **200K TPM / 200 RPM**, jauh di atas kebutuhan uji coba |
| `gpt-5-mini` | ✅ Tersedia (Tier 0: 500K TPM) | Model *reasoning*, jadi **kode perlu diubah** (lihat [9. Masalah umum](#9-masalah-umum)). Belum dipakai |
| `gpt-4o-mini` | ⚠️ Belum tentu | Tidak tercantum di tabel Tier 0. Pakai `gpt-4.1-mini` |
| **AI STT** (`whisper`, `gpt-4o-mini-transcribe`) | ⚠️ **Kemungkinan tidak ada kuota** | Model transkripsi tidak tercantum di tabel Tier 0, dan **Tier 0 tidak bisa mengajukan tambah kuota**. Cek di langganan kamu (langkah 4.3/5.3). Kalau kuotanya 0, pakai **Speaches di Container Apps** (rencana B) |
| Model Claude di Foundry | ❌ | Langganan *student* dan *credit-based* tidak didukung untuk model Claude |
| Global **Batch** | ❌ (N/A) | Tidak dipakai Centsible |
| **Container Apps** | ✅ | Gratis per bulan per langganan: 180.000 vCPU-detik, 360.000 GiB-detik, 2 juta request. Selebihnya dipotong dari kredit |
| **Container Registry** Basic | ✅ | Berbayar kecil (dipotong dari kredit) |
| **Region** | ⚠️ Bisa dibatasi | Sebagian langganan Students dibatasi ke beberapa region lewat Azure Policy. Gejalanya error `RequestDisallowedByAzure`/`RequestDisallowedByPolicy` saat membuat resource. Lihat daftar region yang diizinkan di Portal → **Policy → Assignments** |

> Isi tabel kuota diambil dari dokumentasi Microsoft per 20 Nov 2026. Tier dan kuota ditentukan per langganan, jadi **selalu cek langganan kamu sendiri** di langkah 4.3 (GUI) atau 5.3 (CLI) sebelum memutuskan jalur STT.

---

## 2. Gambaran & keputusan

**Tingkat migrasi.** **Tingkat A sudah cukup** untuk uji coba pengguna (#37).

| | Tingkat A: **AI di Azure, aplikasi tetap di Vercel** (disarankan) | Tingkat B: **semuanya di Azure** |
|---|---|---|
| Yang dipindah | AI Parse, STT, ringkasan AI | + hosting aplikasi & cron |
| Perubahan repo | **Tidak ada** | `Dockerfile` + `output: "standalone"` |
| Biaya dari kredit | Sangat kecil (bayar per token) | + Container Apps & ACR |

**Jalur STT.**

| | Rencana A: **Azure OpenAI** (`gpt-4o-mini-transcribe`/`whisper`) | Rencana B: **Speaches di Container Apps** |
|---|---|---|
| Syarat | Langganan punya kuota model transkripsi | Tidak ada syarat kuota AI |
| Kualitas | Lebih baik untuk bahasa campuran | Sama dengan lokal (`faster-whisper-small`) |
| Biaya | Per menit audio, sangat kecil | Per detik CPU selama container hidup |
| Perubahan kode | Tidak ada | Tidak ada (Speaches juga OpenAI-compatible) |

```
Tingkat A                                         Tingkat B
Browser ─► Vercel (Next.js) ─► Supabase           Browser ─► Container App "centsible" ─► Supabase
              ├─► Azure OpenAI  (deployment parse)               ├─► Azure OpenAI (parse [+ stt])
              └─► STT: Azure OpenAI (stt)                        ├─► Container App "speaches" (rencana B)
                   atau Container App "speaches"                 └─ Container Apps Job (cron) ─► /api/cron/weekly
```

---

## 3. Nama & nilai yang dipakai

Nama berikut dipakai di kedua jalur. Nama resource Azure OpenAI dan ACR harus **unik global**, jadi tambahkan akhiran sendiri kalau sudah dipakai orang.

| Apa | Nilai di tutorial |
|---|---|
| Resource group | `rg-centsible` |
| Region aplikasi (Tingkat B) | `japaneast`, satu region dengan Supabase dan Vercel `hnd1` |
| Resource Azure OpenAI | `centsible-ai` → endpoint `https://centsible-ai.openai.azure.com/` |
| Region Azure OpenAI | `japaneast`. Kalau diblokir policy atau model tidak tersedia, pilih region lain yang diizinkan. Karena memakai Global Standard, latensinya tetap wajar |
| Deployment AI Parse | `parse` (model `gpt-4.1-mini`, versi `2025-04-14`, Global Standard) |
| Deployment STT (rencana A) | `stt` (model `gpt-4o-mini-transcribe` atau `whisper`) |
| Container App STT (rencana B) | `speaches` |
| Container Apps environment | `cae-centsible` |
| Container App aplikasi (Tingkat B) | `centsible` |
| Job cron (Tingkat B) | `job-weekly` |

**Base URL** untuk Centsible = endpoint + `openai/v1/` → `https://centsible-ai.openai.azure.com/openai/v1/`.

---

## 4. Jalur GUI (portal web)

### 4.1 Aktifkan Azure for Students

1. Buka https://azure.microsoft.com/free/students dan daftar dengan email kampus `@mail.ugm.ac.id`.
2. Setelah aktif, buka https://portal.azure.com → cari **Subscriptions**. Harus ada langganan **Azure for Students**.
3. Cek sisa kredit: https://www.microsoftazuresponsorships.com/balance

### 4.2 Resource group & resource Azure OpenAI

1. Portal → **Resource groups → Create** → Subscription: *Azure for Students*, Name: `rg-centsible`, Region: `Japan East` → **Review + create → Create**.
2. Portal → cari **Azure OpenAI → Create**:
   - Resource group: `rg-centsible` · Region: `Japan East` · Name: `centsible-ai` · Pricing tier: **Standard S0**
   - Network: *All networks* (Vercel tidak punya IP tetap)
   - **Review + create → Create**. Kalau muncul error policy/region, ulangi dengan region yang diizinkan (bagian 1).
3. Buka resource → **Keys and Endpoint**. Catat **Endpoint** dan **KEY 1**. KEY 1 rahasia, jadi simpan di password manager dan jangan di-commit.

### 4.3 Cek kuota langganan

1. Buka https://ai.azure.com (Microsoft Foundry) dan pilih resource `centsible-ai`.
2. Buka **Quota** (di Foundry: *Management center → Quota*, atau menu **Quota** di kiri).
3. Filter region resource kamu dan cari baris:
   - `gpt-4.1-mini` · Global Standard: harus ada limit (> 0) → **AI Parse aman**.
   - `gpt-4o-mini-transcribe` / `whisper`: kalau **0 atau tidak ada**, STT pakai **rencana B (4.6)**.

### 4.4 Deploy AI Parse

1. Foundry → **Model catalog** → cari **`gpt-4.1-mini`** → **Deploy → Custom settings**:
   - **Deployment name:** `parse` (ini yang diisi ke `AI_TEXT_MODEL`, bukan nama model)
   - **Deployment type:** **Global Standard**
   - **Model version:** `2025-04-14`
   - **Tokens per Minute Rate Limit:** 30K–50K (cukup untuk uji coba, sisa kuota tidak terpakai)
   - **Deploy**.
2. Uji di **Playground** (Chat): ketik "Balas: ok". Kalau dijawab, deployment siap.

### 4.5 Deploy AI STT, rencana A (kalau ada kuota)

1. **Model catalog** → cari **`gpt-4o-mini-transcribe`** (atau `whisper`) → **Deploy → Custom settings**:
   - **Deployment name:** `stt` · **Deployment type:** Global Standard (atau Standard kalau hanya itu yang muncul)
2. Kalau tombol Deploy menyatakan kuota tidak cukup, lanjut ke **4.6**.
3. Uji dengan curl di [6. Uji coba](#6-uji-coba-di-komputer-sendiri).

### 4.6 Deploy AI STT, rencana B (Speaches di Container Apps)

1. Portal → cari **Container Apps → Create**.
2. **Basics:** Resource group `rg-centsible`, Name `speaches`, Region `Japan East`, Container Apps environment **Create new** → `cae-centsible` (Consumption only).
3. **Container:**
   - Hapus centang **Use quickstart image**.
   - **Image source:** *Docker Hub or other registries* · **Image type:** *Public*
   - **Registry login server:** `ghcr.io` · **Image and tag:** `speaches-ai/speaches:0.8.3-cpu`
   - **CPU and Memory:** `2 CPU cores, 4 Gi memory` (model `small` di CPU butuh RAM ±2 GB)
   - **Environment variables:**

     | Name | Source | Value |
     |---|---|---|
     | `API_KEY` | Manual entry (nanti dipindah ke secret, langkah 6) | buat acak: `openssl rand -hex 24` |
     | `PRELOAD_MODELS` | Manual entry | `["Systran/faster-whisper-small"]` |
     | `ENABLE_UI` | Manual entry | `false` |
4. **Ingress:** Enabled · *Accepting traffic from anywhere* · Target port **8000**.
5. **Review + create → Create**. Setelah jadi, buka app → **Overview** → salin **Application Url** (`https://speaches.<acak>.japaneast.azurecontainerapps.io`).
6. **Amankan kunci:** app → **Settings → Secrets → Add** `speaches-key` = nilai API_KEY. Lalu **Containers → Edit and deploy** → ubah env `API_KEY` menjadi *Reference a secret* → `speaches-key` → **Create**.
7. **Scale:** app → **Scale** → Min replicas **1** selama uji coba (supaya rekaman pertama tidak timeout karena container sedang bangun dan mengunduh model), Max **1**. Setelah uji coba selesai, ubah Min ke **0**.
8. Cek: buka `https://<Application Url>/health` di browser. Harus `OK`.

Nilai env STT untuk rencana B:
```env
AI_STT_BASE_URL=https://speaches.<acak>.japaneast.azurecontainerapps.io/v1
AI_STT_MODEL=Systran/faster-whisper-small
AI_STT_API_KEY=<API_KEY speaches>
```

### 4.7 Budget alert

Portal → **Cost Management → Budgets → Add** → scope langganan, jumlah **US$20**, alert email di 50%, 80%, dan 100%.

### 4.8 (Opsional, Tingkat B) Hosting aplikasi di Container Apps lewat GUI

Persiapan repo dulu (lihat [Persiapan repo untuk Docker](#persiapan-repo-untuk-docker-sekali-hanya-tingkat-b) di bawah), commit, dan push ke `main`.

1. **Container Registry:** Portal → **Container registries → Create** → `rg-centsible`, nama `centsibleacr<angka>`, Region Japan East, Pricing plan **Basic** → Create. Lalu buka registry → **Settings → Access keys** → aktifkan **Admin user**. Ini cara paling sederhana untuk jalur GUI; versi lebih aman memakai managed identity di jalur CLI.
2. **Build image tanpa Docker lokal:** buka **Cloud Shell** (ikon `>_` di bar atas portal, pilih Bash), lalu jalankan:
   ```bash
   az acr build -r centsibleacr<angka> -t centsible:v1 \
     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
     --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
     https://github.com/gadicandra/Senior-Project_Centsible.git#main
   ```
   ACR mengambil kode langsung dari GitHub dan membangunnya di Azure.
3. **Container App:** Portal → **Container Apps → Create** → Name `centsible`, environment `cae-centsible`.
   - **Container:** Image source **Azure Container Registry** → registry, image `centsible`, tag `v1` · CPU `0.5`, Memory `1 Gi`.
   - **Environment variables:** isi semua env Production (tabel di [7](#7-nyalakan-di-production-vercel) + `DATABASE_URL`, `SUPABASE_SECRET_KEY`, `AI_DRAFT_SECRET`, `AI_PARSE_DAILY_LIMIT`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
   - **Ingress:** Enabled, anywhere, Target port **3000** → Create.
   - Setelah jadi: **Secrets** → tambahkan semua nilai rahasia, lalu **Edit and deploy** → ubah env rahasia ke *Reference a secret* (sama seperti 4.6 langkah 6).
4. **Cron:** Portal → **Container App Jobs → Create** → Name `job-weekly`, environment `cae-centsible`, **Trigger type: Scheduled**, Cron expression `0 23 * * 0` (UTC = Senin 06:00 WIB).
   - **Container:** Image source *Docker Hub or other registries*, Public, server `docker.io`, image `curlimages/curl:8.11.1`, CPU 0.25 / 0.5 Gi.
   - **Command override:** `/bin/sh` · **Arguments override:** `-c, curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/weekly"`
   - Env: `APP_URL` = `https://<Application Url centsible>`, `CRON_SECRET` (jadikan secret seperti di atas).
   - Uji: buka job → **Run now** → **Execution history** harus *Succeeded*.
5. Lanjutkan ke [Pindah ke Tingkat B](#pindah-ke-tingkat-b-kedua-jalur).

---

## 5. Jalur CLI (Azure CLI)

Semua perintah di bawah bisa dijalankan di terminal laptop atau di **Cloud Shell** portal.

### 5.1 Pasang CLI & login

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash     # Ubuntu/Debian
az login
az account list -o table                                   # cari "Azure for Students"
az account set --subscription "Azure for Students"
```

### 5.2 Variabel, resource group, resource Azure OpenAI

```bash
RG=rg-centsible
LOC=japaneast            # region aplikasi (Tingkat B)
AI_LOC=japaneast         # region Azure OpenAI; ganti kalau diblokir policy
AI=centsible-ai          # unik global

az group create -n $RG -l $LOC

az cognitiveservices account create -g $RG -n $AI -l $AI_LOC \
  --kind OpenAI --sku S0 --custom-domain $AI

az cognitiveservices account show -g $RG -n $AI --query properties.endpoint -o tsv
# → https://centsible-ai.openai.azure.com/
AI_KEY=$(az cognitiveservices account keys list -g $RG -n $AI --query key1 -o tsv)
```

> Kalau keluar `RequestDisallowedByAzure`/`RequestDisallowedByPolicy`, lihat region yang diizinkan:
> `az policy assignment list --query "[].{nama:displayName, param:parameters}" -o json`

### 5.3 Cek tier & kuota

```bash
SUB=$(az account show --query id -o tsv)
az rest --method get --url "https://management.azure.com/subscriptions/$SUB/providers/Microsoft.CognitiveServices/quotaTiers/default?api-version=2025-10-01-preview" \
  --query properties.currentTierName -o tsv              # mis. "Free-Tier"

# Limit kuota per model di region itu
az cognitiveservices usage list -l $AI_LOC \
  --query "[?contains(name.value,'gpt-4.1-mini') || contains(name.value,'transcribe') || contains(name.value,'whisper')].{kuota:name.value, limit:limit, terpakai:currentValue}" -o table

# Model & versi yang bisa di-deploy di region itu
az cognitiveservices model list -l $AI_LOC \
  --query "[?model.name=='gpt-4.1-mini' || model.name=='gpt-4o-mini-transcribe' || model.name=='whisper'].{model:model.name, versi:model.version, sku:join(',', model.skus[].name)}" -o table
```

Kalau limit transkripsi **0 atau tidak muncul**, STT pakai **rencana B (5.6)**.

### 5.4 Deploy AI Parse

```bash
az cognitiveservices account deployment create -g $RG -n $AI \
  --deployment-name parse \
  --model-name gpt-4.1-mini --model-version 2025-04-14 --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 50      # 50 = 50K TPM

curl -s https://$AI.openai.azure.com/openai/v1/chat/completions \
  -H "Content-Type: application/json" -H "api-key: $AI_KEY" \
  -d '{"model":"parse","messages":[{"role":"user","content":"Balas: ok"}],"max_tokens":5}'
```

### 5.5 Deploy AI STT, rencana A (kalau ada kuota)

Isi versi dan SKU sesuai keluaran `model list` di 5.3:
```bash
az cognitiveservices account deployment create -g $RG -n $AI \
  --deployment-name stt \
  --model-name gpt-4o-mini-transcribe --model-version <versi> --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 1

curl -s https://$AI.openai.azure.com/openai/v1/audio/transcriptions -H "api-key: $AI_KEY" \
  -F file=@rekaman.wav -F model=stt -F language=id -F "prompt=gocap, ceban, goceng, 25rb, kos"
```

### 5.6 Deploy AI STT, rencana B (Speaches di Container Apps)

```bash
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait

az containerapp env create -g $RG -n cae-centsible -l $LOC

STT_KEY=$(openssl rand -hex 24); echo "$STT_KEY"         # simpan di password manager
az containerapp create -g $RG -n speaches --environment cae-centsible \
  --image ghcr.io/speaches-ai/speaches:0.8.3-cpu \
  --target-port 8000 --ingress external \
  --cpu 2 --memory 4Gi --min-replicas 1 --max-replicas 1 \
  --secrets speaches-key="$STT_KEY" \
  --env-vars API_KEY=secretref:speaches-key ENABLE_UI=false \
             'PRELOAD_MODELS=["Systran/faster-whisper-small"]'

STT_URL=https://$(az containerapp show -g $RG -n speaches --query properties.configuration.ingress.fqdn -o tsv)
curl -sf $STT_URL/health && echo
curl -s $STT_URL/v1/audio/transcriptions -H "Authorization: Bearer $STT_KEY" \
  -F file=@rekaman.wav -F model=Systran/faster-whisper-small -F language=id
```

Setelah uji coba selesai: `az containerapp update -g $RG -n speaches --min-replicas 0` (hemat kredit, tetapi rekaman pertama setelah sepi bisa gagal karena container sedang bangun).

### 5.7 Budget alert

Budget dengan alert email paling mudah dibuat di portal, jadi ikuti [4.7](#47-budget-alert). Ini cukup sekali per langganan.

### 5.8 (Opsional, Tingkat B) Hosting aplikasi di Container Apps lewat CLI

Persiapan repo dulu (lihat [Persiapan repo untuk Docker](#persiapan-repo-untuk-docker-sekali-hanya-tingkat-b) di bawah).

```bash
ACR=centsibleacr$RANDOM                                   # unik global
az acr create -g $RG -n $ACR --sku Basic -l $LOC
TAG=$(git rev-parse --short HEAD)
az acr build -r $ACR -t centsible:$TAG \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… .

az containerapp create -g $RG -n centsible --environment cae-centsible \
  --image $ACR.azurecr.io/centsible:$TAG --registry-server $ACR.azurecr.io \
  --registry-identity system \
  --target-port 3000 --ingress external \
  --min-replicas 1 --max-replicas 2 --cpu 0.5 --memory 1Gi \
  --secrets \
     database-url='<DATABASE_URL>' supabase-secret='<SUPABASE_SECRET_KEY>' \
     ai-key="$AI_KEY" stt-key='<AI_STT_API_KEY>' draft-secret='<AI_DRAFT_SECRET>' cron-secret='<CRON_SECRET>' \
  --env-vars \
     NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
     DATABASE_URL=secretref:database-url SUPABASE_SECRET_KEY=secretref:supabase-secret \
     AI_TEXT_PROVIDER=openai-compatible AI_TEXT_MODEL=parse \
     AI_TEXT_BASE_URL=https://$AI.openai.azure.com/openai/v1/ AI_TEXT_API_KEY=secretref:ai-key \
     AI_STT_ENABLED=true AI_STT_BASE_URL='<base URL STT>' AI_STT_MODEL='<stt | Systran/faster-whisper-small>' \
     AI_STT_API_KEY=secretref:stt-key \
     AI_DRAFT_SECRET=secretref:draft-secret AI_PARSE_DAILY_LIMIT=100 CRON_SECRET=secretref:cron-secret

APP=https://$(az containerapp show -g $RG -n centsible --query properties.configuration.ingress.fqdn -o tsv)

az containerapp job create -g $RG -n job-weekly --environment cae-centsible \
  --trigger-type Schedule --cron-expression "0 23 * * 0" \
  --replica-timeout 300 --replica-retry-limit 1 --parallelism 1 --replica-completion-count 1 \
  --image curlimages/curl:8.11.1 --cpu 0.25 --memory 0.5Gi \
  --secrets cron-secret='<CRON_SECRET>' --env-vars CRON_SECRET=secretref:cron-secret APP_URL=$APP \
  --command "/bin/sh" --args "-c" 'curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/weekly"'

az containerapp job start -g $RG -n job-weekly
az containerapp job execution list -g $RG -n job-weekly -o table
```

> `--registry-identity system` membuat *managed identity* untuk app dan otomatis memberinya peran `AcrPull`, jadi admin user ACR tidak perlu diaktifkan. `--secrets` + `secretref:` membuat nilai rahasia tidak tampil di konfigurasi. Cron Container Apps dievaluasi dalam **UTC**.

---

### Persiapan repo untuk Docker (sekali, hanya Tingkat B)

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

### Pindah ke Tingkat B (kedua jalur)

1. **Supabase → Authentication → URL Configuration:** tambahkan `https://<fqdn-centsible>/**`. Ubah *Site URL* kalau domain utama pindah.
2. **Uji** sesuai [7](#7-nyalakan-di-production-vercel) langkah 5 di URL Container App.
3. **Matikan Vercel Cron** supaya ringkasan tidak dibuat dua kali: hapus blok `crons` di `vercel.json` lewat PR.
4. **CI/CD (opsional):** job GitHub Actions `az acr build` lalu `az containerapp update --image …:$SHA` setelah tes lulus, login memakai OIDC (`azure/login`).

---

## 6. Uji coba di komputer sendiri

Ubah `.env.local`. Simpan nilai lamanya kalau mau kembali ke gateway/Speaches lokal.

```env
# --- AI Parse (Azure OpenAI v1) ---
AI_TEXT_PROVIDER=openai-compatible
AI_TEXT_BASE_URL=https://centsible-ai.openai.azure.com/openai/v1/
AI_TEXT_MODEL=parse                 # nama DEPLOYMENT
AI_TEXT_API_KEY=<KEY 1 Azure OpenAI>

# --- AI STT: rencana A (Azure OpenAI) ---
AI_STT_ENABLED=true
AI_STT_BASE_URL=https://centsible-ai.openai.azure.com/openai/v1/
AI_STT_MODEL=stt
AI_STT_API_KEY=<KEY 1 Azure OpenAI>

# --- atau rencana B (Speaches di Container Apps) ---
# AI_STT_BASE_URL=https://speaches.<acak>.japaneast.azurecontainerapps.io/v1
# AI_STT_MODEL=Systran/faster-whisper-small
# AI_STT_API_KEY=<API_KEY speaches>
```

```bash
pnpm dev
```

1. **Parse:** tekan **+**, ketik *"bayar kos 850k senin lalu via bca"* → kartu konfirmasi Rp 850.000 · Kos.
2. **STT:** tekan mikrofon, ucapkan *"makan siang dua puluh lima ribu"* → kartu Rp 25.000 · Makan.
3. **Akurasi:** `pnpm eval:ai`, lalu commit `eval/results/parse.md`. Targetnya **≥ 85%**; hasil sebelumnya (Claude Haiku 4.5) 88,9%.
4. **Ringkasan AI:** `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/weekly` → `"ai": 1` atau lebih.

Uji STT langsung tanpa aplikasi, rencana A:
```bash
curl https://centsible-ai.openai.azure.com/openai/v1/audio/transcriptions -H "api-key: <KEY>" \
  -F file=@rekaman.wav -F model=stt -F language=id -F "prompt=gocap, ceban, goceng, 25rb, kos"
```

---

## 7. Nyalakan di Production (Vercel)

1. **Vercel** → project → **Settings → Environment Variables**, tambahkan untuk **Preview** dulu:

   | Nama | Nilai | Sensitif |
   |---|---|---|
   | `AI_TEXT_PROVIDER` | `openai-compatible` | |
   | `AI_TEXT_BASE_URL` | `https://centsible-ai.openai.azure.com/openai/v1/` | |
   | `AI_TEXT_MODEL` | `parse` | |
   | `AI_TEXT_API_KEY` | KEY 1 Azure OpenAI | ✅ |
   | `AI_STT_ENABLED` | `true` | |
   | `AI_STT_BASE_URL` | rencana A: base URL Azure · rencana B: `https://speaches…/v1` | |
   | `AI_STT_MODEL` | `stt` · atau `Systran/faster-whisper-small` | |
   | `AI_STT_API_KEY` | KEY Azure · atau API_KEY speaches | ✅ |

   `AI_DRAFT_SECRET`, `AI_PARSE_DAILY_LIMIT`, dan `CRON_SECRET` **sudah ada**, jadi jangan diubah.
2. **Redeploy Preview** (env baru hanya terbaca saat build): Deployments → ⋯ → **Redeploy**.
3. Uji di URL Preview: kalimat, suara, dan form manual.
4. Ulangi untuk **Production**, lalu redeploy.
5. **Smoke test:** catat 3 transaksi lewat kalimat dan 1 lewat suara dari HP. Di Vercel **Logs** tidak boleh ada `ai_fallback` `code: "env"` maupun 5xx. Senin berikutnya, cek kartu "Ringkasan minggu lalu".
6. **Tutup issue** #28 (suara) dan #32 (ringkasan AI).

---

## 8. Biaya & pengaman kredit

| Item | Perkiraan uji coba (±10–20 pengguna, 14 hari) |
|---|---|
| `gpt-4.1-mini` (parse + ringkasan) | Sangat kecil: ±1–2 ribu token per kalimat, ratusan kalimat per hari tetap di bawah ±US$1/hari |
| STT rencana A | Per menit audio, rekaman ≤ 30 detik → sangat kecil |
| STT rencana B (Speaches, 2 vCPU, min 1) | **Paling boros.** Container hidup 24 jam melewati kuota gratis 180.000 vCPU-detik dalam ±1 hari, sisanya dipotong dari kredit. Turunkan ke min 0 setelah uji coba |
| Container Apps aplikasi (Tingkat B) | 0,5 vCPU min 1: sebagian kecil kredit |
| ACR Basic | Beberapa dolar per bulan |

Angka di atas hanya perkiraan. Hitung ulang dengan *Azure Pricing Calculator*, dan pantau **Cost Management → Cost analysis** setiap beberapa hari.

**Pengaman:** `AI_PARSE_DAILY_LIMIT=100` per pengguna per hari, budget alert US$20 (4.7), dan hapus semua resource setelah selesai (bagian 10).

---

## 9. Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| `RequestDisallowedByAzure` / `…ByPolicy` saat membuat resource | Region dibatasi policy langganan Students | Pakai region yang diizinkan (Portal → Policy → Assignments) |
| Deploy model gagal karena kuota (`InsufficientQuota`) | Tier 0: model tidak ada kuotanya | Pakai `gpt-4.1-mini` untuk parse; STT rencana B. Tier 0 **tidak bisa** mengajukan tambah kuota |
| Kalimat selalu jatuh ke form manual, log `ai_fallback` `code: "env"` | Env AI belum terbaca | Cek ejaan env, lalu **redeploy** |
| Log `invalid_env` `AI_TEXT_BASE_URL` | URL bukan https | Harus `https://…/openai/v1/` |
| 404 `DeploymentNotFound` | Env diisi nama model | Isi **nama deployment** (`parse`, `stt`) |
| 400 `unsupported_parameter` soal `max_tokens`/`temperature` | Deployment memakai model *reasoning* (`gpt-5-mini`, `o4-mini`) | Pakai `gpt-4.1-mini`. Kalau harus GPT-5: di `src/server/ai/providers/openai-compatible.ts` dan `src/server/ai/weekly.ts` ganti `max_tokens` → `max_completion_tokens` (±2000), hapus `temperature`, tambah `reasoning_effort` (`"minimal"` untuk `gpt-5-mini`; `"none"` untuk 5.1+), lalu `pnpm eval:ai` |
| 401 | Kunci salah / `AI_STT_API_KEY` kosong | Isi kunci di kedua env kunci |
| 429 | TPM deployment habis | Naikkan rate limit deployment (masih dalam kuota), atau tunggu 1 menit |
| STT 404 (rencana A) | Region/deployment belum melayani audio lewat v1 | Pakai rencana B |
| Mikrofon: "sedang tidak tersedia", rencana B | Container Speaches sedang bangun/unduh model (timeout 20 detik) | Min replicas 1 selama uji coba; cek `/health` |
| Ringkasan mingguan masih templat (`"ai": 0`) | AI gagal / env tidak terbaca | Cek log, lalu curl cron (bagian 6) |
| Resource berhenti mendadak | Kredit Students habis | Cek saldo; hapus resource yang tidak dipakai |

---

## 10. Rollback & bersih-bersih

- **Tingkat A:** di Vercel, kosongkan `AI_TEXT_PROVIDER` dan isi `AI_STT_ENABLED=false`, lalu redeploy. Aplikasi kembali ke form manual dan tidak ada data yang hilang.
- **Tingkat B:** aktifkan lagi Vercel Cron dan arahkan pengguna kembali ke URL Vercel.
- **Hapus semuanya** setelah uji coba: GUI → Resource groups → `rg-centsible` → **Delete resource group**; CLI → `az group delete -n rg-centsible --yes`. Resource Azure OpenAI yang dihapus masuk *soft-delete*. Kalau ingin memakai nama yang sama lagi, purge dulu: `az cognitiveservices account purge -g rg-centsible -n centsible-ai -l japaneast`.

Data pengguna tetap di Supabase, jadi rollback tidak berisiko kehilangan data.

---

## 11. Verifikasi terhadap dokumentasi

Dicek ke Microsoft Learn, OpenAI, dan Speaches (lewat Context7) pada **20 November 2026**.

| Klaim | Status | Sumber |
|---|---|---|
| Base URL v1 `…/openai/v1/`, `api-key`, `model` = nama deployment, tanpa `api-version` | ✅ | Azure OpenAI v1 API |
| `/openai/v1/audio/transcriptions` menerima `file`, `model`, `language`, `prompt`, `response_format` | ✅ | REST reference Azure OpenAI |
| Quota tier: Tier 0 (Free tier) = `gpt-4.1-mini` 200K TPM, `gpt-5-mini` 500K, `o4-mini` 100K; Tier 0 tidak bisa menambah kuota | ✅ | *Azure OpenAI quotas and limits* |
| Model transkripsi tidak tercantum di Tier 0 | ⚠️ disimpulkan dari tabel; cek langganan sendiri | idem |
| Claude di Foundry tidak tersedia untuk langganan student/kredit | ✅ | *Claude models hosting comparison* |
| Global Batch: Azure for Students N/A | ✅ | *Quotas and limits — Global batch* |
| Container Apps gratis 180K vCPU-s, 360K GiB-s, 2 juta request per langganan per bulan | ✅ | *Container Apps billing* |
| Pembatasan region via policy untuk Students | ⚠️ dari pengalaman umum, tidak tertulis di docs yang dicek | *RequestDisallowedByPolicy* |
| `az cognitiveservices account create --kind OpenAI --sku S0 --custom-domain` | ✅ | Quickstart Azure OpenAI CLI |
| `az cognitiveservices account deployment create --sku-name GlobalStandard --sku-capacity` | ✅ | *Automate quota deployments* |
| `az cognitiveservices usage list` / `model list`, `quotaTiers` via `az rest` | ✅ | *Quotas and limits* |
| Portal Container Apps: *Docker Hub or other registries*, Ingress target port, Secrets + *Reference a secret* | ✅ | Container Apps quickstart (portal) |
| `--registry-identity system` (AcrPull otomatis), `--secrets` + `secretref:` | ✅ | Container Apps managed identity / secrets |
| Jobs `--trigger-type Schedule`, cron dalam **UTC** | ✅ | *Jobs in Azure Container Apps* |
| `az acr build` dari konteks Git URL | ✅ | ACR Tasks quickstart |
| Speaches: `API_KEY`, `PRELOAD_MODELS`, `ENABLE_UI`, port 8000, `/health` | ✅ | `speaches-ai/speaches` config & installation |
| Reasoning models: `max_completion_tokens`, tanpa `temperature`; `reasoning_effort: none` hanya 5.1+ | ✅ | *Reasoning models* |
| `gpt-4.1-mini 2025-04-14` pensiun 14 April 2027 | ✅ | *Model retirements* |

Kuota, region, dan tanggal pensiun bisa berubah. Cek ulang sebelum migrasi.
