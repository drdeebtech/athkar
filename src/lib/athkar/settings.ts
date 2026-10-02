/** Zekr text sizes, smallest first. A stored fontStep indexes this list; it is the only copy of the scale. */
export const FONT_STEPS = ["1.25rem", "1.5rem", "1.75rem", "2.05rem", "2.4rem"] as const;
export const SETTINGS_KEY = "athkar:settings";
/** Matches when the system prefers a dark colour scheme, which the "system" theme follows. */
export const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";

export type Theme = "system" | "light" | "dark";

export interface ReadingSettings {
  readonly fontStep: number;
  readonly bold: boolean;
  readonly diacritics: boolean;
  readonly theme: Theme;
}

export const DEFAULT_SETTINGS: ReadingSettings = {
  fontStep: 2,
  bold: false,
  diacritics: true,
  theme: "system",
};

const THEMES: readonly Theme[] = ["system", "light", "dark"];
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const validStep = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < FONT_STEPS.length;

/** Parses stored settings, falling back to defaults field by field. */
export function parseSettings(raw: string | null): ReadingSettings {
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (!isRecord(data)) return DEFAULT_SETTINGS;
  return {
    fontStep: validStep(data.fontStep) ? data.fontStep : DEFAULT_SETTINGS.fontStep,
    bold: typeof data.bold === "boolean" ? data.bold : DEFAULT_SETTINGS.bold,
    diacritics: typeof data.diacritics === "boolean" ? data.diacritics : DEFAULT_SETTINGS.diacritics,
    theme: THEMES.includes(data.theme as Theme) ? (data.theme as Theme) : DEFAULT_SETTINGS.theme,
  };
}

export function updateSettings(current: ReadingSettings, patch: Partial<ReadingSettings>): ReadingSettings {
  const next = { ...current, ...patch };
  const step = Number.isFinite(next.fontStep) ? Math.round(next.fontStep) : current.fontStep;
  return { ...next, fontStep: Math.min(FONT_STEPS.length - 1, Math.max(0, step)) };
}

/** What applySettingsToRoot needs from this module, passed in so the function stays self-contained. */
export interface RootSettingsConstants {
  readonly fontSizes: readonly string[];
  readonly themes: readonly Theme[];
  readonly defaults: Pick<ReadingSettings, "fontStep" | "bold" | "theme">;
}

/** The constants both paths pass to applySettingsToRoot: as JSON in PRE_PAINT_SCRIPT, as is at runtime. */
export const ROOT_SETTINGS_CONSTANTS: RootSettingsConstants = {
  fontSizes: FONT_STEPS,
  themes: THEMES,
  defaults: { fontStep: DEFAULT_SETTINGS.fontStep, bold: DEFAULT_SETTINGS.bold, theme: DEFAULT_SETTINGS.theme },
};

/**
 * Applies reading settings to the document root: the zekr text size as the
 * --zekr-size custom property, bold text as data-bold="on", and a dark theme as
 * the "dark" class. `raw` may be any stored value; it is validated with the same
 * rules as parseSettings, falling back to the defaults field by field.
 *
 * PRE_PAINT_SCRIPT inlines this function's source, so it must not reference
 * anything but its parameters and must keep to plain ES2017 that every compile
 * leaves intact (no spread, optional chaining or nullish coalescing).
 */
export function applySettingsToRoot(
  root: HTMLElement,
  raw: unknown,
  prefersDark: boolean,
  constants: RootSettingsConstants,
): void {
  const data: Record<string, unknown> =
    typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const step = data.fontStep;
  const fontStep =
    typeof step === "number" && Number.isInteger(step) && step >= 0 && step < constants.fontSizes.length
      ? step
      : constants.defaults.fontStep;
  const bold = typeof data.bold === "boolean" ? data.bold : constants.defaults.bold;
  const theme = constants.themes.includes(data.theme as Theme) ? (data.theme as Theme) : constants.defaults.theme;
  root.style.setProperty("--zekr-size", constants.fontSizes[fontStep]);
  if (bold) root.dataset.bold = "on";
  else delete root.dataset.bold;
  root.classList.toggle("dark", theme === "dark" || (theme === "system" && prefersDark));
}

/**
 * Inline script run before first paint, so there is no flash of the wrong theme
 * or font size. It applies the stored settings with applySettingsToRoot itself,
 * the function the runtime uses. Unreadable JSON counts as missing settings, as
 * in parseSettings; if storage cannot be read at all, nothing is applied. In a
 * browser without matchMedia the stored settings still apply, and the system
 * theme resolves as light.
 */
export const PRE_PAINT_SCRIPT =
  "(function(){try{" +
  `var stored=localStorage.getItem(${JSON.stringify(SETTINGS_KEY)});` +
  "var raw=null;try{raw=JSON.parse(stored);}catch(e){}" +
  `var prefersDark=typeof matchMedia==="function"&&matchMedia(${JSON.stringify(PREFERS_DARK_QUERY)}).matches;` +
  `(${applySettingsToRoot.toString()})(document.documentElement,raw,prefersDark,` +
  `${JSON.stringify(ROOT_SETTINGS_CONSTANTS)});` +
  "}catch(e){}})();";
