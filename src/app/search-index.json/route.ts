import { getCategories } from "@/lib/athkar/data";
import { toSearchPayload } from "@/lib/athkar/search";

export const dynamic = "force-static";

/** Lazily fetched by the search box so the home page stays light. */
export function GET() {
  // Cache headers for this file live in public/_headers (static export ignores them here).
  return Response.json(toSearchPayload(getCategories()));
}
