import { normalizeArabic } from "./text";
import type { Category } from "./types";

export interface SearchResult {
  readonly category: Category;
  readonly titleMatch: boolean;
  readonly textMatches: number;
}

const MIN_QUERY_LENGTH = 2;

/** Diacritics- and hamza-insensitive search over titles and zekr text. */
export function searchCategories(categories: readonly Category[], query: string): SearchResult[] {
  const needle = normalizeArabic(query);
  if (needle.length < MIN_QUERY_LENGTH) return [];

  return categories
    .map((category) => ({
      category,
      titleMatch: normalizeArabic(category.title).includes(needle),
      textMatches: category.items.filter((z) => normalizeArabic(z.text).includes(needle)).length,
    }))
    .filter((r) => r.titleMatch || r.textMatches > 0)
    .sort(
      (a, b) =>
        Number(b.titleMatch) - Number(a.titleMatch) ||
        b.textMatches - a.textMatches ||
        a.category.id - b.category.id,
    );
}
