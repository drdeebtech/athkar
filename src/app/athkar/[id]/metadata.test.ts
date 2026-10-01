import type { Metadata, ResolvingMetadata } from "next";
import { describe, expect, it } from "vitest";
import { generateMetadata } from "./page";

const parent = Promise.resolve({
  openGraph: {
    type: "website",
    siteName: "أذكار",
    locale: "ar_AR",
    images: [{ url: new URL("https://athkar.site/opengraph-image.jpg"), width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [{ url: new URL("https://athkar.site/opengraph-image.jpg") }] },
}) as unknown as ResolvingMetadata;

describe("situation page metadata", () => {
  it("keeps the site-wide share image, type, site name and locale", async () => {
    const md: Metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) }, parent);
    const og = md.openGraph as Record<string, unknown>;
    expect(og.images).toEqual([{ url: new URL("https://athkar.site/opengraph-image.jpg"), width: 1200, height: 630 }]);
    expect(og.siteName).toBe("أذكار");
    expect(og.locale).toBe("ar_AR");
    expect(og.type).toBe("website");
    expect(String(og.title)).toContain("أذكار الصباح");
    expect(og.url).toBe("/athkar/1");
  });

  it("keeps a large-image Twitter card", async () => {
    const md = await generateMetadata({ params: Promise.resolve({ id: "1" }) }, parent);
    expect((md.twitter as Record<string, unknown>).card).toBe("summary_large_image");
  });
});
