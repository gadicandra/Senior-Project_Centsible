/**
 * Kepala halaman bergaya kartu gradien (referensi desain). Angka utama opsional; `actions` di kanan atas.
 */
export function PageHero({
  title,
  subtitle,
  value,
  valueLabel,
  actions,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  valueLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="-mx-4 -mt-4 flex flex-col gap-1 rounded-b-[2rem] bg-gradient-to-b from-hero-from to-hero-to px-5 pt-6 pb-6 text-hero-foreground md:mx-0 md:mt-0 md:rounded-[2rem]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions}
      </div>
      {subtitle && <p className="text-sm text-hero-foreground/80">{subtitle}</p>}
      {value !== undefined && (
        <div className="mt-3">
          {valueLabel && <p className="text-sm text-hero-foreground/80">{valueLabel}</p>}
          <p className="text-3xl font-bold tracking-tight break-words tabular-nums">{value}</p>
        </div>
      )}
      {children}
    </section>
  );
}
