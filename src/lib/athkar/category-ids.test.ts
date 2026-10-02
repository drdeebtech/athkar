import { describe, expect, it } from "vitest";
import ids from "./category-ids.json";
import source from "../../../data/sources/azkar-db.json";
import { displayTitle, normalizeSource, type SourceRow } from "./normalize";

describe("category-ids.json (URLs are /athkar/{id}; never renumber)", () => {
  const titles = [...new Set((source as SourceRow[]).map((r) => displayTitle(r.category ?? "")).filter(Boolean))];

  it("has an id for every category in the source", () => {
    expect(titles.filter((t) => !(t in ids))).toEqual([]);
  });

  it("uses unique positive integer ids", () => {
    const values = Object.values(ids);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((v) => Number.isInteger(v) && v > 0)).toBe(true);
  });

  it("keeps the ids published at launch", () => {
    // Spot checks against URLs that were live before the map existed.
    expect(ids).toMatchObject({
      "أذكار الصباح": 1,
      "أذكار المساء": 2,
      "أذكار النوم": 28,
      "دعاء السفر": 95,
      "الدعاء إذا نزل منزلا في سفر أو غيره": 103,
      "ذكر الرجوع من السفر": 104,
    });
  });

  it("gives every category its mapped id even when the source order changes", () => {
    const reversed = [...(source as SourceRow[])].reverse();
    const cats = normalizeSource(reversed, ids);
    expect(cats).toHaveLength(Object.keys(ids).length);
    for (const c of cats) expect(c.id).toBe(ids[c.title as keyof typeof ids]);
  });
});
