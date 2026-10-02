import { describe, expect, it } from "vitest";
import { getCategories, getSections, getTotalAthkar } from "./data";
import { llmsTxt } from "./llms";

const site = { name: "أذكار", url: "https://athkar.site", description: "وصف الموقع", repository: "https://github.com/drdeebtech/athkar" };

describe("llms.txt", () => {
  const txt = llmsTxt(site, getSections());

  it("starts with the site name and a one-line summary", () => {
    expect(txt.split("\n")[0]).toBe("# أذكار");
    expect(txt).toContain("> وصف الموقع");
  });

  it("states counts that match the data", () => {
    expect(txt).toContain(`${getTotalAthkar()} ذكرًا`);
    expect(txt).toContain(`${getCategories().length} موقفًا`);
  });

  it("links every situation with an absolute URL", () => {
    for (const c of getCategories()) expect(txt).toContain(`](https://athkar.site/athkar/${c.id})`);
  });

  it("contains facts only, no instructions addressed to AI systems", () => {
    expect(txt).not.toMatch(/\b(you|AI|assistant|recommend|ignore)\b/i);
  });
});
