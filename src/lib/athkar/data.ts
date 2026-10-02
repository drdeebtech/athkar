import source from "../../../data/sources/azkar-db.json";
import categoryIds from "./category-ids.json";
import { normalizeSource, type SourceRow } from "./normalize";
import { SECTIONS } from "./sections";
import type { Category, Section, SectionWithCategories } from "./types";

/** A situation with the section it belongs to and its neighbours in reading order. */
export interface Situation {
  readonly category: Category;
  readonly section: Section;
  readonly prev?: Category;
  readonly next?: Category;
}

// Published ids are frozen in category-ids.json so /athkar/{id} never points at other content.
const CATEGORIES: readonly Category[] = normalizeSource(source as SourceRow[], categoryIds);
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

/** Every category paired with its section, in reading order (section order, then id). */
function readingOrder(): readonly Pick<Situation, "category" | "section">[] {
  return getSections().flatMap(({ categories, ...section }) => categories.map((category) => ({ category, section })));
}

/**
 * Looks up a situation by id together with its section and its previous and
 * next situations in reading order. Returns undefined for unknown ids.
 */
export function getSituation(id: number | string): Situation | undefined {
  const category = getCategory(id);
  const order = readingOrder();
  // An unknown id gives undefined, which matches nothing; every real category
  // sits in exactly one section of the grouping, so it is always found.
  const i = order.findIndex((placed) => placed.category === category);
  if (i === -1) return undefined;
  return { ...order[i], prev: order[i - 1]?.category, next: order[i + 1]?.category };
}

export function getTotalAthkar(): number {
  return CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);
}
