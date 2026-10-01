interface NounForms {
  readonly one: string;
  readonly two: string;
  /** 3–10: plural, e.g. أذكار */
  readonly few: string;
  /** 11–99: accusative singular, e.g. ذكرًا */
  readonly many: string;
  /** round hundreds and 101/102: genitive singular, e.g. ذكر */
  readonly hundred: string;
}

/** Formats "n + counted noun" following Arabic number agreement rules. */
function countNoun(n: number, forms: NounForms): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  const r = n % 100;
  if (r >= 3 && r <= 10) return `${n} ${forms.few}`;
  if (r >= 11) return `${n} ${forms.many}`;
  return `${n} ${forms.hundred}`;
}

export const athkarCount = (n: number) =>
  countNoun(n, { one: "ذكر واحد", two: "ذكران", few: "أذكار", many: "ذكرًا", hundred: "ذكر" });

export const resultsCount = (n: number) =>
  countNoun(n, { one: "نتيجة واحدة", two: "نتيجتان", few: "نتائج", many: "نتيجة", hundred: "نتيجة" });

export const timesCount = (n: number) =>
  countNoun(n, { one: "مرة واحدة", two: "مرتان", few: "مرات", many: "مرة", hundred: "مرة" });

export const situationsCount = (n: number) =>
  countNoun(n, { one: "موقف واحد", two: "موقفان", few: "مواقف", many: "موقفًا", hundred: "موقف" });
