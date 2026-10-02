import { cn } from "@/lib/utils";

export const ART = {
  // Widths of the exported WebP files, ascending; the last one is the fallback src
  // and sets the intrinsic size. `ratio` is height / width (brand-art.test.ts checks
  // every file). Keep scripts/brand/build-brand-assets.mjs in step with these lists.
  rehal: { sizes: [560, 720, 800, 880, 960], ratio: 904 / 960 },
  beads: { sizes: [480, 640, 800], ratio: 593 / 800 },
} as const;

/**
 * `sizes` for each place the art appears. The browser picks the smallest srcset file
 * that covers `slot * devicePixelRatio`, so each value must match the rendered width
 * of the image: too large and phones fetch pixels they never show, too small and the
 * image turns soft. brand-art.test.ts re-derives the widths from the layout classes
 * named below and checks both directions.
 */
export const SLOT_SIZES = {
  // src/app/page.tsx: w-[min(78%,22rem)] inside px-3 + px-5, so 78% of (100vw - 64px)
  // up to 352px (from a 515px viewport); from md the 1fr column peaks at ~436px.
  homeHero: "(min-width: 768px) 440px, (min-width: 515px) 352px, calc(78vw - 49.92px)",
  // src/app/sources/page.tsx: w-40 sm:w-52.
  sourcesBeads: "(min-width: 640px) 208px, 160px",
  // src/app/not-found.tsx: w-[min(80%,20rem)] inside px-4 + px-6, so 80% of (100vw - 80px)
  // up to 320px (from a 480px viewport).
  notFoundBeads: "(min-width: 480px) 320px, calc(80vw - 64px)",
} as const;

/** Decorative clay illustrations, pre-sized WebP with a responsive srcset. */
export function BrandArt({
  name,
  className,
  priority = false,
  sizes = "(min-width: 768px) 420px, 80vw",
}: {
  name: keyof typeof ART;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const art = ART[name];
  const url = (width: number) => `/brand/hero-${name}-${width}.webp`;
  const largest = art.sizes[art.sizes.length - 1];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: pre-sized WebP with srcset
    <img
      src={url(largest)}
      srcSet={art.sizes.map((width) => `${url(width)} ${width}w`).join(", ")}
      sizes={sizes}
      width={largest}
      height={Math.round(largest * art.ratio)}
      alt=""
      aria-hidden="true"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("h-auto select-none drop-shadow-[0_24px_30px_oklch(0.35_0.06_160/0.22)]", className)}
    />
  );
}
