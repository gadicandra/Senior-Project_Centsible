-- ============================================================================
-- Centsible — Migrasi 01: Skema dasar
-- ----------------------------------------------------------------------------
-- Isi : tipe enum, tabel, constraint integritas, indeks, trigger updated_at.
-- Acuan: docs/index.md §e (ERD) dan docs/arsitektur.md §6.5, §7.4, §8.2.
-- Catatan: seluruh berkas migrasi ditulis tangan dan diterapkan dengan
--          `prisma migrate deploy`. Jangan menjalankan `prisma migrate dev`
--          (lihat docs/database.md §13).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tipe enum
-- ---------------------------------------------------------------------------
-- entry_kind dipakai bersama oleh categories.kind DAN transactions.type supaya
-- keduanya bisa diikat satu foreign key majemuk (lihat bagian transactions).
create type public.entry_kind          as enum ('income', 'expense');
create type public.wallet_type         as enum ('cash', 'bank', 'ewallet');
create type public.transaction_source  as enum ('text', 'voice', 'manual');
create type public.ai_input_mode       as enum ('text', 'voice');
create type public.budget_period       as enum ('weekly', 'monthly');
create type public.insight_kind        as enum ('weekly_summary', 'anomaly', 'budget_recommendation');

-- ---------------------------------------------------------------------------
-- 2. Fungsi bantu: menjaga updated_at selalu benar walau baris diubah dari SQL
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Catatan: hak EXECUTE fungsi trigger sengaja TIDAK dicabut. Fungsi bertipe
-- `trigger` memang tidak bisa dipanggil langsung dari SQL, jadi mencabutnya
-- tidak menambah keamanan — hanya menambah risiko salah konfigurasi.

-- ---------------------------------------------------------------------------
-- 3. users — profil pengguna (1:1 dengan auth.users, FK dipasang di migrasi 03)
-- ---------------------------------------------------------------------------
create table public.users (
  id         uuid        not null,
  email      text,
  full_name  text,
  avatar_url text,
  currency   char(3)     not null default 'IDR',
  timezone   text        not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint users_pkey           primary key (id),
  constraint users_currency_chk   check (currency = upper(currency)),
  constraint users_timezone_chk   check (char_length(timezone) between 1 and 64),
  constraint users_full_name_chk  check (full_name is null or char_length(full_name) <= 120)
);

-- Bukan UNIQUE: keunikan email sudah dijamin auth.users. Menduplikasi jaminan
-- itu di sini hanya menambah risiko trigger pendaftaran gagal (lihat §12 doc).
create index users_email_idx on public.users (email);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. wallets — dompet pengguna (FR 10). Saldo TIDAK disimpan di sini.
-- ---------------------------------------------------------------------------
create table public.wallets (
  id              uuid               not null default gen_random_uuid(),
  user_id         uuid               not null,
  name            text               not null,
  type            public.wallet_type not null default 'cash',
  initial_balance bigint             not null default 0,
  is_default      boolean            not null default false,
  is_archived     boolean            not null default false,
  created_at      timestamptz        not null default now(),
  updated_at      timestamptz        not null default now(),

  constraint wallets_pkey     primary key (id),
  constraint wallets_user_fkey foreign key (user_id)
    references public.users (id) on update cascade on delete cascade,

  -- Kunci ber-tenant: dipakai FK majemuk dari transactions supaya sebuah
  -- transaksi tidak mungkin menunjuk dompet milik pengguna lain.
  constraint wallets_user_id_id_key unique (user_id, id),

  constraint wallets_name_chk    check (char_length(btrim(name)) between 1 and 40),
  constraint wallets_balance_chk check (initial_balance between -1000000000000 and 1000000000000),
  -- Dompet yang diarsipkan tidak boleh berstatus dompet utama.
  constraint wallets_default_chk check (not (is_default and is_archived))
);

-- Tepat satu dompet utama per pengguna (dipakai saat AI tidak menyebut dompet).
create unique index wallets_one_default_per_user_idx
  on public.wallets (user_id) where is_default;

-- Nama dompet unik per pengguna, tanpa membedakan huruf besar/kecil.
-- Parsial: nama dompet yang sudah diarsipkan boleh dipakai ulang.
create unique index wallets_active_name_per_user_idx
  on public.wallets (user_id, lower(btrim(name))) where not is_archived;

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. categories — kategori pengguna (FR 9)
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid              not null default gen_random_uuid(),
  user_id     uuid              not null,
  name        text              not null,
  kind        public.entry_kind not null,
  icon        text,
  color       text,
  is_system   boolean           not null default false,
  is_archived boolean           not null default false,
  created_at  timestamptz       not null default now(),
  updated_at  timestamptz       not null default now(),

  constraint categories_pkey      primary key (id),
  constraint categories_user_fkey foreign key (user_id)
    references public.users (id) on update cascade on delete cascade,

  -- Kunci ber-tenant. Varian ber-`kind` dipakai FK majemuk dari transactions
  -- supaya transaksi `expense` tidak mungkin memakai kategori `income`.
  constraint categories_user_id_id_key      unique (user_id, id),
  constraint categories_user_id_id_kind_key unique (user_id, id, kind),

  constraint categories_name_chk  check (char_length(btrim(name)) between 1 and 40),
  constraint categories_icon_chk  check (icon  is null or char_length(icon) <= 8),
  constraint categories_color_chk check (color is null or color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Nama kategori unik per pengguna per jenis. Ini syarat mutlak ADR-06:
-- daftar nama kategori aktif dipakai sebagai `enum` skema keluaran AI, jadi
-- tidak boleh ada dua kategori aktif bernama sama.
create unique index categories_active_name_per_user_idx
  on public.categories (user_id, kind, lower(btrim(name))) where not is_archived;

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. transactions — tabel inti (FR 3, 4, 8, 16)
-- ---------------------------------------------------------------------------
create table public.transactions (
  id          uuid                      not null default gen_random_uuid(),
  user_id     uuid                      not null,
  wallet_id   uuid                      not null,
  category_id uuid                      not null,
  amount      bigint                    not null,
  type        public.entry_kind         not null,
  description text                      not null default '',
  occurred_at date                      not null,
  source      public.transaction_source not null default 'manual',
  client_id   uuid,
  created_at  timestamptz               not null default now(),
  updated_at  timestamptz               not null default now(),

  constraint transactions_pkey      primary key (id),
  constraint transactions_user_fkey foreign key (user_id)
    references public.users (id) on update cascade on delete cascade,

  -- Dompet wajib milik pemilik transaksi.
  -- DEFERRABLE INITIALLY DEFERRED: saat akun dihapus, users → wallets dan
  -- users → transactions sama-sama CASCADE; pemeriksaan NO ACTION harus
  -- ditunda sampai COMMIT agar urutan cascade tidak memicu error palsu.
  constraint transactions_wallet_fkey foreign key (user_id, wallet_id)
    references public.wallets (user_id, id)
    on update no action on delete no action
    deferrable initially deferred,

  -- Kategori wajib milik pemilik transaksi DAN jenisnya wajib sama dengan
  -- type transaksi. Satu constraint menutup dua lubang sekaligus.
  constraint transactions_category_fkey foreign key (user_id, category_id, type)
    references public.categories (user_id, id, kind)
    on update no action on delete no action
    deferrable initially deferred,

  -- Kunci ber-tenant untuk FK majemuk dari ai_extractions.
  constraint transactions_user_id_id_key unique (user_id, id),

  -- Kunci idempoten sinkronisasi offline (FR 16). client_id boleh NULL dan
  -- NULL dianggap berbeda satu sama lain, jadi transaksi online tidak terbatas.
  constraint transactions_user_id_client_id_key unique (user_id, client_id),

  -- Tanda (+/-) dibawa kolom `type`, jadi nominal selalu positif (P5).
  constraint transactions_amount_chk      check (amount > 0 and amount <= 1000000000000),
  constraint transactions_description_chk check (char_length(description) <= 200),
  constraint transactions_occurred_at_chk check (occurred_at >= date '2020-01-01')
);

create index transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc, created_at desc);
create index transactions_user_category_idx
  on public.transactions (user_id, category_id, occurred_at desc);
create index transactions_user_wallet_idx
  on public.transactions (user_id, wallet_id, occurred_at desc);
create index transactions_user_type_idx
  on public.transactions (user_id, type, occurred_at desc);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. ai_extractions — catatan kerja AI (FR 5, arsitektur §6.5 & §10.2)
-- ---------------------------------------------------------------------------
create table public.ai_extractions (
  id               uuid                 not null default gen_random_uuid(),
  user_id          uuid                 not null,
  transaction_id   uuid                 not null,
  raw_input        text                 not null,
  input_mode       public.ai_input_mode not null,
  parsed_result    jsonb                not null,
  user_corrections jsonb                not null default '{}'::jsonb,
  confidence       real,
  model_version    text                 not null,
  latency_ms       integer,
  created_at       timestamptz          not null default now(),

  constraint ai_extractions_pkey      primary key (id),
  constraint ai_extractions_user_fkey foreign key (user_id)
    references public.users (id) on update cascade on delete cascade,

  -- Satu transaksi punya paling banyak satu catatan ekstraksi.
  constraint ai_extractions_transaction_key unique (transaction_id),
  constraint ai_extractions_transaction_fkey foreign key (user_id, transaction_id)
    references public.transactions (user_id, id)
    on update no action on delete cascade,

  constraint ai_extractions_raw_input_chk  check (char_length(raw_input) between 1 and 1000),
  constraint ai_extractions_model_chk      check (char_length(model_version) between 1 and 120),
  constraint ai_extractions_confidence_chk check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint ai_extractions_latency_chk    check (latency_ms is null or latency_ms >= 0),
  constraint ai_extractions_parsed_chk     check (jsonb_typeof(parsed_result)    = 'object'),
  constraint ai_extractions_corrections_chk check (jsonb_typeof(user_corrections) = 'object')
);

create index ai_extractions_user_created_idx
  on public.ai_extractions (user_id, created_at desc);
-- Indeks evaluasi akurasi per model & per jenis input (arsitektur §10.2).
create index ai_extractions_model_mode_idx
  on public.ai_extractions (model_version, input_mode, created_at desc);

-- ---------------------------------------------------------------------------
-- 8. budgets — anggaran per kategori (FR 11)
-- ---------------------------------------------------------------------------
create table public.budgets (
  id           uuid                 not null default gen_random_uuid(),
  user_id      uuid                 not null,
  category_id  uuid                 not null,
  amount_limit bigint               not null,
  period       public.budget_period not null,
  start_date   date                 not null,
  is_active    boolean              not null default true,
  created_at   timestamptz          not null default now(),
  updated_at   timestamptz          not null default now(),

  constraint budgets_pkey      primary key (id),
  constraint budgets_user_fkey foreign key (user_id)
    references public.users (id) on update cascade on delete cascade,
  constraint budgets_category_fkey foreign key (user_id, category_id)
    references public.categories (user_id, id)
    on update no action on delete cascade,

  -- Satu pagu per kategori per periode; mengubah pagu = UPDATE baris yang sama.
  constraint budgets_user_category_period_key unique (user_id, category_id, period),

  constraint budgets_amount_chk     check (amount_limit > 0 and amount_limit <= 1000000000000),
  constraint budgets_start_date_chk check (start_date >= date '2020-01-01')
);

create index budgets_user_active_idx on public.budgets (user_id) where is_active;

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. insights — keluaran job terjadwal (FR 13, 14)
-- ---------------------------------------------------------------------------
create table public.insights (
  id           uuid                not null default gen_random_uuid(),
  user_id      uuid                not null,
  kind         public.insight_kind not null,
  category_id  uuid,
  dedupe_key   text                not null,
  content      text                not null,
  payload      jsonb               not null default '{}'::jsonb,
  period_start date,
  period_end   date,
  is_read      boolean             not null default false,
  generated_at timestamptz         not null default now(),

  constraint insights_pkey      primary key (id),
  constraint insights_user_fkey foreign key (user_id)
    references public.users (id) on update cascade on delete cascade,
  -- category_id boleh NULL; FK majemuk MATCH SIMPLE otomatis lolos saat NULL.
  constraint insights_category_fkey foreign key (user_id, category_id)
    references public.categories (user_id, id)
    on update no action on delete cascade,

  -- Kunci idempoten job terjadwal (arsitektur §7.3): retry tidak menduplikasi.
  -- Contoh isi: 'weekly_summary:2026-09-21', 'anomaly:2026-09-24:<category_id>'.
  constraint insights_user_dedupe_key unique (user_id, dedupe_key),

  constraint insights_dedupe_chk  check (char_length(dedupe_key) between 1 and 120),
  constraint insights_content_chk check (char_length(content) between 1 and 4000),
  constraint insights_payload_chk check (jsonb_typeof(payload) = 'object'),
  constraint insights_period_chk  check (period_start is null or period_end is null or period_end >= period_start)
);

create index insights_user_generated_idx
  on public.insights (user_id, generated_at desc);
create index insights_user_unread_idx
  on public.insights (user_id, generated_at desc) where not is_read;

-- ---------------------------------------------------------------------------
-- 10. ai_usage_daily — kuota pemakaian AI per pengguna per hari
--     (arsitektur §6.1 langkah 2 dan §8.1 "Penyalahgunaan AI")
-- ---------------------------------------------------------------------------
create table public.ai_usage_daily (
  user_id          uuid        not null,
  usage_date       date        not null,
  parse_count      integer     not null default 0,
  transcribe_count integer     not null default 0,
  updated_at       timestamptz not null default now(),

  constraint ai_usage_daily_pkey primary key (user_id, usage_date),
  constraint ai_usage_daily_user_fkey foreign key (user_id)
    references public.users (id) on update cascade on delete cascade,
  constraint ai_usage_daily_counts_chk check (parse_count >= 0 and transcribe_count >= 0)
);
