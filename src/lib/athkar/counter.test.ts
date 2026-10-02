import { describe, expect, it } from "vitest";
import {
  canReset,
  createProgress,
  isDone,
  reset,
  resetAll,
  summarize,
  tap,
  type CounterState,
  type ReadingProgress,
} from "./counter";

/** Frozen progress from [target, remaining] pairs, so any mutation throws. */
function progressOf(...pairs: readonly (readonly [number, number])[]): ReadingProgress {
  return Object.freeze(pairs.map(([target, remaining]) => Object.freeze({ target, remaining })));
}

const remaining = (progress: ReadingProgress) => progress.map((c) => c.remaining);

/** Outcome fields for an event that counted nothing. */
const uncounted = { counted: false, completed: false, nextPending: null };

describe("createProgress", () => {
  it("starts every zekr at its target", () => {
    expect(createProgress([{ count: 3 }, { count: 1 }])).toEqual([
      { target: 3, remaining: 3 },
      { target: 1, remaining: 1 },
    ]);
  });

  it("guards against invalid targets", () => {
    const targets = createProgress([0, Number.NaN, 2.7, -2, Infinity].map((count) => ({ count }))).map((c) => c.target);
    expect(targets).toEqual([1, 1, 2, 1, 1]);
  });
});

describe("tap", () => {
  it("counts down and announces what remains", () => {
    const progress = progressOf([1, 0], [3, 3]);
    const step = tap(progress, 1);
    expect(remaining(step.progress)).toEqual([0, 2]);
    expect(step.progress[0]).toBe(progress[0]);
    expect(step.outcome).toEqual({ counted: true, completed: false, nextPending: null, announcement: "الذكر 2: المتبقي 2" });
  });

  it("completes a zekr and points to the next unfinished one after it", () => {
    const step = tap(progressOf([1, 1], [1, 0], [2, 2]), 0);
    expect(remaining(step.progress)).toEqual([0, 0, 2]);
    expect(step.outcome).toEqual({ counted: true, completed: true, nextPending: 2, announcement: "تمّ الذكر 1" });
  });

  it("points nowhere while the tapped zekr is still unfinished", () => {
    const step = tap(createProgress([{ count: 3 }, { count: 1 }]), 0);
    expect(step.outcome).toEqual({ counted: true, completed: false, nextPending: null, announcement: "الذكر 1: المتبقي 2" });
  });

  it("never points back to an earlier unfinished zekr", () => {
    expect(tap(progressOf([2, 2], [1, 1]), 1).outcome.nextPending).toBeNull();
    expect(tap(progressOf([2, 2], [1, 1], [1, 0]), 1).outcome.nextPending).toBeNull();
  });

  it("ignores a tap on a finished zekr and leaves the announcement as it was", () => {
    // A second tap in the same task reaches a zekr the first one finished; it must
    // not clear the completion message from the live region.
    const progress = progressOf([3, 1], [2, 0]);
    const step = tap(progress, 1);
    expect(step.progress).toBe(progress);
    expect(step.outcome).toEqual({ ...uncounted, announcement: null });
  });
});

describe("reset", () => {
  it("restarts one zekr and announces it", () => {
    const progress = progressOf([3, 1], [2, 0]);
    const step = reset(progress, 1);
    expect(remaining(step.progress)).toEqual([1, 2]);
    expect(step.progress[0]).toBe(progress[0]);
    expect(step.outcome).toEqual({ ...uncounted, announcement: "أُعيد عدّ الذكر 2" });
  });
});

describe("resetAll", () => {
  it("restarts every zekr and leaves the announcement as it was", () => {
    const step = resetAll(progressOf([3, 1], [1, 0], [2, 2]));
    expect(remaining(step.progress)).toEqual([3, 1, 2]);
    expect(step.outcome).toEqual({ ...uncounted, announcement: null });
  });
});

describe("summarize", () => {
  it("counts finished adhkar and rounds the percentage", () => {
    expect(summarize(progressOf([1, 0], [3, 2], [1, 1]))).toEqual({
      doneCount: 1,
      total: 3,
      percent: 33,
      allDone: false,
      canResetAll: true,
    });
    expect(summarize(progressOf([1, 0], [3, 0], [1, 1])).percent).toBe(67);
  });

  it("is all done only when every zekr is finished", () => {
    expect(summarize(progressOf([1, 0], [2, 1])).allDone).toBe(false);
    const done = summarize(progressOf([1, 0], [2, 0]));
    expect(done.allDone).toBe(true);
    expect(done.percent).toBe(100);
  });

  it("offers reset-all only once a zekr is finished, not after partial taps", () => {
    expect(summarize(createProgress([{ count: 3 }])).canResetAll).toBe(false);
    expect(summarize(progressOf([3, 2], [2, 1])).canResetAll).toBe(false);
    expect(summarize(progressOf([3, 2], [2, 0])).canResetAll).toBe(true);
  });
});

describe("per-zekr status", () => {
  const cases: readonly (readonly [string, CounterState, boolean, boolean])[] = [
    ["untouched", { target: 3, remaining: 3 }, false, false],
    ["partly counted", { target: 3, remaining: 1 }, false, true],
    ["finished", { target: 3, remaining: 0 }, true, true],
  ];

  it.each(cases)("%s: done and reset availability", (_, counter, done, resettable) => {
    expect(isDone(counter)).toBe(done);
    expect(canReset(counter)).toBe(resettable);
  });
});

describe("reading a whole situation", () => {
  it("advances through each zekr and can start over at the end", () => {
    const start = createProgress([{ count: 2 }, { count: 1 }]);

    const first = tap(start, 0);
    expect(first.outcome.completed).toBe(false);

    const second = tap(first.progress, 0);
    expect(second.outcome).toEqual({ counted: true, completed: true, nextPending: 1, announcement: "تمّ الذكر 1" });
    expect(summarize(second.progress)).toMatchObject({ doneCount: 1, percent: 50, allDone: false, canResetAll: true });

    const last = tap(second.progress, 1);
    expect(last.outcome.nextPending).toBeNull();
    expect(summarize(last.progress)).toMatchObject({ doneCount: 2, percent: 100, allDone: true });

    const restarted = resetAll(last.progress).progress;
    expect(restarted).toEqual(start);
    expect(summarize(restarted).canResetAll).toBe(false);
  });
});

describe("reset of an untouched zekr", () => {
  it("returns the same progress and announces nothing", () => {
    const progress = createProgress([{ count: 3 }]);
    const step = reset(progress, 0);
    expect(step.progress).toBe(progress);
    expect(step.outcome).toEqual({ counted: false, completed: false, nextPending: null, announcement: null });
  });
});
