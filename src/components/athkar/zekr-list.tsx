"use client";

import { PartyPopper, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { counterReducer, createCounter, type CounterAction, type CounterState } from "@/lib/athkar/counter";
import type { Zekr } from "@/lib/athkar/types";
import { AdSlot, adsEnabled } from "./ad-slot";
import { ZekrCard } from "./zekr-card";

interface ZekrListProps {
  readonly title: string;
  readonly items: readonly Zekr[];
  readonly next?: { id: number; title: string };
}

const AD_EVERY = 5;
const ADVANCE_DELAY_MS = 250;

const initial = (items: readonly Zekr[]) => items.map((z) => createCounter(z.count));

/** Scrolls to the next unfinished zekr and moves keyboard focus to its counter. */
function advanceTo(id: string) {
  const card = document.getElementById(`zekr-${id}`);
  if (!card) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  card.querySelector<HTMLButtonElement>("[data-counter]")?.focus({ preventScroll: true });
}

export function ZekrList({ title, items, next }: ZekrListProps) {
  const [counters, setCounters] = useState<CounterState[]>(() => initial(items));

  const dispatch = (index: number, action: CounterAction) => {
    const current = counters[index];
    const completes = action.type === "tap" && current.remaining === 1;
    setCounters((list) => list.map((c, i) => (i === index ? counterReducer(c, action) : c)));

    if (!completes) return;
    if (typeof navigator.vibrate === "function") navigator.vibrate(30);
    const nextPending = counters.findIndex((c, i) => i > index && c.remaining > 0);
    if (nextPending !== -1) setTimeout(() => advanceTo(items[nextPending].id), ADVANCE_DELAY_MS);
  };

  const doneCount = counters.filter((c) => c.remaining === 0).length;
  const allDone = doneCount === items.length;
  const percent = Math.round((doneCount / items.length) * 100);

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-4 mb-4 border-b bg-background/90 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span aria-live="polite">
            أتممت <span className="font-bold tabular-nums">{doneCount}</span> من{" "}
            <span className="tabular-nums">{items.length}</span>
          </span>
          <button
            type="button"
            aria-disabled={doneCount === 0}
            onClick={() => doneCount > 0 && setCounters(initial(items))}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            البدء من جديد
          </button>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="نسبة الإتمام"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full rounded-full bg-done transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ol className="space-y-4">
        {items.map((zekr, i) => (
          <Fragment key={zekr.id}>
            <li>
              <ZekrCard
                zekr={zekr}
                index={i}
                total={items.length}
                title={title}
                counter={counters[i]}
                onTap={() => dispatch(i, { type: "tap" })}
                onReset={() => dispatch(i, { type: "reset" })}
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
          <div className="rounded-2xl border border-done/50 bg-done/10 p-6 text-center">
            <PartyPopper className="mx-auto mb-2 size-8 text-done" aria-hidden="true" />
            <p className="text-xl font-bold">أتممت {title}، تقبّل الله منك</p>
            {next && (
              <Link
                href={`/athkar/${next.id}`}
                className="mt-4 inline-block rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90"
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
