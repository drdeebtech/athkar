import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/athkar/json-ld";
import { SectionIcon } from "@/components/athkar/section-icon";
import { ZekrList } from "@/components/athkar/zekr-list";
import { siteConfig } from "@/config/site";
import { getCategories, getCategory, getSituation } from "@/lib/athkar/data";
import { athkarCount } from "@/lib/athkar/arabic";
import { breadcrumbJsonLd } from "@/lib/athkar/structured-data";
import { describeCategory } from "@/lib/athkar/describe";

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
  const description = describeCategory(category);
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
  const situation = getSituation((await params).id);
  if (!situation) notFound();

  const { category, section, prev, next } = situation;
  const siblings = getCategories().filter((c) => c.sectionId === category.sectionId && c.id !== category.id);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-4" style={{ "--hue": section.hue } as React.CSSProperties}>
      <JsonLd data={breadcrumbJsonLd(siteConfig, category)} />
      <nav aria-label="مسار التصفح" className="mb-4 px-2 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-foreground">الرئيسية</Link>
          </li>
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/#section-${section.id}`} className="hover:text-foreground">{section.title}</Link>
            </li>
          </>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {category.title}
          </li>
        </ol>
      </nav>

      <header className="clay glaze mb-6 flex items-center gap-4 p-5 [--clay-r:2rem] sm:p-6">
        <span className="clay-sm grid size-14 shrink-0 place-items-center [--clay:var(--card)] [--clay-r:1.25rem]">
          <SectionIcon name={section.icon} className="size-6" />
        </span>
        <div>
          <h1 className="font-zekr text-3xl leading-[1.6] font-bold sm:text-4xl">{category.title}</h1>
          <p className="mt-1 text-sm font-medium opacity-80">{athkarCount(category.items.length)}</p>
        </div>
      </header>

      <ZekrList
        title={category.title}
        items={category.items}
        next={next ? { id: next.id, title: next.title } : undefined}
      />

      <nav aria-label="التنقل بين المواقف" className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {prev ? (
          <Link href={`/athkar/${prev.id}`} className="clay clay-press flex items-center gap-2 p-4 [--clay-r:1.5rem]">
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              <span className="block text-sm text-muted-foreground">السابق</span>
              <span className="font-sans leading-[1.45] font-bold">{prev.title}</span>
            </span>
          </Link>
        ) : (
          // Keeps "next" in the second column from sm up; one column on phones needs no spacer.
          <span className="hidden sm:block" />
        )}
        {next && (
          <Link
            href={`/athkar/${next.id}`}
            className="clay clay-press flex items-center justify-end gap-2 p-4 text-left [--clay-r:1.5rem]"
          >
            <span>
              <span className="block text-sm text-muted-foreground">التالي</span>
              <span className="font-sans leading-[1.45] font-bold">{next.title}</span>
            </span>
            <ChevronLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        )}
      </nav>

      {siblings.length > 0 && (
        <section aria-labelledby="same-section" className="mt-10">
          <h2 id="same-section" className="mb-4 text-xl font-extrabold">
            من نفس القسم
          </h2>
          <ul className="flex flex-wrap gap-2.5">
            {siblings.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/athkar/${c.id}`}
                  className="clay-sm clay-press glaze inline-block px-4 py-2 font-sans text-base font-bold focus-visible:ring-3 focus-visible:ring-ring"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
