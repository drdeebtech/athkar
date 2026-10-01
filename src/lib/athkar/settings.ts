export const FONT_STEPS = ["1.25rem", "1.5rem", "1.75rem", "2.05rem", "2.4rem"] as const;
export const SETTINGS_KEY = "athkar:settings";

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
  return { ...next, fontStep: Math.min(FONT_STEPS.length - 1, Math.max(0, Math.round(next.fontStep))) };
}

/**
 * Inline script run before paint: applies stored settings to <html> so there is
 * no flash of the wrong theme or font size. Kept dependency-free on purpose.
 */
export const PRE_PAINT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_KEY,
)})||"{}");var d=document.documentElement;var steps=${FONT_STEPS.length};if(Number.isInteger(s.fontStep)&&s.fontStep>=0&&s.fontStep<steps)d.dataset.font=String(s.fontStep);if(s.bold===true)d.dataset.bold="on";var t=s.theme==="light"||s.theme==="dark"?s.theme:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");if(t==="dark")d.classList.add("dark");}catch(e){}})();`;
