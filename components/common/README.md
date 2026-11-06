# 通用脚本（所有模板共用）

| 脚本 | 用途 | 用法 |
|---|---|---|
| `scripts/tts.py` | 文稿 → 配音 + 逐句时间（一次合成整段，用逐词时间戳切句；小数点、千分位不断句，超过 18 字自动切） | `pip install edge-tts`；`python tts.py 稿件.txt vo/ --voice zh-CN-YunxiNeural --rate +8%` |
| `scripts/align.py` | 用户自己录的音频 + 稿件 → 逐句时间（Whisper 识别后逐字对齐，识别错字不影响，字幕永远用稿件原文） | `pip install faster-whisper`；`python align.py 配音.mp3 稿件.txt vo/` |
| `scripts/cues_convert.py` | 把上面两个脚本的输出转成 Remotion 组件用的 `cues.json` | `python cues_convert.py vo/ cues.json` |
| `scripts/mix_audio.py` | 配音 + 背景音乐 + 音效混音，一次输出完整版、无旁白版、无音乐版三条音轨 | `python mix_audio.py mix.json`（配置说明见脚本开头） |
| `scripts/uv_grid.py` | 给图片叠 0..1 坐标网格，读出放大镜焦点、镜头取景点的准确坐标 | `python uv_grid.py 图.jpg 网格.jpg` |
| `scripts/export_versions.sh` | 画面只渲染一次，再合成多个声音版本 | `bash export_versions.sh src/Root.tsx <ID> out/片名 [full no_voice no_music]` |

注意：`tts.py` 和 `align.py` 输出的配音是 `vo/vo.mp3`。`mix_audio.py` 的 `voice` 字段直接填这个 mp3 就行，脚本会自动重采样。

写稿规则（来自 tts.py，照做字幕才不会错位）：

- 数字写成阿拉伯数字（159 元），Edge TTS 会读对
- 英文缩写尽量少用；用了的话，字幕时间可能有轻微偏移，脚本会给出警告

推荐声音：zh-CN-YunjianNeural（男，新闻感）、zh-CN-YunxiNeural（男，年轻）、zh-CN-XiaoxiaoNeural（女）、zh-CN-YunyangNeural（男，播音）

来源：tts.py、align.py 已在多个项目里用过，可直接复用。

---

*Copyright (c) 2026 小白姐姐 · MIT License · https://github.com/newbaisays-aigc/knowledge-animation-video*
