#!/bin/bash
# 导出多个声音版本：画面只渲染一次，再分别合成音轨（音效始终保留）
# 用法：bash export_versions.sh <入口文件> <合成ID> <输出名前缀> [版本...]
#   版本可选：full（完整版）no_voice（无旁白）no_music（无音乐），不写则三个都导出
# 例：bash export_versions.sh src/Root.tsx Napoleon out/拿破仑 full no_voice
# 前提：已运行 mix_audio.py，public/ 下有 mix_full.wav / mix_no_voice.wav / mix_no_music.wav
set -e
ENTRY=$1; ID=$2; PREFIX=$3; shift 3
VERS=${@:-full no_voice no_music}
mkdir -p "$(dirname "$PREFIX")"
npx remotion render "$ENTRY" "$ID" "$PREFIX.__silent.mp4" --codec=h264 --crf=20 --muted --concurrency=$(nproc 2>/dev/null || echo 4)
declare -A NAME=([full]="完整版" [no_voice]="无旁白版" [no_music]="无音乐版")
for v in $VERS; do
  ffmpeg -v error -y -i "$PREFIX.__silent.mp4" -i "public/mix_$v.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${PREFIX}_${NAME[$v]}.mp4"
  echo "导出：${PREFIX}_${NAME[$v]}.mp4"
done
rm -f "$PREFIX.__silent.mp4"
