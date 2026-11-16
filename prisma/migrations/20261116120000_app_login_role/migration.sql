-- ============================================================================
-- Centsible — Migrasi 06: role login khusus aplikasi (database.md §7.4)
-- ----------------------------------------------------------------------------
-- Aplikasi selama ini tersambung sebagai `postgres`, pemilik semua tabel, yang
-- melewati RLS. Query jalur pengguna yang lupa memakai withRls() akan diam-diam
-- membaca lintas pengguna. Migrasi ini membuat `centsible_app`:
--   * bisa login, BUKAN superuser, TANPA BYPASSRLS, bukan pemilik objek apa pun;
--   * TANPA grant langsung ke tabel aplikasi;
--   * anggota `authenticated` (withRls: `set local role authenticated`) dan
--     `service_role` (job terjadwal: `set local role service_role`, §8.2).
-- Akibatnya query tanpa withRls()/asService() GAGAL dengan 42501, tidak bocor.
--
-- Password TIDAK ditulis di sini (rahasia tidak masuk repo). Setelah migrasi:
--   alter role centsible_app with password '<acak>';   -- di SQL Editor Supabase
-- lalu ganti DATABASE_URL aplikasi ke user `centsible_app.<project-ref>`.
-- DIRECT_URL (dipakai `prisma migrate`) tetap memakai `postgres`.
-- Aman dijalankan ulang.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'centsible_app') then
    -- NOINHERIT: hak authenticated/service_role baru berlaku setelah `set role`,
    -- jadi koneksi tanpa set role tidak mewarisi akses tabel apa pun.
    -- Atribut SUPERUSER sengaja tidak disebut: di Supabase hanya superuser yang boleh menyetelnya,
    -- dan role baru memang tidak pernah superuser.
    create role centsible_app login noinherit nocreatedb nocreaterole nobypassrls;
  end if;
end
$$;

alter role centsible_app noinherit nobypassrls;
grant authenticated to centsible_app;
grant service_role to centsible_app;

-- Hanya hak "melihat" skema; tidak ada hak tabel langsung.
grant usage on schema public to centsible_app;
revoke all on all tables in schema public from centsible_app;

-- Statement lambat tidak boleh menahan koneksi pooler terlalu lama.
alter role centsible_app set statement_timeout = '15s';
