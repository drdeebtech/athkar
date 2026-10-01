import source from "../../../data/sources/azkar-db.json";
import { normalizeSource, type SourceRow } from "./normalize";
import { SECTIONS } from "./sections";
import type { Category, SectionWithCategories } from "./types";

const CATEGORIES: readonly Category[] = normalizeSource(source as SourceRow[]);
const BY_ID: ReadonlyMap<number, Category> = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategories(): readonly Category[] {
  return CATEGORIES;
}

export function getCategory(id: number | string): Category | undefined {
  const n = typeof id === "number" ? id : Number(id);
  return Number.isInteger(n) ? BY_ID.get(n) : undefined;
}

export function getSections(): SectionWithCategories[] {
  return SECTIONS.map((s) => ({
    ...s,
    categories: CATEGORIES.filter((c) => c.sectionId === s.id),
  })).filter((s) => s.categories.length > 0);
}

/** Previous and next situation in reading order (section order, then id). */
export function getNeighbours(id: number): { prev?: Category; next?: Category } {
  const ordered = getSections().flatMap((s) => s.categories);
  const i = ordered.findIndex((c) => c.id === id);
  if (i === -1) return {};
  return { prev: ordered[i - 1], next: ordered[i + 1] };
}

export function getTotalAthkar(): number {
  return CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);
}
