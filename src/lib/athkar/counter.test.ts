import { describe, expect, it } from "vitest";
import { counterReducer, createCounter, counterStatus } from "./counter";

describe("counter", () => {
  it("starts idle at the target", () => {
    const c = createCounter(3);
    expect(c).toEqual({ target: 3, remaining: 3 });
    expect(counterStatus(c)).toBe("idle");
  });

  it("guards against invalid targets", () => {
    expect(createCounter(0).target).toBe(1);
    expect(createCounter(Number.NaN).target).toBe(1);
    expect(createCounter(2.7).target).toBe(2);
  });

  it("counts down on tap and becomes done at zero", () => {
    let c = createCounter(2);
    c = counterReducer(c, { type: "tap" });
    expect(c.remaining).toBe(1);
    expect(counterStatus(c)).toBe("active");
    c = counterReducer(c, { type: "tap" });
    expect(c.remaining).toBe(0);
    expect(counterStatus(c)).toBe("done");
  });

  it("does not go below zero", () => {
    const done = { target: 1, remaining: 0 };
    expect(counterReducer(done, { type: "tap" })).toBe(done);
  });

  it("resets to the target without mutating state", () => {
    const c = { target: 3, remaining: 1 };
    const r = counterReducer(c, { type: "reset" });
    expect(r).toEqual({ target: 3, remaining: 3 });
    expect(c.remaining).toBe(1);
  });
});
