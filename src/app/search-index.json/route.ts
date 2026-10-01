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
  // Cache headers for this file live in public/_headers (static export ignores them here).
  return Response.json(index);
}
