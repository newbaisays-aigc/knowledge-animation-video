"""按配置把 配音 + 背景音乐 + 音效 混成 public/mix.wav
用法：python3 mix_audio.py mix.json
mix.json 示例：
{
  "voice": "public/voice.wav",        // 已按时间轴拼好的配音
  "total": 21.7,                      // 视频总时长（秒）
  "bgm": {"file": "D:/.../Destiny.mp3", "start": "auto", "db_below_voice": 11, "duck": 0.5},
  "sfx_root": "D:/00shortviedo/2025短视频/00音效库",
  "sfx": [ {"name": "229-拍立得照片", "at": 0.05, "db": -16}, ... ],
  "bed": {"name": "117-海浪声", "at": 19.0, "db": -22},   // 可选：结尾环境声
  "out": "public/mix.wav"
}
一次输出 3 条音轨（音效始终保留）：
  public/mix.wav            完整版：旁白 + 音乐 + 音效（Remotion 预览用，同 mix_full）
  public/mix_full.wav       完整版
  public/mix_no_voice.wav   无旁白版：音乐 + 音效（音乐不再闪避，恢复正常音量）
  public/mix_no_music.wav   无音乐版：旁白 + 音效
bgm.start = "auto" 时，自动在曲子里找一段"前面稳定、随后自然收尾"的位置，让音乐尾巴刚好落在视频结尾。
音效 name 只写文件名前缀，会在 sfx_root 下递归查找；音效自动裁掉开头静音并归一化到 db。"""
import sys, json, glob, wave, subprocess, numpy as np
cfg = json.load(open(sys.argv[1], encoding='utf-8')); sr = 48000
T = cfg['total']; N = int(T * sr)
def load(p, ss=0, t=None, rate=sr):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(ss), '-i', p] + (['-t', str(t)] if t else []) + ['-ac', '1', '-ar', str(rate), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32).astype(float)
def find(n):
    r = glob.glob(f"{cfg['sfx_root']}/**/{n}*", recursive=True)
    if not r: raise SystemExit(f'找不到音效：{n}')
    return r[0]
def auto_start(path, need):
    a = load(path, rate=8000); h = 2000
    db = 20*np.log10(np.array([np.sqrt(np.mean(a[i:i+h]**2))+1e-9 for i in range(0, len(a)-h, h)]))
    k = int(need*4); best = None
    for s in range(0, len(db)-k-8):
        A = db[s:s+k-6].mean(); B = db[s+k-2:s+k+8].mean(); sc = (A-B) - .5*db[s:s+k-6].std() - max(0, -18-A)
        if best is None or sc > best[0]: best = (sc, s/4)
    return best[1]
rms = lambda x: np.sqrt(np.mean(x**2)) + 1e-9
def movavg(x, w):
    """快速滑动平均（累积和实现）。用 np.convolve 在 48kHz 长音频上会退化成 O(n*m)，
    27 秒片子要跑十几分钟；这里等价但快两三个数量级。"""
    w = max(1, int(w)); x = np.asarray(x, float)
    c = np.cumsum(np.insert(x, 0, 0.0)); o = (c[w:] - c[:-w]) / w
    return np.pad(o, (0, max(0, len(x) - len(o))), mode='edge')
v = load(cfg['voice'])   # wav / mp3 都可以，自动重采样
v = np.pad(v[:N], (0, max(0, N-len(v))))
b = cfg['bgm']; st = auto_start(b['file'], T) if b.get('start', 'auto') == 'auto' else float(b['start'])
bg = load(b['file'], st, T+.2)[:N]; bg = np.pad(bg, (0, N-len(bg)))
bg[:int(.6*sr)] *= np.linspace(0, 1, int(.6*sr))
env = movavg(np.abs(v), .15*sr)
duck = movavg(np.where(env > .02, b.get('duck', .5), 1.), .25*sr)
bg = bg/rms(bg)*rms(v[np.abs(v) > .01])*10**(-b.get('db_below_voice', 11)/20)
bg_duck = bg*duck
fx = np.zeros(N)
for e in cfg.get('sfx', []):
    a = load(find(e['name'])); i = np.argmax(np.abs(a) > .05*np.max(np.abs(a))); a = a[max(0, i-int(.01*sr)):]
    a = a/np.max(np.abs(a))*10**(e['db']/20); s = int(e['at']*sr)
    if s < 0: a = a[-s:]; s = 0
    n = min(len(a), N-s); fx[s:s+n] += a[:n] if n > 0 else 0
if cfg.get('bed'):
    e = cfg['bed']; a = load(find(e['name'])); s = int(e['at']*sr); n = min(len(a), N-s)
    fx[s:s+n] += a[:n]/np.max(np.abs(a))*10**(e['db']/20)*np.linspace(.3, 1, n)**.5
fo = int(sr); fx[-fo:] *= np.linspace(1, 0, fo)
for x in (bg, bg_duck): x[-int(.5*sr):] *= np.linspace(1, 0, int(.5*sr))
def write(path, mix):
    pk = np.max(np.abs(mix)); mix = mix/pk*.89 if pk > .89 else mix
    with wave.open(path, 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr); f.writeframes((np.stack([mix, mix], 1)*32767).astype(np.int16).tobytes())
import os
out = cfg.get('out', 'public/mix.wav'); d = os.path.dirname(out) or '.'
write(out, v+bg_duck+fx)
write(os.path.join(d, 'mix_full.wav'), v+bg_duck+fx)
write(os.path.join(d, 'mix_no_voice.wav'), bg*10**(4/20)+fx)   # 无人声时音乐提 4dB 补位
write(os.path.join(d, 'mix_no_music.wav'), v+fx)
print('已输出 mix_full / mix_no_voice / mix_no_music')
print(f'BGM 起点 {st:.2f}s；人声 {20*np.log10(rms(v[np.abs(v)>.01])):.1f}dB 音乐 {20*np.log10(rms(bg_duck)):.1f}dB 音效 {20*np.log10(rms(fx)):.1f}dB')
