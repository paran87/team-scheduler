import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Fraunces, Playfair_Display, Sora } from "next/font/google";
import { TeamRosterProvider } from "@/components/TeamRosterProvider";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import "./globals.css";
import "./calendar-theme.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-playfair",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: BRAND_TAGLINE,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable} ${fraunces.variable} ${sora.variable}`}>
      <body className={dmSans.className}>
        <TeamRosterProvider>{children}</TeamRosterProvider>
      </body>
    </html>
  );
}
