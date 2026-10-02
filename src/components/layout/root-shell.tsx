import { Toaster } from "@/components/ui/sonner";
import { fontMono, fontSans } from "./fonts";

export function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
