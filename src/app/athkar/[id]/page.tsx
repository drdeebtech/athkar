import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionIcon } from "@/components/athkar/section-icon";
import { ZekrList } from "@/components/athkar/zekr-list";
import { siteConfig } from "@/config/site";
import { getCategories, getCategory, getNeighbours } from "@/lib/athkar/data";
import { athkarCount } from "@/lib/athkar/arabic";
import { SECTIONS } from "@/lib/athkar/sections";
import { stripDiacritics } from "@/lib/athkar/text";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getCategories().map((c) => ({ id: String(c.id) }));
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const category = getCategory((await params).id);
  if (!category) return {};
  // A page-level openGraph replaces the parent's, so extend the inherited one to
  // keep the site share image, type, site name and locale on every situation page.
  const inherited = await parent;
  const first = stripDiacritics(category.items[0]?.text ?? "").replace(/\s+/g, " ").slice(0, 120);
  const description = `${category.title}: ${category.items.length} من الأذكار والأدعية من حصن المسلم. ${first}…`;
  return {
    title: category.title,
    description,
    alternates: { canonical: `/athkar/${category.id}` },
    openGraph: {
      ...inherited.openGraph,
      title: `${category.title} | ${siteConfig.name}`,
      description,
      url: `/athkar/${category.id}`,
    },
    twitter: { ...inherited.twitter, card: "summary_large_image", title: category.title, description },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategory((await params).id);
  if (!category) notFound();

  const section = SECTIONS.find((s) => s.id === category.sectionId);
  const { prev, next } = getNeighbours(category.id);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-4" style={{ "--hue": section?.hue ?? 165 } as React.CSSProperties}>
      <nav aria-label="مسار التصفح" className="mb-4 px-2 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-foreground">الرئيسية</Link>
          </li>
          {section && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/#section-${section.id}`} className="hover:text-foreground">{section.title}</Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {category.title}
          </li>
        </ol>
      </nav>

      <header className="clay glaze mb-6 flex items-center gap-4 p-5 [--clay-r:2rem] sm:p-6">
        {section && (
          <span className="clay-sm grid size-14 shrink-0 place-items-center [--clay:var(--card)] [--clay-r:1.25rem]">
            <SectionIcon name={section.icon} className="size-6" />
          </span>
        )}
        <div>
          <h1 className="font-zekr text-3xl leading-tight font-bold sm:text-4xl">{category.title}</h1>
          <p className="mt-1 text-sm font-medium opacity-80">{athkarCount(category.items.length)}</p>
        </div>
      </header>

      <ZekrList
        title={category.title}
        items={category.items}
        next={next ? { id: next.id, title: next.title } : undefined}
      />

      <nav aria-label="التنقل بين المواقف" className="mt-10 grid grid-cols-2 gap-4">
        {prev ? (
          <Link href={`/athkar/${prev.id}`} className="clay clay-press flex items-center gap-2 p-4 [--clay-r:1.5rem]">
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              <span className="block text-xs text-muted-foreground">السابق</span>
              <span className="font-zekr font-bold">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/athkar/${next.id}`}
            className="clay clay-press flex items-center justify-end gap-2 p-4 text-left [--clay-r:1.5rem]"
          >
            <span>
              <span className="block text-xs text-muted-foreground">التالي</span>
              <span className="font-zekr font-bold">{next.title}</span>
            </span>
            <ChevronLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        )}
      </nav>
    </div>
  );
}
