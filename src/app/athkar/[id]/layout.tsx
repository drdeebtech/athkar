import localFont from "next/font/local";

// The reading face ("Athkar Naskh", our renamed subset of Scheherazade New; see
// src/app/layout.tsx) sets the title and the adhkar, and nothing outside situation
// pages uses it. Declaring it in this layout makes Next preload it on these pages
// only, where the title is on the first screen, and keeps it off every other page.
// The Times New Roman fallback gets size-adjusted metrics, so the swap moves little.
const naskhFont = localFont({
  variable: "--font-naskh",
  src: [
    { path: "../../../fonts/AthkarNaskh-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../../fonts/AthkarNaskh-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export default function SituationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={naskhFont.variable}>{children}</div>;
}
