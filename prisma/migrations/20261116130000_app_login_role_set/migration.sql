-- ============================================================================
-- Centsible — Migrasi 07: postgres boleh berpindah ke centsible_app
-- ----------------------------------------------------------------------------
-- Di Postgres 16+ pembuat role hanya mendapat ADMIN OPTION, bukan hak SET, jadi
-- `set role centsible_app` dari koneksi postgres ditolak. Grant ini (sama dengan
-- langkah resmi Supabase untuk user Prisma) dipakai tes integrasi untuk meniru
-- koneksi aplikasi tanpa password, dan agar Dashboard bisa melihat objeknya.
-- postgres sudah lebih berkuasa dari centsible_app, jadi tidak menambah risiko.
-- ============================================================================
grant centsible_app to postgres;
