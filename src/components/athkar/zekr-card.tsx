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
      className={cn(
        "scroll-mt-24 rounded-2xl border bg-card text-card-foreground shadow-sm transition-[opacity,border-color] duration-300",
        status === "done" && "border-done/60 opacity-70",
      )}
    >
      <header className="flex items-center justify-between border-b px-4 py-2 text-sm text-muted-foreground">
        <span>
          الذكر <span className="font-bold text-foreground">{index + 1}</span> من {total}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
          {timesCount(counter.target)}
        </span>
      </header>

      <div className="px-4 py-4 sm:px-6">
        <ZekrText text={zekr.text} />

        {(zekr.virtue || zekr.reference) && (
          <details className="group mt-3 rounded-lg bg-muted/60 text-sm">
            <summary className="cursor-pointer list-none px-3 py-2 font-medium text-muted-foreground marker:hidden hover:text-foreground">
              <span className="group-open:hidden">عرض الفضل والمصدر</span>
              <span className="hidden group-open:inline">إخفاء الفضل والمصدر</span>
            </summary>
            <div className="space-y-2 px-3 pb-3 leading-relaxed">
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

      <footer className="flex items-center gap-2 border-t px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onTap}
          disabled={status === "done"}
          aria-label={status === "done" ? "تم هذا الذكر" : `اضغط للعد، المتبقي ${counter.remaining}`}
          className={cn(
            "flex h-14 flex-1 items-center justify-center gap-3 rounded-xl text-lg font-bold transition-colors select-none active:scale-[0.98]",
            status === "done"
              ? "bg-done/15 text-done"
              : "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
        >
          {status === "done" ? (
            <>
              <Check className="size-6" aria-hidden="true" /> تم
            </>
          ) : (
            <>
              <span className="tabular-nums text-2xl">{counter.remaining}</span>
              <span className="text-base font-medium opacity-90">اضغط للعدّ</span>
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
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-12 shrink-0 place-items-center rounded-xl border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-35"
    >
      {children}
    </button>
  );
}
