import type { Metadata, Viewport } from "next";
import { Amiri, Baloo_Bhaijaan_2, IBM_Plex_Sans_Arabic } from "next/font/google";
import { AdsenseScript } from "@/components/athkar/ad-slot";
import { ReadingSettingsProvider } from "@/components/athkar/reading-settings";
import { SiteFooter } from "@/components/athkar/site-footer";
import { SiteHeader } from "@/components/athkar/site-header";
import { siteConfig } from "@/config/site";
import { PRE_PAINT_SCRIPT } from "@/lib/athkar/settings";
import "./globals.css";

const uiFont = IBM_Plex_Sans_Arabic({
  variable: "--font-ui",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const displayFont = Baloo_Bhaijaan_2({
  variable: "--font-baloo",
  subsets: ["arabic"],
  weight: ["500", "700", "800"],
  display: "swap",
});

const zekrFont = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} | ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ede0" },
    { media: "(prefers-color-scheme: dark)", color: "#16231f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${uiFont.variable} ${displayFont.variable} ${zekrFont.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs synchronously before first paint; PRE_PAINT_SCRIPT is a build-time constant. */}
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
        <AdsenseScript />
      </head>
      <body className="flex min-h-dvh flex-col">
        <ReadingSettingsProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
          >
            تخطَّ إلى المحتوى
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </ReadingSettingsProvider>
      </body>
    </html>
  );
}
