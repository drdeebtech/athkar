import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-bold text-foreground">انشر الموقع</span>، فالدالّ على الخير كفاعله.
        </p>
        <nav aria-label="روابط التذييل" className="flex gap-4">
          <Link href="/" className="hover:text-foreground">الرئيسية</Link>
          <Link href="/sources" className="hover:text-foreground">المصادر</Link>
          <a href={siteConfig.repository} className="hover:text-foreground" rel="noopener noreferrer" target="_blank">
            الكود المصدري
          </a>
        </nav>
      </div>
    </footer>
  );
}
