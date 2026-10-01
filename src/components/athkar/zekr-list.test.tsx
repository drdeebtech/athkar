// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { click, render } from "@/test/dom";
import { ZekrList } from "./zekr-list";

const items = [
  { id: "1-1", text: "سبحان الله", count: 3 },
  { id: "1-2", text: "الحمد لله", count: 3 },
];

let cleanup: () => void = () => {};
afterEach(() => cleanup());

function setup() {
  const { container, unmount } = render(<ZekrList title="اختبار" items={items} />);
  cleanup = unmount;
  const card = container.querySelector<HTMLElement>("#zekr-1-1")!;
  return { container, card, counter: () => card.querySelector<HTMLButtonElement>("[data-counter]")! };
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
