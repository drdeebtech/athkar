# Brand kit — أذكار

All artwork is original, generated with Higgsfield (no text inside images; Arabic
type is always set in code with Baloo Bhaijaan 2 so letters join correctly).

| Asset | Model | Higgsfield job ID |
|---|---|---|
| Logo mark (clay eight-point star) | gpt_image_2_5, 2K, transparent | c7921266-575e-4d35-bc6f-74bb2d57ee74 |
| Hero: clay rehal, beads, crescent | gpt_image_2_5, 2K, transparent | eb676481-3a99-4474-9d32-8b8bb12d7d44 |
| Secondary: clay misbaha, crescent, stars | gpt_image_2_5, 2K, transparent | 4b9e20cb-71b1-4a34-99c7-41c96d1cbd96 |
| Share-image background | gpt_image_2_5, 2K | ca904f43-7c2c-4e92-8668-cb40fc86c055 |

## Palette

| Role | OKLCH | Hex (approx.) |
|---|---|---|
| Sand background | oklch(0.955 0.022 80) | #F4EDE0 |
| Cream surface | oklch(0.985 0.012 85) | #FBF7EF |
| Sage primary | oklch(0.55 0.1 165) | #3F8A6F |
| Light sage | oklch(0.915 0.045 160) | #CFE8DC |
| Apricot accent | oklch(0.79 0.12 58) | #F0A964 |
| Ink | oklch(0.3 0.045 165) | #22433A |
| Lilac (decor only) | — | #B9A7D9 |

## Type

- Display: Baloo Bhaijaan 2 (variable, 400–800)
- Interface: Athkar Sans Arabic, our renamed subset of IBM Plex Sans Arabic (400/500/700)
- Adhkar text: Amiri (400/700)

Fonts are self-hosted from `src/fonts/` (no build-time requests to Google
Fonts). Rebuild with `python scripts/fonts/build-fonts.py <ttf-dir>` using the
pinned google/fonts sources listed in `THIRD_PARTY_NOTICES.md`.

## Files

- `src/app/icon.png`, `src/app/apple-icon.png`, `public/brand/icon-*.png` — app and browser icons
- `public/brand/logo-mark.webp` — header logo
- `public/brand/hero-rehal-{560,720,800,880,960}.webp`, `public/brand/hero-beads-{480,640,800}.webp`
  (responsive widths; `ART` in `src/components/athkar/brand-art.tsx` lists them and
  `SLOT_SIZES` says which slot each page needs)
- `src/app/opengraph-image.jpg` — 1200×630 share image

Rebuild from the 2K originals: `node scripts/brand/build-brand-assets.mjs <source-dir> .`
