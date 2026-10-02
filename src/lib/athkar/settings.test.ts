import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, FONT_STEPS, parseSettings, updateSettings } from "./settings";

describe("parseSettings", () => {
  it("returns defaults for missing or malformed input", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("not json")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("[1,2]")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid fields and replaces invalid ones with defaults", () => {
    const raw = JSON.stringify({ fontStep: 4, bold: false, diacritics: "yes", theme: "neon" });
    expect(parseSettings(raw)).toEqual({ ...DEFAULT_SETTINGS, fontStep: 4, bold: false });
  });

  it("rejects out-of-range font steps", () => {
    expect(parseSettings(JSON.stringify({ fontStep: FONT_STEPS.length })).fontStep).toBe(DEFAULT_SETTINGS.fontStep);
    expect(parseSettings(JSON.stringify({ fontStep: 1.5 })).fontStep).toBe(DEFAULT_SETTINGS.fontStep);
  });
});

describe("updateSettings", () => {
  it("clamps font steps and returns a new object", () => {
    const up = updateSettings(DEFAULT_SETTINGS, { fontStep: 99 });
    expect(up.fontStep).toBe(FONT_STEPS.length - 1);
    expect(updateSettings(DEFAULT_SETTINGS, { fontStep: -3 }).fontStep).toBe(0);
    expect(up).not.toBe(DEFAULT_SETTINGS);
  });

  it("applies boolean and theme changes", () => {
    expect(updateSettings(DEFAULT_SETTINGS, { theme: "dark", diacritics: false })).toMatchObject({
      theme: "dark",
      diacritics: false,
    });
  });
});

describe("updateSettings with non-finite font steps", () => {
  it("keeps the current step instead of storing NaN or Infinity", () => {
    const current = { ...DEFAULT_SETTINGS, fontStep: 3 };
    expect(updateSettings(current, { fontStep: Number.NaN }).fontStep).toBe(3);
    expect(updateSettings(current, { fontStep: Number.POSITIVE_INFINITY }).fontStep).toBe(3);
  });
});
