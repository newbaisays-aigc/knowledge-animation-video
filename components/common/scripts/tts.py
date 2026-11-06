# -*- coding: utf-8 -*-
# Copyright (c) 2026 小白姐姐. MIT License.
# https://github.com/newbaisays-aigc/knowledge-animation-video

"""文本 → 配音 + 逐句字幕时间（cues.json）

用法：
  python tts.py <稿件.txt> <输出目录> [--voice zh-CN-YunjianNeural] [--rate +8%]

输出（都在输出目录里）：
  vo.mp3        配音
  vo.words.json 逐词时间戳（Edge TTS 原始）
  cues.json     逐句字幕：[[开始秒, 结束秒, "句子"], ...]   ← build.py 用这个
  vo.meta.json  {"duration": 配音总秒数, "voice": ...}

规则（不要改，改了字幕会出问题）：
  · 只在 ，。！？；： 后断句；小数点、千分位（2.1万、1,200）不断。
  · 一句超过 18 个全角字就在中间硬切（字幕单行上限）。
  · 数字写成阿拉伯数字（159元），Edge TTS 会读对；不要写"一百五十九"。

需要：pip install edge-tts   （需要联网）
可选声音：zh-CN-YunjianNeural（男·新闻，推荐） zh-CN-YunxiNeural（男·年轻）
          zh-CN-XiaoxiaoNeural（女） zh-CN-YunyangNeural（男·播音）
"""
import asyncio, json, os, re, sys, subprocess, unicodedata

PUNCT = "，。！？；：,.!?;:"
MAXU = 18


def units(s):
    return sum(1.0 if unicodedata.east_asian_width(c) in "WF" else 0.5 for c in s)


def split_sentences(text):
    text = re.sub(r"\s+", "", text)
    out, buf = [], ""
    for i, ch in enumerate(text):
        buf += ch
        if ch in ".,:" and 0 < i < len(text) - 1 and text[i - 1].isdigit() and text[i + 1].isdigit():
            continue                                    # 2.1 / 1,200 / 10:30 不断
        if ch in PUNCT:
            out.append(buf); buf = ""
    if buf:
        out.append(buf)
    lines = []
    for seg in out:
        while units(seg) > MAXU:                        # 超长句硬切
            cut, acc = "", 0.0
            for ch in seg:
                if acc + units(ch) > MAXU:
                    break
                cut += ch; acc += units(ch)
            lines.append(cut); seg = seg[len(cut):]
        if seg:
            lines.append(seg)
    return lines


async def synth(text, voice, rate, out_mp3):
    import edge_tts
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words, audio = [], b""
    async for ch in c.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append({"t": ch["text"], "s": ch["offset"] / 1e7, "e": (ch["offset"] + ch["duration"]) / 1e7})
    open(out_mp3, "wb").write(audio)
    return words


def align(lines, words):
    """把逐词时间戳按字符对齐到句子上。两边用同一个过滤函数，否则「2.1万」里的小数点会让后面全部错位。"""
    strip = lambda s: re.sub(r"[%s\s“”「」‘’（）()《》]" % re.escape(PUNCT), "", s)
    flat = []
    for w in words:
        t = strip(w["t"])
        for i, ch in enumerate(t):
            flat.append((ch, w["s"] + (w["e"] - w["s"]) * i / max(1, len(t)), w["e"]))
    k, cues = 0, []
    for ln in lines:
        core = strip(ln)
        if not core:
            continue
        if k >= len(flat):
            raise SystemExit("✗ 对齐失败：配音比稿件短。检查稿件里是否有 TTS 不读的符号。")
        s = flat[k][1]
        k += len(core)
        e = flat[min(k, len(flat)) - 1][2]
        cues.append([round(s, 2), round(e, 2), ln])
    if abs(k - len(flat)) > 3:
        print("! 警告：稿件字数 %d 与配音字数 %d 不一致，时间可能偏移。把英文缩写/特殊符号改成中文再试。" % (k, len(flat)))
    return cues


def duration(path):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                             capture_output=True, text=True).stdout.strip()
        return float(out)
    except Exception:
        return None


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    src, outdir = sys.argv[1], sys.argv[2]
    voice = "zh-CN-YunjianNeural"; rate = "+8%"
    if "--voice" in sys.argv: voice = sys.argv[sys.argv.index("--voice") + 1]
    if "--rate" in sys.argv: rate = sys.argv[sys.argv.index("--rate") + 1]
    os.makedirs(outdir, exist_ok=True)
    text = open(src, encoding="utf-8").read().strip()
    lines = split_sentences(text)
    mp3 = os.path.join(outdir, "vo.mp3")
    words = asyncio.run(synth("".join(lines), voice, rate, mp3))
    json.dump(words, open(os.path.join(outdir, "vo.words.json"), "w", encoding="utf-8"), ensure_ascii=False)
    cues = align(lines, words)
    json.dump(cues, open(os.path.join(outdir, "cues.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    dur = duration(mp3) or cues[-1][1] + 0.3
    json.dump({"duration": round(dur, 3), "voice": voice, "rate": rate},
              open(os.path.join(outdir, "vo.meta.json"), "w", encoding="utf-8"))
    print("✓ 配音 %.2fs · %d 句 · 声音 %s" % (dur, len(cues), voice))
    for i, (a, b, t) in enumerate(cues):
        print("  c%-2d %6.2f–%6.2f  %s" % (i, a, b, t))


if __name__ == "__main__":
    main()
