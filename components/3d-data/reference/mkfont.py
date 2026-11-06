# Copyright (c) 2026 小白姐姐. MIT License.
# https://github.com/newbaisays-aigc/knowledge-animation-video

# 把 Noto Sans CJK SC Bold 中用到的字形导出成 three.js typeface JSON
import json, sys
from fontTools.ttLib import TTCollection
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.reverseContourPen import ReverseContourPen

CHARS = set(open(sys.argv[1], encoding='utf-8').read()) | set("0123456789.%+-→×:/≈ ")
coll = TTCollection('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
font = None
for f in coll.fonts:
    if 'SC' in f['name'].getDebugName(1):
        font = f; break
cmap = font.getBestCmap(); gs = font.getGlyphSet(); upm = font['head'].unitsPerEm
hmtx = font['hmtx']
glyphs = {}
for ch in CHARS:
    if ord(ch) not in cmap: continue
    gn = cmap[ord(ch)]
    pen = RecordingPen(); gs[gn].draw(ReverseContourPen(pen))  # CFF 轮廓方向与 TrueType 相反，three.js 按 TrueType 判断孔洞
    o = []; xs = []
    def P(x, y):
        xs.append(x); return f"{round(x)} {round(y)}"
    for op, pts in pen.value:
        if op == 'moveTo': o.append('m ' + P(*pts[0]))
        elif op == 'lineTo': o.append('l ' + P(*pts[0]))
        elif op == 'curveTo':
            c1, c2, e = pts; o.append('b ' + P(*e) + ' ' + P(*c1) + ' ' + P(*c2))
        elif op == 'qCurveTo':
            c, e = pts[-2], pts[-1]; o.append('q ' + P(*e) + ' ' + P(*c))
    glyphs[ch] = {"ha": hmtx[gn][0], "x_min": min(xs) if xs else 0, "x_max": max(xs) if xs else 0, "o": ' '.join(o)}
out = {"glyphs": glyphs, "familyName": "NotoSansSCBold", "ascender": 880, "descender": -120,
       "underlinePosition": -100, "underlineThickness": 50, "boundingBox": {"yMin": -120, "xMin": 0, "yMax": 880, "xMax": 1000},
       "resolution": upm, "original_font_information": {}}
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
print(len(glyphs), 'glyphs')
