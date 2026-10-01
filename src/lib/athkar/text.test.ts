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

  it("treats an unclosed marker as plain text", () => {
    expect(segmentText("نص ((غير مغلق")).toEqual([{ kind: "plain", text: "نص ((غير مغلق" }]);
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
