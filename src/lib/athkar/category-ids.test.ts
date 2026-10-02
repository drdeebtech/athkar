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

  it("matches the ids already published at launch (first-appearance order)", () => {
    const positional = normalizeSource(source as SourceRow[]);
    expect(Object.fromEntries(positional.map((c) => [c.title, c.id]))).toEqual(ids);
  });
});
