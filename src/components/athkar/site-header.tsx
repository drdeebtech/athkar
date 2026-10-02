import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LogoMark } from "./logo";
import { ReadingSettingsButton } from "./reading-settings";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="clay mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-3 [--clay-r:1.5rem] sm:px-4">
        <Link href="/" className="flex items-center gap-2 rounded-full focus-visible:ring-3 focus-visible:ring-ring">
          <LogoMark />
          <span className="font-display text-2xl font-extrabold text-foreground">{siteConfig.name}</span>
        </Link>
        <nav aria-label="القائمة الرئيسية" className="flex items-center gap-1.5 text-sm font-medium">
          <Link href="/" className="hidden rounded-full px-3 py-2 text-muted-foreground hover:text-foreground sm:inline-block">
            الرئيسية
          </Link>
          <Link href="/sources" className="hidden rounded-full px-3 py-2 text-muted-foreground hover:text-foreground sm:inline-block">
            المصادر
          </Link>
          <ReadingSettingsButton />
        </nav>
      </div>
    </header>
  );
}
