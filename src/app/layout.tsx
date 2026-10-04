import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_Devanagari } from "next/font/google";
import { BRAND_NAME } from "@/lib/brand";
import { getLocale } from "@/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Hindi text renders in Noto Sans Devanagari on every phone.
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Buy milk tokens for fresh desi cow milk delivered daily",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3f7d20",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={await getLocale()} className={`${geistSans.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
