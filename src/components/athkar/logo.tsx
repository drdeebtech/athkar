import { cn } from "@/lib/utils";

/** Original mark: an eight-point star (two overlapping squares) around a dot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-9", className)}>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <rect x="9" y="9" width="22" height="22" rx="2" />
        <rect x="9" y="9" width="22" height="22" rx="2" transform="rotate(45 20 20)" />
      </g>
      <circle cx="20" cy="20" r="4" fill="var(--accent)" />
    </svg>
  );
}
