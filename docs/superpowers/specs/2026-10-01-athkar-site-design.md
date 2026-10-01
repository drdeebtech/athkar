# Athkar Site — Design Spec

Date: 2026-10-01
Status: Approved by owner (design + name), content source approved.

## Goal

An Arabic-first website that helps a Muslim find and read the right adhkar for
any situation quickly, on mobile first. It follows the same *system* as
islambook.com's azkar section (situation grid → list of adhkar with tap
counters) with an original visual identity. Site name: **أذكار / athkar**.

## Content

- Source: `data/sources/azkar-db.json` from https://github.com/osamayy/azkar-db
  (Hisn al-Muslim based: 345 adhkar, ~130 situations, with virtue text,
  Quran/hadith reference, repeat count).
- The repo has no license file. The texts are Quran and Sunnah; the
  arrangement is Hisn al-Muslim (Sa'id al-Qahtani), whose common permission is
  free distribution. Attribution is shown on `/sources`. Owner must confirm
  terms before enabling ads (see Ads).
- No content is scraped from islambook.com. No islambook branding, CSS, fonts
  or images are used.
- Audio (rn0x/Adhkar-json) is out of scope for v1: recording rights unclear.

## Data model (`src/lib/athkar/`)

- `Zekr { id, text, count, virtue?, reference? }` — `count` parsed from the
  source (`''`/`null` → 1).
- `Category { id (number, stable by first appearance), title, sectionId, items }`
- `Section { id, title, categoryIds }` — every category maps to exactly one
  section via an explicit table; unmapped titles fall into "متفرقة". A test
  asserts no category is unmapped silently.
- Text segments: `﴿…﴾` → Quran style, `((…))` → hadith style, rest plain.
- `stripDiacritics(text)` for the "hide tashkeel" setting and for search.
- `search(query)` — diacritics-insensitive match on category titles and zekr
  text; returns categories ranked title-hit first.

## Pages

| Route | Content |
|---|---|
| `/` | Hero + search, then sections each with a grid of situation buttons |
| `/athkar/[id]` | Situation title, zekr cards with counters, completion banner, next/prev situation |
| `/sources` | Attribution and content notes |
| `sitemap.xml`, `robots.txt` | Generated |

All `/athkar/[id]` pages are statically generated (`generateStaticParams`).
Unknown ids → `notFound()`.

## Zekr card (client component)

- Text with Quran/hadith styling, virtue + reference in an expandable block.
- Counter: tap the card's counter button to decrement from `count` to 0;
  first tap marks "in progress", 0 marks "done" (card dims, check icon);
  reset restores `count`. Pure reducer in `counter.ts`, unit-tested.
- Copy (Clipboard API, inline "تم النسخ" feedback) and Share (Web Share API,
  falls back to `https://wa.me/?text=`).
- Page-level: progress "n / total" and a completion banner when all done.

## Reading settings

Font size (5 steps), bold, hide diacritics, night mode. Stored in
`localStorage` (try/catch, safe defaults), applied as `data-*` attributes and
CSS variables on `<html>` by an inline script before paint to avoid flashes.

## Visual identity

- `lang="ar" dir="rtl"`. Fonts via `next/font/google` (OFL): Amiri for adhkar
  text, IBM Plex Sans Arabic for UI.
- Palette: deep green primary, warm cream background, gold accent, white cards;
  night mode in deep green-slate. Defined as tokens in `globals.css`.
- Mobile-first; situation grid 2 cols → 3 → 4.

## Ads

`<AdSlot>` renders nothing unless `NEXT_PUBLIC_ADSENSE_CLIENT` is set. When on,
slots reserve fixed min-height (no layout shift), never sit inside zekr text,
and appear between sections / after every 5th card. AdSense script loads only
when configured. Off by default.

## Testing

- Vitest unit tests for: source normalization, count parsing, section mapping
  completeness, segmenting, diacritics stripping, search, counter reducer.
- `npm run check` (lint + typecheck + build) must pass.
- Browser verification with gstack browse at 390 / 768 / 1440: home grid,
  search, a situation page, counter flow, settings persistence, night mode.

## Out of scope (v1)

Audio, offline/PWA, accounts, user favourites sync, prayer times, Quran reader.
