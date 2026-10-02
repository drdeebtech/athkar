import { describe, expect, it } from "vitest";
import { describeCategory, MAX_DESCRIPTION } from "./describe";
import type { Category } from "./types";

const cat = (count: number, text: string): Category => ({
  id: 1,
  title: "أذكار الصباح",
  sectionId: "daily",
  items: Array.from({ length: count }, (_, i) => ({ id: `1-${i + 1}`, text, count: 1 })),
});

describe("describeCategory", () => {
  it("states the count with correct Arabic agreement", () => {
    expect(describeCategory(cat(1, "سبحان الله"))).toContain("ذكر واحد");
    expect(describeCategory(cat(31, "سبحان الله"))).toContain("31 ذكرًا");
  });

  it("adds an ellipsis only when the snippet was shortened", () => {
    expect(describeCategory(cat(1, "سبحان الله وبحمده"))).not.toContain("…");
    expect(describeCategory(cat(1, "كلمة ".repeat(80)))).toMatch(/…$/);
  });

  it("stays within the length budget and cuts between words", () => {
    const long = "سبحان الله وبحمده سبحان الله العظيم ".repeat(10);
    const d = describeCategory(cat(3, long));
    expect(d.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    const snippet = d.slice(d.indexOf(". ") + 2).replace(/…$/, "");
    expect(long.replace(/\s+/g, " ").trim().startsWith(snippet)).toBe(true);
    expect(snippet.endsWith(" ")).toBe(false);
  });

  it("removes diacritics and hadith markers from the snippet", () => {
    const d = describeCategory(cat(1, "((سُبْحَانَ اللَّهِ))"));
    expect(d).not.toMatch(/\(\(|\)\)|[ً-ْ]/);
    expect(d).toContain("سبحان الله");
  });
});
