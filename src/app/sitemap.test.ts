import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { FEATURED_IDS } from "@/lib/athkar/data";
import sitemap from "./sitemap";

const SITUATION_PREFIX = `${siteConfig.url}/athkar/`;
const ascending = (ids: readonly number[]): number[] => [...ids].sort((a, b) => a - b);

describe("sitemap", () => {
  const entries = sitemap();
  const situations = entries.filter((e) => e.url.startsWith(SITUATION_PREFIX));

  it("lists home, the sources page and all 135 situations", () => {
    expect(entries).toHaveLength(137);
    expect(situations).toHaveLength(135);
  });

  it("keeps the home and sources priorities", () => {
    expect(entries.find((e) => e.url === `${siteConfig.url}/`)?.priority).toBe(1);
    expect(entries.find((e) => e.url === `${siteConfig.url}/sources`)?.priority).toBe(0.3);
  });

  it("gives exactly the featured situations priority 0.9 and the rest 0.7", () => {
    const top = situations.filter((e) => e.priority === 0.9).map((e) => Number(e.url.slice(SITUATION_PREFIX.length)));
    expect(ascending(top)).toEqual(ascending(FEATURED_IDS));
    expect(situations.filter((e) => e.priority !== 0.9).every((e) => e.priority === 0.7)).toBe(true);
  });
});
