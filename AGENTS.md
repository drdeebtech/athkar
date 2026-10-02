<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# أذكار (athkar.site)

## What This Is
An Arabic-only (RTL) website that helps Muslims read the right adhkar for every
situation: 345 adhkar from Hisn al-Muslim in 135 situations, with tap counters,
search and reading settings. Content source: `data/sources/azkar-db.json`.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict), static export (`output: "export"`)
- **UI:** Tailwind CSS v4 with OKLCH tokens, shadcn/ui primitives, Lucide icons
- **Fonts:** Athkar Sans Arabic (UI, renamed IBM Plex Sans Arabic subset), Baloo Bhaijaan 2 (display), Athkar Naskh (adhkar text and situation title, renamed Scheherazade New subset)
- **Deployment:** Cloudflare Workers static assets (`wrangler.jsonc`), domain athkar.site
- **Tests:** Vitest

## Commands
- `npm run dev` — dev server
- `npm run build` — static export to `out/`
- `npm test` — unit tests
- `npm run check` — lint + typecheck + tests + build
- `npm run deploy` — build and deploy with Wrangler
- `npm run logs:build` — read Cloudflare Workers Builds logs

## Code Style
- TypeScript strict, no `any`; named exports; 2-space indentation
- Tailwind utilities; CSS variables only for data-driven values
- Mobile-first, RTL-first, accessible (labels, focus, reduced motion)
- Never render Arabic text inside images; set it in code

## Project Structure
```
data/sources/          vendored adhkar dataset
src/lib/athkar/        data, text, search, counter, settings logic (+ tests)
src/components/athkar/ UI components
src/app/               routes: /, /athkar/[id], /sources, sitemap, robots
scripts/               maintenance scripts (+ tests)
docs/superpowers/      design spec and implementation plan
```
