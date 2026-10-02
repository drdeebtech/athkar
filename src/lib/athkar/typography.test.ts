import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "../..");

/** Rendered page and component sources (.tsx, tests excluded), relative to src/. */
function components(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return components(path);
    return name.endsWith(".tsx") && !name.endsWith(".test.tsx") ? [relative(SRC, path)] : [];
  });
}

const FILES = components();
const read = (file: string) => readFileSync(join(SRC, file), "utf8");

/** The files that import `file`, from an "@/…" or a relative specifier. */
function importersOf(file: string): string[] {
  const target = file.replace(/\.tsx?$/, "");
  return FILES.filter((f) =>
    [...read(f).matchAll(/from\s+["']([^"']+)["']/g)].some(([, spec]) => {
      if (spec.startsWith("@/")) return spec.slice(2) === target;
      return spec.startsWith(".") && relative(SRC, resolve(SRC, dirname(f), spec)) === target;
    }),
  );
}

/** The files under app/ that render `file`, following imports up from components. */
function routesRendering(file: string, seen = new Set<string>()): string[] {
  if (file.startsWith("app/")) return [file];
  if (seen.has(file)) return [];
  seen.add(file);
  return importersOf(file).flatMap((f) => routesRendering(f, seen));
}

/** Font-size utilities below 14px: text-xs, or an arbitrary text-[…] size under 0.875rem. */
function smallText(code: string): string[] {
  const found = [...code.matchAll(/\btext-xs\b/g)].map((m) => m[0]);
  for (const [token, value, unit] of code.matchAll(/\btext-\[(\d*\.?\d+)(rem|px)\]/g)) {
    if (Number(value) * (unit === "rem" ? 16 : 1) < 14) found.push(token);
  }
  return found;
}

describe("phone typography", () => {
  it("sets no text below 14px", () => {
    const offending = FILES.flatMap((f) => smallText(read(f)).map((token) => `${f}: ${token}`));
    expect(offending).toEqual([]);
  });

  it("declares the reading face in the situation layout only, so other pages never load it", () => {
    expect(read("app/layout.tsx")).not.toMatch(/AthkarNaskh|--font-naskh/);
    expect(read("app/athkar/[id]/layout.tsx")).toContain('variable: "--font-naskh"');
  });

  it("sets .zekr-text in the reading face without the :root-level --font-zekr variable", () => {
    // --font-naskh is defined on the situation layout's wrapper, not on <html>, so
    // var(--font-zekr), which Tailwind declares on :root, would resolve to nothing
    // and the adhkar would silently fall back to the UI face.
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    const rule = /\.zekr-text\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/@apply font-zekr;|font-family:\s*var\(--font-naskh\)/);
    expect(rule).not.toContain("var(--font-zekr)");
  });

  it("uses the reading face only on situation pages; titles elsewhere are in the UI face", () => {
    const users = FILES.filter((f) => /\bfont-zekr\b|["'\s]zekr-text\b/.test(read(f)));
    expect(users).toContain("app/athkar/[id]/page.tsx");
    expect(users).toContain("components/athkar/zekr-text.tsx");
    for (const file of users) {
      const routes = routesRendering(file);
      expect(routes, file).not.toEqual([]);
      expect(routes.filter((route) => !route.startsWith("app/athkar/[id]/")), file).toEqual([]);
    }
  });
});
