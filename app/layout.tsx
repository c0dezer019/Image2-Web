import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

const spaceGrotesk = localFont({
  src: "../public/fonts/SpaceGrotesk-VariableFont_wght.ttf",
  weight: "300 700",
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmMono = localFont({
  src: [
    { path: "../public/fonts/DMMono-Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/DMMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/DMMono-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Image2",
  description: "Turn any image into ASCII or ANSI text art.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmMono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
