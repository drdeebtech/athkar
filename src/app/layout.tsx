import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AdsenseScript } from "@/components/athkar/ad-slot";
import { ReadingSettingsProvider } from "@/components/athkar/reading-settings";
import { SiteFooter } from "@/components/athkar/site-footer";
import { SiteHeader } from "@/components/athkar/site-header";
import { siteConfig } from "@/config/site";
import { PRE_PAINT_SCRIPT } from "@/lib/athkar/settings";
import "./globals.css";

// Fonts are self-hosted (src/fonts, OFL-licensed, built by scripts/fonts/build-fonts.py)
// so builds never fetch from Google Fonts. They are subset to the Arabic + Latin
// ranges in src/fonts/unicode-ranges.json; font-coverage.test.ts guards that.
// "Athkar Sans Arabic" is our subset of IBM Plex Sans Arabic, renamed because
// "Plex" is an OFL Reserved Font Name (see THIRD_PARTY_NOTICES.md).

const uiFont = localFont({
  variable: "--font-ui",
  src: [
    { path: "../fonts/AthkarSansArabic-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/AthkarSansArabic-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/AthkarSansArabic-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const displayFont = localFont({
  variable: "--font-baloo",
  src: [{ path: "../fonts/BalooBhaijaan2-Variable.woff2", weight: "400 800", style: "normal" }],
  display: "swap",
});

// Amiri is the largest family and mostly sits below the first screen, so it is
// not preloaded; a metric-matched serif fallback keeps layout shift low.
const zekrFont = localFont({
  variable: "--font-amiri",
  src: [
    { path: "../fonts/Amiri-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Amiri-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
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
