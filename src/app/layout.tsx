import type { Metadata } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

import { getLang } from "@/lib/i18n";
import { buildMetadata, siteUrl } from "@/lib/metadata";

// PRD §4.1 — one typeface with full Devanagari coverage for BOTH languages.
// Default web fonts render Nepali as empty boxes on many devices, and
// mixing a Latin font with a Devanagari fallback makes the two scripts look
// like two different websites stitched together. Noto Sans Devanagari
// ships Latin glyphs too, so it carries the whole site.
const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari", "latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  ...buildMetadata(),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // PRD §4 — language comes from the `lang` cookie, default Nepali.
  const lang = await getLang();

  return (
    <html
      lang={lang}
      className={`${notoSansDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
