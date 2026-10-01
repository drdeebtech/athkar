import { getCategories } from "@/lib/athkar/data";

export const dynamic = "force-static";

/** Lazily fetched by the search box so the home page stays light. */
export function GET() {
  const index = getCategories().map(({ id, title, sectionId, items }) => ({
    id,
    title,
    sectionId,
    items: items.map(({ id: zid, text, count }) => ({ id: zid, text, count })),
  }));
  return Response.json(index, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
