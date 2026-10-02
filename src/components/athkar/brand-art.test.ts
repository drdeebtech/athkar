import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ART } from "./brand-art";

const BRAND = join(__dirname, "../../../public/brand");

describe("BrandArt intrinsic size", () => {
  // The width/height attributes reserve space before the image loads; a wrong
  // ratio shifts everything below the hero once it arrives.
  it.each(Object.entries(ART))("%s ratio matches every srcset file within 1px", async (name, art) => {
    for (const width of art.sizes) {
      const meta = await sharp(join(BRAND, `hero-${name}-${width}.webp`)).metadata();
      expect(meta.width).toBe(width);
      expect(Math.abs(Math.round(width * art.ratio) - (meta.height ?? 0))).toBeLessThanOrEqual(1);
    }
  });
});
