import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = __dirname;
const SCRIPT = readFileSync(join(DIR, "build-fonts.py"), "utf8");
const REQUIREMENTS = readFileSync(join(DIR, "requirements.txt"), "utf8");

/** The string keys of a top-level Python dict literal `NAME = { "key": ..., }` in build-fonts.py. */
function dictKeys(name: string): string[] {
  const body = new RegExp(`^${name} = \\{([\\s\\S]*?)^\\}`, "m").exec(SCRIPT)?.[1] ?? "";
  return [...body.matchAll(/^\s*"([^"]+)":/gm)].map((m) => m[1]);
}

describe("font build reproducibility", () => {
  it("pins every Python package the build needs to an exact version", () => {
    const lines = REQUIREMENTS.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    expect(lines.map((l) => l.split("==")[0]).sort()).toEqual(["brotli", "fonttools", "uharfbuzz"]);
    for (const line of lines) expect(line).toMatch(/^[a-z]+==\d+(\.\d+)+$/);
  });

  it("checks the SHA-256 of every upstream source it builds from", () => {
    const inputs = dictKeys("INPUT_SHA256");
    const fonts = /^FONTS = \[([\s\S]*?)^\]/m.exec(SCRIPT)?.[1] ?? "";
    const sources = [...new Set([...fonts.matchAll(/^\s*\("([^"]+)",/gm)].map((m) => m[1]))];
    expect(sources).not.toEqual([]);
    expect(inputs).toEqual(sources);
    const body = /^INPUT_SHA256 = \{([\s\S]*?)^\}/m.exec(SCRIPT)?.[1] ?? "";
    expect([...body.matchAll(/"([0-9a-f]{64})"/g)]).toHaveLength(inputs.length);
  });

  it("refuses to build without uharfbuzz, which the committed bytes depend on", () => {
    expect(SCRIPT).toMatch(/import uharfbuzz/);
    expect(SCRIPT).toContain("requirements.txt");
  });
});
