"use client";

import { plainReading, segmentText } from "@/lib/athkar/text";
import { useReadingSettings } from "./reading-settings";

export function ZekrText({ text }: { text: string }) {
  const { settings } = useReadingSettings();
  const shown = settings.diacritics ? text : plainReading(text);
  return (
    <p className="zekr-text">
      {segmentText(shown).map((seg, i) =>
        seg.kind === "plain" ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <span key={i} className={seg.kind === "quran" ? "seg-quran" : "seg-hadith"}>
            {seg.text}
          </span>
        ),
      )}
    </p>
  );
}
