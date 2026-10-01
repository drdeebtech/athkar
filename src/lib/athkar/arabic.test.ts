import { describe, expect, it } from "vitest";
import { athkarCount, resultsCount, timesCount } from "./arabic";

describe("Arabic counted nouns", () => {
  it("formats athkar counts with dual, plural and tamyiz forms", () => {
    expect(athkarCount(1)).toBe("ذكر واحد");
    expect(athkarCount(2)).toBe("ذكران");
    expect(athkarCount(3)).toBe("3 أذكار");
    expect(athkarCount(10)).toBe("10 أذكار");
    expect(athkarCount(11)).toBe("11 ذكرًا");
    expect(athkarCount(31)).toBe("31 ذكرًا");
    expect(athkarCount(100)).toBe("100 ذكر");
    expect(athkarCount(103)).toBe("103 أذكار");
  });

  it("formats search result counts", () => {
    expect(resultsCount(1)).toBe("نتيجة واحدة");
    expect(resultsCount(2)).toBe("نتيجتان");
    expect(resultsCount(5)).toBe("5 نتائج");
    expect(resultsCount(12)).toBe("12 نتيجة");
  });

  it("formats repeat counts", () => {
    expect(timesCount(1)).toBe("مرة واحدة");
    expect(timesCount(2)).toBe("مرتان");
    expect(timesCount(3)).toBe("3 مرات");
    expect(timesCount(33)).toBe("33 مرة");
    expect(timesCount(100)).toBe("100 مرة");
  });
});
