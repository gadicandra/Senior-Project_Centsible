---
title: Migrasi ke Azure (Fase 2)
---

# Migrasi ke Azure (Fase 2): seluruh aplikasi di Azure

Target migrasi ini adalah **Tingkat B**: aplikasi Next.js, cron mingguan, AI Parse (LLM), dan AI STT semuanya berjalan di Azure. Supabase tetap menjadi database dan auth.

Migrasi dilakukan dalam **dua tahap** dengan langkah yang sama, hanya nilainya berbeda:

| Tahap | Langganan | Tujuan |
|---|---|---|
| **Tahap 1: uji coba** | **Azure for Students** (pribadi) | Membuktikan semua langkah berjalan, memakai Supabase **dev** |
| **Tahap 2: produksi** | **DTETI-LabIT** (departemen) | Menjalankan aplikasi untuk pengguna, memakai Supabase **production** |

Setiap tahap bisa dikerjakan lewat salah satu dari dua alur yang hasilnya sama:
- **[Alur Portal](#5-alur-portal-web)**: browser, https://portal.azure.com dan https://ai.azure.com
- **[Alur CLI](#6-alur-azure-cli)**: Azure CLI, bisa disalin sebagai skrip

> **Kode aplikasi tidak perlu diubah.** Azure OpenAI punya **API v1** yang kompatibel dengan OpenAI (`https://<resource>.openai.azure.com/openai/v1/`), dan Centsible sudah memakai jalur `openai-compatible` untuk AI teks dan Whisper. Yang ditambahkan hanya berkas Docker (bagian 3). Jangan isi `AI_TEXT_PROVIDER=azure`; nilai itu dicadangkan untuk login tanpa kunci dan belum diimplementasikan.

## Daftar isi

1. [Hasil pengecekan langganan Azure](#1-hasil-pengecekan-langganan-azure)
2. [Arsitektur & keputusan](#2-arsitektur--keputusan)
3. [Persiapan repo (sekali)](#3-persiapan-repo-sekali)
4. [Nilai per tahap](#4-nilai-per-tahap)
5. [Alur Portal (web)](#5-alur-portal-web)
6. [Alur Azure CLI](#6-alur-azure-cli)
7. [Uji coba setelah deploy](#7-uji-coba-setelah-deploy)
8. [Pindah ke produksi (Tahap 2) & cutover dari Vercel](#8-pindah-ke-produksi-tahap-2--cutover-dari-vercel)
9. [Update versi aplikasi](#9-update-versi-aplikasi)
10. [Biaya & pengaman](#10-biaya--pengaman)
11. [Masalah umum](#11-masalah-umum)
12. [Rollback & bersih-bersih](#12-rollback--bersih-bersih)
13. [Sumber & verifikasi](#13-sumber--verifikasi)

---

## 1. Hasil pengecekan langganan Azure

Dicek dengan Azure CLI 2.93.0 pada **27 November 2026**. Akun kampus terhubung ke dua langganan di dua tenant berbeda.

### 1.1 Azure for Students (Tahap 1)

| Cek | Hasil |
|---|---|
| Status | Enabled; akun = pemilik langganan (boleh membuat *role assignment*) |
| Kredit | ±US$100, dipotong oleh semua pemakaian. Kalau habis, resource dihentikan (tidak ditagih) |
| Policy region | **Dibatasi** ke `indonesiacentral`, `centralindia`, `eastasia`, `japaneast`, `uaenorth`. Region lain ditolak `RequestDisallowedByPolicy` |
| Resource provider | `Microsoft.CognitiveServices`, `Microsoft.App`, `Microsoft.ContainerRegistry`, `Microsoft.OperationalInsights` masih **NotRegistered**, jadi harus didaftarkan dulu (gratis) |
| Resource lain | RG `passgo-rg`: App Service plan **B1** + 2 web app (`indonesiacentral`). B1 memotong kredit tiap bulan; hapus kalau tidak dipakai |
| Quota tier & kuota | Belum terbaca karena provider belum terdaftar; cek di langkah 5.3/6.3 |

| Region yang diizinkan | `gpt-4.1-mini` (parse) | Model STT |
|---|---|---|
| `japaneast` | ✅ Standard, Global Standard | ❌ (`whisper` terdaftar tanpa SKU) |
| **`uaenorth`** | ✅ Global Standard | ✅ `whisper` Standard; `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, `gpt-transcribe` Global Standard |
| `eastasia`, `centralindia` | Hanya Provisioned (mahal) | ❌ |
| `indonesiacentral` | Azure OpenAI tidak tersedia | ❌ |

### 1.2 DTETI-LabIT (Tahap 2)

| Cek | Hasil |
|---|---|
| Status | Enabled |
| Akses akun | Hanya di resource group **`Resource_Group_25-27`** (lokasi RG `japanwest`). Di dalam RG semua aksi boleh, **kecuali** membuat/menghapus *role assignment* dan menghapus RG itu sendiri. Tidak ada izin level langganan |
| Isi RG | Kosong |
| Resource provider | Keempat provider di atas **sudah Registered** |
| Policy region | Tidak ada, semua region boleh |
| Quota tier & kuota | **Tidak bisa dibaca** (butuh izin level langganan); ketahuan saat deploy |

| Region | `gpt-4.1-mini` | Model STT |
|---|---|---|
| `japaneast` | ✅ Standard, Global Standard | ❌ |
| `southeastasia` | ✅ Global Standard | ❌ |
| `japanwest` | ❌ | ❌ |
| **`southindia`** | ✅ Standard, Global Standard | ✅ `whisper` Standard; `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, `gpt-transcribe` Global Standard |
| `eastus2`, `swedencentral` | ✅ | ✅ |

### 1.3 Catatan dari dokumentasi Microsoft

- **Kredit ≠ kuota.** Kredit membayar pemakaian; kuota (token per menit) membatasi berapa banyak yang boleh di-deploy per model per region. Kuota 0 → deploy gagal (`InsufficientQuota`) walaupun kredit masih ada.
- Langganan berbasis kredit bisa berada di **quota tier "Free tier" (Tier 0)**. Tabel Tier 0 mencantumkan `gpt-4.1-mini` Global Standard 200K TPM; Tier 0 **tidak bisa** mengajukan tambah kuota.
- Model Claude di Foundry tidak tersedia untuk langganan *student/credit-based* (Centsible tidak memakainya di Azure).
- Jadwal pensiun: `whisper 001` 26 Feb 2027 · `gpt-4.1-mini 2025-04-14` 14 Apr 2027 · `gpt-4o-mini-transcribe 2025-12-15` 15 Jun 2027 · `gpt-transcribe 2026-07-28` 1 Feb 2028.

---

## 2. Arsitektur & keputusan

```
Browser ─► Container App "centsible" (japaneast) ──► Supabase (Tokyo)
                 │
                 └──► Azure OpenAI (uaenorth / southindia)
                        ├─ deployment "parse"  (gpt-4.1-mini)       ◄── juga dipakai ringkasan mingguan
                        └─ deployment "stt"    (gpt-4o-mini-transcribe)

Container Apps Job "job-weekly" (cron 0 23 * * 0 UTC = Senin 06:00 WIB) ─► https://<centsible>/api/cron/weekly
Container Registry "centsibleacr…" ─► image centsible:<tag>
```

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Hosting aplikasi | **Azure Container Apps** (Consumption) di `japaneast` | Satu region dengan Supabase; aplikasi sangat sering bolak-balik ke database |
| Region Azure OpenAI | Tahap 1 **`uaenorth`**, Tahap 2 **`southindia`** | Satu-satunya region yang (diizinkan dan) punya model parse **dan** STT, jadi cukup satu resource dan satu kunci. Tambahan latensi ±100–200 ms, jauh di bawah timeout 8 detik |
| Model parse | **`gpt-4.1-mini` 2025-04-14**, Global Standard | Bukan model *reasoning*, jadi `temperature`/`max_tokens` di kode tetap valid; mendukung *structured outputs* |
| Model STT | **`gpt-4o-mini-transcribe` 2025-12-15**, Global Standard (cadangan `whisper` Standard) | Lebih akurat untuk bahasa campuran dan pensiun lebih lambat. Menerima `language`, `prompt`, `response_format` seperti Whisper |
| Build image | **`az acr build`** (ACR Tasks) | Image dibangun di Azure; Docker di laptop tidak wajib |
| Tarik image dari ACR | Tahap 1: **managed identity** (`--registry-identity system`) di alur CLI, admin user di alur Portal · Tahap 2: **admin user ACR** | Managed identity butuh *role assignment* `AcrPull`, yang tidak boleh dibuat di DTETI-LabIT |
| Rahasia | **Container Apps secrets** + `secretref:` | Nilai rahasia tidak tampil di konfigurasi. Key Vault bisa ditambahkan nanti |
| Cron | **Container Apps Job** terjadwal yang memanggil `/api/cron/weekly` dengan `CRON_SECRET` | Endpoint yang sama dengan Vercel Cron; idempoten |

---

## 3. Persiapan repo (sekali)

Lakukan lewat PR biasa sebelum Tahap 1, lalu merge ke `main`.


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

Cek di laptop dulu. Nilai `NEXT_PUBLIC_*` diambil langsung dari `.env.local`, jadi tidak ada yang perlu diketik ulang:
```bash
env_val() { grep -E "^$1=" .env.local | tail -1 | cut -d= -f2- | tr -d "\"'"; }

docker build -t centsible:local \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$(env_val NEXT_PUBLIC_SUPABASE_URL)" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$(env_val NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)" .

docker run --rm -p 3000:3000 --env-file .env.local centsible:local
```
Buka http://localhost:3000, lalu login dan catat satu transaksi.

> **Jangan menyalin `<…>` apa adanya.** Di seluruh tutorial, `<ref>`, `<inisial>`, `<KEY 1>`, dan sejenisnya adalah placeholder yang harus diganti **beserta tanda kurungnya**. Kalau tertinggal, bash membaca `<` sebagai redirect file (`bash: ref: No such file or directory`), build tidak jalan, lalu `docker run` gagal dengan `pull access denied for centsible`.
>
> `--env-file` Docker tidak membuang tanda kutip. Kalau nilai di `.env.local` ditulis `KEY="nilai"`, kutipnya ikut terbaca, jadi hapus kutipnya untuk tes ini. Di dalam container, `localhost` adalah container itu sendiri, jadi Speaches lokal (`AI_STT_BASE_URL=http://localhost:8000/v1`) tidak terjangkau. Untuk tes ini matikan STT (`-e AI_STT_ENABLED=false`) atau pakai `http://host.docker.internal:8000/v1` dengan tambahan `--add-host=host.docker.internal:host-gateway`.

**d. `vercel.json`** tidak diubah dulu. Blok `crons` baru dihapus saat cutover (bagian 8), supaya Vercel tetap jalan selama uji coba.

---

## 4. Nilai per tahap

Ganti `<inisial>` dengan inisial kamu (mis. `gac`) dan `<angka>` dengan angka acak, karena nama Azure OpenAI dan ACR harus unik global.

| Nilai | Tahap 1: Azure for Students | Tahap 2: DTETI-LabIT |
|---|---|---|
| Langganan | `Azure for Students` | `DTETI-LabIT` |
| Resource group | `rg-centsible` (**buat baru**, Japan East) | `Resource_Group_25-27` (**sudah ada**, jangan buat baru) |
| Daftarkan resource provider | **Ya** (langkah 5.1 / 6.1) | Tidak perlu |
| Azure OpenAI | `centsible-ai-<inisial>-trial` di **UAE North** | `centsible-ai-<inisial>` di **South India** |
| Container Registry | `centsibletrial<angka>` (Japan East, Basic) | `centsibleacr<angka>` (Japan East, Basic) |
| Container Apps environment | `cae-centsible` (Japan East) | `cae-centsible` (Japan East) |
| Container App / Job | `centsible` / `job-weekly` | `centsible` / `job-weekly` |
| Supabase | Project **dev** | Project **production** |
| Min replicas aplikasi | `0` (hemat kredit; permintaan pertama ±beberapa detik) | `1` (tanpa *cold start*) |

**Env aplikasi** (sama untuk kedua tahap, nilainya dari tabel di atas dan dari Supabase):

| Env | Nilai | Rahasia (secret) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` (juga build arg) | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (juga build arg) | |
| `DATABASE_URL` | Connection string Supabase (pooler) | ✅ `database-url` |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | ✅ `supabase-secret` |
| `AI_TEXT_PROVIDER` | `openai-compatible` | |
| `AI_TEXT_BASE_URL` | `https://<nama-azure-openai>.openai.azure.com/openai/v1/` | |
| `AI_TEXT_MODEL` | `parse` (nama **deployment**) | |
| `AI_TEXT_API_KEY` | KEY 1 Azure OpenAI | ✅ `ai-key` |
| `AI_STT_ENABLED` | `true` | |
| `AI_STT_BASE_URL` | sama dengan `AI_TEXT_BASE_URL` | |
| `AI_STT_MODEL` | `stt` (nama **deployment**) | |
| `AI_STT_API_KEY` | KEY 1 Azure OpenAI | ✅ `ai-key` |
| `AI_DRAFT_SECRET` | acak ≥ 32 karakter (`openssl rand -base64 32`) | ✅ `draft-secret` |
| `AI_PARSE_DAILY_LIMIT` | `100` | |
| `CRON_SECRET` | acak ≥ 16 karakter (`openssl rand -hex 24`) | ✅ `cron-secret` |

`DIRECT_URL` tidak dibutuhkan saat runtime (hanya untuk `prisma migrate` dari laptop).

---

## 5. Alur Portal (web)

Ikuti dari atas ke bawah. Langkah bertanda **[T1]** hanya untuk Tahap 1, **[T2]** hanya untuk Tahap 2.

### 5.1 Pilih langganan & siapkan

1. Buka https://portal.azure.com, login dengan akun `@365.ugm.ac.id`.
2. ⚙️ **Settings → Directories + subscriptions** → pilih direktori langganan tahap ini.
3. **[T1] Daftarkan resource provider:** cari **Subscriptions** → *Azure for Students* → **Settings → Resource providers** → cari dan **Register** satu per satu: `Microsoft.CognitiveServices`, `Microsoft.App`, `Microsoft.ContainerRegistry`, `Microsoft.OperationalInsights`. Tunggu status *Registered*.
4. **[T1] Buat resource group:** **Resource groups → Create** → `rg-centsible`, Region **Japan East** → **Review + create → Create**.
5. **[T2]** Pastikan **Resource groups** menampilkan `Resource_Group_25-27`.

### 5.2 Azure OpenAI

1. Cari **Azure OpenAI → Create**.
   - Resource group: dari tabel 4 · Region: **UAE North** [T1] / **South India** [T2]
   - Name: dari tabel 4 · Pricing tier: **Standard S0**
   - Network: *All networks, including the internet*
2. **Review + submit → Create**.
3. Buka resource → **Resource Management → Keys and Endpoint**. Catat **Endpoint** dan **KEY 1** (rahasia: simpan di password manager, jangan di-commit, jangan ditempel di chat).

### 5.3 Cek kuota

1. Di halaman resource klik **Go to Foundry portal** (atau buka https://ai.azure.com dan pilih resource ini).
2. Menu **Quota** → filter region resource → cari baris `gpt-4.1-mini` dan `gpt-4o-mini-transcribe` (Global Standard). Limit harus > 0.
3. Kalau STT 0, nanti pakai `whisper` (Standard). Kalau keduanya 0, pakai region lain (T2: `eastus2`/`swedencentral`).

### 5.4 Deploy AI Parse (LLM)

1. Foundry → **Model catalog** → cari **`gpt-4.1-mini`** → **Deploy → Custom settings**:
   - **Deployment name:** `parse` · **Deployment type:** Global Standard · **Model version:** `2025-04-14`
   - **Tokens per Minute Rate Limit:** 50K (T1 boleh 10K)
2. **Deploy**. Kalau kuota tidak cukup, turunkan TPM.
3. Uji di **Playground → Chat** dengan deployment `parse`: ketik "Balas: ok".

### 5.5 Deploy AI STT

1. **Model catalog** → **`gpt-4o-mini-transcribe`** → **Deploy → Custom settings**:
   - **Deployment name:** `stt` · **Deployment type:** Global Standard · **Version:** `2025-12-15` · TPM kecil (mis. 10K)
2. Gagal karena kuota → deploy **`whisper`** (Deployment type **Standard**) dengan nama sama `stt`.
3. Uji dengan curl di [7.1](#71-uji-ai-langsung).

### 5.6 Container Registry & build image

1. Cari **Container registries → Create** → resource group dari tabel 4, Registry name dari tabel 4, Location **Japan East**, Pricing plan **Basic** → **Review + create → Create**.
2. Buka registry → **Settings → Access keys** → aktifkan **Admin user**.
3. Buka **Cloud Shell** (ikon `>_` di bar atas) → **Bash** → *No storage account required* → pilih langganan tahap ini. Jalankan (repo publik, jadi ACR bisa mengambilnya langsung dari GitHub):
   ```bash
   az acr build -r <nama-registry> -t centsible:v1 \
     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
     --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
     https://github.com/gadicandra/Senior-Project_Centsible.git#main
   ```
   Tunggu sampai `Run ID: … was successful` (±3–5 menit). Registry → **Repositories** harus berisi `centsible:v1`.

### 5.7 Container App (aplikasi)

1. Cari **Container Apps → Create**.
2. **Basics:** resource group dari tabel 4 · Name `centsible` · Region **Japan East** · Container Apps environment **Create new** → `cae-centsible` (*Consumption only*).
3. **Container:** hapus centang *Use quickstart image*.
   - Image source **Azure Container Registry** → registry, Image `centsible`, Tag `v1`
   - Authentication **Admin credentials**
   - CPU and memory **0.5 CPU, 1 Gi**
   - Environment variables: isi semua env **tanpa** tanda ✅ di tabel 4 (rahasia ditambahkan di langkah 6–7)
4. **Ingress:** Enabled · *Accepting traffic from anywhere* · Target port **3000**.
5. **Review + create → Create**.
6. Buka app → **Settings → Secrets → Add**: `database-url`, `supabase-secret`, `ai-key`, `draft-secret`, `cron-secret` (nilai dari tabel 4).
7. **Application → Containers → Edit and deploy** → pilih container → **Environment variables** → tambahkan `DATABASE_URL`, `SUPABASE_SECRET_KEY`, `AI_TEXT_API_KEY`, `AI_STT_API_KEY`, `AI_DRAFT_SECRET`, `CRON_SECRET` dengan Source **Reference a secret** → **Save → Create**.
8. **Application → Scale:** Min replicas sesuai tabel 4, Max **2** → Save.
9. **Overview → Application Url** → catat (`https://centsible.<acak>.japaneast.azurecontainerapps.io`).

### 5.8 Cron ringkasan mingguan

1. Cari **Container App Jobs → Create** → resource group dari tabel 4 · Name `job-weekly` · Region Japan East · environment `cae-centsible`.
2. **Trigger type:** Scheduled · Cron expression `0 23 * * 0` (dievaluasi dalam **UTC** = Senin 06:00 WIB).
3. **Container:** Image source *Docker Hub or other registries* · Public · Registry `docker.io` · Image `curlimages/curl:8.11.1` · 0.25 CPU / 0.5 Gi
   - **Command override:** `/bin/sh`
   - **Arguments override:** `-c, curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/weekly"`
   - Env `APP_URL` = Application Url dari 5.7 langkah 9
4. **Create**. Lalu job → **Settings → Secrets → Add** `cron-secret`, dan **Configuration → Containers → Edit** → env `CRON_SECRET` = *Reference a secret* `cron-secret`.
5. Job → **Run now** → **Execution history** harus *Succeeded*.

### 5.9 Supabase & budget

1. **Supabase** (project dev [T1] / production [T2]) → **Authentication → URL Configuration → Redirect URLs** → tambahkan `https://<Application Url>/**`.
2. **Budget:** Portal → **Cost Management → Budgets** → Scope = resource group dari tabel 4 → **Add** → US$20, Monthly → alert Actual 50%, 80%, 100% ke email kamu.

Lanjut ke [7. Uji coba setelah deploy](#7-uji-coba-setelah-deploy).

---

## 6. Alur Azure CLI

Bisa di terminal laptop (dari root repo) atau di Cloud Shell.

### 6.1 Login, langganan, variabel

```bash
az login                                   # T2: az login --tenant <tenant DTETI>
az account list --all -o table
az extension add --name containerapp --upgrade
```

**[T1] Azure for Students:**
```bash
az account set --subscription "Azure for Students"
for p in Microsoft.CognitiveServices Microsoft.App Microsoft.ContainerRegistry Microsoft.OperationalInsights; do
  az provider register -n $p --wait
done
RG=rg-centsible
az group create -n $RG -l japaneast
AI=centsible-ai-<inisial>-trial; AI_LOC=uaenorth
ACR=centsibletrial$RANDOM
MIN_REPLICAS=0
```

**[T2] DTETI-LabIT:**
```bash
az account set --subscription "DTETI-LabIT"
RG=Resource_Group_25-27                    # sudah ada; jangan membuat RG baru
AI=centsible-ai-<inisial>; AI_LOC=southindia
ACR=centsibleacr$RANDOM
MIN_REPLICAS=1
```

**Keduanya:**
```bash
APP_LOC=japaneast
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_PUBLISHABLE=sb_publishable_…
echo "ACR=$ACR"                            # catat, dipakai lagi saat update
```

### 6.2 Azure OpenAI

```bash
az cognitiveservices account create -g $RG -n $AI -l $AI_LOC \
  --kind OpenAI --sku S0 --custom-domain $AI --yes
AI_KEY=$(az cognitiveservices account keys list -g $RG -n $AI --query key1 -o tsv)
AI_URL=https://$AI.openai.azure.com/openai/v1/
```

### 6.3 Cek ketersediaan & kuota

```bash
az cognitiveservices model list -l $AI_LOC \
  --query "[?model.name=='gpt-4.1-mini' || model.name=='gpt-4o-mini-transcribe' || model.name=='whisper'].{model:model.name, versi:model.version, sku:join(',', model.skus[].name)}" -o table

# T1 saja (T2 tidak punya izin level langganan):
az cognitiveservices usage list -l $AI_LOC \
  --query "[?contains(name.value,'gpt-4.1-mini') || contains(name.value,'transcribe') || contains(name.value,'whisper')].{kuota:name.value, limit:limit}" -o table
```

### 6.4 Deploy AI Parse (LLM)

```bash
az cognitiveservices account deployment create -g $RG -n $AI \
  --deployment-name parse \
  --model-name gpt-4.1-mini --model-version 2025-04-14 --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 50          # 50K TPM; InsufficientQuota → 10

curl -s ${AI_URL}chat/completions -H "Content-Type: application/json" -H "api-key: $AI_KEY" \
  -d '{"model":"parse","messages":[{"role":"user","content":"Balas: ok"}],"max_tokens":5}'
```

### 6.5 Deploy AI STT

```bash
az cognitiveservices account deployment create -g $RG -n $AI \
  --deployment-name stt \
  --model-name gpt-4o-mini-transcribe --model-version 2025-12-15 --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 10

# Cadangan kalau gagal karena kuota:
# az cognitiveservices account deployment create -g $RG -n $AI --deployment-name stt \
#   --model-name whisper --model-version 001 --model-format OpenAI --sku-name Standard --sku-capacity 1

az cognitiveservices account deployment list -g $RG -n $AI \
  --query "[].{nama:name, model:properties.model.name, status:properties.provisioningState}" -o table
```

### 6.6 Container Registry & build image

```bash
az acr create -g $RG -n $ACR -l $APP_LOC --sku Basic --admin-enabled true
TAG=$(git rev-parse --short HEAD)
az acr build -r $ACR -t centsible:$TAG \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE .
```

### 6.7 Container Apps environment & aplikasi

```bash
az containerapp env create -g $RG -n cae-centsible -l $APP_LOC
```

Pilih cara menarik image:
```bash
# [T1] managed identity (tanpa password; butuh izin role assignment, kamu pemilik langganan)
PULL="--registry-server $ACR.azurecr.io --registry-identity system"

# [T2] admin user ACR (DTETI-LabIT tidak mengizinkan role assignment)
ACR_PASS=$(az acr credential show -n $ACR --query "passwords[0].value" -o tsv)
PULL="--registry-server $ACR.azurecr.io --registry-username $ACR --registry-password $ACR_PASS"
```

```bash
az containerapp create -g $RG -n centsible --environment cae-centsible \
  --image $ACR.azurecr.io/centsible:$TAG $PULL \
  --target-port 3000 --ingress external \
  --min-replicas $MIN_REPLICAS --max-replicas 2 --cpu 0.5 --memory 1Gi \
  --secrets \
     database-url='<DATABASE_URL>' supabase-secret='<SUPABASE_SECRET_KEY>' \
     ai-key="$AI_KEY" draft-secret='<AI_DRAFT_SECRET>' cron-secret='<CRON_SECRET>' \
  --env-vars \
     NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE \
     DATABASE_URL=secretref:database-url SUPABASE_SECRET_KEY=secretref:supabase-secret \
     AI_TEXT_PROVIDER=openai-compatible AI_TEXT_BASE_URL=$AI_URL AI_TEXT_MODEL=parse AI_TEXT_API_KEY=secretref:ai-key \
     AI_STT_ENABLED=true AI_STT_BASE_URL=$AI_URL AI_STT_MODEL=stt AI_STT_API_KEY=secretref:ai-key \
     AI_DRAFT_SECRET=secretref:draft-secret AI_PARSE_DAILY_LIMIT=100 CRON_SECRET=secretref:cron-secret

APP=https://$(az containerapp show -g $RG -n centsible --query properties.configuration.ingress.fqdn -o tsv)
echo $APP
```

> Tanda kutip tunggal `'…'` mencegah shell mengubah karakter khusus di rahasia. Perintah ini tersimpan di riwayat shell; jalankan `history -c` setelahnya kalau memakai laptop bersama.

### 6.8 Cron ringkasan mingguan

```bash
az containerapp job create -g $RG -n job-weekly --environment cae-centsible \
  --trigger-type Schedule --cron-expression "0 23 * * 0" \
  --replica-timeout 300 --replica-retry-limit 1 --parallelism 1 --replica-completion-count 1 \
  --image curlimages/curl:8.11.1 --cpu 0.25 --memory 0.5Gi \
  --secrets cron-secret='<CRON_SECRET>' --env-vars CRON_SECRET=secretref:cron-secret APP_URL=$APP \
  --command "/bin/sh" --args "-c" 'curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/weekly"'

az containerapp job start -g $RG -n job-weekly
az containerapp job execution list -g $RG -n job-weekly -o table      # Succeeded
```

### 6.9 Supabase & budget

1. Supabase → **Authentication → URL Configuration → Redirect URLs** → tambahkan `$APP/**` (dashboard; tidak ada perintah CLI Azure untuk ini).
2. Budget di scope resource group:
   ```bash
   az consumption budget create --resource-group $RG --budget-name centsible-20usd \
     --amount 20 --category cost --time-grain monthly \
     --start-date $(date +%Y-%m-01) --end-date $(date -d '+1 year' +%Y-%m-01)
   ```
   Alert email ditambahkan di Portal → Cost Management → Budgets → `centsible-20usd`.

---

## 7. Uji coba setelah deploy

### 7.1 Uji AI langsung

```bash
# Parse
curl -s ${AI_URL}chat/completions -H "Content-Type: application/json" -H "api-key: $AI_KEY" \
  -d '{"model":"parse","messages":[{"role":"user","content":"Balas: ok"}],"max_tokens":5}'

# STT (rekaman .wav/.webm/.mp3, maks 25 MB) → {"text":"..."}
curl -s ${AI_URL}audio/transcriptions -H "api-key: $AI_KEY" \
  -F file=@rekaman.wav -F model=stt -F language=id -F "prompt=gocap, ceban, goceng, 25rb, kos"
```

### 7.2 Uji aplikasi di URL Container App

1. Buka `https://<Application Url>`, daftar/login (Google dan email). Login gagal → cek Redirect URL Supabase.
2. **Parse:** tekan **+**, ketik *"bayar kos 850k senin lalu via bca"* → kartu konfirmasi Rp 850.000 · Kos → simpan.
3. **STT:** tekan mikrofon di HP, ucapkan *"makan siang dua puluh lima ribu"* → kartu Rp 25.000 · Makan.
4. **Form manual & offline:** catat satu transaksi dengan mode pesawat, lalu nyalakan lagi → tersinkron.
5. **Cron:** `curl -H "Authorization: Bearer <CRON_SECRET>" $APP/api/cron/weekly` → JSON berisi `"ai": 1` atau lebih bila ada transaksi minggu lalu.
6. **Log:** Portal → Container App → **Monitoring → Log stream**, atau
   ```bash
   az containerapp logs show -g $RG -n centsible --follow
   ```
   Tidak boleh ada `ai_fallback` dengan `code: "env"` maupun error 5xx.
7. **Akurasi (laptop):** arahkan `.env.local` ke Azure (env AI di tabel 4), jalankan `pnpm eval:ai`, lalu commit `eval/results/parse.md`. Target **≥ 85%** (sebelumnya 88,9% dengan Claude Haiku 4.5).

**Tahap 1 selesai** kalau 7.1–7.2 lulus. Catat masalah yang ditemui, lalu lanjut ke Tahap 2.

---

## 8. Pindah ke produksi (Tahap 2) & cutover dari Vercel

1. **Izin:** pastikan admin lab menyetujui pemakaian `Resource_Group_25-27` dan siapa yang menanggung biaya.
2. **Ulangi bagian 5 atau 6** dengan kolom **Tahap 2** di tabel 4 (Supabase **production**).
3. **Uji** seperti bagian 7 di URL Container App produksi.
4. **Cutover:**
   - Bagikan URL Container App produksi ke pengguna uji coba (#37).
   - **Matikan Vercel Cron** supaya ringkasan tidak dibuat dua kali: PR yang menghapus blok `crons` dari `vercel.json`. Vercel boleh tetap hidup sebagai cadangan selama 1–2 minggu.
   - (Opsional) domain kustom: Container App → **Networking → Custom domains** → *Add custom domain* dengan sertifikat terkelola; tambahkan juga ke Redirect URL Supabase.
5. **Matikan Tahap 1** untuk menghemat kredit (bagian 12).
6. Tutup issue **#28** (suara) dan **#32** (ringkasan AI) dengan hasil uji.

---

## 9. Update versi aplikasi

Setiap ada perubahan di `main`:

**Portal:** Cloud Shell → `az acr build -r <registry> -t centsible:v2 … https://github.com/gadicandra/Senior-Project_Centsible.git#main` → Container App → **Containers → Edit and deploy** → pilih tag `v2` → **Create**. Revisi baru menggantikan yang lama tanpa downtime.

**CLI:**
```bash
TAG=$(git rev-parse --short HEAD)
az acr build -r $ACR -t centsible:$TAG \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE .
az containerapp update -g $RG -n centsible --image $ACR.azurecr.io/centsible:$TAG
az containerapp revision list -g $RG -n centsible -o table
```

**Otomatis (opsional):** tambahkan job di `.github/workflows/main.yml` yang menjalankan dua perintah di atas setelah tes lulus di `main`, dengan login OIDC (`azure/login`). Di DTETI-LabIT, pembuatan *service principal/federated credential* untuk OIDC butuh bantuan admin.

---

## 10. Biaya & pengaman

| Item | Perkiraan (±10–20 pengguna) |
|---|---|
| `gpt-4.1-mini` (parse + ringkasan) | ±1–2 ribu token per kalimat; ratusan kalimat per hari tetap < ±US$1/hari |
| `gpt-4o-mini-transcribe` | Per durasi audio; rekaman ≤ 30 detik → sangat kecil |
| Container Apps | Gratis per langganan per bulan: 180.000 vCPU-detik, 360.000 GiB-detik, 2 juta request. Aplikasi 0,5 vCPU min 1 replika melewati kuota gratis setelah ±4 hari; min 0 (T1) hampir gratis |
| Job mingguan | Beberapa detik per minggu → praktis gratis |
| ACR Basic | Beberapa dolar per bulan |
| Log Analytics (dibuat otomatis oleh environment) | Per GB log; kecil untuk trafik uji coba |

Angka di atas perkiraan; pantau **Cost Management → Cost analysis** (scope RG) setiap beberapa hari.

**Pengaman:** `AI_PARSE_DAILY_LIMIT=100` per pengguna per hari (parse + suara), TPM deployment kecil, budget alert US$20, dan matikan Tahap 1 setelah selesai.

---

## 11. Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| `RequestDisallowedByPolicy` (T1) | Region di luar daftar policy Students | Pakai `japaneast` / `uaenorth` |
| `MissingSubscriptionRegistration` (T1) | Resource provider belum terdaftar | 5.1 langkah 3 / 6.1 |
| `AuthorizationFailed` di level langganan (T2) | Akses DTETI-LabIT hanya di RG | Selalu pakai `-g Resource_Group_25-27`; jangan buat RG baru |
| Gagal membuat *role assignment* / `--registry-identity system` (T2) | Akun tidak boleh membuat role assignment | Pakai admin user ACR (6.7 [T2]) |
| `InsufficientQuota` saat deploy model | Kuota model di region itu kurang/0 | Turunkan TPM; STT pakai `whisper` Standard; atau region lain |
| `az acr build` gagal di `pnpm install` | `pnpm-lock.yaml` tidak sinkron | `pnpm install` di laptop, commit lockfile |
| Container App *Activating* lalu gagal; log `Cannot find module` | Dockerfile/`output: "standalone"` belum ter-merge | Cek bagian 3 sudah di `main`, build ulang |
| Halaman kosong / Supabase error di browser | `NEXT_PUBLIC_*` tidak diberikan saat **build** | Ulangi `az acr build` dengan `--build-arg` |
| Login gagal / redirect ke Vercel | Redirect URL Supabase belum ditambahkan | 5.9 / 6.9 |
| Kalimat selalu ke form manual, log `ai_fallback` `code: "env"` | Env AI belum ada/salah ejaan | Cek env di Container App, simpan → revisi baru |
| 404 `DeploymentNotFound` | Env berisi nama model | Isi **nama deployment** (`parse`, `stt`) |
| 400 `unsupported_parameter` (`max_tokens`/`temperature`) | Deployment memakai model *reasoning* (`gpt-5*`, `o*`) | Pakai `gpt-4.1-mini`. Kalau harus GPT-5: di `src/server/ai/providers/openai-compatible.ts` dan `src/server/ai/weekly.ts` ganti `max_tokens` → `max_completion_tokens` (±2000), hapus `temperature`, tambah `reasoning_effort` (`"minimal"` untuk `gpt-5-mini`, `"none"` untuk 5.1+), lalu `pnpm eval:ai` |
| 401 dari AI | Kunci salah / secret `ai-key` kosong | Perbarui secret, lalu restart revisi |
| 429 | TPM deployment habis | Naikkan rate limit (Foundry → Deployments → Edit) atau tunggu 1 menit |
| Cron job *Failed* | `APP_URL` salah atau `CRON_SECRET` beda dengan aplikasi | Samakan secret; `az containerapp job execution list` |
| Permintaan pertama lambat (T1) | Min replicas 0 (*cold start*) | Wajar untuk uji coba; T2 memakai min 1 |
| Resource berhenti mendadak (T1) | Kredit Students habis | Cek saldo di https://www.microsoftazuresponsorships.com/balance |

---

## 12. Rollback & bersih-bersih

- **Rollback aplikasi:** arahkan pengguna kembali ke URL Vercel dan kembalikan blok `crons` di `vercel.json`. Data pengguna tetap di Supabase, jadi tidak ada yang hilang.
- **Rollback versi di Container Apps:** Container App → **Revisions and replicas** → aktifkan revisi lama, atau `az containerapp update --image …:<tag-lama>`.
- **Hapus Tahap 1 (Azure for Students):**
  - Portal: Resource groups → `rg-centsible` → **Delete resource group**.
  - CLI: `az group delete -n rg-centsible --yes`, lalu `az cognitiveservices account purge -g rg-centsible -n <nama> -l uaenorth` kalau nama Azure OpenAI ingin dipakai lagi (resource yang dihapus masuk *soft-delete* 48 jam).
- **Hapus Tahap 2 (DTETI-LabIT):** RG **tidak boleh dihapus**, jadi hapus isinya:
  - Portal: `Resource_Group_25-27` → centang resource Centsible → **Delete**.
  - CLI:
    ```bash
    az containerapp job delete -g $RG -n job-weekly --yes
    az containerapp delete -g $RG -n centsible --yes
    az containerapp env delete -g $RG -n cae-centsible --yes
    az acr delete -g $RG -n $ACR --yes
    az cognitiveservices account delete -g $RG -n $AI
    az resource list -g $RG -o table      # sisa, mis. Log Analytics workspace
    ```
- Ingat juga App Service B1 `passgo` di Azure for Students yang terus memotong kredit.

---

## 13. Sumber & verifikasi

Data langganan (bagian 1) dari Azure CLI pada 27 Nov 2026. Klaim lain dicek ke Microsoft Learn dan OpenAI lewat Context7.

| Klaim | Status | Sumber |
|---|---|---|
| Base URL v1 `…/openai/v1/`, header `api-key`, `model` = nama deployment, tanpa `api-version` | ✅ | Azure OpenAI v1 API |
| `/openai/v1/audio/transcriptions` menerima `file`, `model`, `language`, `prompt`, `response_format` | ✅ | REST reference Azure OpenAI |
| `az cognitiveservices account create --kind OpenAI --sku S0 --custom-domain` | ✅ | Quickstart Azure OpenAI (CLI) |
| `az cognitiveservices account deployment create … --sku-name GlobalStandard --sku-capacity` | ✅ | *Automate quota deployments* |
| Ketersediaan model per region | ✅ dicek langsung di kedua langganan | `az cognitiveservices model list` |
| Quota tier Tier 0 & larangan tambah kuota; kredit ≠ kuota | ✅ | *Azure OpenAI quotas and limits* |
| Reasoning models: `max_completion_tokens`, tanpa `temperature` | ✅ | *Reasoning models* |
| `--registry-identity system` membuat role assignment `AcrPull`; alternatif `--registry-username/--registry-password` | ✅ | Container Apps image pull / `az containerapp create` |
| Portal Container Apps: image dari ACR, Ingress target port, Secrets + *Reference a secret* | ✅ | Container Apps quickstart (portal), Manage secrets |
| Jobs `--trigger-type Schedule`, cron dalam **UTC**, `job start`, `execution list` | ✅ | *Jobs in Azure Container Apps* |
| `az acr build` dari URL GitHub (`…git#main`) dan dari folder lokal | ✅ | ACR Tasks quickstart |
| Kuota gratis Container Apps (180K vCPU-s, 360K GiB-s, 2 juta request) | ✅ | Container Apps billing |
| Budget di scope resource group | ✅ | Cost Management budgets |

Kuota, region, dan tanggal pensiun bisa berubah. Cek ulang dengan `az cognitiveservices model list` sebelum migrasi.
