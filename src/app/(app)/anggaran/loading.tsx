export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Anggaran</h1>
      <span className="sr-only">Memuat anggaran…</span>
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
