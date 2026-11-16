import { Toaster } from "@/components/ui/sonner";
import { fontMono, fontSans } from "./fonts";

export function RootShell({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: hanya untuk atribut <html> ini. Ekstensi browser (mis. pemantau error)
    // menyisipkan data-* di <html> sebelum React jalan; isi halaman tetap diperiksa normal.
    <html
      lang="id"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
