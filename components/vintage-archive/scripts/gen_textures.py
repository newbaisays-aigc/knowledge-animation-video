"""生成复古档案风格贴图：wood.jpg（旧木桌）paper.jpg（做旧纸）grain.png（胶片颗粒）
用法：python3 gen_textures.py <输出目录>
另：python3 gen_textures.py <输出目录> --age a.jpg b.jpg ...   把图片做旧，输出 a_aged.jpg"""
import sys, os, numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
out = sys.argv[1] if len(sys.argv) > 1 else '.'
rng = np.random.default_rng(11)

def stretched(h, w, sx, sy):
    n = rng.normal(0, 1, (h // sy + 2, w // sx + 2))
    return np.array(Image.fromarray(((n - n.min()) / np.ptp(n) * 255).astype('uint8')).resize((w, h), Image.BICUBIC)) / 255.

def wood():
    W, H = 2200, 1300; y, x = np.mgrid[0:H, 0:W]; ph = 220; plank = y // ph
    v = 0.42*stretched(H,W,260,6)+0.25*stretched(H,W,90,2)+0.18*stretched(H,W,600,40)+0.15*stretched(H,W,30,1)
    for _ in range(5):
        cx, cy = rng.uniform(0, W), rng.uniform(0, H); r = np.hypot((x-cx)/3.2, (y-cy))
        v -= 0.25*np.exp(-(r/18)**2); v += 0.06*np.sin(r/4)*np.exp(-(r/60)**2)
    v = v + rng.uniform(-0.07, 0.07, plank.max()+1)[plank]
    v = np.where((y % ph) < 3, v-0.35, v); v = np.where((y % ph) == 3, v+0.08, v)
    for p in range(plank.max()+1):
        jx = int(rng.uniform(200, W-200)); v[(plank == p) & (abs(x-jx) < 2)] -= 0.3
    for _ in range(120):
        x0, y0 = rng.uniform(0, W), rng.uniform(0, H); L = rng.uniform(20, 200); a = rng.uniform(-.5, .5)
        t = np.linspace(0, L, int(L)); xs = (x0+t*np.cos(a)).astype(int); ys = (y0+t*np.sin(a)).astype(int)
        m = (xs < W) & (ys < H) & (xs >= 0) & (ys >= 0); v[ys[m], xs[m]] += rng.uniform(.05, .15)
    v = ((v - v.min()) / np.ptp(v)) ** 1.15
    col = np.stack([v*165+28, v*112+16, v*62+6], -1)
    Image.fromarray(col.clip(0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.5)).save(os.path.join(out, 'wood.jpg'), quality=92)

def paper():
    W, H = 1400, 1000; yy, xx = np.mgrid[0:H, 0:W].astype(float)
    def nz(sh, sw):
        n = rng.normal(0, 1, (sh, sw)); return np.array(Image.fromarray(((n-n.min())/np.ptp(n)*255).astype('uint8')).resize((W, H), Image.BICUBIC))/255.
    fib = np.array(Image.fromarray(rng.normal(128, 35, (H, W)).clip(0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.8)))/255.
    d = np.maximum(abs(xx-W/2)/(W/2), abs(yy-H/2)/(H/2)) + 0.06*(nz(20, 28)-.5)
    edge = np.clip((d-.82)/.18, 0, 1)**1.6
    v = .95-.10*nz(6, 8)-.06*nz(30, 40)-.05*(fib-.5)-.45*edge
    for _ in range(3):
        cx, cy, r = rng.uniform(100, W-100), rng.uniform(100, H-100), rng.uniform(60, 150)
        rr = np.hypot(xx-cx, yy-cy); v -= .07*np.exp(-((rr-r)/5)**2)+.025*(rr < r)
    Image.fromarray(np.stack([v*240, v*224, v*186], -1).clip(0, 255).astype('uint8')).save(os.path.join(out, 'paper.jpg'), quality=92)

def grain():
    Image.fromarray(rng.normal(128, 40, (512, 512)).clip(0, 255).astype('uint8')).save(os.path.join(out, 'grain.png'))

def age(path):
    im = Image.open(path).convert('RGB')
    sep = ImageOps.colorize(ImageOps.grayscale(im), (38, 24, 12), (242, 224, 186))
    o = ImageEnhance.Contrast(Image.blend(im, sep, .55)).enhance(1.08)
    base = os.path.splitext(os.path.basename(path))[0]
    o.save(os.path.join(out, base + '_aged.jpg'), quality=90); print('aged', base)

if '--age' in sys.argv:
    for p in sys.argv[sys.argv.index('--age')+1:]: age(p)
else:
    wood(); paper(); grain(); print('wood.jpg paper.jpg grain.png 已生成')
