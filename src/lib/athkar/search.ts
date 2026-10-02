import { normalizeArabic } from "./text";
import type { Category, SectionId } from "./types";

interface PayloadZekr {
  readonly id: string;
  readonly text: string;
  readonly count: number;
}

interface PayloadCategory {
  readonly id: number;
  readonly title: string;
  readonly sectionId: SectionId;
  readonly items: readonly PayloadZekr[];
}

/**
 * The body of /search-index.json. The CDN may serve a copy up to a day old to
 * a newer client, so parseSearchIndex must keep accepting every shipped shape.
 */
export type SearchPayload = readonly PayloadCategory[];

/** The parts of a situation that search reads; a full Category qualifies. */
export interface SearchableCategory {
  readonly id: number;
  readonly title: string;
  readonly items: readonly { readonly text: string }[];
}

export interface SearchResult {
  readonly category: SearchableCategory;
  readonly titleMatch: boolean;
  readonly textMatches: number;
}

interface IndexEntry {
  readonly category: SearchableCategory;
  readonly title: string;
  readonly texts: readonly string[];
}

export type SearchIndex = readonly IndexEntry[];

const MIN_QUERY_LENGTH = 2;

/** Builds the /search-index.json body; virtue and reference stay out to keep the lazy download small. */
export function toSearchPayload(categories: readonly Category[]): SearchPayload {
  return categories.map(({ id, title, sectionId, items }) => ({
    id,
    title,
    sectionId,
    items: items.map(({ id: zekrId, text, count }) => ({ id: zekrId, text, count })),
  }));
}

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const invalid = (detail: string) => new Error(`Invalid search index: ${detail}`);

function parseZekr(zekr: unknown, where: string): SearchableCategory["items"][number] {
  if (!isRecord(zekr) || typeof zekr.text !== "string") throw invalid(`${where} has no string text`);
  return { text: zekr.text };
}

function parseCategory(entry: unknown, position: number): SearchableCategory {
  const where = `situation ${position}`;
  if (!isRecord(entry)) throw invalid(`${where} is not an object`);
  const { id, title, items } = entry;
  if (typeof id !== "number" || !Number.isFinite(id)) throw invalid(`${where} has no finite numeric id`);
  if (typeof title !== "string") throw invalid(`${where} has no string title`);
  if (!isList(items)) throw invalid(`${where} has no items array`);
  return { id, title, items: items.map((zekr, i) => parseZekr(zekr, `${where}, zekr ${i}`)) };
}

/**
 * Turns the fetched /search-index.json body into a ready index. Checks every
 * field search reads and throws a descriptive Error otherwise, so a bad or
 * truncated response fails loudly instead of indexing garbage.
 */
export function parseSearchIndex(data: unknown): SearchIndex {
  if (!isList(data)) throw invalid("expected an array of situations");
  return createSearchIndex(data.map(parseCategory));
}

/** Normalizes every title and text once so each query only does substring checks. */
export function createSearchIndex(categories: readonly SearchableCategory[]): SearchIndex {
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
