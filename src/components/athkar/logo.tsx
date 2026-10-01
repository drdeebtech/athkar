import { cn } from "@/lib/utils";

/** Brand mark: clay eight-point star (see docs/brand/README.md). */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: pre-sized WebP, no optimizer needed
    <img src="/brand/logo-mark.webp" alt="" width={40} height={40} className={cn("size-10 shrink-0", className)} />
  );
}
