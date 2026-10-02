import { sectionForTitle } from "./sections";
import { toBaseLetters } from "./text";
import type { Category, Zekr } from "./types";

export interface SourceRow {
  readonly category: string;
  readonly zekr: string;
  readonly count: string | number | null | undefined;
  readonly description?: string | null;
  readonly reference?: string | null;
  readonly search?: string | null;
}

export function parseCount(value: SourceRow["count"]): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

const clean = (value: string | null | undefined): string | undefined => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/** Known errors in the source titles, keyed by the title after letter clean-up. */
const TITLE_FIXES: Readonly<Record<string, string>> = {
  "الدعاء إذا نزل مترلا في سفر أو غيره": "الدعاء إذا نزل منزلا في سفر أو غيره",
};

/** The title shown on the site: trimmed, base letters only, known typos fixed. */
export function displayTitle(raw: string): string {
  const title = toBaseLetters(raw.trim());
  return TITLE_FIXES[title] ?? title;
}

/**
 * Groups source rows into categories in first-appearance order.
 * With `ids` (title -> id, see category-ids.json), known categories keep their
 * published id and new ones get the next free id, so URLs never renumber.
 */
export function normalizeSource(rows: readonly SourceRow[], ids?: Readonly<Record<string, number>>): Category[] {
  const order: string[] = [];
  const grouped = new Map<string, SourceRow[]>();

  for (const row of rows) {
    const title = clean(displayTitle(row.category ?? ""));
    if (!title || !clean(row.zekr)) continue;
    if (!grouped.has(title)) {
      grouped.set(title, []);
      order.push(title);
    }
    grouped.get(title)?.push(row);
  }

  let nextId = Math.max(0, ...Object.values(ids ?? {}));
  return order.map((title, index) => {
    const id = ids ? (ids[title] ?? ++nextId) : index + 1;
    const items: Zekr[] = (grouped.get(title) ?? []).map((row, i) => {
      const virtue = clean(row.description);
      const reference = clean(row.reference);
      return {
        id: `${id}-${i + 1}`,
        text: clean(row.zekr) ?? "",
        count: parseCount(row.count),
        ...(virtue ? { virtue } : {}),
        ...(reference ? { reference } : {}),
      };
    });
    return { id, title, sectionId: sectionForTitle(title), items };
  });
}
