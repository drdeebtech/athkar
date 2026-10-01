import { describe, expect, it } from "vitest";
import { getCategories, getCategory, getNeighbours, getSections, getTotalAthkar } from "./data";

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

  it("links neighbours in reading order", () => {
    const first = getSections()[0].categories[0];
    expect(getNeighbours(first.id).prev).toBeUndefined();
    expect(getNeighbours(first.id).next).toBeDefined();
    expect(getNeighbours(-1)).toEqual({});
  });
});
