import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import source from "../../../data/sources/azkar-db.json";
import { displayTitle, type SourceRow } from "./normalize";
import { plainReading } from "./text";

const ROOT = join(__dirname, "../../..");
const FONTS_DIR = join(ROOT, "src/fonts");

/** What scripts/fonts/build-fonts.py records in src/fonts/cmap.json for each shipped file. */
interface ShippedFont {
  readonly sha256: string;
  /** Code points the file maps, as "U+XXXX" or "U+XXXX-YYYY" ranges. */
  readonly cmap: readonly string[];
}

const SHIPPED: Readonly<Record<string, ShippedFont>> = JSON.parse(
  readFileSync(join(FONTS_DIR, "cmap.json"), "utf8"),
).fonts;

/** The reading face: adhkar text and the situation page title, both weights. */
const READING_FACE = ["AthkarNaskh-Regular.woff2", "AthkarNaskh-Bold.woff2"];
/** Every other text: the UI face in each shipped weight, and the display face. */
const UI_FACES = [
  "AthkarSansArabic-Regular.woff2",
  "AthkarSansArabic-Medium.woff2",
  "AthkarSansArabic-Bold.woff2",
  "BalooBhaijaan2-Variable.woff2",
];

function codepoints(ranges: readonly string[]): Set<number> {
  const points = new Set<number>();
  for (const r of ranges) {
    const [lo, hi] = r.replace("U+", "").split("-");
    for (let cp = Number.parseInt(lo, 16); cp <= Number.parseInt(hi ?? lo, 16); cp++) points.add(cp);
  }
  return points;
}

/** Every distinct character of `text` that `file` does not map. Line breaks and tabs are never drawn. */
function unmapped(file: string, text: string): string[] {
  const cmap = codepoints(SHIPPED[file]?.cmap ?? []);
  const missing = new Set<string>();
  for (const ch of text) {
    if (ch === "\n" || ch === "\r" || ch === "\t") continue;
    const cp = ch.codePointAt(0) ?? 0;
    if (!cmap.has(cp)) missing.add(`U+${cp.toString(16).toUpperCase().padStart(4, "0")} ${ch}`);
  }
  return [...missing];
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Comments never render, so they are not part of what the fonts must cover. */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const rows = source as SourceRow[];
/** Titles as the site shows them: displayTitle turns the source's presentation forms into base letters. */
const titles = rows.map((r) => displayTitle(r.category ?? "")).join("");
const zekr = rows.map((r) => r.zekr).join("");
const virtuesAndSources = rows.map((r) => `${r.description ?? ""}${r.reference ?? ""}`).join("");
const globalsCss = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
/** Text that CSS draws around the adhkar, such as ﴿ ﴾ around Quran. */
const cssContent = [...globalsCss.matchAll(/content:\s*"([^"]*)"/g)].map((m) => m[1]).join("");
const interfaceText = sourceFiles(join(ROOT, "src"))
  .map((f) => withoutComments(readFileSync(f, "utf8")))
  .join("");

describe("self-hosted font coverage", () => {
  it("records every shipped font file in cmap.json, unchanged since the build", () => {
    const files = readdirSync(FONTS_DIR).filter((f) => f.endsWith(".woff2")).sort();
    expect(Object.keys(SHIPPED).sort()).toEqual(files);
    for (const file of files) {
      const digest = createHash("sha256").update(readFileSync(join(FONTS_DIR, file))).digest("hex");
      expect(digest, `${file} differs from cmap.json; rerun scripts/fonts/build-fonts.py`).toBe(SHIPPED[file].sha256);
    }
  });

  it("injects ﴿ ﴾ around Quran with CSS, so they count as reading-face text", () => {
    expect(cssContent).toContain("﴿");
    expect(cssContent).toContain("﴾");
  });

  it.each(READING_FACE)("%s maps every zekr, with and without diacritics, and every title", (file) => {
    expect(unmapped(file, `${zekr}${plainReading(zekr)}${titles}${cssContent}`)).toEqual([]);
  });

  it.each(UI_FACES)("%s maps every interface string, virtue, source and title", (file) => {
    expect(unmapped(file, `${interfaceText}${virtuesAndSources}${titles}`)).toEqual([]);
  });

  it("ships the upstream license next to every font family", () => {
    const files = readdirSync(FONTS_DIR);
    // woff2 file prefix -> license of the upstream family it was built from
    const licenses: Record<string, string> = {
      AthkarNaskh: "OFL-ScheherazadeNew.txt",
      BalooBhaijaan2: "OFL-BalooBhaijaan2.txt",
      AthkarSansArabic: "OFL-IBMPlexSansArabic.txt",
    };
    const families = new Set(files.filter((f) => f.endsWith(".woff2")).map((f) => f.split("-")[0]));
    expect([...families].sort()).toEqual(Object.keys(licenses).sort());
    for (const license of Object.values(licenses)) expect(files).toContain(license);
  });

  it("never ships a font whose file name uses a Reserved Font Name (Plex, Scheherazade)", () => {
    const files = readdirSync(FONTS_DIR).filter((f) => f.endsWith(".woff2"));
    expect(files.filter((f) => /plex|scheherazade/i.test(f))).toEqual([]);
  });
});
