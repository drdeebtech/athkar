import { describe, expect, it } from "vitest";
import type { Category } from "./types";
import { createSearchIndex, searchIndex } from "./search";

const cats: Category[] = [
  { id: 1, title: "أذكار الصباح", sectionId: "daily", items: [{ id: "1-1", text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ", count: 1 }] },
  { id: 2, title: "دعاء السفر", sectionId: "travel", items: [{ id: "2-1", text: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا", count: 1 }] },
  { id: 3, title: "أذكار النوم", sectionId: "daily", items: [{ id: "3-1", text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", count: 1 }] },
];
const index = createSearchIndex(cats);

describe("searchIndex", () => {
  it("returns nothing for blank or one-letter queries", () => {
    expect(searchIndex(index, "")).toEqual([]);
    expect(searchIndex(index, " ص ")).toEqual([]);
    expect(searchIndex(index, "x")).toEqual([]);
  });

  it("matches titles regardless of hamza forms", () => {
    expect(searchIndex(index, "اذكار").map((r) => r.category.id)).toEqual([1, 3]);
  });

  it("matches zekr text without diacritics and reports the hit count", () => {
    const [hit] = searchIndex(index, "سخر لنا");
    expect(hit.category.id).toBe(2);
    expect(hit.titleMatch).toBe(false);
    expect(hit.textMatches).toBe(1);
  });

  it("ranks title matches before text-only matches", () => {
    const res = searchIndex(index, "الصباح");
    expect(res[0].category.id).toBe(1);
    expect(res[0].titleMatch).toBe(true);
  });
});
