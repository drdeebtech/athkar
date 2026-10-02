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
 * Athkar Naskh is much wider than the fonts a phone draws while it loads, so each
 * fallback is scaled with size-adjust to take the same width, and the text keeps
 * its line breaks when the face swaps in.
 *
 * size-adjust is width(Athkar Naskh) / width(fallback), both in em, shaped with
 * HarfBuzz (uharfbuzz 0.56.2, RTL, default features) over every zekr line as the
 * page shows it (with ﴿ ﴾ and (( )) drawn in) plus every situation title:
 * - 400: all zekr text in AthkarNaskh-Regular. 700: all zekr text and titles in
 *   AthkarNaskh-Bold (the title is always bold; the zekr is bold in bold mode).
 * - Times New Roman (iPhone, Mac, Windows): /System/Library/Fonts/Supplemental/
 *   Times New Roman.ttf and Times New Roman Bold.ttf on macOS 27. 400: 1.141 (pages
 *   1.07 to 1.26). 700: 1.161 (titles alone 1.132, bold zekr 1.164).
 * - Noto Naskh Arabic (Android's Arabic serif): NotoNaskhArabic[wght].ttf from
 *   google/fonts 9710da1, at wght 400 and 700. 400: 1.043. 700: 1.038.
 * Neither fallback is missing a glyph for this text.
 *
 * Times New Roman then ships at 113% and 115%, a step under the HarfBuzz ratios,
 * because Chromium (Playwright, macOS) lines the text up better there. Over 480
 * zekr paragraphs at 360px, the paragraphs whose line count changes on the swap:
 * 112/114: 54, 113/115: 50, 114.1/116.1: 55 (the 1.75rem size), and 83 / 73 / 73 at
 * 2.4rem, with the fewest first-screen changes at 113/115 (21 and 29 pages). With
 * every font held 2.5s, CLS on /athkar/1 at 360px was 0.0018 at 113% against 0.13
 * at 114.1%. Noto Naskh Arabic is not installed on the Mac that measured, so it
 * keeps the HarfBuzz ratio.
 *
 * The line height is fixed (2.05 and 1.6), but a text run's box is its font's
 * ascent plus descent, so a fallback with other vertical metrics moves every line
 * of text by a few pixels when the face swaps in. Chromium counts that as layout
 * shift: without the overrides, /athkar/1 at 360px scored 0.16. The overrides give
 * each fallback Athkar Naskh's metrics (ascent 2750, descent 1427, line gap 0 per
 * 2048 units, the same in both weights and in hhea and OS/2 typo, which it marks
 * USE_TYPO_METRICS), divided by size-adjust because the browser scales them by it.
 */
const FALLBACKS: FallbackFace[] = [
  {
    family: '"Athkar Naskh Fallback Times"',
    weight: "400",
    src: 'local("Times New Roman"), local("TimesNewRomanPSMT")',
    sizeAdjust: "113%",
    ascent: "118.83%",
    descent: "61.66%",
    lineGap: "0%",
  },
  {
    family: '"Athkar Naskh Fallback Times"',
    weight: "700",
    src: 'local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT")',
    sizeAdjust: "115%",
    ascent: "116.76%",
    descent: "60.59%",
    lineGap: "0%",
  },
  {
    family: '"Athkar Naskh Fallback Noto"',
    weight: "400",
    src: 'local("Noto Naskh Arabic Regular"), local("NotoNaskhArabic-Regular"), local("Noto Naskh Arabic")',
    sizeAdjust: "104.3%",
    ascent: "128.74%",
    descent: "66.81%",
    lineGap: "0%",
  },
  {
    family: '"Athkar Naskh Fallback Noto"',
    weight: "700",
    src: 'local("Noto Naskh Arabic Bold"), local("NotoNaskhArabic-Bold")',
    sizeAdjust: "103.8%",
    ascent: "129.36%",
    descent: "67.13%",
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
