"""Builds the self-hosted woff2 fonts in src/fonts from pinned google/fonts sources.

Usage: python scripts/fonts/build-fonts.py <dir-with-ttf-sources>
Requires: fonttools[woff] (fonttools + brotli).

Sources: https://github.com/google/fonts at commit 9710da1eacb3be272583c3224dcb70f9da6eadbb
  ofl/baloobhaijaan2/BalooBhaijaan2[wght].ttf
  ofl/amiri/Amiri-{Regular,Bold}.ttf
  ofl/ibmplexsansarabic/IBMPlexSansArabic-{Regular,Medium,Bold}.ttf
Each font is subset to src/fonts/unicode-ranges.json, keeping every OpenType
layout feature so Arabic shaping, marks and ligatures are unchanged.

IBM Plex Sans Arabic is licensed with Reserved Font Name "Plex". A subset is a
Modified Version under the OFL, so its user-facing names (name IDs 1, 3, 4, 6,
16, 18, 21) are renamed to "Athkar Sans Arabic". Copyright, trademark and
license records are kept unchanged. The build fails if a reserved name remains.
"""

import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "fonts"
FONTS = {
    "BalooBhaijaan2[wght].ttf": "BalooBhaijaan2-Variable.woff2",
    "Amiri-Regular.ttf": "Amiri-Regular.woff2",
    "Amiri-Bold.ttf": "Amiri-Bold.woff2",
    "IBMPlexSansArabic-Regular.ttf": "AthkarSansArabic-Regular.woff2",
    "IBMPlexSansArabic-Medium.ttf": "AthkarSansArabic-Medium.woff2",
    "IBMPlexSansArabic-Bold.ttf": "AthkarSansArabic-Bold.woff2",
}

# OFL Reserved Font Names that must not appear in Modified Versions' names.
RESERVED = {"IBMPlexSansArabic": "Plex"}
RENAMES = [("IBM Plex Sans Arabic", "Athkar Sans Arabic"), ("IBMPlexSansArabic", "AthkarSansArabic")]
NAME_IDS = {1, 3, 4, 6, 16, 18, 21}


def codepoints() -> set[int]:
    ranges = json.loads((OUT / "unicode-ranges.json").read_text(encoding="utf-8"))["ranges"]
    points: set[int] = set()
    for r in ranges:
        lo, _, hi = r.removeprefix("U+").partition("-")
        points.update(range(int(lo, 16), int(hi or lo, 16) + 1))
    return points


def rename_reserved(font: TTFont, reserved: str) -> None:
    """Rename user-facing name records of a Modified Version; keep legal records."""
    for record in font["name"].names:
        if record.nameID not in NAME_IDS:
            continue
        text = record.toUnicode()
        for old, new in RENAMES:
            text = text.replace(old, new)
        if reserved in text:
            raise SystemExit(f"reserved name {reserved!r} left in name ID {record.nameID}: {text!r}")
        record.string = text


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
        for prefix, reserved in RESERVED.items():
            if ttf.startswith(prefix):
                rename_reserved(font, reserved)
        font.flavor = "woff2"
        font.save(OUT / woff2)
        print(f"{woff2:36} {(OUT / woff2).stat().st_size // 1024:4} KB")


if __name__ == "__main__":
    main()
