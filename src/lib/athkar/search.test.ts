import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/search-index.json/route";
import { getCategories, getCategory } from "./data";
import type { Category } from "./types";
import { createSearchIndex, isSearchQuery, parseSearchIndex, searchIndex, toSearchPayload } from "./search";

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

  it("searches from two letters, the shortest query", () => {
    expect(searchIndex(index, "هم").map((r) => r.category.id)).toEqual([3]);
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

describe("isSearchQuery", () => {
  it("measures the query after normalization, as searchIndex does", () => {
    expect(isSearchQuery("أَ")).toBe(false);
    expect(isSearchQuery("ـص")).toBe(false);
    expect(isSearchQuery("  ")).toBe(false);
    expect(isSearchQuery("ﷲ")).toBe(true);
    expect(isSearchQuery("سفر")).toBe(true);
  });

  it("accepts two letters, the shortest query", () => {
    expect(isSearchQuery("هم")).toBe(true);
  });
});

describe("toSearchPayload", () => {
  // The CDN keeps /search-index.json for up to a day, so the shape (and key
  // order, which keeps the file byte-identical) must not drift.
  it("keeps the published keys of /search-index.json at both levels", () => {
    const payload = toSearchPayload(getCategories());
    expect(payload).toHaveLength(getCategories().length);
    expect([...new Set(payload.map((c) => Object.keys(c).join()))]).toEqual(["id,title,sectionId,items"]);
    expect([...new Set(payload.flatMap((c) => c.items.map((z) => Object.keys(z).join())))]).toEqual(["id,text,count"]);
  });

  it("leaves out virtue and reference", () => {
    const category: Category = {
      id: 9,
      title: "دعاء",
      sectionId: "misc",
      items: [{ id: "9-1", text: "نص", count: 3, virtue: "فضل", reference: "مرجع" }],
    };
    expect(toSearchPayload([category])).toEqual([
      { id: 9, title: "دعاء", sectionId: "misc", items: [{ id: "9-1", text: "نص", count: 3 }] },
    ]);
  });
});

describe("GET /search-index.json", () => {
  // The other payload tests call toSearchPayload directly, so only this one
  // notices if the route stops publishing it for every situation.
  it("publishes toSearchPayload of the whole catalogue", async () => {
    expect(await GET().text()).toBe(JSON.stringify(toSearchPayload(getCategories())));
  });
});

describe("parseSearchIndex", () => {
  const valid = { id: 1, title: "أذكار الصباح", items: [{ text: "سبحان الله" }] };

  it.each<[string, unknown, RegExp]>([
    ["null", null, /expected an array/],
    ["an object", {}, /expected an array/],
    ["a situation that is not an object", [valid, null], /situation 1 is not an object/],
    ["a non-numeric id", [{ ...valid, id: "1" }], /situation 0 has no finite numeric id/],
    ["a non-finite id", [{ ...valid, id: Number.NaN }], /situation 0 has no finite numeric id/],
    ["a non-string title", [{ ...valid, title: 7 }], /situation 0 has no string title/],
    ["missing items", [{ id: 1, title: "أذكار الصباح" }], /situation 0 has no items array/],
    ["a zekr that is not an object", [{ ...valid, items: [null] }], /situation 0, zekr 0 has no string text/],
    ["a zekr without text", [{ ...valid, items: [{ text: "x" }, { id: "1-2", count: 1 }] }], /situation 0, zekr 1 has no string text/],
  ])("rejects %s", (_, data, message) => {
    expect(() => parseSearchIndex(data)).toThrow(message);
  });

  describe("on the published catalogue after a trip through JSON", () => {
    const shipped = parseSearchIndex(JSON.parse(JSON.stringify(toSearchPayload(getCategories()))));
    const direct = createSearchIndex(getCategories());
    const summary = (query: string, from: typeof shipped) =>
      searchIndex(from, query).map((r) => [r.category.id, r.titleMatch, r.textMatches]);

    it("finds a situation by its title", () => {
      const hit = searchIndex(shipped, "السفر").find((r) => r.category.id === 95);
      expect(hit?.category.title).toBe("دعاء السفر");
      expect(hit?.titleMatch).toBe(true);
      expect(hit?.category.items).toHaveLength(getCategory(95)?.items.length ?? -1);
    });

    it("finds adhkar text through the ﷲ ligature", () => {
      expect(searchIndex(shipped, "ﷲ").length).toBeGreaterThan(0);
    });

    it("searches exactly like an index built from the catalogue itself", () => {
      for (const query of ["السفر", "ﷲ", "اللهم", "الكرب"]) {
        expect(summary(query, shipped)).toEqual(summary(query, direct));
      }
    });
  });
});

describe("search module imports", () => {
  // Static `from "x"`, side-effect `import "x"` and dynamic `import("x")`.
  const SPECIFIER = /\bfrom\s*["']([^"']+)["']|\bimport\s*\(?\s*["']([^"']+)["']/g;

  it("never imports the catalogue, which would ship it in the search box's client bundle", () => {
    const source = readFileSync(join(__dirname, "search.ts"), "utf8");
    const specifiers = [...source.matchAll(SPECIFIER)].map((m) => m[1] ?? m[2]);
    expect(specifiers.length).toBeGreaterThan(0);
    for (const specifier of specifiers) expect(["./text", "./types"]).toContain(specifier);
  });
});
