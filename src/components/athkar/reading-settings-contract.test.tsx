// @vitest-environment jsdom
/*
 * Stored reading settings reach <html> by two paths: the inline pre-paint script
 * in every page head (first load) and the runtime store (later changes). These
 * tests run the real script string and the real runtime path on the same input.
 */
import { act } from "react";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FONT_STEPS,
  PRE_PAINT_SCRIPT,
  ROOT_SETTINGS_CONSTANTS,
  SETTINGS_KEY,
  applySettingsToRoot,
} from "@/lib/athkar/settings";
import { render } from "@/test/dom";
import { ReadingSettingsProvider } from "./reading-settings";

interface RootState {
  readonly className: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly zekrSize: string;
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
    zekrSize: el.style.getPropertyValue("--zekr-size"),
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

/** Parses a stored string as the pre-paint script does: unreadable JSON counts as missing. */
function parseStored(stored: string | null): unknown {
  if (stored === null) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/** Compiles JavaScript `source` for `target` with the TypeScript compiler. */
function emitFor(source: string, target: ts.ScriptTarget): string {
  return ts.transpileModule(source, { compilerOptions: { target, module: ts.ModuleKind.ESNext } }).outputText;
}

/** Calls an apply function directly with the parsed, unvalidated stored value. */
function runDirect(apply: typeof applySettingsToRoot, stored: string | null, prefersDark: boolean): RootState {
  resetRoot();
  apply(root(), parseStored(stored), prefersDark, ROOT_SETTINGS_CONSTANTS);
  return recordRoot();
}

afterEach(() => {
  resetRoot();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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

const STORED: ReadonlyArray<readonly [label: string, stored: string | null]> = [
  ["missing settings", null],
  ["a dark theme", json({ theme: "dark" })],
  ["a light theme", json({ theme: "light" })],
  ["the system theme", json({ theme: "system" })],
  ...FONT_STEPS.map((_size, step) => [`font step ${step}`, json({ fontStep: step })] as const),
  ["bold on", json({ bold: true })],
  ["bold off", json({ bold: false })],
  ["a literal null", "null"],
  ["invalid JSON", "{"],
  ["an empty string", ""],
  ["font step 99", json({ fontStep: 99 })],
  ["font step -1", json({ fontStep: -1 })],
  ["a font step one past the scale", json({ fontStep: FONT_STEPS.length })],
  ["a non-integer font step", json({ fontStep: 1.5 })],
  ["a non-number font step", json({ fontStep: "3" })],
  ["an unknown theme", json({ theme: "neon" })],
];

const MATRIX = STORED.flatMap(([label, stored]) =>
  [false, true].map((prefersDark) => ({ label, stored, prefersDark })),
);

describe("pre-paint script and runtime path", () => {
  it.each(MATRIX)("leave <html> identical for $label (prefers dark: $prefersDark)", ({ stored, prefersDark }) => {
    expect(runPrePaint(stored, prefersDark)).toEqual(runRuntime(stored, prefersDark));
  });
});

describe("pre-paint script with storage blocked", () => {
  it("swallows the error and leaves <html> untouched", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    resetRoot();
    stubPrefersDark(true);
    expect(() => new Function(PRE_PAINT_SCRIPT)()).not.toThrow();
    expect(getItem).toHaveBeenCalledWith(SETTINGS_KEY);
    // Not even the dark default this device prefers is applied: the stylesheet's defaults stand.
    expect(recordRoot()).toEqual({ className: "", attributes: {}, zekrSize: "" });
  });
});

describe("applySettingsToRoot", () => {
  it.each(MATRIX)("validates $label like parseSettings (prefers dark: $prefersDark)", ({ stored, prefersDark }) => {
    expect(runDirect(applySettingsToRoot, stored, prefersDark)).toEqual(runRuntime(stored, prefersDark));
  });

  it("references nothing outside its own source, so it can be inlined", () => {
    // Called outside any try/catch: an outside reference fails loudly here instead of silently in the page head.
    const isolated = new Function(`return (${applySettingsToRoot.toString()});`)() as typeof applySettingsToRoot;
    MATRIX.forEach(({ stored, prefersDark }) => {
      expect(runDirect(isolated, stored, prefersDark)).toEqual(runDirect(applySettingsToRoot, stored, prefersDark));
    });
  });

  it("keeps to ES2017 syntax, so no compile rewrites the inlined source or adds helpers to it", () => {
    // Emitting for ES2017 rewrites any newer syntax (spread, ?., ??, catch without a binding, ...),
    // while emitting for ESNext rewrites none, so the two emits differ exactly when newer syntax is present.
    const source = applySettingsToRoot.toString();
    expect(emitFor(source, ts.ScriptTarget.ES2017)).toBe(emitFor(source, ts.ScriptTarget.ESNext));
  });
});

// Literal on purpose: the sizes readers have always seen per step; FONT_STEPS must not drift from them.
const RENDERED_SIZES = ["1.25rem", "1.5rem", "1.75rem", "2.05rem", "2.4rem"];

const FONT_SIZE: ReadonlyArray<readonly [label: string, stored: string | null, size: string]> = [
  ["missing settings", null, "1.75rem"],
  ...RENDERED_SIZES.map((size, step) => [`font step ${step}`, json({ fontStep: step }), size] as const),
  ["font step 99", json({ fontStep: 99 }), "1.75rem"],
  ["a font step one past the scale", json({ fontStep: FONT_STEPS.length }), "1.75rem"],
  ["a non-integer font step", json({ fontStep: 1.5 }), "1.75rem"],
  ["invalid JSON", "{", "1.75rem"],
];

const UNREADABLE = [
  ["a literal null", "null"],
  ["invalid JSON", "{"],
] as const;

describe.each(PATHS)("%s", (_path, run) => {
  it.each(THEME_AND_BOLD)("applies theme and bold for $label (prefers dark: $prefersDark)", (c) => {
    const state = run(c.stored, c.prefersDark);
    expect(state.className.split(" ").includes("dark")).toBe(c.dark);
    expect(state.attributes["data-bold"]).toBe(c.bold ? "on" : undefined);
  });

  it.each(FONT_SIZE)("sets --zekr-size for %s to %s", (_label, stored, size) => {
    const state = run(stored, false);
    expect(state.zekrSize).toBe(size);
    expect(state.attributes["data-font"]).toBeUndefined();
  });

  it.each(UNREADABLE)("resolves %s like missing settings", (_label, stored) => {
    const state = run(stored, true);
    expect(state).toEqual(run(null, true));
    expect(state.className).toBe("dark");
  });
});
