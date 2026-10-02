import { statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ART, BrandArt, SLOT_SIZES } from "./brand-art";

const BRAND = join(__dirname, "../../../public/brand");
const fileFor = (name: keyof typeof ART, width: number) => join(BRAND, `hero-${name}-${width}.webp`);

describe("BrandArt intrinsic size", () => {
  // The width/height attributes reserve space before the image loads; a wrong
  // ratio shifts everything below the hero once it arrives.
  it.each(Object.entries(ART))("%s ratio matches every srcset file within 1px", async (name, art) => {
    for (const width of art.sizes) {
      const meta = await sharp(fileFor(name as keyof typeof ART, width)).metadata();
      expect(meta.width).toBe(width);
      expect(Math.abs(Math.round(width * art.ratio) - (meta.height ?? 0))).toBeLessThanOrEqual(1);
    }
  });

  // A variant that is a renamed copy of a bigger one would make phones pay for
  // pixels they never see, so every step down must really be smaller.
  it.each(Object.entries(ART))("%s widths ascend and each file is smaller than the next", (name, art) => {
    const widths = [...art.sizes];
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
    expect(new Set(widths).size).toBe(widths.length);
    const bytes = widths.map((w) => statSync(fileFor(name as keyof typeof ART, w)).size);
    expect(bytes).toEqual([...bytes].sort((a, b) => a - b));
    expect(new Set(bytes).size).toBe(bytes.length);
  });
});

describe("BrandArt markup", () => {
  const html = (props: Parameters<typeof BrandArt>[0]) => renderToStaticMarkup(createElement(BrandArt, props));

  it("lists every width in srcset and keeps the largest as src and intrinsic size", () => {
    for (const [name, art] of Object.entries(ART)) {
      const out = html({ name: name as keyof typeof ART });
      const largest = art.sizes[art.sizes.length - 1];
      const srcset = art.sizes.map((w) => `/brand/hero-${name}-${w}.webp ${w}w`).join(", ");
      expect(out).toContain(`srcSet="${srcset}"`);
      expect(out).toContain(`src="/brand/hero-${name}-${largest}.webp"`);
      expect(out).toContain(`width="${largest}"`);
      expect(out).toContain(`height="${Math.round(largest * art.ratio)}"`);
    }
  });

  it("stays decorative and only the priority image loads eagerly at high priority", () => {
    const lazy = html({ name: "beads" });
    expect(lazy).toContain('alt=""');
    expect(lazy).toContain('aria-hidden="true"');
    expect(lazy).toContain('loading="lazy"');
    expect(lazy).not.toContain('fetchPriority="high"');
    const hero = html({ name: "rehal", priority: true });
    expect(hero).toContain('loading="eager"');
    expect(hero).toContain('fetchPriority="high"');
  });
});

/**
 * What a browser downloads: it resolves `sizes` to a slot width in CSS px, multiplies
 * by the device pixel ratio and takes the smallest srcset candidate that is at least
 * that wide (the largest if none is).
 */
function slotFromSizes(sizes: string, viewport: number): number {
  for (const clause of sizes.split(",").map((c) => c.trim())) {
    const media = /^\(min-width: (\d+)px\) (.+)$/.exec(clause);
    if (media && viewport < Number(media[1])) continue;
    const value = media ? media[2] : clause;
    const px = /^([\d.]+)px$/.exec(value);
    if (px) return Number(px[1]);
    const calc = /^calc\(([\d.]+)vw - ([\d.]+)px\)$/.exec(value);
    if (calc) return (viewport * Number(calc[1])) / 100 - Number(calc[2]);
    throw new Error(`unsupported sizes clause: ${clause}`);
  }
  throw new Error(`no sizes clause matches ${viewport}px`);
}

const candidate = (name: keyof typeof ART, sizes: string, viewport: number, dpr: number) => {
  const need = slotFromSizes(sizes, viewport) * dpr;
  return ART[name].sizes.find((w) => w >= need) ?? ART[name].sizes[ART[name].sizes.length - 1];
};

/** Rendered width of each image, read from the layout classes at its call site. */
const LAYOUT = {
  // src/app/page.tsx: section px-3 > clay px-5 (sm:px-10) > w-[min(78%,22rem)]; from md a
  // 1.15fr/1fr grid inside max-w-5xl with 2rem of padding on each side and a 0.5rem gap.
  homeHero: (vw: number) =>
    vw < 768
      ? Math.min(352, 0.78 * (vw - (vw < 640 ? 64 : 104)))
      : (Math.min(vw - 24, 1024) - 88) / 2.15,
  // src/app/sources/page.tsx: w-40 sm:w-52.
  sourcesBeads: (vw: number) => (vw < 640 ? 160 : 208),
  // src/app/not-found.tsx: max-w-xl px-4 > clay px-6 > w-[min(80%,20rem)].
  notFoundBeads: (vw: number) => Math.min(320, 0.8 * (Math.min(vw, 576) - 80)),
} as const;

describe("slot sizes", () => {
  const cases = [
    ["homeHero", "rehal"],
    ["sourcesBeads", "beads"],
    ["notFoundBeads", "beads"],
  ] as const;

  // A sizes value below the real width makes the browser pick a file that is too
  // small, which shows as a soft image.
  it.each(cases)("%s never claims less than the rendered width", (key) => {
    for (let vw = 320; vw <= 1920; vw++) {
      expect(slotFromSizes(SLOT_SIZES[key], vw)).toBeGreaterThanOrEqual(LAYOUT[key](vw) - 0.01);
    }
  });

  // Below the tablet breakpoint the claim must also be tight, otherwise phones
  // keep downloading a bigger file than they can show.
  it.each(cases)("%s is exact on phones", (key) => {
    for (let vw = 320; vw < 768; vw++) {
      expect(slotFromSizes(SLOT_SIZES[key], vw)).toBeLessThanOrEqual(LAYOUT[key](vw) + 0.5);
    }
  });

  // [viewport CSS px, device pixel ratio, expected hero file width]
  it.each([
    [360, 2, 560],
    [390, 2, 560],
    [412, 2, 560],
    [430, 2, 720],
    [360, 3, 720],
    [412, 2.625, 720],
    [390, 3, 800],
    [402, 3, 800],
    [430, 3, 880],
    [768, 2, 880],
    [1280, 1, 560],
    [1280, 2, 880],
  ])("home hero at %ipx x%f downloads the %i px file", (viewport, dpr, width) => {
    expect(candidate("rehal", SLOT_SIZES.homeHero, viewport, dpr)).toBe(width);
  });

  it.each([
    [390, 2, 480],
    [390, 3, 480],
    [768, 2, 480],
    [768, 3, 640],
  ])("sources beads at %ipx x%f download the %i px file", (viewport, dpr, width) => {
    expect(candidate("beads", SLOT_SIZES.sourcesBeads, viewport, dpr)).toBe(width);
  });

  it.each([
    [390, 2, 640],
    [390, 3, 800],
    [768, 2, 640],
  ])("404 beads at %ipx x%f download the %i px file", (viewport, dpr, width) => {
    expect(candidate("beads", SLOT_SIZES.notFoundBeads, viewport, dpr)).toBe(width);
  });
});
