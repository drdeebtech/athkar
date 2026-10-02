/**
 * schema.org JSON-LD for pages. Only describes what is visible on the page:
 * the site itself, and the breadcrumb shown above each situation.
 */
interface Site {
  readonly name: string;
  readonly url: string;
  readonly description: string;
}

const absolute = (site: Site, path: string) => new URL(path, `${site.url}/`).toString();

export function websiteJsonLd(site: Site) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: absolute(site, "/"),
    inLanguage: "ar",
    description: site.description,
  } as const;
}

export function breadcrumbJsonLd(site: Site, page: { readonly id: number; readonly title: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: absolute(site, "/") },
      { "@type": "ListItem", position: 2, name: page.title, item: absolute(site, `/athkar/${page.id}`) },
    ],
  } as const;
}

/** JSON for a <script type="application/ld+json">; "<" is escaped so content cannot end the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
