// =============================================================
// 时间线（单一真源）：画面、文字、音频事件都从这里读取
// 30fps · 960 帧 · 120 BPM（1 拍 = 15 帧）
// =============================================================
export const FPS = 30;
export const DURATION = 960;
export const W = 1920;
export const H = 1080;

// 段落（帧）
export const SEG = {
  select: [0, 180],    // ① 选择 S-A 轮盘旋选
  overview: [180, 390], // ② 讲解 O-A 渗透展开 + 侧移让位 + 缓推
  d1: [390, 525],       // ③ 细节1 D-A 放大镜片（嘴角）
  d2: [525, 660],       // ③ 细节2 D-A 镜片滑移（双眼）
  d3: [660, 780],       // ③ 细节3 D-C 双镜对比（地平线）
  cycle: [780, 960],    // ④ 结语 C-A 收回轮盘
};

// 纹理：0 蒙娜丽莎 1 抱银鼠的女子 2 吉内薇拉 3 施洗者圣约翰 4 自画像
export const TEX = ['mona', 'ermine', 'ginevra', 'john', 'self'];
export const ASPECT = [0.6710, 0.7438, 0.9433, 0.7725, 0.6373];
// 每幅画的"脸部"取景中心（uv）与轮盘镜片内画作高度系数
export const FACE = [
  [0.47, 0.27, 5.2],
  [0.53, 0.25, 4.6],
  [0.50, 0.40, 3.6],
  [0.40, 0.24, 4.4],
  [0.50, 0.33, 3.4],
];
export const NAMES = ['蒙娜丽莎', '抱银鼠的女子', '吉内薇拉·德·本奇', '施洗者圣约翰', '自画像'];

// 轮盘：15 格 × 24° = 360°，作品顺序循环 3 次
const ORDER = [4, 2, 1, 3, 0];
export const SLOTS = 15;
const STEP = (24 * Math.PI) / 180;
const WR = 1100; // 轮盘半径
const WC = [960, 540 + WR];

// ------------------------------------------------- easing
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (f, a, b) => clamp((f - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const outCubic = (t) => 1 - Math.pow(1 - t, 3);
export const outBack = (t, s = 0.6) => {
  const c3 = s + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};
// 阻尼弹簧（液体落位，过冲约 8%）
export const spring = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-6.5 * t) * Math.cos(9.5 * t);
};
const lerpLog = (a, b, t) => Math.exp(lerp(Math.log(a), Math.log(b), t));

// ------------------------------------------------- 轮盘角度 θ（单位：格）
// 选择段：从 -6 旋入，经过 10 格，回弹停在第 4 格（蒙娜丽莎）
// 结语段：从第 4 格整整转一圈（15 格）回到第 19 格（仍是蒙娜丽莎）
export const SELECT_SPIN = [6, 128];
export const CYCLE_SPIN = [828, 888];
export function wheelTheta(f) {
  if (f < 600) {
    const t = prog(f, SELECT_SPIN[0], SELECT_SPIN[1]);
    return -6 + 10 * outBack(outCubic(t) * 0.35 + t * 0.65, 0.5);
  }
  const t = prog(f, CYCLE_SPIN[0], CYCLE_SPIN[1]);
  return 4 + 15 * outBack(inOut(t), 0.35);
}
const wrapSlot = (d) => {
  let x = d % SLOTS;
  if (x > SLOTS / 2) x -= SLOTS;
  if (x < -SLOTS / 2) x += SLOTS;
  return x;
};

// 视图：{c:[u,v], h:画作屏幕高度px, a:[锚点x,y], t:纹理}
const view = (t, c, h, a) => ({ t, c, h, a });
const portraitView = (tex, r, anchor) =>
  view(tex, [FACE[tex][0], FACE[tex][1]], r * FACE[tex][2], anchor);
// 把视图换算到新锚点（画面不动）
const reanchor = (v, a) => {
  const w = v.h * ASPECT[v.t];
  return view(v.t, [v.c[0] + (a[0] - v.a[0]) / w, v.c[1] + (a[1] - v.a[1]) / v.h], v.h, a);
};
const lerpView = (A, B, t) =>
  view(A.t, [lerp(A.c[0], B.c[0], t), lerp(A.c[1], B.c[1], t)], lerpLog(A.h, B.h, t), [
    lerp(A.a[0], B.a[0], t),
    lerp(A.a[1], B.a[1], t),
  ]);
// 画面上某 uv 点的屏幕坐标
export const uvToScreen = (v, uv) => {
  const w = v.h * ASPECT[v.t];
  return [v.a[0] + (uv[0] - v.c[0]) * w, v.a[1] + (uv[1] - v.c[1]) * v.h];
};
// 放大镜：在 bg 视图上，以屏幕点 p 为中心放大 m 倍
const magView = (bg, p, m) => {
  const w = bg.h * ASPECT[bg.t];
  const uv = [bg.c[0] + (p[0] - bg.a[0]) / w, bg.c[1] + (p[1] - bg.a[1]) / bg.h];
  return view(bg.t, uv, bg.h * m, p);
};

// 轮盘镜片
function wheelLenses(theta, f, alphaAll = 1, vel = 0) {
  const out = [];
  for (let k = 0; k < SLOTS; k++) {
    const d = wrapSlot(k - theta);
    const ang = d * STEP;
    if (Math.abs(ang) > 1.35) continue;
    const close = clamp(1 - Math.abs(d));
    const c = smooth(close);
    const r = lerp(108, 178, c);
    const x = WC[0] + WR * Math.sin(ang);
    const y = WC[1] - WR * Math.cos(ang);
    const tex = ORDER[k % 5];
    const tang = [Math.cos(ang), Math.sin(ang)];
    const st = clamp(Math.abs(vel) * 0.55, 0, 0.42) * Math.sign(vel || 1);
    out.push({
      x, y, r,
      active: c,
      view: portraitView(tex, r, [x, y]),
      stretch: [tang[0] * st, tang[1] * st],
      alpha: alphaAll * clamp((1.35 - Math.abs(ang)) / 0.25),
      blur: lerp(1.2, 0, c),
      tex, d,
    });
  }
  return out.sort((a, b) => a.active - b.active);
}

const wheelBg = (theta) => {
  const k = Math.floor(theta);
  const fr = theta - k;
  const tA = ORDER[((k % SLOTS) + SLOTS) % 5];
  const tB = ORDER[(((k + 1) % SLOTS) + SLOTS) % 5];
  const mk = (t) => view(t, [0.5, FACE[t][1] + 0.1], 1960 / ASPECT[t], [960, 540]);
  return { bg: mk(tA), bg2: mk(tB), mix: smooth(clamp((fr - 0.3) / 0.4)) };
};

// ------------------------------------------------- 关键视图
const OV_FULL_C = view(0, [0.5, 0.5], 960, [960, 540]);
const OV_RIGHT_0 = view(0, [0.5, 0.5], 960, [1300, 540]);
const OV_RIGHT_1 = view(0, [0.5, 0.48], 1010, [1300, 540]);
const FACE_V = view(0, [0.47, 0.285], 3400, [1250, 560]);
const EYES_V = view(0, [0.468, 0.24], 3000, [1250, 600]);
const LAND_V = view(0, [0.5, 0.31], 1750, [960, 470]);
export const MOUTH_UV = [0.458, 0.312];
export const EYES_UV = [0.468, 0.228];
export const HZ_L_UV = [0.17, 0.345];
export const HZ_R_UV = [0.84, 0.265];

// ------------------------------------------------- 每帧状态
export function frameState(f) {
  const S = {
    bg: OV_FULL_C, bg2: null, mix: 0, blur: 0, dim: 1, backdrop: 1,
    lenses: [], fade: 1, vel: 0,
  };
  // 速度（用于液态拉伸）
  const thetaVel = wheelTheta(f + 0.5) - wheelTheta(f - 0.5);

  if (f < SEG.overview[0]) {
    // ① 选择
    const th = wheelTheta(f);
    const wb = wheelBg(th);
    Object.assign(S, wb, { blur: 4.2, dim: 0.34 });
    const push = lerp(0.92, 1, outCubic(prog(f, 0, 150)));
    S.lenses = wheelLenses(th, f, 1, thetaVel).map((L) => scaleAbout(L, push));
    S.fade = smooth(prog(f, 0, 14));
  } else if (f < SEG.d1[0]) {
    // ② 讲解：中心镜片渗满整屏 → 画作右移 → 缓推
    const t = prog(f, 180, 228);
    const e = inOut(t);
    if (f < 228) {
      const th = wheelTheta(f);
      const wb = wheelBg(th);
      Object.assign(S, wb, { blur: 4.2, dim: lerp(0.34, 0.1, e) });
      const others = wheelLenses(th, f, 1 - smooth(prog(f, 180, 205)), 0)
        .filter((L) => L.active < 0.5)
        .map((L) => {
          // 两侧镜片被推开
          const dx = L.x - 960;
          return { ...L, x: L.x + dx * e * 0.8, y: L.y + 260 * e };
        });
      const r = lerp(178, 1250, e);
      const pv = portraitView(0, 178, [960, 540]);
      const v = lerpView(pv, OV_FULL_C, e);
      S.lenses = [
        ...others,
        { x: 960, y: 540, r, active: 1, view: v, stretch: [0, 0], alpha: 1, blur: 0 },
      ];
    } else {
      const t2 = inOut(prog(f, 232, 272));
      let v = lerpView(OV_FULL_C, OV_RIGHT_0, t2);
      const t3 = prog(f, 272, 390);
      if (f >= 272) v = lerpView(OV_RIGHT_0, OV_RIGHT_1, t3);
      S.bg = v; S.blur = 0; S.dim = 1;
    }
  } else if (f < SEG.d2[0]) {
    // ③ 细节1：俯冲到面部，放大镜贴到嘴角
    const t = inOut(prog(f, 390, 432));
    S.bg = lerpView(OV_RIGHT_1, FACE_V, t);
    S.dim = lerp(1, 0.42, smooth(prog(f, 428, 452)));
    const s = spring(prog(f, 424, 456));
    const p = uvToScreen(S.bg, MOUTH_UV);
    const r = 235 * s;
    if (r > 2)
      S.lenses = [{ x: p[0], y: p[1], r, active: 1, view: magView(S.bg, p, 2.1), stretch: [0, 0], alpha: clamp(s * 3), blur: 0 }];
  } else if (f < SEG.d3[0]) {
    // ③ 细节2：镜片像水滴一样滑到双眼
    const t = inOut(prog(f, 525, 560));
    S.bg = lerpView(FACE_V, EYES_V, t);
    S.dim = 0.42;
    const pA = uvToScreen(S.bg, MOUTH_UV);
    const pB = uvToScreen(S.bg, EYES_UV);
    const p = [lerp(pA[0], pB[0], t), lerp(pA[1], pB[1], t)];
    const rr = lerp(235, 290, spring(prog(f, 540, 575)));
    const mm = lerp(2.1, 1.35, t);
    // 速度 → 拉伸
    const t1 = inOut(prog(f + 1, 525, 560));
    const vy = (lerp(pA[1], pB[1], t1) - p[1]) / 40;
    const vx = (lerp(pA[0], pB[0], t1) - p[0]) / 40;
    S.lenses = [{ x: p[0], y: p[1], r: rr, active: 1, view: magView(S.bg, p, mm), stretch: [vx * 1.6, vy * 1.6], alpha: 1, blur: 0 }];
  } else if (f < SEG.cycle[0]) {
    // ③ 细节3：拉远，双镜对比左右地平线
    const t = inOut(prog(f, 660, 700));
    S.bg = lerpView(EYES_V, LAND_V, t);
    S.dim = lerp(0.42, 0.55, t);
    const lens = [];
    if (f < 684) {
      const p = uvToScreen(S.bg, EYES_UV);
      const a = 1 - smooth(prog(f, 662, 684));
      lens.push({ x: p[0], y: p[1], r: 290 * lerp(1, 0.4, smooth(prog(f, 660, 684))), active: 1, view: magView(S.bg, p, 1.35), stretch: [0, 0], alpha: a, blur: 0 });
    }
    const sL = spring(prog(f, 700, 730));
    const sR = spring(prog(f, 708, 738));
    for (const [uv, s] of [[HZ_L_UV, sL], [HZ_R_UV, sR]]) {
      if (s <= 0.01) continue;
      const p = uvToScreen(S.bg, uv);
      lens.push({ x: p[0], y: p[1], r: 165 * s, active: 1, view: magView(S.bg, p, 2.0), stretch: [0, 0], alpha: clamp(s * 3), blur: 0 });
    }
    S.lenses = lens;
  } else {
    // ④ 结语：画作收回镜片 → 轮盘整圈旋转 → 定格
    const th = wheelTheta(f);
    const t = inOut(prog(f, 780, 828));
    const wb = wheelBg(th);
    Object.assign(S, wb, { blur: 4.2, dim: 0.34 });
    let lenses = wheelLenses(th, f, smooth(prog(f, 808, 832)), thetaVel);
    // 地平线双镜淡出
    if (f < 792) {
      const a = 1 - smooth(prog(f, 780, 792));
      for (const uv of [HZ_L_UV, HZ_R_UV]) {
        const p = uvToScreen(LAND_V, uv);
        lenses.push({ x: p[0], y: p[1], r: 165, active: 1, view: magView(LAND_V, p, 2.0), stretch: [0, 0], alpha: a, blur: 0 });
      }
    }
    if (f < 828) {
      lenses = lenses.filter((L) => L.r < 170 || L.tex === undefined);
      const big = reanchor(LAND_V, [960, 540]);
      const r = lerp(1250, 178, t);
      const v = lerpView(big, portraitView(0, 178, [960, 540]), t);
      lenses.push({ x: 960, y: 540, r, active: 1, view: v, stretch: [0, 0], alpha: 1, blur: 0, dim: lerp(0.55, 1, t) });
    }
    S.lenses = lenses;
    S.fade = 1 - smooth(prog(f, 948, 960)) * 0.85;
  }
  return S;
}

function scaleAbout(L, s) {
  return { ...L, x: 960 + (L.x - 960) * s, y: 540 + (L.y - 540) * s, r: L.r * s, view: { ...L.view, h: L.view.h * s, a: [960 + (L.view.a[0] - 960) * s, 540 + (L.view.a[1] - 540) * s] } };
}

// ------------------------------------------------- 选择段：经过中心的作品（用于名字闪现 & 滴答声）
export function centeredSlot(f) {
  const th = wheelTheta(f);
  const k = Math.round(th);
  return { k, tex: ORDER[((k % SLOTS) + SLOTS) % SLOTS % 5], dist: Math.abs(th - k) };
}

// ------------------------------------------------- 音频事件（帧）
export function audioEvents() {
  const ev = [];
  let prev = Math.round(wheelTheta(0));
  for (let f = 1; f < DURATION; f++) {
    if (f > 200 && f < 820) continue;
    const k = Math.round(wheelTheta(f));
    if (k !== prev) ev.push({ type: 'tick', f });
    prev = k;
  }
  ev.push({ type: 'land', f: 128 });
  ev.push({ type: 'title', f: 135 });
  ev.push({ type: 'whoosh', f: 180, len: 50 });
  ev.push({ type: 'title', f: 240 });
  ev.push({ type: 'title', f: 315 });
  ev.push({ type: 'swoop', f: 390, len: 42 });
  ev.push({ type: 'drop', f: 424 });
  ev.push({ type: 'title', f: 450 });
  ev.push({ type: 'flow', f: 525, len: 36 });
  ev.push({ type: 'drop', f: 556 });
  ev.push({ type: 'title', f: 570 });
  ev.push({ type: 'whoosh', f: 660, len: 40 });
  ev.push({ type: 'drop', f: 700 });
  ev.push({ type: 'drop', f: 708 });
  ev.push({ type: 'title', f: 735 });
  ev.push({ type: 'whoosh', f: 780, len: 48 });
  ev.push({ type: 'spin', f: 828, len: 60 });
  ev.push({ type: 'land', f: 888 });
  ev.push({ type: 'boom', f: 888 });
  return ev;
}
