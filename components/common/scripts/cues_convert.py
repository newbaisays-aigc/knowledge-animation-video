"""把 tts.py / align.py 输出的 cues.json（[[开始, 结束, "句子"], ...]）
转成 Remotion 组件用的格式 {"cues":[{"text","start","end"}], "total": 秒}
用法：python3 cues_convert.py <tts输出目录> <输出cues.json> [片尾留白秒数=1.0]
total 取配音时长（vo.meta.json）+ 片尾留白。"""
import json, sys, os
d, out = sys.argv[1], sys.argv[2]; tail = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
cues = json.load(open(os.path.join(d, 'cues.json'), encoding='utf-8'))
meta = json.load(open(os.path.join(d, 'vo.meta.json'), encoding='utf-8'))
json.dump({'cues': [{'text': t, 'start': a, 'end': b} for a, b, t in cues], 'total': round(meta['duration'] + tail, 3)},
          open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('已转换', len(cues), '句，总时长', round(meta['duration'] + tail, 2))
