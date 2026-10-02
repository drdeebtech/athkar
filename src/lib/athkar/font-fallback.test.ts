import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "../..");
const CSS = readFileSync(join(SRC, "app/globals.css"), "utf8");
const LAYOUT = readFileSync(join(SRC, "app/athkar/[id]/layout.tsx"), "utf8");

interface FallbackFace {
  readonly family: string;
  readonly weight: string;
  readonly src: string;
  readonly sizeAdjust: string;
  readonly ascent: string;
  readonly descent: string;
  readonly lineGap: string;
}

/** Every @font-face rule in globals.css, with the descriptors the fallback relies on. */
function fontFaces(): FallbackFace[] {
  return [...CSS.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
    const get = (name: string) => new RegExp(`(?:^|;)\\s*${name}:\\s*([^;]+);`).exec(body)?.[1].trim() ?? "";
    return {
      family: get("font-family"),
      weight: get("font-weight"),
      src: get("src"),
      sizeAdjust: get("size-adjust"),
      ascent: get("ascent-override"),
      descent: get("descent-override"),
      lineGap: get("line-gap-override"),
    };
  });
}

/*
 * Athkar Naskh (our subset of Noto Naskh Arabic) is wider than Times New Roman,
 * the font iPhone, Mac and Windows draw while it loads, so that fallback is scaled
 * with size-adjust to take the same width, and the text keeps its line breaks when
 * the face swaps in. Android draws Noto Naskh Arabic itself, the font Athkar Naskh
 * is built from, so that fallback is not scaled.
 *
 * Times New Roman's size-adjust is width(Athkar Naskh) / width(Times New Roman),
 * both in em, shaped with HarfBuzz (uharfbuzz 0.56.2, RTL, default features) over
 * every zekr line in the dataset; the 700 value also counts every situation title
 * (the title is always bold; the zekr is bold in bold mode). Sources: the shipped
 * AthkarNaskh-*.woff2 and /System/Library/Fonts/Supplemental/Times New Roman.ttf
 * and Times New Roman Bold.ttf on macOS 27. 400: 1.094. 700: 1.119 (titles alone
 * 1.116). Neither fallback is missing a glyph for this text.
 *
 * Chromium (Playwright, macOS) agrees: over the zekr paragraphs of 45 situation
 * pages in four settings (360px at 1.75rem, 2.4rem and bold, 390px at 1.25rem), the
 * paragraphs whose line count changes on the swap number 78 / 64 / 57 / 55 / 66 for
 * 106.4 / 107.4 / 108.4 / 109.4 / 110.4% (700 two points higher), the fewest at the
 * HarfBuzz ratio. A page can still shift when one word sits on a line-break edge
 * (with every font held 2.5s, /athkar/1 at 360px scores about 0.15 at all five).
 *
 * The line height is fixed (2.05 and 1.6), but a text run's box is its font's
 * ascent plus descent, so a fallback with other vertical metrics moves every line
 * of text by a few pixels when the face swaps in, which Chromium counts as layout
 * shift. The overrides give each fallback Athkar Naskh's metrics (ascent 1069,
 * descent 634, line gap 0 per 1000 units, the same in both weights and in hhea and
 * OS/2 typo, which it marks USE_TYPO_METRICS), divided by size-adjust because the
 * browser scales them by it.
 */
const FALLBACKS: FallbackFace[] = [
  {
    family: '"Athkar Naskh Fallback Times"',
    weight: "400",
    src: 'local("Times New Roman"), local("TimesNewRomanPSMT")',
    sizeAdjust: "109.4%",
    ascent: "97.71%",
    descent: "57.95%",
    lineGap: "0%",
  },
  {
    family: '"Athkar Naskh Fallback Times"',
    weight: "700",
    src: 'local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT")',
    sizeAdjust: "111.9%",
    ascent: "95.53%",
    descent: "56.66%",
    lineGap: "0%",
  },
  {
    family: '"Athkar Naskh Fallback Noto"',
    weight: "400",
    src: 'local("Noto Naskh Arabic Regular"), local("NotoNaskhArabic-Regular"), local("Noto Naskh Arabic")',
    sizeAdjust: "100%",
    ascent: "106.9%",
    descent: "63.4%",
    lineGap: "0%",
  },
  {
    family: '"Athkar Naskh Fallback Noto"',
    weight: "700",
    src: 'local("Noto Naskh Arabic Bold"), local("NotoNaskhArabic-Bold")',
    sizeAdjust: "100%",
    ascent: "106.9%",
    descent: "63.4%",
    lineGap: "0%",
  },
];

describe("reading face fallback", () => {
  it("turns off next/font's generated fallback, which is sized for Latin text", () => {
    // next/font sizes its generated fallback from the average width of Latin a-z
    // (size-adjust 92% here), so Times New Roman drew the Arabic about 20% narrower
    // than Athkar Naskh and the text gained lines when the face swapped in.
    expect(LAYOUT).toMatch(/adjustFontFallback:\s*false/);
  });

  it("declares a fallback face per family and weight, matched to Athkar Naskh's width and metrics", () => {
    expect(fontFaces()).toEqual(FALLBACKS);
  });

  it("lists the fallbacks right after the reading face", () => {
    expect(CSS).toMatch(
      /--font-zekr:\s*var\(--font-naskh\),\s*"Athkar Naskh Fallback Times",\s*"Athkar Naskh Fallback Noto",/,
    );
  });
});
