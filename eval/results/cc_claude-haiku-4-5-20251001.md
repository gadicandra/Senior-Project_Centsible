# Evaluasi AI — openai-compatible:cc/claude-haiku-4-5-20251001@p1

Tanggal: 2026-11-15 · Dataset: 99 kalimat (`eval/ai-dataset.jsonl`) · Target: nominal **dan** kategori benar ≥ 85%

| Isian | Benar | Akurasi |
|---|---|---|
| Nominal | 99/99 | 100.0% |
| Jenis | 99/99 | 100.0% |
| Kategori | 88/99 | 88.9% |
| **Nominal + kategori** | **88/99** | **88.9%** ✅ |
| Gagal dibaca (fallback form manual) | 0/99 | 0.0% |

Latensi per kalimat: p50 969 ms · p95 1319 ms

## Salah (11)

| Kalimat | Harapan | Hasil |
|---|---|---|
| traktir temen ultah gocap | 50000 · Makan | 50000 · Hiburan |
| galon air minum 20rb | 20000 · Makan | 20000 · Lain-lain |
| servis motor ganti oli 65rb | 65000 · Transport | 65000 · Lain-lain |
| tiket pesawat mudik 1,2jt | 1200000 · Transport | 1200000 · Lain-lain |
| laundry kiloan 24rb | 24000 · Kos | 24000 · Lain-lain |
| beli sabun sampo odol 35rb | 35000 · Kos | 35000 · Lain-lain |
| nge-gym bulanan 150rb | 150000 · Hiburan | 150000 · Kesehatan |
| beli kacamata 450k | 450000 · Kesehatan | 450000 · Lain-lain |
| kirim paket ke rumah 18rb | 18000 · Lain-lain | 18000 · Transport |
| kemarin lusa bayar wifi 300k | 300000 · Kos | 300000 · Lain-lain |
| minggu lalu beli sepatu futsal 275rb | 275000 · Hiburan | 275000 · Lain-lain |
