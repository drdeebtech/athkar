// U+0610–U+061A Quranic signs, U+064B–U+065F harakat, U+0670 superscript alef,
// U+06D6–U+06ED Quranic annotation marks, U+0640 tatweel.
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Removes harakat, shadda, sukun, Quranic marks and tatweel. */
export function stripDiacritics(text: string): string {
  return text.replace(DIACRITICS, "");
}

/** Canonical form for matching: no diacritics, unified letters, single spaces. */
export function normalizeArabic(text: string): string {
  return stripDiacritics(text.normalize("NFKC"))
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export type SegmentKind = "plain" | "quran" | "hadith";

export interface TextSegment {
  readonly kind: SegmentKind;
  readonly text: string;
}

const MARKERS = /﴿([^﴾]*)﴾|\(\(([\s\S]*?)\)\)/g;

/** Splits zekr text into plain, Quran (﴿…﴾) and hadith ((…)) segments. */
export function segmentText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  const push = (kind: SegmentKind, value: string) => {
    if (value.trim().length > 0) segments.push({ kind, text: value });
  };

  for (const match of text.matchAll(MARKERS)) {
    const start = match.index ?? 0;
    push("plain", text.slice(cursor, start));
    if (match[1] !== undefined) push("quran", match[1]);
    else push("hadith", match[2] ?? "");
    cursor = start + match[0].length;
  }
  push("plain", text.slice(cursor));
  return segments;
}

/** Text for the "hide diacritics" reading mode: no marks, alef wasla as plain alef. */
export function plainReading(text: string): string {
  return stripDiacritics(text).replace(/ٱ/g, "ا");
}
