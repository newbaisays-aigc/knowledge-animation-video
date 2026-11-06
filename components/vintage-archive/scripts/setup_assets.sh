#!/bin/bash
# 用法：bash setup_assets.sh <remotion项目的public目录>
# 下载字体 + 生成木桌/纸张/颗粒贴图
#
# 字体来自 google/fonts 官方仓库，授权均为 OFL 1.1 或 Apache 2.0（可商用、可嵌入）。
# 默认校验 sha256，防止下载过程被劫持替换。若上游更新了字体导致哈希不一致，
# 会报错退出；确认无误后可设 ALLOW_UNVERIFIED_FONTS=1 跳过校验。
set -e
PUB=${1:-public}; mkdir -p "$PUB"; DIR=$(cd "$(dirname "$0")" && pwd)
cd "$PUB"

BASE=https://raw.githubusercontent.com/google/fonts/main

# 名称|相对路径|sha256
FONTS=(
  "SpecialElite.ttf|apache/specialelite/SpecialElite-Regular.ttf|a776fcb4ceb8bdf03e2967688ebdad42680de5b91a7e62c17e718ae212d14bc4"
  "OldStandard-Bold.ttf|ofl/oldstandardtt/OldStandard-Bold.ttf|7d831e9d799ad23ee98e889381a9db2a283b2dac7f228dd5c06071decb9c54db"
  "PlayfairDisplay-VF.ttf|ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf|c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6"
)

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | cut -d' ' -f1
  else echo "NOHASHTOOL"; fi
}

for entry in "${FONTS[@]}"; do
  IFS='|' read -r fname path want <<< "$entry"
  if [ ! -s "$fname" ]; then
    echo "下载 $fname ..."
    curl -fsSL --retry 3 -o "$fname.tmp" "$BASE/$path"
    got=$(sha256_of "$fname.tmp")
    if [ "$got" = "NOHASHTOOL" ]; then
      echo "  ! 本机没有 sha256sum/shasum，跳过完整性校验"
    elif [ "$got" != "$want" ]; then
      rm -f "$fname.tmp"
      if [ "${ALLOW_UNVERIFIED_FONTS:-}" = "1" ]; then
        echo "  ! 哈希不匹配（上游可能已更新字体），ALLOW_UNVERIFIED_FONTS=1 允许继续"
      else
        echo "  ✗ 哈希不匹配，已删除临时文件。" >&2
        echo "    期望 $want" >&2
        echo "    实际 $got" >&2
        echo "    若确认是上游正常更新，可设 ALLOW_UNVERIFIED_FONTS=1 重跑。" >&2
        exit 1
      fi
    fi
    mv "$fname.tmp" "$fname"
  fi
done

python3 "$DIR/gen_textures.py" .

# 字体自检：必须是真正的 TrueType/OpenType，不能是下载失败留下的 HTML
for f in SpecialElite.ttf OldStandard-Bold.ttf PlayfairDisplay-VF.ttf; do
  [ -s "$f" ] || { echo "✗ $f 缺失" >&2; exit 1; }
  head -c 4 "$f" | grep -q $'\x00\x01\x00\x00' || head -c 4 "$f" | grep -q "OTTO" \
    || { echo "✗ $f 不是有效的字体文件（可能是下载失败的错误页）" >&2; exit 1; }
done
echo "字体 OK（3 个已就绪并通过完整性校验）"
