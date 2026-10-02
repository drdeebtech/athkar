import localFont from "next/font/local";

// The reading face ("Athkar Naskh", our renamed subset of Scheherazade New; see
// src/app/layout.tsx) sets the title and the adhkar, and nothing outside situation
// pages uses it. Declaring it in this layout makes Next preload it on these pages,
// where the title is on the first screen, and keeps it out of every other page's
// HTML and CSS. A page that prefetches situation links (the home page's quick
// links and section grid, search results) still fetches the files after its load
// event, from the font hints in the prefetched route, which warms the cache for
// the next page.
// next/font would size its fallback from Latin letter widths, about 20% too narrow
// for this Arabic text, so it is turned off. The width-matched fallbacks (Times New
// Roman, Noto Naskh Arabic) follow var(--font-naskh) in --font-zekr in globals.css.
const naskhFont = localFont({
  variable: "--font-naskh",
  src: [
    { path: "../../../fonts/AthkarNaskh-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../../fonts/AthkarNaskh-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: false,
});

export default function SituationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={naskhFont.variable}>{children}</div>;
}
