export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ringkasan</h1>
      <span className="sr-only">Memuat ringkasan…</span>
      <div className="h-28 animate-pulse rounded-lg bg-muted" />
      <div className="h-20 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
