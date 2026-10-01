"use client";

import { Minus, Moon, Plus, Settings2, Sun, SunMoon, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
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

/* A tiny external store over localStorage, shared by every subscriber and synced across tabs. */
let cache: ReadingSettings | null = null;
const listeners = new Set<() => void>();

const getSnapshot = (): ReadingSettings => (cache ??= readStored());
const getServerSnapshot = (): ReadingSettings => DEFAULT_SETTINGS;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SETTINGS_KEY) return;
    cache = readStored();
    applyToDocument(cache);
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(next: ReadingSettings) {
  cache = next;
  applyToDocument(next);
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); settings still apply for this visit.
  }
  listeners.forEach((l) => l());
}

export function ReadingSettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (settings.theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyToDocument(settings);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);

  const update = useCallback((patch: Partial<ReadingSettings>) => commit(updateSettings(getSnapshot(), patch)), []);

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
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const onPointer = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close(false) : setOpen(true))}
        className="clay-sm clay-press flex items-center gap-1.5 px-3.5 py-2 text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Settings2 className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">إعدادات القراءة</span>
        <span className="sm:hidden">القراءة</span>
      </button>
      <div
        ref={panel}
        id={panelId}
        role="dialog"
        aria-label="إعدادات القراءة"
        tabIndex={-1}
        hidden={!open}
        className="clay absolute left-0 top-full z-50 mt-3 w-76 p-5 text-popover-foreground outline-none [--clay-r:1.75rem]"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg font-extrabold">إعدادات القراءة</p>
          <button type="button" onClick={() => close(true)} aria-label="إغلاق" className="clay-sm clay-press grid size-8 place-items-center">
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
                className="clay-sm clay-press grid size-10 place-items-center disabled:pointer-events-none disabled:opacity-40"
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
                className="clay-sm clay-press grid size-10 place-items-center disabled:pointer-events-none disabled:opacity-40"
              >
                <Minus className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <Toggle label="خط عريض" checked={settings.bold} onChange={(v) => update({ bold: v })} />
          <Toggle label="إظهار التشكيل" checked={settings.diacritics} onChange={(v) => update({ diacritics: v })} />

          <div>
            <p className="mb-2 text-muted-foreground">المظهر</p>
            <div className="clay-inset grid grid-cols-3 gap-1 p-1.5 [--clay-r:1.25rem]">
              {THEME_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.theme === value}
                  onClick={() => update({ theme: value })}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md py-2 text-xs",
                    settings.theme === value ? "clay-sm font-bold [--clay-r:1rem]" : "rounded-2xl hover:bg-card/50",
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
        className="clay-inset relative h-7 w-12 transition-colors [--clay-r:9999px] after:absolute after:top-1 after:right-1 after:size-5 after:rounded-full after:bg-card after:shadow-[0_3px_6px_-2px_var(--clay-drop),inset_0_2px_3px_var(--clay-hi)] after:transition-transform peer-checked:bg-primary peer-checked:after:-translate-x-5 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
      />
    </label>
  );
}
