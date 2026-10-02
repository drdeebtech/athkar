import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../..");
const CSS = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

type Oklch = [number, number, number];

/** Opaque oklch() tokens declared directly in a top-level block such as ":root" or ".dark". */
function tokens(selector: string): Record<string, Oklch> {
  const start = CSS.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  const body = CSS.slice(start, CSS.indexOf("\n}", start));
  const out: Record<string, Oklch> = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

/** WCAG relative luminance of an OKLCH colour (OKLab -> linear sRGB, gamut-clipped). */
function luminance([L, C, h]: Oklch): number {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (v: number) => Math.min(1, Math.max(0, v));
  const r = clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

const contrast = (x: Oklch, y: Oklch) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT_PAIRS: [string, string][] = [
  ["foreground", "card"],
  ["foreground", "background"],
  ["primary", "card"],
  ["primary", "background"],
  ["primary-foreground", "primary"],
  ["destructive", "card"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "secondary"],
  ["quran", "card"],
  ["hadith", "card"],
];
/** Secondary text (labels, sources, counts) on the surfaces it sits on: AAA, for phones in daylight. */
const AAA_TEXT_PAIRS: [string, string][] = [
  ["muted-foreground", "card"],
  ["muted-foreground", "background"],
  // The virtue/source panel and done cards (clay-inset, --clay: var(--muted)).
  ["muted-foreground", "muted"],
];
const RING_SURFACES = ["background", "card", "muted", "secondary"];

describe.each([":root", ".dark"])("%s colour contrast (WCAG 2.2 AA)", (selector) => {
  const t = tokens(selector);

  it.each(TEXT_PAIRS)("%s text on %s is at least 4.5:1", (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(AAA_TEXT_PAIRS)("%s text on %s is at least 7:1", (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(7);
  });

  it.each(RING_SURFACES)("focus ring on %s is at least 3:1", (bg) => {
    expect(contrast(t.ring, t[bg])).toBeGreaterThanOrEqual(3);
  });
});

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx|css)$/.test(name) ? [path] : [];
  });
}

describe("hadith is not marked by colour alone (WCAG 1.4.1)", () => {
  // Hadith against plain text is about 2:1 in light and 1.35:1 in dark, so colour
  // alone does not set it apart. The brackets have empty alternative text, so
  // screen readers do not read them, and copied or shared text is unchanged.
  it.each([
    ["before", "(("],
    ["after", "))"],
  ])("draws %s each hadith span %s, hidden from screen readers", (side, marks) => {
    const rule = new RegExp(`\\.seg-hadith::${side}\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ?? "";
    expect(rule).toContain(`content: "${marks}";`);
    expect(rule).toContain(`content: "${marks}" / "";`);
  });
});

describe("no faded focus rings or placeholder text", () => {
  it("never lowers the opacity of the ring or placeholder colours", () => {
    const offending = sources(join(ROOT, "src")).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/(?:ring-ring|outline-ring|placeholder:text-[a-z-]+)\/\d+/g)].map(
        (m) => `${file.replace(ROOT + "/", "")}: ${m[0]}`,
      ),
    );
    expect(offending).toEqual([]);
  });
});
