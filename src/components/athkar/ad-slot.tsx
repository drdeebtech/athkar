"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim() || undefined;

/** Loads AdSense only when a client id is configured. */
export function AdsenseScript() {
  if (!siteConfig.adsenseClient) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${siteConfig.adsenseClient}`}
    />
  );
}

/**
 * Reserved ad space. Renders nothing unless NEXT_PUBLIC_ADSENSE_CLIENT and
 * NEXT_PUBLIC_ADSENSE_SLOT are set, so the site is ad-free by default.
 */
export function AdSlot({ className }: { className?: string }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!siteConfig.adsenseClient || !SLOT || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or a late script load must never break reading.
    }
  }, []);

  if (!siteConfig.adsenseClient || !SLOT) return null;

  return (
    <aside aria-label="إعلان" className={cn("my-6 min-h-[280px] overflow-hidden rounded-xl border bg-muted/40", className)}>
      <ins
        className="adsbygoogle block"
        data-ad-client={siteConfig.adsenseClient}
        data-ad-slot={SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
