import { describe, expect, it } from "vitest";
import type { Category } from "./types";
import { searchCategories } from "./search";

const cats: Category[] = [
  { id: 1, title: "أذكار الصباح", sectionId: "daily", items: [{ id: "1-1", text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ", count: 1 }] },
  { id: 2, title: "دعاء السفر", sectionId: "travel", items: [{ id: "2-1", text: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا", count: 1 }] },
  { id: 3, title: "أذكار النوم", sectionId: "daily", items: [{ id: "3-1", text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", count: 1 }] },
];

describe("searchCategories", () => {
  it("returns nothing for blank or one-letter queries", () => {
    expect(searchCategories(cats, "")).toEqual([]);
    expect(searchCategories(cats, " ص ")).toEqual([]);
  });

  it("matches titles regardless of hamza forms", () => {
    expect(searchCategories(cats, "اذكار").map((r) => r.category.id)).toEqual([1, 3]);
  });

  it("matches zekr text without diacritics and reports the hit count", () => {
    const [hit] = searchCategories(cats, "سخر لنا");
    expect(hit.category.id).toBe(2);
    expect(hit.titleMatch).toBe(false);
    expect(hit.textMatches).toBe(1);
  });

  it("ranks title matches before text-only matches", () => {
    const res = searchCategories(cats, "الصباح اصبحنا".split(" ")[0]);
    expect(res[0].category.id).toBe(1);
    expect(res[0].titleMatch).toBe(true);
  });
});

describe("createSearchIndex", () => {
  it("returns the same results as searchCategories from a prepared index", async () => {
    const { createSearchIndex, searchIndex } = await import("./search");
    const index = createSearchIndex(cats);
    expect(searchIndex(index, "اذكار")).toEqual(searchCategories(cats, "اذكار"));
    expect(searchIndex(index, "سخر لنا")[0].category.id).toBe(2);
    expect(searchIndex(index, "x")).toEqual([]);
  });
});
