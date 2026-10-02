import { athkarCount } from "./arabic";
import type { SectionWithCategories } from "./types";

interface Site {
  readonly name: string;
  readonly url: string;
  readonly description: string;
  readonly repository: string;
}

/**
 * /llms.txt: a plain description of the site for any reader, generated from the
 * same data as the pages so counts and links never drift. Facts only.
 */
export function llmsTxt(site: Site, sections: readonly SectionWithCategories[]): string {
  const categories = sections.flatMap((s) => s.categories);
  const total = categories.reduce((sum, c) => sum + c.items.length, 0);
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    "## عن الموقع",
    `- ${total} ذكرًا ودعاءً في ${categories.length} موقفًا، مقسّمة على ${sections.length} قسمًا.`,
    "- النصوص من القرآن الكريم والسنة النبوية بترتيب كتاب «حصن المسلم» للشيخ سعيد بن علي بن وهف القحطاني.",
    "- لكل ذكر عدد مرات التكرار، ومع بعض الأذكار فضلها ومصدرها.",
    "- الموقع بالعربية فقط، مجاني، ولا يحتاج تسجيلًا.",
    "",
    ...sections.flatMap((s) => [
      `## ${s.title}`,
      ...s.categories.map((c) => `- [${c.title}](${site.url}/athkar/${c.id}): ${athkarCount(c.items.length)}`),
      "",
    ]),
    "## صفحات أخرى",
    `- [المصادر](${site.url}/sources)`,
    `- [خريطة الموقع](${site.url}/sitemap.xml)`,
    `- [الكود والإبلاغ عن الأخطاء](${site.repository})`,
    "",
  ];
  return lines.join("\n");
}
