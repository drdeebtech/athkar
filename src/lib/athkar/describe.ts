import { athkarCount } from "./arabic";
import { plainReading } from "./text";
import type { Category } from "./types";

/** Search results show about 155 characters of a description. */
export const MAX_DESCRIPTION = 155;

/** Meta description for a situation page: count, source, then the opening words of its first zekr. */
export function describeCategory(category: Category): string {
  const head = `${category.title}: ${athkarCount(category.items.length)} من حصن المسلم. `;
  const text = plainReading(category.items[0]?.text ?? "")
    .replace(/\(\(|\)\)|[﴾﴿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const room = MAX_DESCRIPTION - head.length - 1; // 1 for the ellipsis
  if (text.length <= room + 1) return head + text;
  const cut = text.slice(0, room);
  const atWord = cut.slice(0, Math.max(cut.lastIndexOf(" "), 0)).trim() || cut.trim();
  return `${head}${atWord}…`;
}
