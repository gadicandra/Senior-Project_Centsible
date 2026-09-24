import type { Metadata } from "next";
import { RootShell } from "@/components/layout/root-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centsible",
  description: "Pencatat keuangan mahasiswa berbasis AI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <RootShell>{children}</RootShell>;
}
