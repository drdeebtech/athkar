// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SETTINGS_KEY } from "@/lib/athkar/settings";
import { click, render } from "@/test/dom";
import { ReadingSettingsButton, ReadingSettingsProvider } from "./reading-settings";

let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  const root = document.documentElement;
  root.getAttributeNames().forEach((name) => root.removeAttribute(name));
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

/** A prefers-color-scheme stub whose answer can change while listeners watch it. */
function stubColorScheme(initiallyDark: boolean): { setDark: (dark: boolean) => void } {
  let dark = initiallyDark;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === "(prefers-color-scheme: dark)" && dark;
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    setDark(next: boolean) {
      dark = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

/** Renders the open settings panel with the store reset to defaults. */
function mountPanel(): HTMLElement {
  const { container, unmount } = render(
    <ReadingSettingsProvider>
      <ReadingSettingsButton />
    </ReadingSettingsProvider>,
  );
  cleanup = unmount;
  // The store is module state shared by every test; a storage event reloads it from empty storage.
  localStorage.clear();
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: SETTINGS_KEY }));
  });
  click(container.querySelector("button[aria-expanded]")!);
  return container;
}

function themeButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")).find(
    (b) => b.textContent === label,
  );
  if (!button) throw new Error(`no theme button labelled ${label}`);
  return button;
}

function switchFor(container: HTMLElement, label: string): HTMLInputElement {
  const row = Array.from(container.querySelectorAll("label")).find((l) => l.textContent === label);
  const input = row?.querySelector<HTMLInputElement>('input[role="switch"]');
  if (!input) throw new Error(`no switch labelled ${label}`);
  return input;
}

const root = () => document.documentElement;

describe("ReadingSettingsProvider applies settings to <html>", () => {
  it("toggles the dark class with the chosen theme", () => {
    const container = mountPanel();
    stubColorScheme(true);
    click(themeButton(container, "ليلي"));
    expect(root().classList.contains("dark")).toBe(true);
    click(themeButton(container, "نهاري"));
    expect(root().classList.contains("dark")).toBe(false);
    click(themeButton(container, "تلقائي"));
    expect(root().classList.contains("dark")).toBe(true);
  });

  it("marks bold text on <html> only while bold is on", () => {
    const container = mountPanel();
    const bold = switchFor(container, "خط عريض");
    click(bold);
    expect(bold.checked).toBe(true);
    expect(root().dataset.bold).toBe("on");
    click(bold);
    expect(bold.checked).toBe(false);
    expect(root().hasAttribute("data-bold")).toBe(false);
  });

  it("follows the system colour scheme while the theme is system", () => {
    const container = mountPanel();
    const colorScheme = stubColorScheme(false);
    click(themeButton(container, "تلقائي"));
    expect(root().classList.contains("dark")).toBe(false);
    colorScheme.setDark(true);
    expect(root().classList.contains("dark")).toBe(true);
    colorScheme.setDark(false);
    expect(root().classList.contains("dark")).toBe(false);
  });

  it("stops following the system colour scheme once a theme is chosen", () => {
    const container = mountPanel();
    const colorScheme = stubColorScheme(false);
    click(themeButton(container, "نهاري"));
    colorScheme.setDark(true);
    expect(root().classList.contains("dark")).toBe(false);
  });
});
