# 10 秒科技感 BGM + 音效（纯 numpy 合成），对齐镜头时间轴
import numpy as np, wave, sys
SR = 48000; T = 10.0; N = int(SR * T); t = np.arange(N) / SR
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)
def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR); n = min(len(sig), N - i)
    if n <= 0: return
    L[i:i+n] += sig[:n] * gain * (1 - max(0, pan)); R[i:i+n] += sig[:n] * gain * (1 + min(0, pan))
def env(n, a, d):  # attack / exp decay
    x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def lp(x, k):  # one-pole lowpass, k in (0,1)
    y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s += k * (x[i] - s); y[i] = s
    return y
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
BPM = 120; beat = 60 / BPM
# 和弦进行 (A 小调)：Am - F - C - G，每 2.5 秒
chords = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]
# 1) 垫音：去谐锯齿 + 慢滤波
pad = np.zeros(N)
for ci, ch in enumerate(chords):
    s, e = int(ci * 2.5 * SR), int((ci + 1) * 2.5 * SR); tt = t[s:e]
    seg = np.zeros(e - s)
    for m in ch:
        for det in (-0.08, 0.08):
            f = mtof(m + det); seg += 2 * ((tt * f) % 1) - 1
    fade = np.minimum(1, np.minimum((tt - tt[0]) / 0.25, (tt[-1] - tt + 1e-3) / 0.25))
    pad[s:e] = seg * fade
pad = lp(pad, 0.035) * 0.12
L += pad; R += pad
# 2) 低音脉冲：8 分音符根音
for k in range(int(T / (beat / 2))):
    st = k * beat / 2; ci = min(3, int(st / 2.5)); f = mtof(chords[ci][0] - 24)
    n = int(0.22 * SR); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * x) + 0.3 * np.sign(np.sin(2 * np.pi * f * x))
    add(lp(s, 0.08) * env(n, 0.005, 0.09), st, 0.32 if st > 0.4 else 0.0)
# 3) 鼓：底鼓四拍，闭镲 16 分
def kick():
    n = int(0.35 * SR); x = np.arange(n) / SR; f = 45 + 110 * np.exp(-x * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9)
def hat(d=0.04):
    n = int(0.08 * SR); w = rng.standard_normal(n); w = w - lp(w, 0.5); return w * env(n, 0.001, d)
for k in range(int(T / beat)):
    st = k * beat
    if 0.5 < st < 9.4: add(kick(), st, 0.55)
for k in range(int(T / (beat / 4))):
    st = k * beat / 4
    if 0.5 < st < 9.4: add(hat(), st, 0.10 if k % 2 else 0.05, pan=0.3 if k % 4 == 1 else -0.2)
# 4) 琶音（高音闪烁感）
for k in range(int(T / (beat / 4))):
    st = k * beat / 4; ci = min(3, int(st / 2.5)); ch = chords[ci]; m = ch[k % 3] + 12 + (12 if (k // 3) % 2 else 0)
    n = int(0.16 * SR); x = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * mtof(m) * x)) * 0.5 + np.sin(2 * np.pi * mtof(m) * x)
    if 0.3 < st < 9.5: add(lp(s, 0.25) * env(n, 0.002, 0.05), st, 0.06, pan=0.4 * np.sin(k))
# 5) 音效
def whoosh(dur=0.6, up=True):
    n = int(dur * SR); w = rng.standard_normal(n); x = np.linspace(0, 1, n)
    k = (0.02 + 0.25 * (x if up else 1 - x) ** 2); y = np.zeros(n); s = 0.0
    for i in range(n): s += k[i] * (w[i] - s); y[i] = s
    return y * np.sin(np.pi * x) ** 1.5 * 3
def riser(dur):
    n = int(dur * SR); x = np.arange(n) / SR; f = 200 * (8 ** (x / dur))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + rng.standard_normal(n) * 0.2) * (x / dur) ** 2
def impact():
    n = int(1.2 * SR); x = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-x * 8)) / SR) * np.exp(-x * 3)
    noise = lp(rng.standard_normal(n), 0.2) * np.exp(-x * 12)
    return sub + noise * 0.8
def blip(f=1800, d=0.05):
    n = int(0.09 * SR); x = np.arange(n) / SR; return np.sin(2 * np.pi * f * x) * env(n, 0.001, d)
def tick():
    n = int(0.02 * SR); x = np.arange(n) / SR; return np.sin(2 * np.pi * 3200 * x) * np.exp(-x * 400)
def sparkle(dur=1.0):
    out = np.zeros(int(dur * SR))
    for j in range(40):
        st = int(rng.random() * (len(out) - 5000)); b = blip(2500 + rng.random() * 3000, 0.02) * (st / len(out))
        out[st:st+len(b)] += b[:len(out)-st]
    return out
# 开场
add(impact(), 0.05, 0.55); add(whoosh(0.7), 0.0, 0.25)
for i, s in enumerate([0.1, 0.16, 0.22, 0.28, 0.34, 0.4]): add(blip(1500 + i * 120), s, 0.08)
add(blip(2200, 0.08), 0.55, 0.12)                    # 问句字出现
add(blip(900, 0.12), 1.2, 0.15)                      # 下划线
# 转场 (2.1–2.6, 4.7–5.2, 7.2–7.7)
for st in (2.1, 4.7, 7.2):
    add(riser(0.45), st - 0.05, 0.18); add(whoosh(0.55), st, 0.45, pan=-0.3); add(impact(), st + 0.5, 0.45)
# S1 数字滚动 + 柱子
for k in range(28): add(tick(), 2.1 + 0.25 + k * 0.05 * (1 + k / 40), 0.22)
add(blip(2600, 0.15), 3.6, 0.14); add(blip(1200, 0.1), 3.7, 0.12); add(blip(1600, 0.1), 4.2, 0.12)
# S2 粒子汇聚
add(sparkle(1.3), 4.75, 0.25); add(riser(1.2), 4.9, 0.12); add(impact(), 6.0, 0.6)
add(blip(700, 0.1), 6.3, 0.15); add(blip(2400, 0.12), 6.55, 0.16)
# S3 环形图
for i in range(3): add(blip(1000 + i * 300, 0.07), 7.35 + i * 0.18, 0.15)
add(blip(1800, 0.2), 8.35, 0.14)
for k in range(12): add(tick(), 8.35 + k * 0.035, 0.12)
add(impact(), 8.4, 0.3)
# 混音
mix = np.stack([L, R], 1)
fade = np.ones(N); fade[:int(0.05*SR)] = np.linspace(0, 1, int(0.05*SR)); fi = int(0.6 * SR); fade[-fi:] = np.linspace(1, 0, fi) ** 2
mix *= fade[:, None]
mix = np.tanh(mix * 1.3) / np.tanh(1.3); mix *= 0.89 / np.abs(mix).max()
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok')
