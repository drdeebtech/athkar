# Changelog

All notable changes to athkar.site are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-10-02

### Added

- Arabic RTL athkar site: 345 adhkar in 135 situations across 12 sections (Hisn al-Muslim, via azkar-db).
- Tap counters with progress, auto-advance and completion banner; copy and share.
- Reading settings (font size, bold, diacritics, night mode) applied before first paint.
- Diacritics- and hamza-insensitive search with a lazily loaded index.
- Static export deployed to Cloudflare Workers at athkar.site, with sitemap and robots.
- `npm run logs:build` to read Cloudflare Workers Builds logs with a least-privilege token.
- CI: lint, typecheck, unit tests and build on every push and pull request to `main`.

[Unreleased]: https://github.com/drdeebtech/athkar/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/drdeebtech/athkar/releases/tag/v0.1.0
