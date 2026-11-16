import type { Metadata, Viewport } from "next";
import { RootShell } from "@/components/layout/root-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centsible",
  description: "Pencatat keuangan mahasiswa berbasis AI",
  appleWebApp: { title: "Centsible", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#171717" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <RootShell>{children}</RootShell>;
}
