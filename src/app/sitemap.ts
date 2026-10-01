import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getCategories } from "@/lib/athkar/data";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteConfig.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/sources`, changeFrequency: "yearly", priority: 0.3 },
    ...getCategories().map((c) => ({
      url: `${siteConfig.url}/athkar/${c.id}`,
      changeFrequency: "monthly" as const,
      priority: c.id <= 2 ? 0.9 : 0.7,
    })),
  ];
}
