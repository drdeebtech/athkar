import { serializeJsonLd } from "@/lib/athkar/structured-data";

/** schema.org data for search engines; not executed, and "<" is escaped. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
