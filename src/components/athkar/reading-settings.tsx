"use client";

import { Minus, Moon, Plus, Settings2, Sun, SunMoon, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
  FONT_STEPS,
  SETTINGS_KEY,
  parseSettings,
  updateSettings,
  type ReadingSettings,
  type Theme,
} from "@/lib/athkar/settings";
import { cn } from "@/lib/utils";

interface SettingsContextValue {
  readonly settings: ReadingSettings;
  readonly update: (patch: Partial<ReadingSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({ settings: DEFAULT_SETTINGS, update: () => {} });

export const useReadingSettings = () => useContext(SettingsContext);

function applyToDocument(s: ReadingSettings) {
  const root = document.documentElement;
  root.dataset.font = String(s.fontStep);
  if (s.bold) root.dataset.bold = "on";
  else delete root.dataset.bold;
  const dark = s.theme === "dark" || (s.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

function readStored(): ReadingSettings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function ReadingSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Sync React state with the value the pre-paint script already applied.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(readStored());
  }, []);

  useEffect(() => {
    if (settings.theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyToDocument(settings);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);

  const update = useCallback((patch: Partial<ReadingSettings>) => {
    setSettings((current) => {
      const next = updateSettings(current, patch);
      applyToDocument(next);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); settings still apply for this visit.
      }
      return next;
    });
  }, []);

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>;
}

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "نهاري", Icon: Sun },
  { value: "dark", label: "ليلي", Icon: Moon },
  { value: "system", label: "تلقائي", Icon: SunMoon },
];

export function ReadingSettingsButton() {
  const { settings, update } = useReadingSettings();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-3 py-2 hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-accent/60"
      >
        <Settings2 className="size-5" aria-hidden="true" />
        <span>إعدادات القراءة</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="إعدادات القراءة"
          className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold">إعدادات القراءة</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-md p-1 hover:bg-muted">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-2 text-muted-foreground">حجم الخط</p>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="تكبير الخط"
                  disabled={settings.fontStep >= FONT_STEPS.length - 1}
                  onClick={() => update({ fontStep: settings.fontStep + 1 })}
                  className="rounded-lg border p-2 hover:bg-muted disabled:opacity-40"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
                <span className="font-zekr text-lg" aria-live="polite">
                  {settings.fontStep + 1} / {FONT_STEPS.length}
                </span>
                <button
                  type="button"
                  aria-label="تصغير الخط"
                  disabled={settings.fontStep <= 0}
                  onClick={() => update({ fontStep: settings.fontStep - 1 })}
                  className="rounded-lg border p-2 hover:bg-muted disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <Toggle label="خط عريض" checked={settings.bold} onChange={(v) => update({ bold: v })} />
            <Toggle label="إظهار التشكيل" checked={settings.diacritics} onChange={(v) => update({ diacritics: v })} />

            <div>
              <p className="mb-2 text-muted-foreground">المظهر</p>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {THEME_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={settings.theme === value}
                    onClick={() => update({ theme: value })}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md py-2 text-xs",
                      settings.theme === value ? "bg-card font-bold shadow-sm" : "hover:bg-card/60",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 rounded-full bg-muted-foreground/30 transition-colors after:absolute after:top-0.5 after:right-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:-translate-x-5 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
      />
    </label>
  );
}
