// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
/**
 * 示例：《蒙娜丽莎》32 秒美术馆风知识动画（16:9，960 帧）
 * 用组件库重写的版本；原始一体化源码在 original/ 里，效果一致。
 * 结构：① 作品轮盘旋选 → ② 镜片渗满全屏 + 作品档案 → ③ 三个细节（放大镜 / 镜片滑移 / 双镜对比）→ ④ 收回轮盘
 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Artwork, FrameState, Lens, makeViews, makeWheel, clamp, lerp, prog, smooth, inOut, outCubic, outBack, spring,
  GalleryCanvas, GalleryFonts, Plaque, IndexMark, ArtworkCard, DetailNote, CenterTitle, CompareMarks, G, CJK, MONO, SHADOW} from '../index';

export const ARTS: Artwork[] = [
  {src: 'mona.jpg', aspect: 0.6710, name: '蒙娜丽莎', face: [0.47, 0.27, 5.2]},
  {src: 'ermine.jpg', aspect: 0.7438, name: '抱银鼠的女子', face: [0.53, 0.25, 4.6]},
  {src: 'ginevra.jpg', aspect: 0.9433, name: '吉内薇拉·德·本奇', face: [0.50, 0.40, 3.6]},
  {src: 'baptist.jpg', aspect: 0.7725, name: '施洗者圣约翰', face: [0.40, 0.24, 4.4]},
  {src: 'self.jpg', aspect: 0.6373, name: '自画像', face: [0.50, 0.33, 3.4]},
];
const V = makeViews(ARTS);
const WH = makeWheel(ARTS, {order: [4, 2, 1, 3, 0]});

// 轮盘角度（单位：格）：开场旋入停在蒙娜丽莎（第 4 格），结尾整转一圈
const theta = (f: number) => f < 600
  ? -6 + 10 * outBack(outCubic(prog(f, 6, 128)) * 0.35 + prog(f, 6, 128) * 0.65, 0.5)
  : 4 + 15 * outBack(inOut(prog(f, 828, 888)), 0.35);

// 关键视图
const FULL = V.full(0, 960); const RIGHT0 = V.full(0, 960, [1300, 540]); const RIGHT1 = V.focus(0, [0.5, 0.48], 1010, [1300, 540]);
const FACE = V.focus(0, [0.47, 0.285], 3400, [1250, 560]); const EYES = V.focus(0, [0.468, 0.24], 3000, [1250, 600]); const LAND = V.focus(0, [0.5, 0.31], 1750, [960, 470]);
const MOUTH: [number, number] = [0.458, 0.312], EYE: [number, number] = [0.468, 0.228], HZL: [number, number] = [0.17, 0.345], HZR: [number, number] = [0.84, 0.265];

const scaleAbout = (L: Lens, s: number): Lens => ({...L, x: 960 + (L.x - 960) * s, y: 540 + (L.y - 540) * s, r: L.r * s,
  view: {...L.view, h: L.view.h * s, a: [960 + (L.view.a[0] - 960) * s, 540 + (L.view.a[1] - 540) * s]}});

export function state(f: number): FrameState {
  const vel = theta(f + 0.5) - theta(f - 0.5);
  if (f < 180) {   // ① 轮盘
    const push = lerp(0.92, 1, outCubic(prog(f, 0, 150)));
    return {...WH.background(theta(f)), lenses: WH.lenses(theta(f), 1, vel).map((L) => scaleAbout(L, push)), fade: smooth(prog(f, 0, 14))};
  }
  if (f < 390) {   // ② 中心镜片渗满全屏 → 画右移让位给档案卡
    const e = inOut(prog(f, 180, 228));
    if (f < 228) {
      const others = WH.lenses(theta(f), 1 - smooth(prog(f, 180, 205))).filter((L) => (L.active ?? 0) < 0.5)
        .map((L) => ({...L, x: L.x + (L.x - 960) * e * 0.8, y: L.y + 260 * e}));
      return {...WH.background(theta(f)), dim: lerp(0.34, 0.1, e),
        lenses: [...others, {x: 960, y: 540, r: lerp(178, 1250, e), alpha: 1, active: 1, view: V.mixView(V.portrait(0, 178, [960, 540]), FULL, e)}]};
    }
    const bg = f < 272 ? V.mixView(FULL, RIGHT0, inOut(prog(f, 232, 272))) : V.mixView(RIGHT0, RIGHT1, prog(f, 272, 390));
    return {bg, lenses: []};
  }
  if (f < 525) {   // ③-1 俯冲到脸，放大镜落在嘴角
    const bg = V.mixView(RIGHT1, FACE, inOut(prog(f, 390, 432)));
    return {bg, dim: lerp(1, 0.42, smooth(prog(f, 428, 452))), lenses: [V.magnifier(bg, MOUTH, 235, 2.1, spring(prog(f, 424, 456)))!].filter(Boolean)};
  }
  if (f < 660) {   // ③-2 镜片像水滴一样滑到双眼（带液态拉伸）
    const t = inOut(prog(f, 525, 560)); const bg = V.mixView(FACE, EYES, t);
    const pA = V.uvToScreen(bg, MOUTH), pB = V.uvToScreen(bg, EYE);
    const p: [number, number] = [lerp(pA[0], pB[0], t), lerp(pA[1], pB[1], t)];
    const t1 = inOut(prog(f + 1, 525, 560));
    const st: [number, number] = [(lerp(pA[0], pB[0], t1) - p[0]) / 40 * 1.6, (lerp(pA[1], pB[1], t1) - p[1]) / 40 * 1.6];
    return {bg, dim: 0.42, lenses: [{x: p[0], y: p[1], r: lerp(235, 290, spring(prog(f, 540, 575))), alpha: 1, active: 1, view: V.magView(bg, p, lerp(2.1, 1.35, t)), stretch: st}]};
  }
  if (f < 780) {   // ③-3 拉远，双镜对比地平线
    const t = inOut(prog(f, 660, 700)); const bg = V.mixView(EYES, LAND, t);
    const lenses: Lens[] = [];
    if (f < 684) { const p = V.uvToScreen(bg, EYE); lenses.push({x: p[0], y: p[1], r: 290 * lerp(1, 0.4, smooth(prog(f, 660, 684))), alpha: 1 - smooth(prog(f, 662, 684)), active: 1, view: V.magView(bg, p, 1.35)}); }
    for (const [uv, s] of [[HZL, spring(prog(f, 700, 730))], [HZR, spring(prog(f, 708, 738))]] as const) { const L = V.magnifier(bg, uv as any, 165, 2.0, s); if (L) lenses.push(L); }
    return {bg, dim: lerp(0.42, 0.55, t), lenses};
  }
  // ④ 收回轮盘，整转一圈，定格
  const t = inOut(prog(f, 780, 828));
  let lenses = WH.lenses(theta(f), smooth(prog(f, 808, 832)), vel);
  if (f < 792) for (const uv of [HZL, HZR]) lenses.push(V.magnifier(LAND, uv, 165, 2.0)!), (lenses[lenses.length - 1].alpha = 1 - smooth(prog(f, 780, 792)));
  if (f < 828) {
    lenses = lenses.filter((L) => L.r < 170 || L.tex === undefined);
    lenses.push({x: 960, y: 540, r: lerp(1250, 178, t), alpha: 1, active: 1, dim: lerp(0.55, 1, t), view: V.mixView(V.reanchor(LAND, [960, 540]), V.portrait(0, 178, [960, 540]), t)});
  }
  return {...WH.background(theta(f)), lenses, fade: 1 - smooth(prog(f, 948, 960)) * 0.85};
}

const NameFlash: React.FC = () => {
  const f = useCurrentFrame(); if (!(f < 128 || (f >= 828 && f < 884))) return null;
  const c = WH.centered(theta(f));
  return <div style={{position: 'absolute', left: 0, right: 0, top: 772, textAlign: 'center', fontFamily: CJK, fontSize: 40, letterSpacing: '0.2em', color: G.white,
    opacity: clamp(1 - c.dist * 3.2) * (f < 128 ? smooth(prog(f, 14, 30)) : 1) * 0.85, textShadow: SHADOW}}>{ARTS[c.tex].name}</div>;
};

const Text: React.FC = () => {
  const f = useCurrentFrame();
  const lens = (uv: [number, number], s: number) => { const p = V.uvToScreen(LAND, uv); return {x: p[0], y: p[1], r: 165 * s}; };
  return (
    <AbsoluteFill style={{opacity: 1 - smooth(prog(f, 948, 960)) * 0.85}}>
      <NameFlash />
      {f < 190 && <><Plaque a={10} b={186}>列奥纳多·达·芬奇 · 作品</Plaque>
        {f >= 128 && <><CenterTitle a={132} b={186} title={['蒙娜丽莎 ', {em: 'Mona Lisa', it: true, color: G.white}]} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 872, textAlign: 'center', fontFamily: MONO, fontSize: 32, letterSpacing: '0.14em', color: G.muted}}>约 1503 — 1519</div></>}</>}
      {f >= 236 && f < 392 && <><Plaque a={236} b={392}>讲解 · 作品档案</Plaque>
        <ArtworkCard a={240} b={392} title="蒙娜丽莎" foreign="La Gioconda" author="列奥纳多·达·芬奇" year="约 1503—1519" meta={['杨木板油画 · 77 × 53 cm', '巴黎卢浮宫']} /></>}
      {f >= 440 && f < 527 && <><Plaque a={440} b={527}>细节 · 局部放大</Plaque><IndexMark a={440} b={527} n={1} total={3} />
        <DetailNote a={440} b={527} title={[{em: 'Sfumato', it: true}, ' 晕涂法']} lines={['轮廓化入烟雾般的阴影，', '嘴角若有似无']} /></>}
      {f >= 562 && f < 662 && <><Plaque a={562} b={662}>细节 · 局部放大</Plaque><IndexMark a={562} b={662} n={2} total={3} />
        <DetailNote a={562} b={662} title={['没有', {em: '眉毛'}]} lines={['眉毛与睫毛几乎不可见']} /></>}
      {f >= 700 && f < 790 && <><Plaque a={704} b={790}>细节 · 双镜对比</Plaque><IndexMark a={704} b={790} n={3} total={3} />
        <CompareMarks A={lens(HZL, spring(prog(f, 700, 730)))} B={lens(HZR, spring(prog(f, 708, 738)))} a={728} b={790} labels={['左 · 低', '右 · 高']} />
        <CenterTitle a={735} b={790} top={800} title={[{em: '地平线'}, '左低右高']} sub={['人物身后的风景并不对称']} /></>}
      {f >= 884 && <><Plaque a={884} b={2000}>列奥纳多·达·芬奇 · 卢浮宫</Plaque>
        <CenterTitle a={888} b={2000} title={['蒙娜丽莎 ', {em: 'Mona Lisa', it: true, color: G.white}]} sub={['一抹', {em: '微笑'}, '，被凝视了五百多年']} /></>}
    </AbsoluteFill>
  );
};

export const MonaLisa: React.FC = () => (
  <AbsoluteFill style={{background: '#0E0E03'}}>
    <GalleryFonts />
    <GalleryCanvas arts={ARTS} state={state} />
    <Text />
    <Audio src={staticFile('audio.wav')} />
  </AbsoluteFill>
);
