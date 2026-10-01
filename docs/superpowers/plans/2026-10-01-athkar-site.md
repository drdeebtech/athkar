# Athkar Site — Implementation Plan

Spec: `docs/superpowers/specs/2026-10-01-athkar-site-design.md`

## Phase 1 — Data layer (TDD)
1. Add Vitest (`npm test`, `npm run test:coverage`).
2. `src/lib/athkar/text.ts`: `stripDiacritics`, `normalizeArabic`, `segmentText`. Tests first.
3. `src/lib/athkar/counter.ts`: pure reducer (`tap`, `reset`) + status. Tests first.
4. `src/lib/athkar/sections.ts`: section table + `sectionForTitle`. Test: every source category maps to a non-fallback section.
5. `src/lib/athkar/normalize.ts`: source rows → `Category[]` (stable ids, parsed counts, trimmed virtue/reference). Tests first.
6. `src/lib/athkar/data.ts`: loads the vendored JSON once; `getCategories`, `getCategory`, `getSections`, `getNeighbours`.
7. `src/lib/athkar/search.ts`: diacritics-insensitive search. Tests first.

## Phase 2 — Foundation
8. `src/config/site.ts`: name, description, URL, ads client from env.
9. `layout.tsx`: `lang="ar" dir="rtl"`, Amiri + IBM Plex Sans Arabic, pre-paint settings script, header/footer.
10. `globals.css`: palette tokens (light + night), reading-size variables, Quran/hadith styles.

## Phase 3 — Pages & components
11. Home: hero, `SearchBox` (client), `SectionGrid`.
12. `/athkar/[id]`: `generateStaticParams`, `generateMetadata`, `ZekrList` (client: progress + banner), `ZekrCard` (counter, copy, share, virtue), prev/next.
13. `ReadingSettings` (client popover in header) + `useReadingSettings` hook.
14. `AdSlot` + conditional AdSense script.
15. `/sources`, `sitemap.ts`, `robots.ts`, `not-found.tsx`.

## Phase 4 — Verify
16. `npm test`, `npm run check`.
17. Browser pass (gstack) at 390/768/1440; fix issues.
18. Code review pass; commit.
