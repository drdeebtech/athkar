import { siteConfig } from "@/config/site";
import { getSections } from "@/lib/athkar/data";
import { llmsTxt } from "@/lib/athkar/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(siteConfig, getSections()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
