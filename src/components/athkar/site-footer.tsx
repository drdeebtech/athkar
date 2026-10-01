import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 px-3 pb-6">
      <div className="clay mx-auto flex max-w-5xl flex-col gap-4 px-6 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-base">
          <span className="font-bold text-foreground">انشر الموقع</span>، فالدالّ على الخير كفاعله.
        </p>
        <nav aria-label="روابط التذييل" className="flex flex-wrap gap-2">
          <Link href="/" className="clay-sm clay-press px-4 py-2 text-foreground">الرئيسية</Link>
          <Link href="/sources" className="clay-sm clay-press px-4 py-2 text-foreground">المصادر</Link>
          <a href={siteConfig.repository} className="clay-sm clay-press px-4 py-2 text-foreground" rel="noopener noreferrer" target="_blank">
            الكود المصدري
          </a>
        </nav>
      </div>
    </footer>
  );
}
