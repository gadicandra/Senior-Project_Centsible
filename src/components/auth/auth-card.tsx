import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/** Halaman masuk/daftar/reset: kartu putih di atas gradien merek (redesain 16 Nov). */
export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 flex-col items-center px-4 pt-14 pb-12">
      <div aria-hidden className="absolute inset-x-0 top-0 h-72 rounded-b-[2.5rem] bg-gradient-to-b from-hero-from to-hero-to" />
      <div className="relative mb-6 flex flex-col items-center gap-1 text-hero-foreground">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 text-3xl font-bold" aria-hidden>
          ¢
        </span>
        <p className="text-lg font-bold">Centsible</p>
      </div>
      <Card className="relative w-full max-w-sm rounded-3xl shadow-xl shadow-primary/10">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>}
      </Card>
    </main>
  );
}
