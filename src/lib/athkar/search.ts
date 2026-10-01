import { normalizeArabic } from "./text";
import type { Category } from "./types";

export interface SearchResult {
  readonly category: Category;
  readonly titleMatch: boolean;
  readonly textMatches: number;
}

interface IndexEntry {
  readonly category: Category;
  readonly title: string;
  readonly texts: readonly string[];
}

export type SearchIndex = readonly IndexEntry[];

const MIN_QUERY_LENGTH = 2;

/** Normalizes every title and text once so each query only does substring checks. */
export function createSearchIndex(categories: readonly Category[]): SearchIndex {
  return categories.map((category) => ({
    category,
    title: normalizeArabic(category.title),
    texts: category.items.map((z) => normalizeArabic(z.text)),
  }));
}

/** Diacritics- and hamza-insensitive search; title hits rank before text-only hits. */
export function searchIndex(index: SearchIndex, query: string): SearchResult[] {
  const needle = normalizeArabic(query);
  if (needle.length < MIN_QUERY_LENGTH) return [];

  return index
    .map(({ category, title, texts }) => ({
      category,
      titleMatch: title.includes(needle),
      textMatches: texts.filter((t) => t.includes(needle)).length,
    }))
    .filter((r) => r.titleMatch || r.textMatches > 0)
    .sort(
      (a, b) =>
        Number(b.titleMatch) - Number(a.titleMatch) ||
        b.textMatches - a.textMatches ||
        a.category.id - b.category.id,
    );
}

export function searchCategories(categories: readonly Category[], query: string): SearchResult[] {
  return searchIndex(createSearchIndex(categories), query);
}
