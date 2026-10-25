import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatMonthLabel, shiftMonth } from "@/lib/summary";
import { cn } from "@/lib/utils";

const control = buttonVariants({ variant: "outline", size: "sm" });

function MonthControl({ target, currentMonth, label, icon }: { target: string | null; currentMonth: string; label: string; icon: React.ReactNode }) {
  // Di batas rentang: bukan tautan dan tanpa nama aksesibel, hanya penjaga tata letak.
  if (!target) {
    return (
      <span aria-hidden="true" className={cn(control, "pointer-events-none opacity-50")}>
        {icon}
      </span>
    );
  }
  return (
    <Link href={target === currentMonth ? "/ringkasan" : `/ringkasan?month=${target}`} aria-label={label} className={control}>
      {icon}
    </Link>
  );
}

export function MonthNav({ month, currentMonth }: { month: string; currentMonth: string }) {
  return (
    <nav aria-label="Pilih bulan" className="flex items-center gap-2">
      <MonthControl
        target={shiftMonth(month, -1, currentMonth)}
        currentMonth={currentMonth}
        label="Bulan sebelumnya"
        icon={<ChevronLeftIcon aria-hidden="true" />}
      />
      <p aria-live="polite" className="min-w-32 text-center font-medium">
        {formatMonthLabel(month)}
      </p>
      <MonthControl
        target={shiftMonth(month, 1, currentMonth)}
        currentMonth={currentMonth}
        label="Bulan berikutnya"
        icon={<ChevronRightIcon aria-hidden="true" />}
      />
    </nav>
  );
}
