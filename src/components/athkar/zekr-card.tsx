"use client";

import { Check, Copy, RotateCcw, Share2 } from "lucide-react";
import { useState } from "react";
import { timesCount } from "@/lib/athkar/arabic";
import { counterStatus, type CounterState } from "@/lib/athkar/counter";
import type { Zekr } from "@/lib/athkar/types";
import { cn } from "@/lib/utils";
import { copyText, formatForSharing, shareText } from "./share";
import { ZekrText } from "./zekr-text";

interface ZekrCardProps {
  readonly zekr: Zekr;
  readonly index: number;
  readonly total: number;
  readonly title: string;
  readonly counter: CounterState;
  readonly onTap: () => void;
  readonly onReset: () => void;
}

export function ZekrCard({ zekr, index, total, title, counter, onTap, onReset }: ZekrCardProps) {
  const status = counterStatus(counter);
  const done = status === "done";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (await copyText(formatForSharing(zekr.text, title))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleShare = () => shareText(formatForSharing(zekr.text, title), window.location.href);

  return (
    <article
      id={`zekr-${zekr.id}`}
      aria-label={`الذكر ${index + 1} من ${total}`}
      // Done cards get a muted clay surface instead of fading: fading the whole card
      // dropped secondary text below WCAG AA contrast.
      className={cn("clay scroll-mt-32 [--clay-r:2rem]", done && "[--clay:var(--muted)]")}
    >
      <header className="flex items-center justify-between px-5 pt-4 text-sm text-muted-foreground sm:px-7">
        <span className="font-display">
          الذكر <span className="text-base font-bold text-foreground">{index + 1}</span> من {total}
        </span>
        <span className="clay-sm glaze px-3 py-1 text-xs font-bold [--hue:60]">{timesCount(counter.target)}</span>
      </header>

      <div className="px-5 pt-3 pb-5 sm:px-7">
        <ZekrText text={zekr.text} />

        {(zekr.virtue || zekr.reference) && (
          <details className="group clay-inset mt-4 text-sm [--clay-r:1.25rem]">
            <summary className="cursor-pointer list-none px-4 py-3 font-medium text-muted-foreground marker:hidden hover:text-foreground">
              <span className="group-open:hidden">عرض الفضل والمصدر</span>
              <span className="hidden group-open:inline">إخفاء الفضل والمصدر</span>
            </summary>
            <div className="space-y-2 px-4 pb-4 leading-relaxed">
              {zekr.virtue && (
                <p>
                  <span className="font-bold">الفضل: </span>
                  {zekr.virtue}
                </p>
              )}
              {zekr.reference && (
                <p className="text-muted-foreground">
                  <span className="font-bold text-foreground">المصدر: </span>
                  {zekr.reference}
                </p>
              )}
            </div>
          </details>
        )}
      </div>

      <footer className="flex items-center gap-3 px-4 pb-5 sm:px-6">
        <button
          type="button"
          data-counter
          onClick={() => !done && onTap()}
          aria-disabled={done}
          aria-label={done ? "تم هذا الذكر" : `اضغط للعد، المتبقي ${counter.remaining}`}
          style={{ "--hue": done ? 150 : 60 } as React.CSSProperties}
          className={cn(
            "clay glaze flex h-16 flex-1 items-center justify-center gap-3 [--clay-r:9999px] select-none focus-visible:ring-3 focus-visible:ring-ring",
            // Alternate the animation name so the squish replays on every tap without
            // remounting the button (a remount would drop keyboard and screen-reader focus).
            done ? "cursor-default" : cn("clay-press", counter.remaining % 2 ? "squish" : "squish-alt"),
          )}
        >
          {done ? (
            <>
              <Check className="size-7" strokeWidth={2.6} aria-hidden="true" />
              <span className="font-display text-xl font-extrabold">تمّ</span>
            </>
          ) : (
            <>
              <span className="font-display text-3xl leading-none font-extrabold tabular-nums">{counter.remaining}</span>
              <span className="font-display text-base font-bold opacity-80">اضغط للعدّ</span>
            </>
          )}
        </button>
        <IconButton label="إعادة العدّ" onClick={onReset} disabled={status === "idle"}>
          <RotateCcw className="size-5" aria-hidden="true" />
        </IconButton>
        <IconButton label={copied ? "تم النسخ" : "نسخ"} onClick={handleCopy}>
          {copied ? <Check className="size-5 text-done" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
        </IconButton>
        <IconButton label="مشاركة" onClick={handleShare}>
          <Share2 className="size-5" aria-hidden="true" />
        </IconButton>
        <span className="sr-only" aria-live="polite">
          {copied ? "تم نسخ الذكر" : ""}
        </span>
      </footer>
    </article>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onClick()}
      aria-disabled={disabled}
      aria-label={label}
      title={label}
      className="clay-sm clay-press grid size-12 shrink-0 place-items-center text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring aria-disabled:cursor-default aria-disabled:opacity-40"
    >
      {children}
    </button>
  );
}
