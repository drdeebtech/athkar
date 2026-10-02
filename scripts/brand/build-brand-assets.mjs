/**
 * Builds the web brand kit from the original Higgsfield renders.
 *   node scripts/brand/build-brand-assets.mjs <source-dir> <project-root>
 * <source-dir> must contain logo.png, hero-rehal.png, hero-beads.png, og.png
 * (2K originals; job IDs are listed in docs/brand/README.md).
 */
import { existsSync } from "node:fs";
import sharp from "sharp";

const [S, OUT] = process.argv.slice(2);
if (!S || !OUT || !existsSync(S) || !existsSync(OUT)) {
  console.error("usage: node scripts/brand/build-brand-assets.mjs <source-dir> <project-root>");
  process.exit(1);
}
const SAND = { r: 244, g: 237, b: 224, alpha: 1 };

const trimmed = async (file) => sharp(await sharp(`${S}/${file}`).trim({ threshold: 10 }).png().toBuffer());

async function square(buf, size, pad, background) {
  const inner = Math.round(size * (1 - pad * 2));
  const fg = await sharp(buf).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: fg, gravity: "centre" }]);
}

const logo = await (await trimmed("logo.png")).png().toBuffer();
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
await (await square(logo, 512, 0.04, clear)).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(`${OUT}/src/app/icon.png`);
await (await square(logo, 180, 0.12, SAND)).flatten({ background: SAND }).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(`${OUT}/src/app/apple-icon.png`);
await (await square(logo, 192, 0.1, SAND)).flatten({ background: SAND }).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(`${OUT}/public/brand/icon-192.png`);
await (await square(logo, 512, 0.1, SAND)).flatten({ background: SAND }).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(`${OUT}/public/brand/icon-512.png`);
await (await square(logo, 512, 0.2, SAND)).flatten({ background: SAND }).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(`${OUT}/public/brand/icon-maskable-512.png`);
await sharp(logo).resize(160, 160, { fit: "contain", background: clear }).webp({ quality: 88, alphaQuality: 100 }).toFile(`${OUT}/public/brand/logo-mark.webp`);

// Hero widths (keep in step with ART in src/components/athkar/brand-art.tsx). The browser
// picks the smallest file that covers slot * devicePixelRatio, so the steps are sized for
// real phones: 560 for 2x phones, 720 for 2.6-3x Android, 800 and 880 for 3x iPhones and
// 2x desktops, 960 as the largest. Every width is resized from the same trimmed 2K original
// with the same encoder settings, so a width can be added without touching the others.
//
// Each width is written twice: WebP (the <img> fallback) and AVIF (the <source> in front of
// it). AVIF quality is not comparable with WebP quality, so it was chosen per image by scoring
// the AVIF against the lossless resize on sand and on the dark theme background. Shipped
// settings are at least as good as the WebP of the same width on whole-image RGB SSIM,
// edge-band RGB SSIM and p99 composite error, with p99.9 within 0.6 of a level at the smallest
// width: hero q80, beads q75. (q80 overshoots WebP quality for the beads; q75 still beats it
// on every measure above.) Measured against the WebP files:
//   rehal q80: 40-41% smaller; RGB SSIM 0.9905-0.9931 vs 0.9855-0.9891
//   beads q75: 32-33% smaller; RGB SSIM 0.9942-0.9956 vs 0.9925-0.9945
// WebP stores alpha almost losslessly (alphaQuality 90, |delta alpha| <= 1/255); AVIF alpha
// is lossier (p99 <= 3/255, max <= 10/255), which showed no halo or fringe in 3x crops over
// sand and dark. 4:2:0 chroma matches WebP; effort 9 is the slowest and smallest setting.
const HEROES = [
  ["hero-rehal.png", "hero-rehal", [560, 720, 800, 880, 960], 80],
  ["hero-beads.png", "hero-beads", [480, 640, 800], 75],
];
for (const [file, name, widths, avifQuality] of HEROES) {
  const t = await (await trimmed(file)).png().toBuffer();
  for (const w of widths) {
    await sharp(t).resize({ width: w }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(`${OUT}/public/brand/${name}-${w}.webp`);
    await sharp(t).resize({ width: w }).avif({ quality: avifQuality, effort: 9, chromaSubsampling: "4:2:0" }).toFile(`${OUT}/public/brand/${name}-${w}.avif`);
  }
}
await sharp(`${S}/og.png`).resize(1200, 630, { fit: "cover", position: "left" }).png().toFile(`${S}/og-bg-1200x630.png`);
console.log("done");
