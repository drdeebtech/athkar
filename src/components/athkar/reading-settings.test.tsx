// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { click, render } from "@/test/dom";
import { ReadingSettingsButton, ReadingSettingsProvider } from "./reading-settings";

let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("ReadingSettingsButton font controls", () => {
  it("keeps focus on the increase button at the largest size", () => {
    const { container, unmount } = render(
      <ReadingSettingsProvider>
        <ReadingSettingsButton />
      </ReadingSettingsProvider>,
    );
    cleanup = unmount;
    click(container.querySelector("button[aria-expanded]")!);
    const plus = container.querySelector<HTMLButtonElement>('button[aria-label="تكبير الخط"]')!;
    for (let i = 0; i < 6; i++) click(plus);
    expect(plus.hasAttribute("disabled")).toBe(false);
    expect(plus.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(plus);
    // Clamped at the largest step, not pushed past it by the extra clicks.
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe("5 / 5");
  });
});
