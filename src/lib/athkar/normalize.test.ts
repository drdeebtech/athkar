import { describe, expect, it } from "vitest";
import { normalizeSource, parseCount, type SourceRow } from "./normalize";

const row = (over: Partial<SourceRow>): SourceRow => ({
  category: "أذكار الصباح",
  zekr: "سبحان الله",
  count: "",
  description: "",
  reference: "",
  search: "",
  ...over,
});

describe("parseCount", () => {
  it("defaults empty and missing values to 1", () => {
    expect(parseCount("")).toBe(1);
    expect(parseCount(null)).toBe(1);
    expect(parseCount(undefined)).toBe(1);
  });

  it("parses numbers and numeric strings", () => {
    expect(parseCount(3)).toBe(3);
    expect(parseCount("100")).toBe(100);
    expect(parseCount(" 7 ")).toBe(7);
  });

  it("falls back to 1 for junk or non-positive values", () => {
    expect(parseCount("abc")).toBe(1);
    expect(parseCount("0")).toBe(1);
    expect(parseCount(-4)).toBe(1);
  });
});

describe("normalizeSource", () => {
  it("groups rows by category in first-appearance order with stable ids", () => {
    const cats = normalizeSource([
      row({ category: "أذكار الصباح", zekr: "أ" }),
      row({ category: "أذكار المساء", zekr: "ب" }),
      row({ category: "أذكار الصباح", zekr: "ج", count: "3" }),
    ]);
    expect(cats.map((c) => [c.id, c.title, c.items.length])).toEqual([
      [1, "أذكار الصباح", 2],
      [2, "أذكار المساء", 1],
    ]);
    expect(cats[0].items[1]).toMatchObject({ id: "1-2", text: "ج", count: 3 });
  });

  it("trims text and omits empty virtue and reference", () => {
    const [cat] = normalizeSource([
      row({ category: "  أذكار النوم ", zekr: "  نص \n", description: " ", reference: null }),
    ]);
    expect(cat.title).toBe("أذكار النوم");
    expect(cat.items[0]).toEqual({ id: "1-1", text: "نص", count: 1 });
  });

  it("keeps virtue and reference when present", () => {
    const [cat] = normalizeSource([row({ description: "فضل", reference: "مسلم" })]);
    expect(cat.items[0].virtue).toBe("فضل");
    expect(cat.items[0].reference).toBe("مسلم");
  });

  it("skips rows with empty text or category", () => {
    expect(normalizeSource([row({ zekr: "  " }), row({ category: "" })])).toEqual([]);
  });

  it("assigns a section to each category", () => {
    const [cat] = normalizeSource([row({ category: "أذكار الصباح" })]);
    expect(cat.sectionId).toBe("daily");
  });
});
