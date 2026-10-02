# Third-party notices

This project started from ai-website-cloner-template
(https://github.com/JCodesMore/ai-website-cloner-template), used under the MIT License:

```
MIT License

Copyright (c) 2025 JCodesMore

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Athkar texts: Quran and Sunnah, arranged as in Hisn al-Muslim by Sa'id bin Ali bin Wahf Al-Qahtani.
Dataset: https://github.com/osamayy/azkar-db (no license file published; see /sources).

Commercial use: azkar-db publishes no license, and the permission commonly cited
for Hisn al-Muslim covers free distribution. Ads stay disabled until the owner
confirms that an ad-supported site is permitted; record the confirmed terms here.

## Fonts

Self-hosted in `src/fonts/`, each with its SIL Open Font License 1.1 file
(`OFL-<Family>.txt`). Source: https://github.com/google/fonts at commit
9710da1eacb3be272583c3224dcb70f9da6eadbb, subset by `scripts/fonts/build-fonts.py`
to the ranges in `src/fonts/unicode-ranges.json` (all OpenType layout features
kept).

- Baloo Bhaijaan 2 (`ofl/baloobhaijaan2`), Ek Type
- Amiri (`ofl/amiri`), Khaled Hosny and contributors
- IBM Plex Sans Arabic (`ofl/ibmplexsansarabic`), IBM Corp., with Reserved
  Font Name "Plex". Our subset is a Modified Version, so it is distributed as
  "Athkar Sans Arabic" (`src/fonts/AthkarSansArabic-*.woff2`). IBM's copyright,
  trademark and license records inside the files are unchanged.
