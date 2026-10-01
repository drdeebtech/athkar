export const siteConfig = {
  name: "أذكار",
  tagline: "الذكر المناسب لكل موقف",
  description:
    "أذكار الصباح والمساء والنوم والصلاة والسفر وكل مواقف اليوم من حصن المسلم، مع عدّاد للتسبيح وخيارات قراءة مريحة.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  repository: "https://github.com/drdeebtech/athkar",
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || undefined,
} as const;
