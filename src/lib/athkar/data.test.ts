import { describe, expect, it } from "vitest";
import { getCategories, getCategory, getSections, getSituation, getTotalAthkar } from "./data";
import { SECTIONS } from "./sections";

describe("data", () => {
  it("loads every row of the vendored source", () => {
    expect(getTotalAthkar()).toBe(345);
    expect(getCategories().length).toBeGreaterThan(100);
  });

  it("finds categories by numeric or string id and rejects junk", () => {
    expect(getCategory(1)?.title).toBe("أذكار الصباح");
    expect(getCategory("1")?.id).toBe(1);
    expect(getCategory("abc")).toBeUndefined();
    expect(getCategory(99999)).toBeUndefined();
  });

  it("puts every category in exactly one non-empty section", () => {
    const ids = getSections().flatMap((s) => s.categories.map((c) => c.id));
    expect(ids.length).toBe(getCategories().length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getSections().some((s) => s.id === "misc")).toBe(false);
  });
});

describe("getSituation", () => {
  const readingOrder = getSections().flatMap((s) => s.categories);

  it("resolves a situation with its section", () => {
    const situation = getSituation(1);
    expect(situation?.category.title).toBe("أذكار الصباح");
    expect(situation?.section.id).toBe("daily");
    expect(situation?.section.hue).toBe(60);
    expect(situation?.section).toEqual(SECTIONS.find((s) => s.id === "daily"));
    expect(getSituation("1")?.category.id).toBe(1);
  });

  it("gives every situation the section that groups it", () => {
    for (const section of getSections()) {
      for (const category of section.categories) {
        expect(getSituation(category.id)?.section.id).toBe(section.id);
      }
    }
  });

  it("links neighbours in reading order", () => {
    readingOrder.forEach((category, i) => {
      const situation = getSituation(category.id);
      expect(situation?.prev).toBe(readingOrder[i - 1]);
      expect(situation?.next).toBe(readingOrder[i + 1]);
    });
  });

  it("has no previous situation for the first and no next one for the last", () => {
    const first = getSituation(readingOrder[0].id);
    expect(first?.prev).toBeUndefined();
    expect(first?.next).toBeDefined();
    const last = getSituation(readingOrder[readingOrder.length - 1].id);
    expect(last?.prev).toBeDefined();
    expect(last?.next).toBeUndefined();
  });

  it("returns undefined for unknown ids", () => {
    expect(getSituation(-1)).toBeUndefined();
    expect(getSituation(99999)).toBeUndefined();
    expect(getSituation("abc")).toBeUndefined();
  });
});
