---
title: Migrasi ke Azure (Fase 2)
---

# Migrasi ke Azure (Fase 2)

Tutorial ini menyalakan tiga hal di Production memakai Azure: **AI Parse** (kalimat → transaksi, sekaligus ringkasan mingguan), **AI STT** (suara → teks), dan opsional **deploy aplikasi** ke Azure Container Apps.

Setiap langkah punya dua alur yang hasilnya sama, jadi pilih salah satu:
- **[Alur Portal](#4-alur-portal-web)**: lewat browser di https://portal.azure.com dan https://ai.azure.com
- **[Alur CLI](#5-alur-azure-cli)**: lewat Azure CLI, bisa disalin sebagai skrip

> **Kode tidak perlu diubah.** Azure OpenAI punya **API v1** yang kompatibel dengan OpenAI (`https://<resource>.openai.azure.com/openai/v1/`). Centsible sudah memakai jalur `openai-compatible` untuk AI teks dan Whisper, jadi cukup mengganti **variabel env**. Jangan isi `AI_TEXT_PROVIDER=azure`, karena nilai itu dicadangkan untuk login tanpa kunci dan belum diimplementasikan.

## Daftar isi

1. [Hasil pengecekan langganan Azure](#1-hasil-pengecekan-langganan-azure)
2. [Keputusan: langganan, region, model](#2-keputusan-langganan-region-model)
3. [Nama & nilai yang dipakai](#3-nama--nilai-yang-dipakai)
4. [Alur Portal (web)](#4-alur-portal-web)
5. [Alur Azure CLI](#5-alur-azure-cli)
6. [Persiapan repo untuk Docker (khusus deploy)](#6-persiapan-repo-untuk-docker-khusus-deploy)
7. [Uji coba di komputer sendiri](#7-uji-coba-di-komputer-sendiri)
8. [Nyalakan di Production](#8-nyalakan-di-production)
9. [Biaya & pengaman](#9-biaya--pengaman)
10. [Masalah umum](#10-masalah-umum)
11. [Rollback & bersih-bersih](#11-rollback--bersih-bersih)
12. [Sumber & verifikasi](#12-sumber--verifikasi)

---

## 1. Hasil pengecekan langganan Azure

Dicek dengan Azure CLI pada **27 November 2026**. Akun kampus terhubung ke dua langganan di dua tenant berbeda.

### 1.1 DTETI-LabIT (langganan departemen)

| Cek | Hasil |
|---|---|
| Status | Enabled |
| Akses akun | Hanya di resource group **`Resource_Group_25-27`** (lokasi RG `japanwest`). Di dalam RG semua aksi boleh (`*`), **kecuali** menulis/menghapus *role assignment* (`Microsoft.Authorization/*/Write`) dan menghapus RG itu sendiri. Tidak ada izin di level langganan |
| Isi RG | Kosong |
| Resource provider | `Microsoft.CognitiveServices`, `Microsoft.App`, `Microsoft.ContainerRegistry`, `Microsoft.OperationalInsights` **sudah Registered** |
| Policy region | **Tidak ada**, semua region boleh |
| Quota tier & kuota per model | **Tidak bisa dibaca** (403 dan hasil kosong), karena butuh izin level langganan. Kuota baru ketahuan saat deploy |

Model yang bisa di-deploy (`az cognitiveservices model list`):

| Region | `gpt-4.1-mini` (parse) | Model STT |
|---|---|---|
| `japaneast` | ✅ Standard, Global Standard | ❌ (`whisper` terdaftar tanpa SKU) |
| `southeastasia` | ✅ Global Standard | ❌ |
| `japanwest` | ❌ | ❌ |
| **`southindia`** | ✅ Standard, Global Standard | ✅ `whisper` Standard, `gpt-4o-mini-transcribe` & `gpt-4o-transcribe` & `gpt-transcribe` Global Standard |
| `eastus2`, `swedencentral` | ✅ | ✅ |

### 1.2 Azure for Students (langganan pribadi, kredit ±US$100)

| Cek | Hasil |
|---|---|
| Status | Enabled, akun = pemilik langganan |
| Policy region | **Dibatasi** ke `indonesiacentral`, `centralindia`, `eastasia`, `japaneast`, `uaenorth`. Region lain ditolak `RequestDisallowedByPolicy` |
| Resource provider | Keempat provider di atas **NotRegistered**, jadi harus didaftarkan dulu (gratis) |
| Quota tier & kuota | Belum terbaca karena provider belum terdaftar |

| Region (yang diizinkan) | `gpt-4.1-mini` | Model STT |
|---|---|---|
| `japaneast` | ✅ Standard, Global Standard | ❌ |
| **`uaenorth`** | ✅ Global Standard | ✅ `whisper` Standard, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, `gpt-transcribe` |
| `eastasia`, `centralindia` | Hanya Provisioned (mahal) | ❌ |
| `indonesiacentral` | Azure OpenAI tidak tersedia | ❌ |

### 1.3 Catatan dari dokumentasi Microsoft

- **Kredit ≠ kuota.** Kredit membayar pemakaian, sedangkan kuota (token per menit) membatasi berapa banyak yang boleh di-deploy per model per region. Kalau kuota model 0, deploy gagal (`InsufficientQuota`) walaupun kredit masih ada.
- Langganan berbasis kredit bisa berada di **quota tier "Free tier" (Tier 0)**. Tabel Tier 0 mencantumkan `gpt-4.1-mini` Global Standard 200K TPM; Tier 0 **tidak bisa** mengajukan tambah kuota.
- Model Claude di Foundry tidak tersedia untuk langganan *student/credit-based*. Centsible tidak memakainya di Azure.
- Jadwal pensiun (dari `model list`): `whisper 001` 26 Feb 2027 · `gpt-4.1-mini 2025-04-14` 14 Apr 2027 · `gpt-4o-mini-transcribe 2025-12-15` 15 Jun 2027 · `gpt-transcribe 2026-07-28` 1 Feb 2028.

---

## 2. Keputusan: langganan, region, model

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Langganan | **DTETI-LabIT** (utama), Azure for Students (cadangan) | Provider sudah terdaftar, region bebas, kredit pribadi tidak terpakai. **Minta izin admin lab dulu** bahwa RG boleh dipakai untuk proyek ini |
| Region Azure OpenAI | **`southindia`** (cadangan Students: `uaenorth`) | Satu-satunya region dekat yang punya model parse **dan** STT, jadi cukup satu resource dan satu kunci. Tambahan latensi dari Tokyo ±100 ms, jauh di bawah timeout 8 detik |
| Model parse | **`gpt-4.1-mini` 2025-04-14**, Global Standard | Bukan model *reasoning*, jadi `temperature` dan `max_tokens` di kode tetap valid. Mendukung *structured outputs* |
| Model STT | **`gpt-4o-mini-transcribe` 2025-12-15**, Global Standard (alternatif `whisper` Standard) | Lebih akurat untuk bahasa campuran dan pensiun lebih lambat dari `whisper`. Menerima `language`, `prompt`, `response_format` sama seperti Whisper |
| Hosting aplikasi | **Tetap di Vercel** (Tingkat A). Container Apps opsional (Tingkat B) | Tingkat A sudah cukup untuk uji coba #37 |
| Region Container Apps (Tingkat B) | `japaneast` | Satu region dengan Supabase (Tokyo). Region resource tidak harus sama dengan lokasi RG |
| Tarik image dari ACR (Tingkat B) | **Admin user ACR** (username/password) | Di DTETI-LabIT akun tidak boleh membuat *role assignment*, sehingga `--registry-identity system` (butuh peran `AcrPull`) akan gagal |

```
Tingkat A (disarankan)                         Tingkat B (opsional)
Browser ─► Vercel (Next.js) ─► Supabase        Browser ─► Container App "centsible" (japaneast) ─► Supabase
              │                                              ├─► Azure OpenAI (southindia)
              └─► Azure OpenAI (southindia)                  └─ Job "job-weekly" (cron) ─► /api/cron/weekly
                   ├─ deployment "parse"
                   └─ deployment "stt"
```

---

## 3. Nama & nilai yang dipakai

| Apa | Nilai |
|---|---|
| Langganan | `DTETI-LabIT` |
| Resource group | `Resource_Group_25-27` (sudah ada, **jangan** dibuat baru) |
| Resource Azure OpenAI | `centsible-ai-<inisial>`, misalnya `centsible-ai-gac` (harus unik global, dipakai di URL) |
| Region Azure OpenAI | `southindia` |
| Deployment parse | `parse` → `gpt-4.1-mini` 2025-04-14 |
| Deployment STT | `stt` → `gpt-4o-mini-transcribe` 2025-12-15 |
| Container Registry (Tingkat B) | `centsibleacr<angka>` (unik global, huruf kecil dan angka saja) |
| Container Apps environment (Tingkat B) | `cae-centsible` di `japaneast` |
| Container App & job (Tingkat B) | `centsible`, `job-weekly` |

**Base URL** untuk Centsible = endpoint + `openai/v1/` → `https://centsible-ai-gac.openai.azure.com/openai/v1/`.

---

## 4. Alur Portal (web)

### 4.1 Pilih langganan

1. Buka https://portal.azure.com dan login dengan akun `@365.ugm.ac.id`.
2. Klik ikon ⚙️ **Settings** (kanan atas) → **Directories + subscriptions** → pilih direktori departemen. Pastikan filter langganan memuat **DTETI-LabIT**.
3. Cari **Resource groups** → `Resource_Group_25-27` harus muncul.

### 4.2 Buat resource Azure OpenAI

1. Cari **Azure OpenAI** → **Create**.
2. **Basics:**
   - Subscription `DTETI-LabIT` · Resource group `Resource_Group_25-27`
   - Region **South India** · Name `centsible-ai-gac` · Pricing tier **Standard S0**
3. **Network:** *All networks, including the internet* (Vercel tidak punya IP tetap).
4. **Review + submit → Create**, tunggu ±1 menit.
5. Buka resource → **Resource Management → Keys and Endpoint**. Catat **Endpoint** dan **KEY 1**. KEY 1 rahasia: simpan di password manager, jangan di-commit, jangan ditempel di chat.

### 4.3 Deploy model AI Parse

1. Di halaman resource klik **Go to Foundry portal** (atau buka https://ai.azure.com dan pilih resource `centsible-ai-gac`).
2. **Model catalog** → cari **`gpt-4.1-mini`** → **Deploy → Custom settings**:
   - **Deployment name:** `parse`, yang nanti diisi ke `AI_TEXT_MODEL` (bukan nama model)
   - **Deployment type:** Global Standard
   - **Model version:** `2025-04-14`
   - **Tokens per Minute Rate Limit:** 50K
3. **Deploy**. Kalau muncul pesan kuota tidak cukup, turunkan TPM (mis. 10K) lalu coba lagi.
4. Uji di **Playground → Chat**, pilih deployment `parse`, ketik "Balas: ok".

### 4.4 Deploy model AI STT

1. **Model catalog** → cari **`gpt-4o-mini-transcribe`** → **Deploy → Custom settings**:
   - **Deployment name:** `stt` · **Deployment type:** Global Standard · **Version:** `2025-12-15`
2. **Deploy**. Kalau gagal karena kuota, coba **`whisper`** (Deployment type **Standard**) dengan nama yang sama `stt`.
3. Uji dengan curl di [7. Uji coba](#7-uji-coba-di-komputer-sendiri). Playground audio tidak dibutuhkan.

### 4.5 Budget alert

Portal → **Cost Management → Budgets** → ganti **Scope** ke `Resource_Group_25-27` → **Add**:
- Amount US$20, Reset period Monthly
- Alert conditions: Actual 50%, 80%, 100% → email kamu

### 4.6 Nyalakan di Vercel

Lanjutkan ke [8. Nyalakan di Production](#8-nyalakan-di-production). Kalau hanya Tingkat A, selesai di sini.

### 4.7 (Tingkat B) Deploy aplikasi ke Container Apps

Selesaikan dulu [6. Persiapan repo](#6-persiapan-repo-untuk-docker-khusus-deploy), merge ke `main`.

**a. Container Registry**
1. Cari **Container registries → Create** → RG `Resource_Group_25-27`, Registry name `centsibleacr<angka>`, Location **Japan East**, Pricing plan **Basic** → **Review + create → Create**.
2. Buka registry → **Settings → Access keys** → aktifkan **Admin user**. Catat *Login server*, *Username*, dan *password*.

**b. Build image (tanpa Docker di laptop)**
1. Klik ikon **Cloud Shell** `>_` di bar atas portal → pilih **Bash** → *No storage account required* → pilih langganan **DTETI-LabIT**.
2. Jalankan:
   ```bash
   az acr build -r centsibleacr<angka> -t centsible:v1 \
     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
     --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
     https://github.com/gadicandra/Senior-Project_Centsible.git#main
   ```
   ACR mengambil kode dari GitHub dan membangunnya di Azure (±3–5 menit).

**c. Container App**
1. Cari **Container Apps → Create**.
2. **Basics:** RG `Resource_Group_25-27`, Name `centsible`, Region **Japan East**, Container Apps environment **Create new** → `cae-centsible`, *Consumption only*.
3. **Container:** hapus centang *Use quickstart image* →
   - Image source **Azure Container Registry** → registry `centsibleacr<angka>`, Image `centsible`, Tag `v1`
   - Authentication: **Admin credentials**
   - CPU and memory **0.5 CPU, 1 Gi**
   - Environment variables: sementara isi yang **tidak rahasia** saja (tabel [8.1](#81-vercel-tingkat-a) baris tanpa ✅, ditambah `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `AI_PARSE_DAILY_LIMIT=100`)
4. **Ingress:** Enabled · *Accepting traffic from anywhere* · Target port **3000**.
5. **Review + create → Create**.
6. Setelah jadi: **Settings → Secrets → Add**: `database-url`, `supabase-secret`, `ai-key`, `draft-secret`, `cron-secret`.
7. **Application → Containers → Edit and deploy** → container → **Environment variables** → tambahkan `DATABASE_URL`, `SUPABASE_SECRET_KEY`, `AI_TEXT_API_KEY`, `AI_STT_API_KEY`, `AI_DRAFT_SECRET`, `CRON_SECRET` dengan Source **Reference a secret** → **Save → Create**.
8. **Application → Scale:** Min replicas 1, Max 2 (min 1 menghindari *cold start*).
9. **Overview → Application Url**, buka di browser lalu login.

**d. Cron ringkasan mingguan**
1. Cari **Container App Jobs → Create** → RG yang sama, Name `job-weekly`, environment `cae-centsible`.
2. **Trigger type:** Scheduled · Cron expression `0 23 * * 0` (dievaluasi dalam **UTC** = Senin 06:00 WIB).
3. **Container:** Image source *Docker Hub or other registries* · Public · Registry `docker.io` · Image `curlimages/curl:8.11.1` · CPU 0.25 / 0.5 Gi
   - **Command override:** `/bin/sh`
   - **Arguments override:** `-c, curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/weekly"`
   - Env `APP_URL` = Application Url `centsible`; `CRON_SECRET` sebagai secret (sama seperti langkah c.6–7)
4. Create → buka job → **Run now** → **Execution history** harus *Succeeded*.

Lanjut ke [8.2 Pindah ke Tingkat B](#82-pindah-ke-tingkat-b).

---

## 5. Alur Azure CLI

Bisa di terminal laptop atau di **Cloud Shell** portal.

### 5.1 Login & pilih langganan

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash          # sekali, Ubuntu/Debian
az login --tenant <tenant-departemen>                           # tenant DTETI
az account list --all -o table                                  # harus ada DTETI-LabIT
az account set --subscription "DTETI-LabIT"
```

### 5.2 Variabel

```bash
RG=Resource_Group_25-27
AI=centsible-ai-gac          # unik global
AI_LOC=southindia
APP_LOC=japaneast            # khusus Tingkat B
```

### 5.3 Cek ketersediaan model (opsional, sudah dirangkum di bagian 1)

```bash
az cognitiveservices model list -l $AI_LOC \
  --query "[?model.name=='gpt-4.1-mini' || model.name=='gpt-4o-mini-transcribe' || model.name=='whisper'].{model:model.name, versi:model.version, sku:join(',', model.skus[].name)}" -o table
```

### 5.4 Buat resource Azure OpenAI

```bash
az cognitiveservices account create -g $RG -n $AI -l $AI_LOC \
  --kind OpenAI --sku S0 --custom-domain $AI --yes

az cognitiveservices account show -g $RG -n $AI --query properties.endpoint -o tsv
AI_KEY=$(az cognitiveservices account keys list -g $RG -n $AI --query key1 -o tsv)
```

### 5.5 Deploy AI Parse

```bash
az cognitiveservices account deployment create -g $RG -n $AI \
  --deployment-name parse \
  --model-name gpt-4.1-mini --model-version 2025-04-14 --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 50          # 50 = 50K TPM

curl -s https://$AI.openai.azure.com/openai/v1/chat/completions \
  -H "Content-Type: application/json" -H "api-key: $AI_KEY" \
  -d '{"model":"parse","messages":[{"role":"user","content":"Balas: ok"}],"max_tokens":5}'
```

`InsufficientQuota` → ulangi dengan `--sku-capacity 10`.

### 5.6 Deploy AI STT

```bash
az cognitiveservices account deployment create -g $RG -n $AI \
  --deployment-name stt \
  --model-name gpt-4o-mini-transcribe --model-version 2025-12-15 --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 10

# Cadangan kalau gagal: whisper (Standard)
# az cognitiveservices account deployment create -g $RG -n $AI --deployment-name stt \
#   --model-name whisper --model-version 001 --model-format OpenAI --sku-name Standard --sku-capacity 1

az cognitiveservices account deployment list -g $RG -n $AI \
  --query "[].{nama:name, model:properties.model.name, versi:properties.model.version, status:properties.provisioningState}" -o table

curl -s https://$AI.openai.azure.com/openai/v1/audio/transcriptions -H "api-key: $AI_KEY" \
  -F file=@rekaman.wav -F model=stt -F language=id -F "prompt=gocap, ceban, goceng, 25rb, kos"
```

### 5.7 Budget alert (scope resource group)

```bash
az consumption budget create --resource-group $RG --budget-name centsible-20usd \
  --amount 20 --category cost --time-grain monthly \
  --start-date $(date +%Y-%m-01) --end-date $(date -d '+1 year' +%Y-%m-01)
```
Alert email paling mudah ditambahkan di Portal → Cost Management → Budgets → `centsible-20usd` → *Alert conditions*.

### 5.8 (Tingkat B) Deploy aplikasi ke Container Apps

Selesaikan dulu [6. Persiapan repo](#6-persiapan-repo-untuk-docker-khusus-deploy).

```bash
az extension add --name containerapp --upgrade

# Registry + build image di Azure
ACR=centsibleacr$RANDOM
az acr create -g $RG -n $ACR -l $APP_LOC --sku Basic --admin-enabled true
TAG=$(git rev-parse --short HEAD)
az acr build -r $ACR -t centsible:$TAG \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… .
ACR_PASS=$(az acr credential show -n $ACR --query "passwords[0].value" -o tsv)

# Environment
az containerapp env create -g $RG -n cae-centsible -l $APP_LOC

# Aplikasi (rahasia lewat --secrets + secretref:)
az containerapp create -g $RG -n centsible --environment cae-centsible \
  --image $ACR.azurecr.io/centsible:$TAG \
  --registry-server $ACR.azurecr.io --registry-username $ACR --registry-password "$ACR_PASS" \
  --target-port 3000 --ingress external \
  --min-replicas 1 --max-replicas 2 --cpu 0.5 --memory 1Gi \
  --secrets \
     database-url='<DATABASE_URL>' supabase-secret='<SUPABASE_SECRET_KEY>' \
     ai-key="$AI_KEY" draft-secret='<AI_DRAFT_SECRET>' cron-secret='<CRON_SECRET>' \
  --env-vars \
     NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
     DATABASE_URL=secretref:database-url SUPABASE_SECRET_KEY=secretref:supabase-secret \
     AI_TEXT_PROVIDER=openai-compatible AI_TEXT_MODEL=parse \
     AI_TEXT_BASE_URL=https://$AI.openai.azure.com/openai/v1/ AI_TEXT_API_KEY=secretref:ai-key \
     AI_STT_ENABLED=true AI_STT_MODEL=stt \
     AI_STT_BASE_URL=https://$AI.openai.azure.com/openai/v1/ AI_STT_API_KEY=secretref:ai-key \
     AI_DRAFT_SECRET=secretref:draft-secret AI_PARSE_DAILY_LIMIT=100 CRON_SECRET=secretref:cron-secret

APP=https://$(az containerapp show -g $RG -n centsible --query properties.configuration.ingress.fqdn -o tsv)
echo $APP

# Cron mingguan (UTC)
az containerapp job create -g $RG -n job-weekly --environment cae-centsible \
  --trigger-type Schedule --cron-expression "0 23 * * 0" \
  --replica-timeout 300 --replica-retry-limit 1 --parallelism 1 --replica-completion-count 1 \
  --image curlimages/curl:8.11.1 --cpu 0.25 --memory 0.5Gi \
  --secrets cron-secret='<CRON_SECRET>' --env-vars CRON_SECRET=secretref:cron-secret APP_URL=$APP \
  --command "/bin/sh" --args "-c" 'curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/weekly"'

az containerapp job start -g $RG -n job-weekly
az containerapp job execution list -g $RG -n job-weekly -o table
```

**Update versi berikutnya:**
```bash
TAG=$(git rev-parse --short HEAD)
az acr build -r $ACR -t centsible:$TAG --build-arg … .
az containerapp update -g $RG -n centsible --image $ACR.azurecr.io/centsible:$TAG
```

> Di langganan **Azure for Students** (kamu pemilik langganan) boleh memakai `--registry-identity system` sebagai ganti admin user, yang lebih aman karena tanpa password. Di DTETI-LabIT opsi itu gagal karena butuh izin membuat *role assignment*.

Lanjut ke [8.2 Pindah ke Tingkat B](#82-pindah-ke-tingkat-b).

### 5.9 Cadangan: memakai Azure for Students

Jalankan hanya kalau DTETI-LabIT tidak boleh dipakai atau kuotanya habis.

```bash
az account set --subscription "Azure for Students"
for p in Microsoft.CognitiveServices Microsoft.App Microsoft.ContainerRegistry Microsoft.OperationalInsights; do
  az provider register -n $p --wait
done
az group create -n rg-centsible -l japaneast
RG=rg-centsible; AI_LOC=uaenorth      # region yang diizinkan policy DAN punya model STT
```
Setelah itu ulangi 5.4–5.8. Untuk alur Portal caranya sama: buat RG `rg-centsible` (Japan East), lalu resource Azure OpenAI di **UAE North**.

---

## 6. Persiapan repo untuk Docker (khusus deploy)

Hanya dibutuhkan untuk Tingkat B. Buat lewat PR biasa.

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

---

## 7. Uji coba di komputer sendiri

Ubah `.env.local`. Simpan nilai lamanya kalau mau kembali ke gateway/Speaches lokal.

```env
AI_TEXT_PROVIDER=openai-compatible
AI_TEXT_BASE_URL=https://centsible-ai-gac.openai.azure.com/openai/v1/
AI_TEXT_MODEL=parse                 # nama DEPLOYMENT
AI_TEXT_API_KEY=<KEY 1>

AI_STT_ENABLED=true
AI_STT_BASE_URL=https://centsible-ai-gac.openai.azure.com/openai/v1/
AI_STT_MODEL=stt                    # nama DEPLOYMENT
AI_STT_API_KEY=<KEY 1>              # wajib untuk Azure
```

```bash
pnpm dev
```

1. **Parse:** tekan **+**, ketik *"bayar kos 850k senin lalu via bca"* → kartu konfirmasi Rp 850.000 · Kos.
2. **STT:** tekan mikrofon, ucapkan *"makan siang dua puluh lima ribu"* → teks muncul, lalu kartu Rp 25.000 · Makan.
3. **Akurasi:** `pnpm eval:ai`, lalu commit `eval/results/parse.md`. Target **≥ 85%** nominal dan kategori (hasil sebelumnya, Claude Haiku 4.5: 88,9%).
4. **Ringkasan AI:** `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/weekly` → `"ai": 1` atau lebih.

Uji STT tanpa aplikasi (rekaman `.wav`/`.webm`/`.mp3`, maks 25 MB):
```bash
curl https://centsible-ai-gac.openai.azure.com/openai/v1/audio/transcriptions -H "api-key: <KEY 1>" \
  -F file=@rekaman.wav -F model=stt -F language=id -F "prompt=gocap, ceban, goceng, 25rb, kos"
# → {"text":"..."}
```

---

## 8. Nyalakan di Production

### 8.1 Vercel (Tingkat A)

1. Vercel → project → **Settings → Environment Variables**, tambahkan untuk **Preview** dulu:

   | Nama | Nilai | Sensitif |
   |---|---|---|
   | `AI_TEXT_PROVIDER` | `openai-compatible` | |
   | `AI_TEXT_BASE_URL` | `https://centsible-ai-gac.openai.azure.com/openai/v1/` | |
   | `AI_TEXT_MODEL` | `parse` | |
   | `AI_TEXT_API_KEY` | KEY 1 | ✅ |
   | `AI_STT_ENABLED` | `true` | |
   | `AI_STT_BASE_URL` | `https://centsible-ai-gac.openai.azure.com/openai/v1/` | |
   | `AI_STT_MODEL` | `stt` | |
   | `AI_STT_API_KEY` | KEY 1 | ✅ |

   `AI_DRAFT_SECRET`, `AI_PARSE_DAILY_LIMIT`, dan `CRON_SECRET` sudah ada, jadi jangan diubah.
2. **Redeploy Preview** (env baru hanya terbaca saat build): Deployments → ⋯ → **Redeploy**.
3. Uji di URL Preview: kalimat, suara (izinkan mikrofon), dan form manual.
4. Ulangi untuk **Production**, lalu redeploy.
5. **Smoke test:** 3 transaksi lewat kalimat dan 1 lewat suara dari HP. Di Vercel **Logs** tidak boleh ada `ai_fallback` `code: "env"` maupun 5xx. Senin berikutnya cek kartu "Ringkasan minggu lalu".
6. Tutup issue **#28** (suara) dan **#32** (ringkasan AI) dengan hasil uji.

### 8.2 Pindah ke Tingkat B

1. **Supabase → Authentication → URL Configuration:** tambahkan `https://<fqdn-centsible>/**`. Ubah *Site URL* kalau domain utama pindah.
2. Ulangi smoke test 8.1 langkah 5 di URL Container App.
3. **Matikan Vercel Cron** supaya ringkasan tidak dibuat dua kali: hapus blok `crons` di `vercel.json` lewat PR.
4. (Opsional) CI/CD: job GitHub Actions yang menjalankan `az acr build` lalu `az containerapp update --image …:$SHA` setelah tes lulus, login dengan OIDC (`azure/login`).

---

## 9. Biaya & pengaman

| Item | Perkiraan uji coba (±10–20 pengguna, 14 hari) |
|---|---|
| `gpt-4.1-mini` (parse + ringkasan) | ±1–2 ribu token per kalimat; ratusan kalimat per hari tetap < ±US$1/hari |
| `gpt-4o-mini-transcribe` | Dihitung per durasi audio; rekaman ≤ 30 detik → sangat kecil |
| Container Apps (Tingkat B) | Gratis per langganan per bulan: 180.000 vCPU-detik, 360.000 GiB-detik, 2 juta request. Aplikasi 0,5 vCPU dengan min 1 replika melewati kuota gratis setelah ±4 hari, sisanya kecil |
| ACR Basic | Beberapa dolar per bulan |

Angka di atas perkiraan; hitung ulang di *Azure Pricing Calculator* dan pantau **Cost Management → Cost analysis** (scope RG).

**Pengaman:** `AI_PARSE_DAILY_LIMIT=100` per pengguna per hari (parse + suara), TPM deployment yang kecil, dan budget alert US$20.

---

## 10. Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| `AuthorizationFailed` di level langganan | Akses DTETI-LabIT hanya di RG | Selalu sertakan `-g Resource_Group_25-27`; jangan membuat RG baru |
| `RequestDisallowedByPolicy` | Region di luar daftar (khusus Students) | Pakai `japaneast` / `uaenorth` |
| `InsufficientQuota` saat deploy model | Kuota model di region itu kurang/0 | Turunkan TPM; STT coba `whisper` Standard; atau region lain (`eastus2`, `swedencentral`) |
| `--registry-identity system` gagal (role assignment) | Akun tidak boleh membuat *role assignment* | Pakai admin user ACR (5.8) |
| Kalimat selalu ke form manual, log `ai_fallback` `code: "env"` | Env belum terbaca | Cek ejaan, lalu **redeploy** |
| Log `invalid_env` `AI_TEXT_BASE_URL` | URL bukan https / salah format | Harus `https://…/openai/v1/` |
| 404 `DeploymentNotFound` | Env berisi nama model | Isi **nama deployment** (`parse`, `stt`) |
| 400 `unsupported_parameter` (`max_tokens`/`temperature`) | Deployment memakai model *reasoning* (`gpt-5*`, `o*`) | Pakai `gpt-4.1-mini`. Kalau harus GPT-5: di `src/server/ai/providers/openai-compatible.ts` dan `src/server/ai/weekly.ts` ganti `max_tokens` → `max_completion_tokens` (±2000), hapus `temperature`, tambah `reasoning_effort` (`"minimal"` untuk `gpt-5-mini`, `"none"` untuk 5.1+), lalu `pnpm eval:ai` |
| 401 | Kunci salah / `AI_STT_API_KEY` kosong | Isi KEY 1 di kedua env kunci |
| 429 | TPM deployment habis | Naikkan rate limit (Foundry → Deployments → Edit) atau tunggu 1 menit |
| STT 404 | Deployment `stt` belum *Succeeded* atau salah resource | `az cognitiveservices account deployment list …` |
| Ringkasan mingguan masih templat (`"ai": 0`) | AI gagal / env tidak terbaca di job | Cek log, lalu curl cron (bagian 7) |
| Login gagal di Container App | Redirect URL belum ditambahkan | 8.2 langkah 1 |

---

## 11. Rollback & bersih-bersih

- **Tingkat A:** di Vercel kosongkan `AI_TEXT_PROVIDER` dan isi `AI_STT_ENABLED=false`, lalu redeploy. Aplikasi kembali ke form manual; tidak ada data yang hilang.
- **Tingkat B:** aktifkan lagi Vercel Cron dan arahkan pengguna kembali ke URL Vercel.
- **Hapus resource setelah uji coba.** RG departemen **tidak boleh dihapus**, jadi hapus isinya saja:
  - Portal: buka `Resource_Group_25-27` → centang resource Centsible → **Delete**.
  - CLI:
    ```bash
    az containerapp job delete -g $RG -n job-weekly --yes
    az containerapp delete -g $RG -n centsible --yes
    az containerapp env delete -g $RG -n cae-centsible --yes
    az acr delete -g $RG -n $ACR --yes
    az cognitiveservices account delete -g $RG -n $AI
    az resource list -g $RG -o table      # sisa, mis. Log Analytics workspace dari environment
    ```
  - Resource Azure OpenAI yang dihapus masuk *soft-delete* selama 48 jam; namanya baru bisa dipakai lagi setelah di-*purge* (`az cognitiveservices account purge`), yang mungkin butuh bantuan admin karena scope-nya level langganan.
- Langganan Students (cadangan): `az group delete -n rg-centsible --yes`.

Data pengguna tetap di Supabase, jadi rollback tidak berisiko kehilangan data.

---

## 12. Sumber & verifikasi

Data langganan (bagian 1) dari Azure CLI 2.93.0 pada 27 Nov 2026. Klaim lain dicek ke Microsoft Learn, OpenAI, dan Speaches lewat Context7.

| Klaim | Status | Sumber |
|---|---|---|
| Base URL v1 `…/openai/v1/`, header `api-key`, `model` = nama deployment, tanpa `api-version` | ✅ | Azure OpenAI v1 API |
| `/openai/v1/audio/transcriptions` menerima `file`, `model`, `language`, `prompt`, `response_format` | ✅ | REST reference Azure OpenAI |
| `az cognitiveservices account create --kind OpenAI --sku S0 --custom-domain` | ✅ | Quickstart Azure OpenAI (CLI) |
| `az cognitiveservices account deployment create … --sku-name GlobalStandard --sku-capacity` | ✅ | *Automate quota deployments* |
| Ketersediaan model per region | ✅ dicek langsung di langganan | `az cognitiveservices model list` |
| Quota tier Tier 0 dan larangan tambah kuota | ✅ | *Azure OpenAI quotas and limits* |
| Kredit ≠ kuota; deploy gagal bila kuota 0 | ✅ | *Manage Azure OpenAI quota* |
| Reasoning models: `max_completion_tokens`, tanpa `temperature` | ✅ | *Reasoning models* |
| `--registry-identity system` membuat *role assignment* `AcrPull` | ✅ | Container Apps managed identity image pull |
| Admin user ACR (`--registry-username/--registry-password`) | ✅ | `az containerapp create` reference |
| `--secrets` + `secretref:`; jobs `--trigger-type Schedule`, cron dalam UTC | ✅ | Container Apps secrets / jobs |
| `az acr build` dari URL GitHub (`…git#main`) | ✅ | ACR Tasks quickstart |
| Kuota gratis Container Apps (180K vCPU-s, 360K GiB-s, 2 juta request) | ✅ | Container Apps billing |
| Budget di scope resource group | ✅ | Cost Management budgets |

Kuota, region, dan tanggal pensiun bisa berubah. Cek ulang dengan `az cognitiveservices model list` sebelum migrasi.
