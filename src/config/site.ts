function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://athkar.site";
}

export const siteConfig = {
  name: "أذكار",
  tagline: "الذكر المناسب لكل موقف",
  description:
    "أذكار الصباح والمساء والنوم والصلاة والسفر وكل مواقف اليوم من حصن المسلم، مع عدّاد للتسبيح وخيارات قراءة مريحة.",
  url: resolveSiteUrl(),
  repository: "https://github.com/drdeebtech/athkar",
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || undefined,
} as const;
