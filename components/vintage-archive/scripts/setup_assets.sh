#!/bin/bash
# 用法：bash setup_assets.sh <remotion项目的public目录>
# 下载字体 + 生成木桌/纸张/颗粒贴图
set -e
PUB=${1:-public}; mkdir -p "$PUB"; DIR=$(cd "$(dirname "$0")" && pwd)
cd "$PUB"
[ -s SpecialElite.ttf ] || curl -sL -o SpecialElite.ttf https://raw.githubusercontent.com/google/fonts/main/apache/specialelite/SpecialElite-Regular.ttf
[ -s OldStandard-Bold.ttf ] || curl -sL -o OldStandard-Bold.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/oldstandardtt/OldStandard-Bold.ttf
[ -s PlayfairDisplay-VF.ttf ] || curl -sL -o PlayfairDisplay-VF.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf"
python3 "$DIR/gen_textures.py" .
file *.ttf | grep -v "TrueType" && echo "警告：有字体没下载成功，中文仍会回退到 Noto Serif CJK" || echo "字体 OK"
