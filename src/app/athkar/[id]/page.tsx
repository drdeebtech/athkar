import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getCategory((await params).id);
  if (!category) return {};
  const first = stripDiacritics(category.items[0]?.text ?? "").replace(/\s+/g, " ").slice(0, 120);
  const description = `${category.title}: ${category.items.length} من الأذكار والأدعية من حصن المسلم. ${first}…`;
  return {
    title: category.title,
    description,
    alternates: { canonical: `/athkar/${category.id}` },
    openGraph: { title: `${category.title} | ${siteConfig.name}`, description, url: `/athkar/${category.id}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategory((await params).id);
  if (!category) notFound();

  const section = SECTIONS.find((s) => s.id === category.sectionId);
  const { prev, next } = getNeighbours(category.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <nav aria-label="مسار التصفح" className="mb-3 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-foreground">الرئيسية</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/#section-${section?.id}`} className="hover:text-foreground">{section?.title}</Link>
          </li>
        </ol>
      </nav>

      <header className="mb-4 flex items-center gap-3">
        {section && (
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <SectionIcon name={section.icon} className="size-6" />
          </span>
        )}
        <div>
          <h1 className="font-zekr text-3xl leading-tight font-bold sm:text-4xl">{category.title}</h1>
          <p className="text-sm text-muted-foreground">{athkarCount(category.items.length)}</p>
        </div>
      </header>

      <ZekrList
        title={category.title}
        items={category.items}
        next={next ? { id: next.id, title: next.title } : undefined}
      />

      <nav aria-label="التنقل بين المواقف" className="mt-8 grid grid-cols-2 gap-3">
        {prev ? (
          <Link href={`/athkar/${prev.id}`} className="flex items-center gap-2 rounded-xl border bg-card p-3 hover:border-primary/40">
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
            className="flex items-center justify-end gap-2 rounded-xl border bg-card p-3 text-left hover:border-primary/40"
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
