import Link from "next/link";
import { athkarCount, situationsCount } from "@/lib/athkar/arabic";
import type { SectionWithCategories } from "@/lib/athkar/types";
import { SectionIcon } from "./section-icon";

export function SectionGrid({ sections }: { sections: readonly SectionWithCategories[] }) {
  return (
    <div className="space-y-14">
      {sections.map((section) => (
        <section
          key={section.id}
          id={`section-${section.id}`}
          aria-labelledby={`heading-${section.id}`}
          className="scroll-mt-28"
          style={{ "--hue": section.hue } as React.CSSProperties}
        >
          <h2 id={`heading-${section.id}`} className="mb-5 flex items-center gap-3 text-2xl font-extrabold">
            <span className="clay-sm glaze grid size-12 place-items-center [--clay-r:1rem]">
              <SectionIcon name={section.icon} className="size-6" />
            </span>
            {section.title}
            <span className="font-sans text-sm font-medium text-muted-foreground">{situationsCount(section.categories.length)}</span>
          </h2>
          <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {section.categories.map((cat, i) => (
              <li key={cat.id} className="rise" style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={`/athkar/${cat.id}`}
                  className="clay clay-press glaze flex h-full min-h-24 flex-col justify-between gap-3 p-4 [--clay-r:1.5rem] focus-visible:ring-3 focus-visible:ring-ring"
                >
                  <span className="font-sans text-base leading-[1.45] font-bold">{cat.title}</span>
                  <span className="self-start rounded-full bg-[color-mix(in_oklch,currentColor_10%,transparent)] px-2.5 py-0.5 text-sm font-medium">
                    {athkarCount(cat.items.length)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
