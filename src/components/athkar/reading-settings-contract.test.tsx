// @vitest-environment jsdom
/*
 * Stored reading settings reach <html> by two paths: the inline pre-paint script
 * in every page head (first load) and the runtime store (later changes). These
 * tests run the real script string and the real runtime path on the same input.
 */
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRE_PAINT_SCRIPT, SETTINGS_KEY } from "@/lib/athkar/settings";
import { render } from "@/test/dom";
import { ReadingSettingsProvider } from "./reading-settings";

interface RootState {
  readonly className: string;
  readonly attributes: Readonly<Record<string, string>>;
}

const root = () => document.documentElement;

function resetRoot(): void {
  root()
    .getAttributeNames()
    .forEach((name) => root().removeAttribute(name));
}

function recordRoot(): RootState {
  const el = root();
  return {
    className: el.className,
    attributes: Object.fromEntries(el.getAttributeNames().map((name) => [name, el.getAttribute(name) ?? ""])),
  };
}

function store(stored: string | null): void {
  localStorage.clear();
  if (stored !== null) localStorage.setItem(SETTINGS_KEY, stored);
}

function stubPrefersDark(prefersDark: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" && prefersDark,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/** Runs the inline script string exactly as it ships in the page head. */
function runPrePaint(stored: string | null, prefersDark: boolean): RootState {
  resetRoot();
  store(stored);
  stubPrefersDark(prefersDark);
  new Function(PRE_PAINT_SCRIPT)();
  return recordRoot();
}

/** Runs the runtime path: a storage event makes the store re-read, parse and apply the stored value. */
function runRuntime(stored: string | null, prefersDark: boolean): RootState {
  const { unmount } = render(
    <ReadingSettingsProvider>
      <span />
    </ReadingSettingsProvider>,
  );
  try {
    resetRoot();
    store(stored);
    stubPrefersDark(prefersDark);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: SETTINGS_KEY }));
    });
    return recordRoot();
  } finally {
    unmount();
  }
}

afterEach(() => {
  resetRoot();
  localStorage.clear();
  vi.unstubAllGlobals();
});

const PATHS = [
  ["pre-paint script", runPrePaint],
  ["runtime path", runRuntime],
] as const;

const json = (value: unknown) => JSON.stringify(value);

interface ThemeAndBoldCase {
  readonly label: string;
  readonly stored: string | null;
  readonly prefersDark: boolean;
  readonly dark: boolean;
  readonly bold: boolean;
}

const THEME_AND_BOLD: readonly ThemeAndBoldCase[] = [
  { label: "missing settings", stored: null, prefersDark: false, dark: false, bold: false },
  { label: "missing settings", stored: null, prefersDark: true, dark: true, bold: false },
  { label: "a dark theme", stored: json({ theme: "dark" }), prefersDark: false, dark: true, bold: false },
  { label: "a light theme", stored: json({ theme: "light" }), prefersDark: true, dark: false, bold: false },
  { label: "the system theme", stored: json({ theme: "system" }), prefersDark: true, dark: true, bold: false },
  { label: "the system theme", stored: json({ theme: "system" }), prefersDark: false, dark: false, bold: false },
  { label: "an unknown theme", stored: json({ theme: "neon" }), prefersDark: true, dark: true, bold: false },
  { label: "bold on", stored: json({ bold: true }), prefersDark: false, dark: false, bold: true },
  { label: "bold off", stored: json({ bold: false }), prefersDark: false, dark: false, bold: false },
  { label: "a non-boolean bold", stored: json({ bold: "yes" }), prefersDark: false, dark: false, bold: false },
  { label: "an invalid font step", stored: json({ fontStep: 99, theme: "dark" }), prefersDark: false, dark: true, bold: false },
  { label: "a JSON array", stored: "[1,2]", prefersDark: true, dark: true, bold: false },
];

describe.each(PATHS)("%s", (_path, run) => {
  it.each(THEME_AND_BOLD)("applies theme and bold for $label (prefers dark: $prefersDark)", (c) => {
    const state = run(c.stored, c.prefersDark);
    expect(state.className.split(" ").includes("dark")).toBe(c.dark);
    expect(state.attributes["data-bold"]).toBe(c.bold ? "on" : undefined);
  });
});
