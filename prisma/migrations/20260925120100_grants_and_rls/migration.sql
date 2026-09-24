-- ============================================================================
-- Centsible — Migrasi 02: Hak akses (GRANT) + Row Level Security
-- ----------------------------------------------------------------------------
-- Memenuhi FR 17 dan prinsip P4: pembatasan data antar-pengguna dijaga oleh
-- basis data, bukan oleh `where userId` di kode.
--
-- Dua lapis yang harus benar dua-duanya:
--   1. GRANT  — tanpa ini Postgres menolak dengan 42501 SEBELUM policy dibaca.
--                Sejak 30 Mei 2026 project Supabase baru TIDAK lagi memberi
--                grant otomatis ke anon/authenticated, jadi grant di bawah
--                wajib ada.
--   2. POLICY — menentukan baris mana yang boleh dilihat/diubah.
--
-- `anon` sengaja tidak diberi hak apa pun: seluruh data Centsible milik
-- pengguna yang sudah masuk.
-- ============================================================================

grant usage on schema public to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. GRANT per tabel
-- ---------------------------------------------------------------------------
-- users: baris dibuat trigger pendaftaran, dihapus lewat cascade auth.users.
grant select                         on public.users          to authenticated;
grant update (full_name, avatar_url, currency, timezone)
                                     on public.users          to authenticated;
grant select, insert, update, delete on public.users          to service_role;

grant select, insert, update, delete on public.wallets        to authenticated, service_role;
grant select, insert, update, delete on public.categories     to authenticated, service_role;
grant select, insert, update, delete on public.transactions   to authenticated, service_role;
grant select, insert, update, delete on public.budgets        to authenticated, service_role;

-- ai_extractions: hanya ditulis sekali bersama transaksinya (FR 5); tidak
-- boleh disunting pengguna karena dipakai sebagai bahan ukur akurasi AI.
-- Penghapusan terjadi lewat cascade dari transactions.
grant select, insert                 on public.ai_extractions to authenticated;
grant select, insert, update, delete on public.ai_extractions to service_role;

-- insights: ditulis job terjadwal. Pengguna hanya boleh menandai sudah dibaca,
-- jadi hak UPDATE dipersempit ke satu kolom saja.
grant select                         on public.insights       to authenticated;
grant update (is_read)               on public.insights       to authenticated;
grant select, insert, update, delete on public.insights       to service_role;

-- ai_usage_daily: pengguna boleh melihat sisa kuotanya, tapi tidak boleh
-- mengubah penghitungnya. Penambahan hanya lewat public.consume_ai_quota()
-- (SECURITY DEFINER, dibuat di migrasi 04).
grant select                         on public.ai_usage_daily to authenticated;
grant select, insert, update, delete on public.ai_usage_daily to service_role;

-- ---------------------------------------------------------------------------
-- 2. Aktifkan RLS
-- ---------------------------------------------------------------------------
-- Catatan: FORCE ROW LEVEL SECURITY sengaja TIDAK dipakai. Pemilik tabel
-- (role `postgres`) harus tetap bisa membaca lintas pengguna untuk migrasi dan
-- job terjadwal FR 13/14 (arsitektur §8.2). Jalur aplikasi tidak pernah
-- memakai jalur itu: setiap query pengguna dibungkus withRls() yang menjalankan
-- `set local role authenticated`.
alter table public.users          enable row level security;
alter table public.wallets        enable row level security;
alter table public.categories     enable row level security;
alter table public.transactions   enable row level security;
alter table public.ai_extractions enable row level security;
alter table public.budgets        enable row level security;
alter table public.insights       enable row level security;
alter table public.ai_usage_daily enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Policy
-- ---------------------------------------------------------------------------
-- Pola yang dipakai konsisten di semua tabel:
--   * selalu menyebut `to authenticated` (policy tidak bocor ke role lain);
--   * `auth.uid()` dibungkus `(select ...)` supaya Postgres menghitungnya
--     sekali per statement, bukan sekali per baris;
--   * satu policy per operasi;
--   * INSERT/UPDATE memakai `with check` agar pengguna tidak bisa memindahkan
--     baris ke pengguna lain.
-- `auth.uid()` membaca GUC `request.jwt.claims`, yang diisi PostgREST maupun
-- withRls() di sisi Prisma — jadi policy yang sama berlaku di kedua jalur.

-- users --------------------------------------------------------------------
create policy users_select_own on public.users
  for select to authenticated
  using ((select auth.uid()) = id);

create policy users_update_own on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- wallets ------------------------------------------------------------------
create policy wallets_select_own on public.wallets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy wallets_insert_own on public.wallets
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy wallets_update_own on public.wallets
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy wallets_delete_own on public.wallets
  for delete to authenticated using ((select auth.uid()) = user_id);

-- categories ---------------------------------------------------------------
create policy categories_select_own on public.categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy categories_insert_own on public.categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy categories_update_own on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy categories_delete_own on public.categories
  for delete to authenticated using ((select auth.uid()) = user_id);

-- transactions -------------------------------------------------------------
create policy transactions_select_own on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy transactions_insert_own on public.transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy transactions_update_own on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete_own on public.transactions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ai_extractions -----------------------------------------------------------
create policy ai_extractions_select_own on public.ai_extractions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ai_extractions_insert_own on public.ai_extractions
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- budgets ------------------------------------------------------------------
create policy budgets_select_own on public.budgets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy budgets_insert_own on public.budgets
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy budgets_update_own on public.budgets
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy budgets_delete_own on public.budgets
  for delete to authenticated using ((select auth.uid()) = user_id);

-- insights -----------------------------------------------------------------
create policy insights_select_own on public.insights
  for select to authenticated using ((select auth.uid()) = user_id);
create policy insights_update_own on public.insights
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ai_usage_daily -----------------------------------------------------------
create policy ai_usage_daily_select_own on public.ai_usage_daily
  for select to authenticated using ((select auth.uid()) = user_id);
