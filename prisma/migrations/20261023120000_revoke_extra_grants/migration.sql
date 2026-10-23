-- ============================================================================
-- Centsible — Migrasi 05: Cabut hak akses berlebih
-- ----------------------------------------------------------------------------
-- Project Supabase lama punya default privileges untuk role `postgres` di skema
-- public: setiap tabel baru otomatis memberi anon, authenticated, dan
-- service_role hak penuh (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES,
-- TRIGGER, MAINTAIN). Migrasi 02 hanya MENAMBAH grant, jadi hak bawaan itu tetap
-- ada. Migrasi ini mencabut hak yang tidak ada di migrasi 02 sehingga keadaan
-- basis data sama dengan docs/database.md §7.2.
--
-- Hak yang dipakai aplikasi tidak disentuh. Hapus berantai ke ai_extractions dan
-- penghapusan akun berjalan sebagai pemilik tabel, jadi tidak butuh DELETE milik
-- authenticated. Semua perintah aman dijalankan ulang (no-op bila hak sudah sesuai).
-- service_role sengaja tidak diubah.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. anon: tidak boleh punya hak apa pun di tabel/view aplikasi
-- ---------------------------------------------------------------------------
revoke all on table public.users           from anon;
revoke all on table public.wallets         from anon;
revoke all on table public.categories      from anon;
revoke all on table public.transactions    from anon;
revoke all on table public.ai_extractions  from anon;
revoke all on table public.budgets         from anon;
revoke all on table public.insights        from anon;
revoke all on table public.ai_usage_daily  from anon;
revoke all on table public.wallet_balances from anon;

-- _prisma_migrations: tabel internal Prisma, tanpa RLS, dan terbaca lewat Data
-- API. Hanya pemiliknya (postgres, dipakai `prisma migrate deploy`) yang perlu.
revoke all on table public._prisma_migrations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. authenticated: sisakan hanya hak dari migrasi 02
-- ---------------------------------------------------------------------------
revoke truncate, references, trigger on table public.wallets      from authenticated;
revoke truncate, references, trigger on table public.categories   from authenticated;
revoke truncate, references, trigger on table public.transactions from authenticated;
revoke truncate, references, trigger on table public.budgets      from authenticated;

-- ai_extractions hanya select + insert (FR 5, bahan ukur akurasi AI).
revoke update, delete, truncate, references, trigger on public.ai_extractions from authenticated;

revoke insert, update, delete, truncate, references, trigger on table public.ai_usage_daily  from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.wallet_balances from authenticated;

-- users & insights: UPDATE tingkat tabel membuat semua kolom bisa diubah.
-- REVOKE UPDATE di tingkat tabel ikut mencabut hak per kolom, jadi hak per
-- kolom dari migrasi 02 dipasang ulang tepat sesudahnya.
revoke insert, update, delete, truncate, references, trigger on table public.users from authenticated;
grant update (full_name, avatar_url, currency, timezone) on public.users to authenticated;

revoke insert, update, delete, truncate, references, trigger on table public.insights from authenticated;
grant update (is_read) on public.insights to authenticated;

-- MAINTAIN baru ada sejak PostgreSQL 17; dibungkus supaya migrasi tetap jalan
-- di versi yang lebih lama.
do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on table public.users, public.wallets, public.categories, '
         || 'public.transactions, public.ai_extractions, public.budgets, public.insights, '
         || 'public.ai_usage_daily, public.wallet_balances from authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Tabel baru berikutnya tidak lagi otomatis memberi hak ke anon/authenticated.
--    Setiap tabel baru wajib menulis GRANT-nya sendiri (docs/database.md §7.1).
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
