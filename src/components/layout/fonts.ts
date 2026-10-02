import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

// Plus Jakarta Sans = typeface tunggal hasil keputusan desain (Issue #12).
export const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
