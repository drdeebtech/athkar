import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import source from "../../../data/sources/azkar-db.json";
import { ranges } from "../../fonts/unicode-ranges.json";

const ROOT = join(__dirname, "../../..");

function parseRanges(list: readonly string[]): [number, number][] {
  return list.map((r) => {
    const [lo, hi] = r.replace("U+", "").split("-");
    return [Number.parseInt(lo, 16), Number.parseInt(hi ?? lo, 16)];
  });
}

const KEPT = parseRanges(ranges);
const inKept = (cp: number) => KEPT.some(([lo, hi]) => cp >= lo && cp <= hi);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

/** Comments never render, so they are not part of what the fonts must cover. */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Every distinct non-whitespace character outside the kept ranges, with where it came from. */
function uncovered(text: string): string[] {
  const missing = new Set<string>();
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    const cp = ch.codePointAt(0) ?? 0;
    if (!inKept(cp)) missing.add(`U+${cp.toString(16).toUpperCase().padStart(4, "0")} ${ch}`);
  }
  return [...missing];
}

describe("self-hosted font coverage", () => {
  it("keeps every character used in the adhkar dataset", () => {
    const text = (source as { zekr: string; category: string; description?: string | null; reference?: string | null }[])
      .map((r) => `${r.zekr}${r.category}${r.description ?? ""}${r.reference ?? ""}`)
      .join("");
    expect(uncovered(text)).toEqual([]);
  });

  it("keeps every character in the interface source and CSS (incl. ﴿ ﴾ injected around Quran)", () => {
    const text = sourceFiles(join(ROOT, "src"))
      .map((f) => withoutComments(readFileSync(f, "utf8")))
      .join("");
    expect(text).toContain("﴿");
    expect(uncovered(text)).toEqual([]);
  });

  it("ships the upstream license next to every font family", () => {
    const files = readdirSync(join(ROOT, "src/fonts"));
    // woff2 file prefix -> license of the upstream family it was built from
    const licenses: Record<string, string> = {
      Amiri: "OFL-Amiri.txt",
      BalooBhaijaan2: "OFL-BalooBhaijaan2.txt",
      AthkarSansArabic: "OFL-IBMPlexSansArabic.txt",
    };
    const families = new Set(files.filter((f) => f.endsWith(".woff2")).map((f) => f.split("-")[0]));
    expect([...families].sort()).toEqual(Object.keys(licenses).sort());
    for (const license of Object.values(licenses)) expect(files).toContain(license);
  });

  it("never ships a font whose file name uses the reserved name Plex", () => {
    const files = readdirSync(join(ROOT, "src/fonts")).filter((f) => f.endsWith(".woff2"));
    expect(files.filter((f) => /plex/i.test(f))).toEqual([]);
  });
});
