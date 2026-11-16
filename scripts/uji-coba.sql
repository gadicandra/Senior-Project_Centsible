-- Metrik uji coba pengguna (Issue #37, tujuan terukur di docs/index.md §a).
-- READ-ONLY. Jalankan sebagai owner (psql "$DIRECT_URL" -v start="'2026-12-01'" -v emails="'a@x,b@y'" -f scripts/uji-coba.sql).
--   :start  = tanggal hari ke-1 uji coba (YYYY-MM-DD, zona Asia/Jakarta)
--   :emails = email peserta dipisah koma (hanya peserta yang dihitung, akun tim/uji tidak ikut)
set default_transaction_read_only = on;

with peserta as (
  select u.id, u.email
  from public.users u
  where u.email = any (string_to_array(:emails, ','))
),
hari as (
  -- Hari ke-n tiap transaksi (1 = :start), berdasarkan waktu dicatat (created_at) di WIB,
  -- bukan occurred_at, supaya transaksi lama yang dimasukkan belakangan tidak dihitung "aktif".
  select t.user_id,
         ((t.created_at at time zone 'Asia/Jakarta')::date - :start::date) + 1 as n,
         t.source
  from public.transactions t
  join peserta p on p.id = t.user_id
  where (t.created_at at time zone 'Asia/Jakarta')::date between :start::date and :start::date + 13
),
per_user as (
  select p.email,
         count(h.*)                                         as transaksi,
         count(distinct h.n)                                as hari_aktif,
         max(h.n)                                           as hari_terakhir,
         bool_or(h.n between 7 and 14)                      as aktif_d7_14,
         bool_or(h.n >= 13)                                 as aktif_d13_14,
         count(*) filter (where h.source <> 'manual')       as via_ai
  from peserta p
  left join hari h on h.user_id = p.id
  group by p.email
)
select '1. per peserta' as bagian, email, transaksi, hari_aktif, hari_terakhir, aktif_d7_14, aktif_d13_14, via_ai
from per_user
order by email;

-- 2. Retensi (target: ≥ 60% masih mencatat sampai hari ke-14 → dihitung aktif di hari 13 atau 14).
with peserta as (select id from public.users where email = any (string_to_array(:emails, ','))),
akhir as (
  select distinct t.user_id
  from public.transactions t join peserta p on p.id = t.user_id
  where (t.created_at at time zone 'Asia/Jakarta')::date between :start::date + 12 and :start::date + 13
),
d7 as (
  select distinct t.user_id
  from public.transactions t join peserta p on p.id = t.user_id
  where (t.created_at at time zone 'Asia/Jakarta')::date between :start::date + 6 and :start::date + 13
)
select '2. retensi' as bagian,
       (select count(*) from peserta)                                                       as peserta,
       (select count(*) from d7)                                                            as aktif_minggu_2,
       (select count(*) from akhir)                                                         as aktif_hari_13_14,
       round(100.0 * (select count(*) from akhir) / nullif((select count(*) from peserta), 0), 1) as retensi_d14_persen;

-- 3. Akurasi AI dari data nyata (target ≥ 85% tanpa koreksi nominal & kategori; database.md §12).
select '3. akurasi ai' as bagian, e.model_version, e.input_mode,
       count(*) as total,
       count(*) filter (where not jsonb_exists(e.user_corrections, 'amount')
                          and not jsonb_exists(e.user_corrections, 'category')) as tanpa_koreksi,
       round(100.0 * count(*) filter (where not jsonb_exists(e.user_corrections, 'amount')
                                        and not jsonb_exists(e.user_corrections, 'category'))
             / nullif(count(*), 0), 1) as akurasi_persen,
       percentile_cont(0.95) within group (order by e.latency_ms)::int as latensi_p95_ms
from public.ai_extractions e
join public.users u on u.id = e.user_id
where u.email = any (string_to_array(:emails, ','))
  and (e.created_at at time zone 'Asia/Jakarta')::date between :start::date and :start::date + 13
group by 1, 2, 3
order by 2, 3;

-- 4. Ringkasan mingguan (target: tiap pengguna aktif dapat ringkasan + ≥ 1 saran).
select '4. ringkasan mingguan' as bagian, u.email,
       count(i.*)                                    as ringkasan,
       count(i.*) filter (where i.content like '%Saran:%') as dengan_saran,
       count(i.*) filter (where i.payload->>'model' <> 'template') as dari_ai
from public.users u
left join public.insights i
  on i.user_id = u.id and i.kind = 'weekly_summary'
 and i.period_start between :start::date - 7 and :start::date + 13
where u.email = any (string_to_array(:emails, ','))
group by u.email
order by u.email;
