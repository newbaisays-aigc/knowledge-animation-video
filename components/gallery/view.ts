/**
 * 美术馆组件库 · 视图数学与镜头工具
 * 视图 View = {t: 纹理序号, c: [u,v] 画面上对准锚点的位置, h: 画作在屏幕上的高度(px), a: [x,y] 屏幕锚点}
 * 所有函数都是纯函数：同一帧永远得到同一画面，可以分段并行渲染。
 */
export type View = {t: number; c: [number, number]; h: number; a: [number, number]};
export type Lens = {x: number; y: number; r: number; alpha: number; view: View; active?: number; blur?: number; stretch?: [number, number]; dim?: number; tex?: number};
export type FrameState = {bg: View; bg2?: View | null; mix?: number; blur?: number; dim?: number; lenses: Lens[]; fade?: number};

// ---------- 缓动
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const outBack = (t: number, s = 0.6) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
/** 阻尼弹簧：液体落位，过冲约 8% */
export const spring = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(9.5 * t));
const lerpLog = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));

/** 画作配置：src 文件名（public/ 下）、aspect 宽/高、face 肖像取景 [u, v, 镜片内高度系数] */
export type Artwork = {src: string; aspect: number; name: string; face?: [number, number, number]};

export function makeViews(arts: Artwork[], W = 1920, H = 1080) {
  const A = (t: number) => arts[t].aspect;
  const view = (t: number, c: [number, number], h: number, a: [number, number]): View => ({t, c, h, a});
  /** 整幅画居中，高度为 h */
  const full = (t: number, h = H * 0.89, a: [number, number] = [W / 2, H / 2]) => view(t, [0.5, 0.5], h, a);
  /** 以 uv 点对准屏幕锚点 a，画作高 h（h 越大越近） */
  const focus = (t: number, uv: [number, number], h: number, a: [number, number] = [W / 2, H / 2]) => view(t, uv, h, a);
  /** 镜片里的肖像取景（按 face 配置） */
  const portrait = (t: number, r: number, a: [number, number]) => {
    const fc = arts[t].face || [0.5, 0.33, 4];
    return view(t, [fc[0], fc[1]], r * fc[2], a);
  };
  /** 两个视图之间插值（缩放走对数，推拉更自然） */
  const mixView = (P: View, Q: View, t: number): View =>
    view(P.t, [lerp(P.c[0], Q.c[0], t), lerp(P.c[1], Q.c[1], t)], lerpLog(P.h, Q.h, t), [lerp(P.a[0], Q.a[0], t), lerp(P.a[1], Q.a[1], t)]);
  /** 画面不动，只换锚点 */
  const reanchor = (v: View, a: [number, number]): View => {
    const w = v.h * A(v.t); return view(v.t, [v.c[0] + (a[0] - v.a[0]) / w, v.c[1] + (a[1] - v.a[1]) / v.h], v.h, a);
  };
  /** 画上某 uv 点现在在屏幕的哪里（放大镜要贴的位置） */
  const uvToScreen = (v: View, uv: [number, number]): [number, number] => {
    const w = v.h * A(v.t); return [v.a[0] + (uv[0] - v.c[0]) * w, v.a[1] + (uv[1] - v.c[1]) * v.h];
  };
  /** 放大镜：在背景视图 bg 上，以屏幕点 p 为中心放大 m 倍 */
  const magView = (bg: View, p: [number, number], m: number): View => {
    const w = bg.h * A(bg.t); return view(bg.t, [bg.c[0] + (p[0] - bg.a[0]) / w, bg.c[1] + (p[1] - bg.a[1]) / bg.h], bg.h * m, p);
  };
  /** 一个放大镜镜片：贴在 bg 上 uv 处，半径 r，放大 m 倍，appear 为 0..1 的出现进度（建议用 spring） */
  const magnifier = (bg: View, uv: [number, number], r: number, m: number, appear = 1, stretch: [number, number] = [0, 0]): Lens | null => {
    if (r * appear < 2) return null;
    const p = uvToScreen(bg, uv);
    return {x: p[0], y: p[1], r: r * appear, alpha: clamp(appear * 3), active: 1, view: magView(bg, p, m), stretch};
  };
  return {view, full, focus, portrait, mixView, reanchor, uvToScreen, magView, magnifier};
}

/**
 * 作品轮盘：多幅画以圆形镜片排在一个大圆弧上，旋转选择。
 * order 是格子里放的作品序号（循环），slots 是一圈的格数。
 */
export function makeWheel(arts: Artwork[], opts: {order: number[]; slots?: number; radius?: number; W?: number; H?: number; rMin?: number; rMax?: number} ) {
  const {order, slots = 15, radius = 1100, W = 1920, H = 1080, rMin = 108, rMax = 178} = opts;
  const STEP = (2 * Math.PI) / slots; const WC = [W / 2, H / 2 + radius];
  const V = makeViews(arts, W, H);
  const wrap = (d: number) => { let x = d % slots; if (x > slots / 2) x -= slots; if (x < -slots / 2) x += slots; return x; };
  const texAt = (k: number) => order[((k % slots) + slots) % slots % order.length];
  /** theta：轮盘角度（单位：格）。vel：角速度，用于液态拉伸 */
  const lenses = (theta: number, alphaAll = 1, vel = 0): Lens[] => {
    const out: Lens[] = [];
    for (let k = 0; k < slots; k++) {
      const d = wrap(k - theta), ang = d * STEP;
      if (Math.abs(ang) > 1.35) continue;
      const c = smooth(clamp(1 - Math.abs(d))); const r = lerp(rMin, rMax, c);
      const x = WC[0] + radius * Math.sin(ang), y = WC[1] - radius * Math.cos(ang);
      const st = clamp(Math.abs(vel) * 0.55, 0, 0.42) * Math.sign(vel || 1);
      const tex = texAt(k);
      out.push({x, y, r, active: c, view: V.portrait(tex, r, [x, y]), stretch: [Math.cos(ang) * st, Math.sin(ang) * st],
        alpha: alphaAll * clamp((1.35 - Math.abs(ang)) / 0.25), blur: lerp(1.2, 0, c), tex});
    }
    return out.sort((a, b) => (a.active ?? 0) - (b.active ?? 0));
  };
  /** 轮盘背后的模糊背景：当前中心作品，转动时与下一幅交叉 */
  const background = (theta: number) => {
    const k = Math.floor(theta), fr = theta - k;
    const mk = (t: number) => V.view(t, [0.5, (arts[t].face?.[1] ?? 0.33) + 0.1], 1960 / arts[t].aspect, [W / 2, H / 2]);
    return {bg: mk(texAt(k)), bg2: mk(texAt(k + 1)), mix: smooth(clamp((fr - 0.3) / 0.4)), blur: 4.2, dim: 0.34};
  };
  /** 当前最接近中心的作品（用于名字闪现、滴答声） */
  const centered = (theta: number) => { const k = Math.round(theta); return {tex: texAt(k), dist: Math.abs(theta - k)}; };
  return {lenses, background, centered, slots};
}

/** 按 theta(f) 生成"每过一格"的滴答事件帧，用于音效 */
export function tickFrames(theta: (f: number) => number, from: number, to: number) {
  const out: number[] = []; let prev = Math.round(theta(from));
  for (let f = from + 1; f < to; f++) { const k = Math.round(theta(f)); if (k !== prev) out.push(f); prev = k; }
  return out;
}
