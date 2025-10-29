import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const year = new Date().getFullYear();

export const metadata: Metadata = {
  title: "Curated Digging",
  description:
    "Keep track of new music from playlists and albums, with persistent filters and quick history.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png" },
      { url: "/icon-512.png" },
    ],
    apple: "/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    title: "Curated Digging",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Script src="https://kit.fontawesome.com/cd85a69654.js" crossOrigin="anonymous" async />
        <Providers>
          <div className="flex min-h-screen">
            <SiteHeader />
            <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-6 pl-16 md:pl-20">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
