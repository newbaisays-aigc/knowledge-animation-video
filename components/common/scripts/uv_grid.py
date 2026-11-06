# Copyright (c) 2026 小白姐姐. MIT License.
# https://github.com/newbaisays-aigc/knowledge-animation-video

"""给图片叠一层 0..1 坐标网格，方便确定放大镜 focus / 视图 uv 坐标
用法：python3 uv_grid.py 图片.jpg 输出.jpg
看图读出目标（嘴角、皇冠、签名）的 (u, v)，填进 Magnifier 的 focus 或 view 的 uv。不要凭感觉估坐标。"""
import sys
from PIL import Image, ImageDraw, ImageFont
im = Image.open(sys.argv[1]).convert('RGB'); W, H = im.size; d = ImageDraw.Draw(im, 'RGBA')
fs = max(14, W // 60)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', fs)
except Exception: font = ImageFont.load_default()
for i in range(21):
    x, y = W * i / 20, H * i / 20; a = 200 if i % 2 == 0 else 90
    d.line([(x, 0), (x, H)], fill=(255, 40, 40, a), width=2 if i % 2 == 0 else 1)
    d.line([(0, y), (W, y)], fill=(40, 200, 255, a), width=2 if i % 2 == 0 else 1)
    if i % 2 == 0 and 0 < i < 20:
        d.text((x + 3, 3), f'{i/20:.1f}', fill=(255, 60, 60, 255), font=font)
        d.text((3, y + 3), f'{i/20:.1f}', fill=(60, 200, 255, 255), font=font)
im.save(sys.argv[2], quality=88); print('已输出', sys.argv[2])
