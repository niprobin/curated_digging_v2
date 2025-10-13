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
  title: "Curated Music To-do",
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
    title: "Curated Music",
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
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
            <footer className="border-t border-border bg-card/70">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 text-sm text-muted-foreground">
                <span>&copy; {year} Curated Music</span>
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-info" aria-hidden />
                  <span>Version 2 preview</span>
                </span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
