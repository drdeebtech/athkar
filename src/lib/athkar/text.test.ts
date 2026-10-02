import { describe, expect, it } from "vitest";
import { normalizeArabic, segmentText, stripDiacritics } from "./text";

describe("stripDiacritics", () => {
  it("removes harakat, shadda, sukun and superscript alef", () => {
    expect(stripDiacritics("بِسْمِ اللَّهِ")).toBe("بسم الله");
    expect(stripDiacritics("الرَّحْمَٰنِ")).toBe("الرحمن");
  });

  it("removes tatweel and leaves plain text untouched", () => {
    expect(stripDiacritics("بِسْـمِ")).toBe("بسم");
    expect(stripDiacritics("hello 123")).toBe("hello 123");
  });
});

describe("normalizeArabic", () => {
  it("unifies alef forms, taa marbuta, alef maqsura and whitespace", () => {
    expect(normalizeArabic("  أَذْكَارُ   الإستيقاظ ")).toBe("اذكار الاستيقاظ");
    expect(normalizeArabic("الصلاة على النبى")).toBe("الصلاه علي النبي");
  });
});

describe("segmentText", () => {
  it("returns a single plain segment when there are no markers", () => {
    expect(segmentText("سبحان الله")).toEqual([{ kind: "plain", text: "سبحان الله" }]);
  });

  it("splits Quran and hadith markers and keeps the surrounding text", () => {
    expect(segmentText("قال ((الحمد لله)) ثم ﴿قل هو الله أحد﴾ تم")).toEqual([
      { kind: "plain", text: "قال " },
      { kind: "hadith", text: "الحمد لله" },
      { kind: "plain", text: " ثم " },
      { kind: "quran", text: "قل هو الله أحد" },
      { kind: "plain", text: " تم" },
    ]);
  });

  it("drops an opening hadith marker the source never closed", () => {
    expect(segmentText("يقول: ((آمنت بالله")).toEqual([{ kind: "plain", text: "يقول: آمنت بالله" }]);
  });

  it("drops a closing hadith marker with nothing to close", () => {
    expect(segmentText("((سبحان الله)) وزاد البحر)).")).toEqual([
      { kind: "hadith", text: "سبحان الله" },
      { kind: "plain", text: " وزاد البحر." },
    ]);
  });

  it("styles the innermost hadith when an earlier opener is never closed", () => {
    expect(segmentText("((يقول: ((آمنت بالله))")).toEqual([
      { kind: "plain", text: "يقول: " },
      { kind: "hadith", text: "آمنت بالله" },
    ]);
  });

  it("keeps a Quran verse styled when it follows an unclosed hadith opener", () => {
    expect(segmentText("((بسم الله ﴿سبحان الذي﴾، ((الحمد لله))")).toEqual([
      { kind: "plain", text: "بسم الله " },
      { kind: "quran", text: "سبحان الذي" },
      { kind: "plain", text: "، " },
      { kind: "hadith", text: "الحمد لله" },
    ]);
  });

  it("keeps a double closing parenthesis that closes two single ones", () => {
    const text = "(ينفث عن يساره (ثلاثاً)) - (يستعيذ)";
    expect(segmentText(text)).toEqual([{ kind: "plain", text }]);
  });

  it("keeps the closing parenthesis that matches one open single one", () => {
    expect(segmentText("(ثلاث مرات)).")).toEqual([{ kind: "plain", text: "(ثلاث مرات)." }]);
  });

  it("drops empty segments", () => {
    expect(segmentText("((ذكر))")).toEqual([{ kind: "hadith", text: "ذكر" }]);
  });
});

describe("plainReading", () => {
  it("strips diacritics and turns alef wasla into a plain alef", async () => {
    const { plainReading } = await import("./text");
    expect(plainReading("مَلِكِ ٱلنَّاسِ")).toBe("ملك الناس");
  });
});

describe("segmentText whitespace between markers", () => {
  it("keeps the space between two adjacent marked segments", () => {
    expect(segmentText("((أ)) ((ب))")).toEqual([
      { kind: "hadith", text: "أ" },
      { kind: "plain", text: " " },
      { kind: "hadith", text: "ب" },
    ]);
  });

  it("still drops empty and whitespace-only marked segments", () => {
    expect(segmentText("(( ))نص")).toEqual([{ kind: "plain", text: "نص" }]);
  });
});

describe("shareableText", () => {
  it("removes hadith markers and keeps the Quran brackets", async () => {
    const { shareableText } = await import("./text");
    expect(shareableText("قال: ((سبحان الله)) ﴿قل هو الله أحد﴾")).toBe("قال: سبحان الله ﴿قل هو الله أحد﴾");
  });

  it("keeps nested single parentheses intact", async () => {
    const { shareableText } = await import("./text");
    expect(shareableText("(ينفث (ثلاثاً)) ((دعاء))")).toBe("(ينفث (ثلاثاً)) دعاء");
  });
});

describe("hadith markers in the vendored source", () => {
  it("never shows a stray (( or )) to the reader", async () => {
    const { default: rows } = await import("../../../data/sources/azkar-db.json");
    const unmatchedOpen = (s: string) => {
      let depth = 0;
      for (const ch of s) depth = ch === "(" ? depth + 1 : ch === ")" ? Math.max(0, depth - 1) : depth;
      return depth;
    };
    for (const row of rows as { zekr?: string }[]) {
      for (const seg of segmentText(row.zekr ?? "")) {
        expect(seg.text).not.toContain("((");
        // A "))" may remain only where it closes two open single parentheses.
        let at = seg.text.indexOf("))");
        while (at !== -1) {
          expect(unmatchedOpen(seg.text.slice(0, at))).toBeGreaterThanOrEqual(2);
          at = seg.text.indexOf("))", at + 2);
        }
      }
    }
  });
});
