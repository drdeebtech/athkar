import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, serializeJsonLd, websiteJsonLd } from "./structured-data";

const site = { name: "أذكار", url: "https://athkar.site", description: "وصف" };

describe("structured data", () => {
  it("describes the website with its name, URL and language", () => {
    expect(websiteJsonLd(site)).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "أذكار",
      url: "https://athkar.site/",
      inLanguage: "ar",
      description: "وصف",
    });
  });

  it("builds a two-level breadcrumb with absolute URLs", () => {
    const crumbs = breadcrumbJsonLd(site, { id: 1, title: "أذكار الصباح" });
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://athkar.site/" },
      { "@type": "ListItem", position: 2, name: "أذكار الصباح", item: "https://athkar.site/athkar/1" },
    ]);
  });

  it("escapes < so the JSON can never close its script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
