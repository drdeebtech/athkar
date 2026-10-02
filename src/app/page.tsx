import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/athkar/ad-slot";
import { BrandArt, SLOT_SIZES } from "@/components/athkar/brand-art";
import { JsonLd } from "@/components/athkar/json-ld";
import { SearchBox } from "@/components/athkar/search-box";
import { SectionGrid } from "@/components/athkar/section-grid";
import { siteConfig } from "@/config/site";
import { getCategories, getFeatured, getSections, getTotalAthkar } from "@/lib/athkar/data";
import { websiteJsonLd } from "@/lib/athkar/structured-data";

// Canonical and og:url live here, not in the root layout, so the 404 page does
// not inherit a canonical pointing at the home page.
export async function generateMetadata(_: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const inherited = await parent;
  return { alternates: { canonical: "/" }, openGraph: { ...inherited.openGraph, url: "/" } };
}

export default function HomePage() {
  const sections = getSections();
  const categories = getCategories();
  const quick = getFeatured();

  return (
    <>
      <JsonLd data={websiteJsonLd(siteConfig)} />
      <section className="px-3 pt-5">
        <div className="clay relative mx-auto grid max-w-5xl items-center gap-2 px-5 pt-8 pb-7 [--clay-r:2.25rem] sm:px-10 md:grid-cols-[1.15fr_1fr] md:py-12">
          <div className="relative z-10">
            <p className="rise font-display text-lg font-bold text-primary">بسم الله نبدأ</p>
            <h1 className="rise mt-1 text-[clamp(2.4rem,7vw,4rem)] leading-[1.05] font-extrabold text-balance [--i:1]">
              {siteConfig.tagline}
            </h1>
            <p className="rise mt-4 max-w-md text-base text-muted-foreground [--i:2] sm:text-lg">
              {getTotalAthkar()} ذكرًا ودعاءً من حصن المسلم في {categories.length} موقفًا، مع عدّاد يساعدك على الإتمام.
            </p>
            <div className="rise relative z-30 mt-6 max-w-xl [--i:3]">
              <SearchBox />
            </div>
            <nav aria-label="الأكثر قراءة" className="rise mt-5 flex flex-wrap gap-2.5 [--i:4]">
              {quick.map((c) => (
                <Link
                  key={c.id}
                  href={`/athkar/${c.id}`}
                  style={{ "--hue": 60 } as React.CSSProperties}
                  className="clay-sm clay-press glaze px-4 py-2 font-display text-[0.95rem] font-bold"
                >
                  {c.title}
                </Link>
              ))}
            </nav>
          </div>
          <div className="rise order-first mx-auto w-[min(78%,22rem)] [--i:2] md:order-none md:w-full">
            <BrandArt name="rehal" priority sizes={SLOT_SIZES.homeHero} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <nav aria-label="الأقسام" className="mb-10 flex gap-2.5 overflow-x-auto px-1 pt-1 pb-4 sm:flex-wrap sm:overflow-visible">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#section-${s.id}`}
              style={{ "--hue": s.hue } as React.CSSProperties}
              className="clay-sm clay-press glaze shrink-0 px-4 py-2 text-sm font-bold"
            >
              {s.title}
            </a>
          ))}
        </nav>
        <SectionGrid sections={sections} />
        <AdSlot />
      </div>
    </>
  );
}
