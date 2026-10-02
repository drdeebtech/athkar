// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { click, render } from "@/test/dom";
import type { Zekr } from "@/lib/athkar/types";
import { ZekrList } from "./zekr-list";

const items = [
  { id: "1-1", text: "سبحان الله", count: 3 },
  { id: "1-2", text: "الحمد لله", count: 3 },
];

/** Adhkar said once, so a single tap completes each one. */
const singles = [
  { id: "2-1", text: "سبحان الله", count: 1 },
  { id: "2-2", text: "الحمد لله", count: 1 },
  { id: "2-3", text: "الله أكبر", count: 1 },
];

const mixed = [
  { id: "3-1", text: "سبحان الله", count: 2 },
  { id: "3-2", text: "الحمد لله", count: 1 },
];

/** Matches ADVANCE_DELAY_MS in zekr-list.tsx. */
const ADVANCE_DELAY_MS = 250;

let cleanup: () => void = () => {};
afterEach(() => cleanup());

function renderList(list: readonly Zekr[], next?: { id: number; title: string }) {
  const { container, unmount } = render(<ZekrList title="اختبار" items={list} next={next} />);
  cleanup = unmount;
  const card = (id: string) => container.querySelector<HTMLElement>(`#zekr-${id}`)!;
  return {
    container,
    card,
    counterOf: (id: string) => card(id).querySelector<HTMLButtonElement>("[data-counter]")!,
    announcement: () => container.querySelector('p[aria-live="polite"]')?.textContent,
    doneText: () => container.querySelector('span[aria-live="polite"]')?.textContent,
    percent: () => container.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"),
    status: () => container.querySelector<HTMLElement>('[role="status"]')!,
    resetAll: () => [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("البدء من جديد"))!,
  };
}

function setup() {
  const { container, card, counterOf } = renderList(items);
  return { container, card: card("1-1"), counter: () => counterOf("1-1") };
}

describe("ZekrList counter accessibility", () => {
  it("keeps focus on the same counter button across taps", () => {
    const { counter } = setup();
    const first = counter();
    click(first);
    expect(counter()).toBe(first);
    expect(first.isConnected).toBe(true);
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute("aria-label")).toContain("2");
  });

  it("keeps focus on reset instead of disabling it under the cursor", () => {
    const { card, counter } = setup();
    click(counter());
    const reset = card.querySelector<HTMLButtonElement>('button[aria-label="إعادة العدّ"]')!;
    click(reset);
    expect(reset.hasAttribute("disabled")).toBe(false);
    expect(reset.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(reset);
    expect(counter().getAttribute("aria-label")).toContain("3");
  });

  it("announces the remaining count in a polite live region", () => {
    const { container, counter } = setup();
    click(counter());
    const regions = [...container.querySelectorAll('[aria-live="polite"]')].map((r) => r.textContent ?? "");
    expect(regions.some((t) => t.includes("المتبقي") && t.includes("2"))).toBe(true);
  });
});

describe("ZekrList reading progress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "vibrate");
  });

  it("announces a completed zekr and moves focus to the next pending counter after the delay", () => {
    const { card, counterOf, announcement } = renderList(singles);
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    const first = counterOf("2-1");

    click(first);
    expect(announcement()).toBe("تمّ الذكر 1");
    expect(first.getAttribute("aria-label")).toBe("تم هذا الذكر");

    vi.advanceTimersByTime(ADVANCE_DELAY_MS - 1);
    expect(document.activeElement).toBe(first);
    expect(scroll).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(document.activeElement).toBe(counterOf("2-2"));
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(card("2-2"));
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("advances only forwards, skipping adhkar already finished", () => {
    const { card, counterOf } = renderList(singles);
    const scroll = vi.mocked(Element.prototype.scrollIntoView);

    click(counterOf("2-2"));
    vi.advanceTimersByTime(ADVANCE_DELAY_MS);
    expect(document.activeElement).toBe(counterOf("2-3"));

    click(counterOf("2-1"));
    vi.advanceTimersByTime(ADVANCE_DELAY_MS);
    expect(document.activeElement).toBe(counterOf("2-3"));
    expect(scroll.mock.contexts[1]).toBe(card("2-3"));

    // Nothing is pending after the last zekr; the earlier ones are all done.
    click(counterOf("2-3"));
    vi.advanceTimersByTime(ADVANCE_DELAY_MS);
    expect(document.activeElement).toBe(counterOf("2-3"));
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it("does not move focus backwards to an earlier pending zekr", () => {
    const { counterOf } = renderList(singles);
    const scroll = vi.mocked(Element.prototype.scrollIntoView);

    click(counterOf("2-3"));
    vi.advanceTimersByTime(ADVANCE_DELAY_MS);
    expect(document.activeElement).toBe(counterOf("2-3"));
    expect(scroll).not.toHaveBeenCalled();
  });

  it("vibrates when a zekr is completed, not on every tap", () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });
    const { counterOf } = renderList(mixed);

    click(counterOf("3-1"));
    expect(vibrate).not.toHaveBeenCalled();
    click(counterOf("3-1"));
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(30);
    click(counterOf("3-2"));
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it("ignores taps on a finished zekr and keeps its announcement", () => {
    const { counterOf, announcement } = renderList(singles);
    const first = counterOf("2-1");
    click(first);
    click(first);
    expect(announcement()).toBe("تمّ الذكر 1");
    expect(first.getAttribute("aria-label")).toBe("تم هذا الذكر");
  });

  it("tracks progress and congratulates with a link to the next situation when all are done", () => {
    const { counterOf, doneText, percent, status } = renderList(singles, { id: 7, title: "أذكار المساء" });
    expect(doneText()).toBe("أتممت 0 من 3");
    expect(percent()).toBe("0");
    expect(status().childElementCount).toBe(0);

    click(counterOf("2-1"));
    expect(doneText()).toBe("أتممت 1 من 3");
    expect(percent()).toBe("33");
    click(counterOf("2-2"));
    expect(percent()).toBe("67");
    expect(status().childElementCount).toBe(0);

    click(counterOf("2-3"));
    expect(doneText()).toBe("أتممت 3 من 3");
    expect(percent()).toBe("100");
    expect(status().querySelector("p")?.textContent).toBe("أتممت اختبار، تقبّل الله منك");
    const link = status().querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/athkar/7");
    expect(link.textContent).toBe("التالي: أذكار المساء");
  });

  it("congratulates without a link when there is no next situation", () => {
    const { counterOf, status } = renderList(singles.slice(0, 1));
    click(counterOf("2-1"));
    expect(status().querySelector("p")?.textContent).toBe("أتممت اختبار، تقبّل الله منك");
    expect(status().querySelector("a")).toBeNull();
  });

  it("enables reset-all only after a zekr is completed and leaves the announcement as it was", () => {
    const { counterOf, announcement, doneText, resetAll } = renderList(mixed);
    expect(resetAll().getAttribute("aria-disabled")).toBe("true");

    // A partly counted zekr does not make reset-all available.
    click(counterOf("3-1"));
    expect(resetAll().getAttribute("aria-disabled")).toBe("true");
    click(resetAll());
    expect(counterOf("3-1").getAttribute("aria-label")).toBe("اضغط للعد، المتبقي 1");

    click(counterOf("3-2"));
    expect(resetAll().getAttribute("aria-disabled")).toBe("false");
    expect(announcement()).toBe("تمّ الذكر 2");

    click(resetAll());
    expect(resetAll().getAttribute("aria-disabled")).toBe("true");
    expect(doneText()).toBe("أتممت 0 من 2");
    expect(counterOf("3-1").getAttribute("aria-label")).toBe("اضغط للعد، المتبقي 2");
    expect(counterOf("3-2").getAttribute("aria-label")).toBe("اضغط للعد، المتبقي 1");
    expect(announcement()).toBe("تمّ الذكر 2");
  });

  it("announces a per-zekr reset", () => {
    const { card, counterOf, announcement } = renderList(mixed);
    click(counterOf("3-1"));
    expect(announcement()).toBe("الذكر 1: المتبقي 1");
    click(card("3-1").querySelector<HTMLButtonElement>('button[aria-label="إعادة العدّ"]')!);
    expect(announcement()).toBe("أُعيد عدّ الذكر 1");
    expect(counterOf("3-1").getAttribute("aria-label")).toBe("اضغط للعد، المتبقي 2");
  });
});
