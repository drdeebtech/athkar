import { sectionForTitle } from "./sections";
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

/** Groups source rows into categories in first-appearance order. */
export function normalizeSource(rows: readonly SourceRow[]): Category[] {
  const order: string[] = [];
  const grouped = new Map<string, SourceRow[]>();

  for (const row of rows) {
    const title = clean(row.category);
    if (!title || !clean(row.zekr)) continue;
    if (!grouped.has(title)) {
      grouped.set(title, []);
      order.push(title);
    }
    grouped.get(title)?.push(row);
  }

  return order.map((title, index) => {
    const id = index + 1;
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
