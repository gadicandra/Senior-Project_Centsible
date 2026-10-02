export function HomeScreen({ displayName }: { displayName: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Halo, {displayName}</h1>
      <p className="text-muted-foreground">Ringkasan keuangan akan tampil di sini (Issue #30).</p>
    </div>
  );
}
