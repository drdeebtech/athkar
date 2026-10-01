import Link from "next/link";
import { athkarCount } from "@/lib/athkar/arabic";
import type { SectionWithCategories } from "@/lib/athkar/types";
import { SectionIcon } from "./section-icon";

export function SectionGrid({ sections }: { sections: readonly SectionWithCategories[] }) {
  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.id} id={`section-${section.id}`} aria-labelledby={`heading-${section.id}`} className="scroll-mt-20">
          <h2 id={`heading-${section.id}`} className="mb-4 flex items-center gap-2 text-xl font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
              <SectionIcon name={section.icon} />
            </span>
            {section.title}
            <span className="text-sm font-normal text-muted-foreground">({section.categories.length})</span>
          </h2>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {section.categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/athkar/${cat.id}`}
                  className="flex h-full min-h-20 flex-col justify-between gap-2 rounded-xl border bg-card p-3 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="font-zekr text-lg leading-snug font-bold">{cat.title}</span>
                  <span className="text-xs text-muted-foreground">{athkarCount(cat.items.length)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
