import { cn } from "@/lib/utils";

export const ART = {
  // height / width of the exported WebP files (brand-art.test.ts checks them)
  rehal: { sizes: [560, 960], ratio: 904 / 960 },
  beads: { sizes: [480, 800], ratio: 593 / 800 },
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
  const [small, large] = art.sizes;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: pre-sized WebP with srcset
    <img
      src={`/brand/hero-${name}-${large}.webp`}
      srcSet={`/brand/hero-${name}-${small}.webp ${small}w, /brand/hero-${name}-${large}.webp ${large}w`}
      sizes={sizes}
      width={large}
      height={Math.round(large * art.ratio)}
      alt=""
      aria-hidden="true"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("h-auto select-none drop-shadow-[0_24px_30px_oklch(0.35_0.06_160/0.22)]", className)}
    />
  );
}
