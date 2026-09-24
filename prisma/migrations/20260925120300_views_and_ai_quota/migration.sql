-- ============================================================================
-- Centsible — Migrasi 04: View saldo + penjaga kuota AI
-- ----------------------------------------------------------------------------
-- Isi:
--   * public.wallet_balances  → saldo dompet dihitung, tidak disimpan (FR 10, P5).
--   * public.consume_ai_quota() → batas pemakaian AI per pengguna per hari
--     (arsitektur §6.1 langkah 2, §8.1).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Saldo dompet
-- ---------------------------------------------------------------------------
-- security_invoker = true WAJIB: tanpa itu view dieksekusi dengan hak pemilik
-- (postgres) sehingga RLS tabel di bawahnya dilewati dan saldo pengguna lain
-- ikut terbaca. Dengan security_invoker, policy transactions/wallets tetap
-- berlaku untuk siapa pun yang membaca view ini.
create view public.wallet_balances
with (security_invoker = true) as
select
  w.id              as wallet_id,
  w.user_id         as user_id,
  w.name            as name,
  w.type            as type,
  w.is_default      as is_default,
  w.is_archived     as is_archived,
  w.initial_balance as initial_balance,
  w.initial_balance
    + coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as balance,
  count(t.id)        as transaction_count,
  max(t.occurred_at) as last_occurred_at
from public.wallets w
left join public.transactions t
  on t.wallet_id = w.id
 and t.user_id   = w.user_id
group by w.id;

grant select on public.wallet_balances to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Kuota pemakaian AI
-- ---------------------------------------------------------------------------
-- Penghitung disimpan di tabel yang tidak bisa ditulis role `authenticated`,
-- dan hanya bisa dinaikkan lewat fungsi ini. Jadi pengguna tidak bisa
-- mengosongkan kuotanya sendiri lewat Data API.
--
-- Batas hari memakai zona waktu pengguna, bukan UTC, supaya "kuota harian"
-- berganti pada tengah malam waktu pengguna.
--
-- Pemakaian: panggil SEBELUM memanggil penyedia AI, dalam transaksi tersendiri.
--   select public.consume_ai_quota('parse', 100);   -- mengembalikan sisa kuota
-- Jika kuota habis, fungsi melempar error SQLSTATE 53400 dan penghitung tidak
-- ikut bertambah (statement-nya di-rollback).
create or replace function public.consume_ai_quota(p_kind text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today   date;
  v_used    integer;
begin
  if v_user_id is null then
    raise exception 'consume_ai_quota: tidak ada sesi pengguna'
      using errcode = '28000';
  end if;

  if p_kind not in ('parse', 'transcribe') then
    raise exception 'consume_ai_quota: p_kind harus ''parse'' atau ''transcribe'', bukan %', p_kind
      using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 0 then
    raise exception 'consume_ai_quota: p_limit harus bilangan bulat >= 0'
      using errcode = '22023';
  end if;

  select (now() at time zone coalesce(u.timezone, 'Asia/Jakarta'))::date
    into v_today
    from public.users u
   where u.id = v_user_id;

  -- Pengguna tanpa baris profil tidak boleh memakai AI sama sekali.
  if v_today is null then
    raise exception 'consume_ai_quota: profil pengguna tidak ditemukan'
      using errcode = '28000';
  end if;

  insert into public.ai_usage_daily as a
    (user_id, usage_date, parse_count, transcribe_count, updated_at)
  values (
    v_user_id,
    v_today,
    case when p_kind = 'parse'      then 1 else 0 end,
    case when p_kind = 'transcribe' then 1 else 0 end,
    now()
  )
  on conflict (user_id, usage_date) do update
    set parse_count      = a.parse_count      + case when p_kind = 'parse'      then 1 else 0 end,
        transcribe_count = a.transcribe_count + case when p_kind = 'transcribe' then 1 else 0 end,
        updated_at       = now()
  returning (case when p_kind = 'parse' then a.parse_count else a.transcribe_count end)
  into v_used;

  if v_used > p_limit then
    raise exception 'consume_ai_quota: kuota harian % habis (% dari %)', p_kind, v_used, p_limit
      using errcode = '53400';
  end if;

  return p_limit - v_used;
end;
$$;

revoke all on function public.consume_ai_quota(text, integer) from public, anon;
grant execute on function public.consume_ai_quota(text, integer) to authenticated, service_role;
