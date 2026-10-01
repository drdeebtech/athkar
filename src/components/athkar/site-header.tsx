import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LogoMark } from "./logo";
import { ReadingSettingsButton } from "./reading-settings";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-primary text-primary-foreground shadow-sm dark:bg-card dark:text-foreground">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:ring-3 focus-visible:ring-accent/60">
          <LogoMark className="text-accent" />
          <span className="text-2xl font-bold tracking-tight">{siteConfig.name}</span>
        </Link>
        <nav aria-label="القائمة الرئيسية" className="flex items-center gap-1 text-sm font-medium">
          <Link href="/" className="hidden rounded-md px-3 py-2 hover:bg-white/10 sm:inline-block">
            الرئيسية
          </Link>
          <Link href="/sources" className="hidden rounded-md px-3 py-2 hover:bg-white/10 sm:inline-block">
            المصادر
          </Link>
          <ReadingSettingsButton />
        </nav>
      </div>
    </header>
  );
}
