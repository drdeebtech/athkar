import Link from "next/link";
import { AdSlot } from "@/components/athkar/ad-slot";
import { SearchBox } from "@/components/athkar/search-box";
import { SectionGrid } from "@/components/athkar/section-grid";
import { siteConfig } from "@/config/site";
import { getCategories, getSections, getTotalAthkar } from "@/lib/athkar/data";

const QUICK_LINKS = ["أذكار الصباح", "أذكار المساء", "أذكار النوم", "الأذكار بعد السلام من الصلاة"];

export default function HomePage() {
  const sections = getSections();
  const categories = getCategories();
  const quick = QUICK_LINKS.map((t) => categories.find((c) => c.title === t)).filter((c) => c !== undefined);

  return (
    <>
      <section className="bg-pattern bg-primary text-primary-foreground dark:bg-card dark:text-foreground">
        <div className="mx-auto max-w-5xl px-4 pt-10 pb-12 sm:pt-14">
          <h1 className="text-3xl font-bold sm:text-4xl">{siteConfig.tagline}</h1>
          <p className="mt-3 max-w-2xl text-base opacity-90 sm:text-lg">
            {getTotalAthkar()} ذكرًا ودعاءً من حصن المسلم في {categories.length} موقفًا، مع عدّاد يساعدك على الإتمام.
          </p>
          <div className="mt-6 max-w-2xl">
            <SearchBox />
          </div>
          <nav aria-label="الأكثر قراءة" className="mt-5 flex flex-wrap gap-2">
            {quick.map((c) => (
              <Link
                key={c.id}
                href={`/athkar/${c.id}`}
                className="rounded-full bg-white/12 px-4 py-2 text-sm font-medium ring-1 ring-white/20 hover:bg-white/20 dark:bg-muted dark:ring-border"
              >
                {c.title}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <nav aria-label="الأقسام" className="mb-8 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#section-${s.id}`}
              className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-sm hover:border-primary/40"
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
