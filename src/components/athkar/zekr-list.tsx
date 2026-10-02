"use client";

import { PartyPopper, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import {
  createProgress,
  reset,
  resetAll,
  summarize,
  tap,
  type ProgressStep,
  type ReadingProgress,
} from "@/lib/athkar/counter";
import type { Zekr } from "@/lib/athkar/types";
import { AdSlot, adsEnabled } from "./ad-slot";
import { ZekrCard } from "./zekr-card";

interface ZekrListProps {
  readonly title: string;
  readonly items: readonly Zekr[];
  readonly next?: { id: number; title: string };
}

const AD_EVERY = 5;
/** Pages with this many adhkar or fewer show each virtue and source open. */
const SHORT_PAGE = 3;
const ADVANCE_DELAY_MS = 250;

/** Scrolls to the next unfinished zekr and moves keyboard focus to its counter. */
function advanceTo(id: string) {
  const card = document.getElementById(`zekr-${id}`);
  if (!card) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  card.querySelector<HTMLButtonElement>("[data-counter]")?.focus({ preventScroll: true });
}

/** A situation's adhkar with tap counters, overall progress and the all-done message. */
export function ZekrList({ title, items, next }: ZekrListProps) {
  const [progress, setProgress] = useState<ReadingProgress>(() => createProgress(items));
  // Screen readers do not reliably re-read a focused button whose label changed,
  // so each tap is also announced here.
  const [announcement, setAnnouncement] = useState("");

  // Each step is computed from this render's progress, so its outcome and the next
  // state agree. Effects run here rather than in a state updater, which React may
  // call more than once.
  const apply = ({ progress: nextProgress, outcome }: ProgressStep) => {
    setProgress(nextProgress);
    if (outcome.announcement !== null) setAnnouncement(outcome.announcement);

    if (!outcome.completed) return;
    if (typeof navigator.vibrate === "function") navigator.vibrate(30);
    const { nextPending } = outcome;
    if (nextPending !== null) setTimeout(() => advanceTo(items[nextPending].id), ADVANCE_DELAY_MS);
  };

  const { doneCount, total, percent, allDone, canResetAll } = summarize(progress);

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div className="clay sticky top-[5.25rem] z-30 mb-6 px-4 py-3 [--clay-r:1.5rem]">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span aria-live="polite" className="font-display">
            أتممت <span className="font-bold tabular-nums">{doneCount}</span> من{" "}
            <span className="tabular-nums">{total}</span>
          </span>
          <button
            type="button"
            aria-disabled={!canResetAll}
            onClick={() => canResetAll && apply(resetAll(progress))}
            className="clay-sm clay-press flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            البدء من جديد
          </button>
        </div>
        <div
          className="clay-inset mt-2.5 h-3 overflow-hidden p-0.5 [--clay-r:9999px]"
          role="progressbar"
          aria-label="نسبة الإتمام"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full origin-right rounded-full bg-done transition-transform duration-500 ease-out" style={{ transform: `scaleX(${percent / 100})` }} />
        </div>
      </div>

      <ol className="space-y-6">
        {items.map((zekr, i) => (
          <Fragment key={zekr.id}>
            <li>
              <ZekrCard
                expanded={items.length <= SHORT_PAGE}
                zekr={zekr}
                index={i}
                total={items.length}
                title={title}
                counter={progress[i]}
                onTap={() => apply(tap(progress, i))}
                onReset={() => apply(reset(progress, i))}
              />
            </li>
            {adsEnabled && (i + 1) % AD_EVERY === 0 && i + 1 < items.length && (
              <li>
                <AdSlot className="my-0" />
              </li>
            )}
          </Fragment>
        ))}
      </ol>

      <div role="status" className="mt-6 empty:hidden">
        {allDone && (
          <div className="clay glaze rise p-8 text-center [--hue:150]">
            <PartyPopper className="mx-auto mb-2 size-8 text-done" aria-hidden="true" />
            <p className="font-display text-2xl font-extrabold">أتممت {title}، تقبّل الله منك</p>
            {next && (
              <Link
                href={`/athkar/${next.id}`}
                className="clay-sm clay-press mt-5 inline-block px-6 py-3 font-display font-bold text-foreground"
              >
                التالي: {next.title}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
