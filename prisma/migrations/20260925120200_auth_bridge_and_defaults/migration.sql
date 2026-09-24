-- ============================================================================
-- Centsible — Migrasi 03: Jembatan ke Supabase Auth + data bawaan pengguna
-- ----------------------------------------------------------------------------
-- Isi:
--   * FK public.users.id → auth.users.id ON DELETE CASCADE  → FR 1
--     ("hapus akun beserta seluruh datanya" cukup satu perintah di Auth).
--   * public.bootstrap_user()  → kategori bawaan (FR 9) + dompet utama (FR 10).
--   * Trigger on auth.users    → profil & data bawaan dibuat saat pendaftaran.
--   * Backfill untuk pengguna yang sudah terlanjur ada.
--
-- Migrasi ini WAJIB dijalankan di database Supabase (butuh skema `auth`).
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users'
  ) then
    raise exception
      'Tabel auth.users tidak ditemukan. Migrasi Centsible harus dijalankan pada database Supabase (lokal: `supabase start`).';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Profil terikat ke akun Auth
-- ---------------------------------------------------------------------------
alter table public.users
  add constraint users_id_auth_users_fkey
  foreign key (id) references auth.users (id)
  on update cascade on delete cascade;

-- ---------------------------------------------------------------------------
-- 2. Data bawaan pengguna baru
-- ---------------------------------------------------------------------------
-- Idempoten: aman dipanggil ulang (ON CONFLICT DO NOTHING menutup semua
-- unique index, termasuk yang parsial seperti "satu dompet utama per user").
create or replace function public.bootstrap_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wallets (user_id, name, type, is_default)
  values (p_user_id, 'Tunai', 'cash', true)
  on conflict do nothing;

  insert into public.categories (user_id, name, kind, icon, color, is_system) values
    (p_user_id, 'Makan',      'expense', '🍚', '#F97316', true),
    (p_user_id, 'Transport',  'expense', '🛵', '#0EA5E9', true),
    (p_user_id, 'Kos',        'expense', '🏠', '#8B5CF6', true),
    (p_user_id, 'Kuliah',     'expense', '🎓', '#6366F1', true),
    (p_user_id, 'Hiburan',    'expense', '🎮', '#EC4899', true),
    (p_user_id, 'Kesehatan',  'expense', '💊', '#10B981', true),
    (p_user_id, 'Lain-lain',  'expense', '📦', '#64748B', true),
    (p_user_id, 'Uang Saku',  'income',  '💸', '#22C55E', true),
    (p_user_id, 'Freelance',  'income',  '💼', '#14B8A6', true),
    (p_user_id, 'Lain-lain',  'income',  '📥', '#64748B', true)
  on conflict do nothing;
end;
$$;

-- Fungsi SECURITY DEFINER dengan parameter user_id tidak boleh bisa dipanggil
-- pengguna biasa — kalau tidak, seseorang bisa membuat data atas nama orang lain.
revoke all on function public.bootstrap_user(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_user(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Trigger pendaftaran
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, avatar_url, timezone)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name',
                          new.raw_user_meta_data ->> 'name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url',
                          new.raw_user_meta_data ->> 'picture', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'Asia/Jakarta')
  )
  on conflict (id) do nothing;

  perform public.bootstrap_user(new.id);
  return new;
end;
$$;

-- Menjaga salinan email di profil tetap sama dengan email di Auth.
create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

-- Supabase Auth menulis ke auth.users memakai role supabase_auth_admin.
-- Pemberian hak di bawah adalah jaring pengaman bila project tidak memberi
-- hak default ke skema public.
do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.handle_new_user() to supabase_auth_admin;
    grant execute on function public.handle_auth_user_email_change() to supabase_auth_admin;
  end if;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.handle_auth_user_email_change();

-- ---------------------------------------------------------------------------
-- 4. Backfill — pengguna yang sudah ada sebelum migrasi ini
-- ---------------------------------------------------------------------------
insert into public.users (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name',
                        u.raw_user_meta_data ->> 'name', '')), ''),
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'avatar_url',
                        u.raw_user_meta_data ->> 'picture', '')), '')
from auth.users u
on conflict (id) do nothing;

do $$
declare
  r record;
begin
  for r in select id from public.users loop
    perform public.bootstrap_user(r.id);
  end loop;
end;
$$;
