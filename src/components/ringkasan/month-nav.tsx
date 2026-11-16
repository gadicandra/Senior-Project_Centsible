import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatMonthLabel, shiftMonth } from "@/lib/summary";
import { cn } from "@/lib/utils";

// cn() wajib: tanpa tailwind-merge, `border-transparent` dari kelas dasar menang atas `border-border` varian outline.
const control = cn(buttonVariants({ variant: "outline", size: "sm" }));
// Di atas kartu gradien (PageHero): lingkaran putih transparan, teks putih.
const onHero = "inline-flex size-8 items-center justify-center rounded-full bg-white/15 text-hero-foreground hover:bg-white/25";

function MonthControl({
  target,
  currentMonth,
  label,
  icon,
  hero,
}: {
  target: string | null;
  currentMonth: string;
  label: string;
  icon: React.ReactNode;
  hero?: boolean;
}) {
  const cls = hero ? onHero : control;
  // Di batas rentang: bukan tautan dan tanpa nama aksesibel, hanya penjaga tata letak.
  if (!target) {
    return (
      <span aria-hidden="true" className={cn(cls, "pointer-events-none opacity-50")}>
        {icon}
      </span>
    );
  }
  return (
    <Link href={target === currentMonth ? "/ringkasan" : `/ringkasan?month=${target}`} aria-label={label} className={cls}>
      {icon}
    </Link>
  );
}

export function MonthNav({ month, currentMonth, hero }: { month: string; currentMonth: string; hero?: boolean }) {
  return (
    <nav aria-label="Pilih bulan" className="flex items-center gap-2">
      <MonthControl
        target={shiftMonth(month, -1, currentMonth)}
        currentMonth={currentMonth}
        label="Bulan sebelumnya"
        icon={<ChevronLeftIcon aria-hidden="true" />}
        hero={hero}
      />
      <p aria-live="polite" className={cn("min-w-32 text-center font-medium", hero && "text-sm")}>
        {formatMonthLabel(month)}
      </p>
      <MonthControl
        target={shiftMonth(month, 1, currentMonth)}
        currentMonth={currentMonth}
        label="Bulan berikutnya"
        icon={<ChevronRightIcon aria-hidden="true" />}
        hero={hero}
      />
    </nav>
  );
}
