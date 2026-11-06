# -*- coding: utf-8 -*-
"""用户自带配音（mp3/wav/mp4）+ 稿件 → 逐句字幕时间（cues.json）

用法：
  python align.py <配音文件> <稿件.txt> <输出目录>

做法：faster-whisper 识别出逐字时间，再按稿件逐字对齐（识别错字不影响，字幕永远用稿件原文）。
没有稿件时：python align.py <配音文件> - <输出目录>   → 直接用识别文本当字幕（需人工校对）。

需要：pip install faster-whisper   （首次运行会下载约 500MB 模型）
"""
import json, os, re, sys, subprocess, difflib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tts import split_sentences, PUNCT


def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    audio, script, outdir = sys.argv[1:4]
    os.makedirs(outdir, exist_ok=True)
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(audio, language="zh", word_timestamps=True)
    chars = []                                         # [(字, 开始, 结束)]
    for s in segs:
        for w in s.words:
            t = re.sub(r"[\s%s]" % re.escape(PUNCT), "", w.word)
            for i, ch in enumerate(t):
                chars.append((ch, w.start + (w.end - w.start) * i / max(1, len(t)), w.end))
    if script == "-":
        text = "".join(s.text for s in m.transcribe(audio, language="zh")[0])
        print("! 没有稿件：字幕直接用识别文本，务必人工校对 cues.json")
    else:
        text = open(script, encoding="utf-8").read()
    lines = split_sentences(text)
    strip = lambda s: re.sub(r"[%s\s“”「」‘’（）()《》]" % re.escape(PUNCT), "", s)
    ref = "".join(strip(l) for l in lines)
    hyp = "".join(c[0] for c in chars)
    # 稿件字 → 识别字 的映射（错字也能对上位置）
    sm = difflib.SequenceMatcher(None, ref, hyp, autojunk=False)
    pos = [None] * len(ref)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ("equal", "replace"):
            for k in range(i2 - i1):
                pos[i1 + k] = min(j1 + k * max(1, (j2 - j1)) // max(1, (i2 - i1)), len(chars) - 1)
    # 补洞：没对上的字用前后插值
    last = 0
    for i in range(len(pos)):
        if pos[i] is None:
            pos[i] = last
        last = pos[i]
    cues, k = [], 0
    for ln in lines:
        n = len(strip(ln))
        if n == 0:
            continue
        a = chars[pos[k]][1]; b = chars[pos[min(k + n, len(ref)) - 1]][2]
        cues.append([round(a, 2), round(max(b, a + 0.4), 2), ln]); k += n
    json.dump(cues, open(os.path.join(outdir, "cues.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio],
                               capture_output=True, text=True).stdout.strip())
    ext = os.path.splitext(audio)[1].lower()
    dst = os.path.join(outdir, "vo.mp3")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", audio, "-vn", "-ac", "2", "-ar", "44100", "-b:a", "192k", dst], check=True)
    json.dump({"duration": round(dur, 3), "voice": "user:" + os.path.basename(audio)},
              open(os.path.join(outdir, "vo.meta.json"), "w", encoding="utf-8"))
    print("✓ 对齐完成 %.2fs · %d 句（识别与稿件相似度 %.0f%%）" % (dur, len(cues), sm.ratio() * 100))
    if sm.ratio() < 0.6:
        print("! 相似度低于 60%：稿件和配音可能不是同一份，先核对再继续。")
    for i, (a, b, t) in enumerate(cues):
        print("  c%-2d %6.2f–%6.2f  %s" % (i, a, b, t))


if __name__ == "__main__":
    main()
