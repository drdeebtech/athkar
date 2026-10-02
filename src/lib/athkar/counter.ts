import type { Zekr } from "./types";

/** One zekr's tap counter: how many times it is said and how many are left. */
export interface CounterState {
  readonly target: number;
  readonly remaining: number;
}

/** A situation's reading progress: one counter per zekr, in page order. */
export type ReadingProgress = readonly CounterState[];

/** What a tap or reset meant, so the page can announce it and move the reader on. */
export interface ProgressOutcome {
  /** A tap took one off a zekr's count (false for resets and ignored taps). */
  readonly counted: boolean;
  /** The tap finished its zekr. */
  readonly completed: boolean;
  /**
   * After a completing tap, the first unfinished zekr after it. Never an earlier
   * one, so the reader is not pulled back up the page; null when none follows.
   */
  readonly nextPending: number | null;
  /** Text for the polite live region, or null to leave the current text in place. */
  readonly announcement: string | null;
}

/** The progress after a tap or reset, and what that event meant. */
export interface ProgressStep {
  readonly progress: ReadingProgress;
  readonly outcome: ProgressOutcome;
}

/** Totals shown above the list. */
export interface ProgressSummary {
  readonly doneCount: number;
  readonly total: number;
  /** Whole percent of adhkar finished. */
  readonly percent: number;
  readonly allDone: boolean;
  readonly canResetAll: boolean;
}

/** The outcome of an event that counted nothing and leaves the announcement alone. */
const QUIET: ProgressOutcome = { counted: false, completed: false, nextPending: null, announcement: null };

function createCounter(target: number): CounterState {
  const safe = Number.isFinite(target) && target >= 1 ? Math.floor(target) : 1;
  return { target: safe, remaining: safe };
}

const restart = (counter: CounterState): CounterState => ({ ...counter, remaining: counter.target });

function replaceAt(progress: ReadingProgress, index: number, counter: CounterState): ReadingProgress {
  return progress.map((c, i) => (i === index ? counter : c));
}

function nextPendingAfter(progress: ReadingProgress, index: number): number | null {
  const found = progress.findIndex((c, i) => i > index && c.remaining > 0);
  return found === -1 ? null : found;
}

/** Starts a situation's progress with every zekr at its target count (at least 1). */
export function createProgress(items: readonly Pick<Zekr, "count">[]): ReadingProgress {
  return items.map((z) => createCounter(z.count));
}

/** True once a zekr has been said its full number of times. */
export function isDone(counter: CounterState): boolean {
  return counter.remaining === 0;
}

/** True once a zekr has been tapped, so there is a count to undo. */
export function canReset(counter: CounterState): boolean {
  return counter.remaining !== counter.target;
}

/**
 * Counts one recitation of the zekr at `index`. A tap on a finished zekr is
 * ignored: the same progress comes back and the announcement is left as it was.
 */
export function tap(progress: ReadingProgress, index: number): ProgressStep {
  const counter = progress[index];
  if (isDone(counter)) return { progress, outcome: QUIET };

  const n = index + 1;
  const left = counter.remaining - 1;
  const next = replaceAt(progress, index, { ...counter, remaining: left });
  const completed = left === 0;
  return {
    progress: next,
    outcome: {
      counted: true,
      completed,
      nextPending: completed ? nextPendingAfter(next, index) : null,
      announcement: completed ? `تمّ الذكر ${n}` : `الذكر ${n}: المتبقي ${left}`,
    },
  };
}

/**
 * Restarts the zekr at `index` from its target count. A zekr that was never
 * tapped is left as it is and nothing is announced.
 */
export function reset(progress: ReadingProgress, index: number): ProgressStep {
  // Nothing to undo: same progress, nothing announced (the button is aria-disabled).
  if (!canReset(progress[index])) return { progress, outcome: QUIET };
  const n = index + 1;
  return {
    progress: replaceAt(progress, index, restart(progress[index])),
    outcome: { ...QUIET, announcement: `أُعيد عدّ الذكر ${n}` },
  };
}

/**
 * Restarts every zekr. Nothing is announced: the done count above the list sits
 * in its own live region and already reads the reset.
 */
export function resetAll(progress: ReadingProgress): ProgressStep {
  return { progress: progress.map(restart), outcome: QUIET };
}

/** Derives the done count, percentage and whether starting over is offered. */
export function summarize(progress: ReadingProgress): ProgressSummary {
  const doneCount = progress.filter(isDone).length;
  const total = progress.length;
  return {
    doneCount,
    total,
    // A situation with no adhkar has nothing to finish: 0%, never "all done".
    percent: total === 0 ? 0 : Math.round((doneCount / total) * 100),
    allDone: total > 0 && doneCount === total,
    // Partial counts are undone per zekr; starting over is offered once one is finished.
    canResetAll: doneCount > 0,
  };
}
