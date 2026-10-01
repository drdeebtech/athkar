import { describe, expect, it } from "vitest";
import source from "../../../data/sources/azkar-db.json";
import { SECTIONS, sectionForTitle } from "./sections";

describe("sections", () => {
  it("has unique ids and Arabic titles", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    SECTIONS.forEach((s) => expect(s.title.length).toBeGreaterThan(0));
  });

  it("maps well-known situations to the expected section", () => {
    expect(sectionForTitle("أذكار الصباح")).toBe("daily");
    expect(sectionForTitle("دعاء السجود")).toBe("prayer");
    expect(sectionForTitle("دعاء السفر")).toBe("travel");
    expect(sectionForTitle("الرقية الشرعية من السنة النبوية")).toBe("ruqyah");
  });

  it("ignores surrounding whitespace and diacritics", () => {
    expect(sectionForTitle("  أَذْكَارُ الصَّبَاحِ ")).toBe("daily");
  });

  it("falls back to misc for unknown titles", () => {
    expect(sectionForTitle("عنوان غير معروف")).toBe("misc");
  });

  it("maps every category in the vendored source explicitly", () => {
    const titles = [...new Set((source as { category: string }[]).map((r) => r.category.trim()))];
    const unmapped = titles.filter((t) => sectionForTitle(t, { strict: true }) === null);
    expect(unmapped).toEqual([]);
  });
});

describe("section glaze hues", () => {
  it("gives every section a valid hue, distinct from its neighbours", () => {
    SECTIONS.forEach((s) => {
      expect(s.hue).toBeGreaterThanOrEqual(0);
      expect(s.hue).toBeLessThan(360);
    });
    const shown = SECTIONS.filter((s) => s.id !== "misc");
    shown.slice(1).forEach((s, i) => expect(Math.abs(s.hue - shown[i].hue)).toBeGreaterThanOrEqual(20));
  });
});
