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

for (const [file, name, widths] of [["hero-rehal.png", "hero-rehal", [560, 960]], ["hero-beads.png", "hero-beads", [480, 800]]]) {
  const t = await (await trimmed(file)).png().toBuffer();
  for (const w of widths) {
    await sharp(t).resize({ width: w }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(`${OUT}/public/brand/${name}-${w}.webp`);
  }
}
await sharp(`${S}/og.png`).resize(1200, 630, { fit: "cover", position: "left" }).png().toFile(`${S}/og-bg-1200x630.png`);
console.log("done");
