"""Builds the self-hosted woff2 fonts in src/fonts from pinned google/fonts sources.

Usage: python scripts/fonts/build-fonts.py <dir-with-ttf-sources>
Requires: fonttools[woff] (fonttools + brotli).

Sources: https://github.com/google/fonts at commit 9710da1eacb3be272583c3224dcb70f9da6eadbb
  ofl/baloobhaijaan2/BalooBhaijaan2[wght].ttf
  ofl/amiri/Amiri-{Regular,Bold}.ttf
  ofl/ibmplexsansarabic/IBMPlexSansArabic-{Regular,Medium,Bold}.ttf
Each font is subset to src/fonts/unicode-ranges.json, keeping every OpenType
layout feature so Arabic shaping, marks and ligatures are unchanged.
"""

import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "fonts"
FONTS = {
    "BalooBhaijaan2-wght.ttf": "BalooBhaijaan2-Variable.woff2",
    "Amiri-Regular.ttf": "Amiri-Regular.woff2",
    "Amiri-Bold.ttf": "Amiri-Bold.woff2",
    "IBMPlexSansArabic-Regular.ttf": "IBMPlexSansArabic-Regular.woff2",
    "IBMPlexSansArabic-Medium.ttf": "IBMPlexSansArabic-Medium.woff2",
    "IBMPlexSansArabic-Bold.ttf": "IBMPlexSansArabic-Bold.woff2",
}


def codepoints() -> set[int]:
    ranges = json.loads((OUT / "unicode-ranges.json").read_text(encoding="utf-8"))["ranges"]
    points: set[int] = set()
    for r in ranges:
        lo, _, hi = r.removeprefix("U+").partition("-")
        points.update(range(int(lo, 16), int(hi or lo, 16) + 1))
    return points


def main() -> None:
    src = Path(sys.argv[1])
    keep = codepoints()
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.glyph_names = False
    for ttf, woff2 in FONTS.items():
        font = TTFont(src / ttf)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=sorted(keep & set(font.getBestCmap())))
        subsetter.subset(font)
        font.flavor = "woff2"
        font.save(OUT / woff2)
        print(f"{woff2:36} {(OUT / woff2).stat().st_size // 1024:4} KB")


if __name__ == "__main__":
    main()
