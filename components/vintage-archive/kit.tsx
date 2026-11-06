// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
/**
 * 复古档案组件库 · 基础元件（kit）
 * 依赖：remotion。需要 public/ 下有：paper.jpg wood.jpg grain.png 以及字体文件（见 README）。
 * 所有动画都由 useCurrentFrame 驱动，可安全用于 Remotion 渲染。
 */
import React from 'react';
import {AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';

export const C = {ink:'#2a1a0e', paper:'#E8D9B5', red:'#9E2B25', brass:'#B8893B', cream:'#F3E6C8'};
export const SERIF = "'Old Standard', 'Noto Serif CJK SC', serif";
export const TYPE = "'Special Elite', 'Noto Serif CJK SC', monospace";
export const DISPLAY = "'Playfair Display', 'Noto Serif CJK SC', serif";
export const CJK = "'Noto Serif CJK SC', serif";

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const lerp = (f: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(f, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});

export const useSpring = (delay: number, cfg = {damping: 14, mass: 0.8, stiffness: 110}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  return spring({frame: f - delay, fps, config: cfg});
};

// jagged torn-paper polygon
export const torn = (seed: string, amp = 1.6, n = 26) => {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${(i / n) * 100}% ${random(seed + 't' + i) * amp}%`);
  for (let i = 0; i <= n; i++) pts.push(`${100 - random(seed + 'r' + i) * amp * 0.6}% ${(i / n) * 100}%`);
  for (let i = n; i >= 0; i--) pts.push(`${(i / n) * 100}% ${100 - random(seed + 'b' + i) * amp}%`);
  for (let i = n; i >= 0; i--) pts.push(`${random(seed + 'l' + i) * amp * 0.6}% ${(i / n) * 100}%`);
  return `polygon(${pts.join(',')})`;
};

export const Paper: React.FC<{seed: string; style?: React.CSSProperties; children?: React.ReactNode; tornEdge?: boolean; tint?: string}> =
  ({seed, style, children, tornEdge = true, tint}) => (
  <div style={{position: 'absolute', filter: 'drop-shadow(0 14px 18px rgba(0,0,0,.55)) drop-shadow(0 2px 3px rgba(0,0,0,.5))', ...style}}>
    <div style={{width: '100%', height: '100%', backgroundImage: `url(${staticFile('paper.jpg')})`, backgroundSize: 'cover',
      clipPath: tornEdge ? torn(seed) : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
      {tint && <div style={{position: 'absolute', inset: 0, background: tint, mixBlendMode: 'multiply'}} />}
      <div style={{position: 'relative', textAlign: 'center'}}>{children}</div>
    </div>
  </div>
);

// photo card: aged print with cream border
export const PhotoCard: React.FC<{src: string; w: number; h: number; pos?: string; zoom?: number; style?: React.CSSProperties; gray?: number; caption?: string}> =
  ({src, w, h, pos = '50% 50%', zoom = 1, style, gray = 0, caption}) => (
  <div style={{position: 'absolute', width: w, height: h + (caption ? 70 : 0), padding: 18, paddingBottom: caption ? 70 : 18, boxSizing: 'content-box',
    backgroundImage: `url(${staticFile('paper.jpg')})`, backgroundSize: 'cover',
    boxShadow: '0 30px 50px rgba(0,0,0,.6), 0 4px 8px rgba(0,0,0,.5)', ...style}}>
    <div style={{width: w, height: h, overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 0 40px rgba(40,20,5,.6)'}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos,
        transform: `scale(${zoom})`, transformOrigin: pos, filter: `grayscale(${gray}) sepia(.25) contrast(1.05)`}} />
      <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 80px rgba(30,15,0,.55)'}} />
    </div>
    {caption && <div style={{position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontFamily: TYPE, fontSize: 30, color: C.ink, opacity: .85}}>{caption}</div>}
  </div>
);

// hand-drawn red ink circle
export const InkCircle: React.FC<{w: number; h: number; start: number; dur?: number; color?: string; sw?: number; style?: React.CSSProperties; seed?: string}> =
  ({w, h, start, dur = 14, color = C.red, sw = 7, style, seed = 'c'}) => {
  const f = useCurrentFrame();
  const p = lerp(f, start, start + dur, 0, 1, Easing.out(Easing.cubic));
  const pts: string[] = []; const N = 80;
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI * 0.6 + (i / N) * Math.PI * 2.25;
    const rw = (w / 2 - sw) * (1 + 0.05 * Math.sin(i * 0.31 + random(seed) * 6) - 0.04 * (i / N));
    const rh = (h / 2 - sw) * (1 + 0.06 * Math.cos(i * 0.27 + random(seed + 'x') * 6));
    pts.push(`${i ? 'L' : 'M'}${(w / 2 + rw * Math.cos(a)).toFixed(1)},${(h / 2 + rh * Math.sin(a)).toFixed(1)}`);
  }
  const L = 3.2 * Math.PI * Math.max(w, h) / 2 * 1.2;
  return (
    <svg width={w} height={h} style={{position: 'absolute', overflow: 'visible', ...style}}>
      <path d={pts.join(' ')} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={L} strokeDashoffset={L * (1 - p)} opacity={0.9} style={{filter: 'url(#rough)'}} />
    </svg>
  );
};

// rubber stamp
export const Stamp: React.FC<{text: string; at: number; style?: React.CSSProperties; size?: number}> = ({text, at, style, size = 76}) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + 6, 0, 1, Easing.in(Easing.quad));
  if (f < at) return null;
  const s = interpolate(p, [0, 1], [2.4, 1]);
  return (
    <div style={{position: 'absolute', transform: `scale(${s}) rotate(-12deg)`, opacity: p, ...style,
      filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.55))'}}>
      <div style={{background: 'linear-gradient(160deg,#FFD84A,#F2B705 60%,#E3A400)', border: `7px solid ${C.red}`, borderRadius: 12,
        boxShadow: `inset 0 0 0 4px #FFE680, inset 0 0 0 7px ${C.red}`, padding: '8px 34px 12px', color: C.red, fontFamily: CJK, fontWeight: 900,
        fontSize: size, letterSpacing: 12, lineHeight: 1.1, textShadow: '0 1px 0 rgba(255,240,180,.6)'}}>{text}</div>
    </div>
  );
};

// ribbon banner that unrolls from center
export const Ribbon: React.FC<{text: string; at: number; w: number; style?: React.CSSProperties; size?: number; sub?: string}> = ({text, at, w, style, size = 92, sub}) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + 16, 0, 1);
  const h = size * 1.92;
  const clip = `inset(0 ${50 - p * 50}% 0 ${50 - p * 50}%)`;
  return (
    <div style={{position: 'absolute', width: w, height: h, clipPath: clip, filter: 'drop-shadow(0 12px 14px rgba(0,0,0,.6))', ...style}}>
      <svg width={w} height={h} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id="rb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efe2c2" /><stop offset=".5" stopColor="#dcc79c" /><stop offset="1" stopColor="#b99c6a" />
          </linearGradient>
        </defs>
        <path d={`M0,${h * .25} L${w * .06},${h * .5} L0,${h * .75} L${w * .09},${h * .78} L${w * .09},${h * .22} Z`} fill="#8d7146" />
        <path d={`M${w},${h * .25} L${w * .94},${h * .5} L${w},${h * .75} L${w * .91},${h * .78} L${w * .91},${h * .22} Z`} fill="#8d7146" />
        {/* 纸面下缘弧度 .82h/.88h：原 .76h 的弧线中部太浅，sub 副标题会掉出纸外 */}
        <path d={`M${w * .07},${h * .12} Q${w / 2},${h * .02} ${w * .93},${h * .12} L${w * .93},${h * .88} Q${w / 2},${h * .82} ${w * .07},${h * .88} Z`} fill="url(#rb)" stroke="#6b5232" strokeWidth={2} />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: h * .08}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: size, color: C.ink, letterSpacing: 4, lineHeight: .84, fontStyle: 'italic'}}>{text}</div>
        {sub && <div style={{fontFamily: CJK, fontSize: size * .27, color: C.red, marginTop: 3, letterSpacing: 6, fontWeight: 700, lineHeight: 1}}>{sub}</div>}
      </div>
    </div>
  );
};

// typewriter reveal
export const Typed: React.FC<{text: string; at: number; cps?: number; style?: React.CSSProperties}> = ({text, at, cps = 18, style}) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((f - at) * cps / 30)));
  return <span style={style}>{text.slice(0, n)}<span style={{opacity: 0}}>{text.slice(n)}</span></span>;
};

export const Wood: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{backgroundImage: `url(${staticFile('wood.jpg')})`, backgroundSize: '2200px 1300px',
    backgroundPosition: `${-140 + f * 0.12}px ${-110 + f * 0.05}px`, filter: 'brightness(.82) saturate(.9)'}} />;
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const fl = 1 + (random('fl' + Math.floor(f / 2)) - 0.5) * 0.05;
  return (
    <>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 72% 70% at 50% 46%, rgba(0,0,0,0) 45%, rgba(12,6,0,.55) 78%, rgba(6,3,0,.85) 100%)', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 40% 35% at 50% 30%, rgba(255,214,150,.10), rgba(0,0,0,0))', mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('grain.png')})`, backgroundSize: '512px',
        backgroundPosition: `${random('gx' + f) * 512}px ${random('gy' + f) * 512}px`, mixBlendMode: 'overlay', opacity: .22}} />
      <AbsoluteFill style={{background: `rgba(255,230,190,${(fl - 1) * 0.8 + 0.02})`, mixBlendMode: 'soft-light'}} />
      {Array.from({length: 7}).map((_, i) => {
        const on = random(`d${i}${Math.floor(f / 3)}`) > 0.6;
        return on ? <div key={i} style={{position: 'absolute', left: random(`dx${i}${Math.floor(f / 3)}`) * 1920, top: random(`dy${i}${Math.floor(f / 3)}`) * 1080,
          width: 2 + random(`ds${i}`) * 3, height: 2 + random(`dh${i}${f}`) * 14, background: 'rgba(250,235,200,.35)', borderRadius: 2}} /> : null;
      })}
    </>
  );
};

// 字体注册：放在根组件里渲染一次
export const FontFaces: React.FC = () => (
  <style>{`
@font-face{font-family:'Special Elite';src:url(${staticFile('SpecialElite.ttf')})}
@font-face{font-family:'Old Standard';font-weight:700;src:url(${staticFile('OldStandard-Bold.ttf')})}
@font-face{font-family:'Playfair Display';font-weight:400 900;src:url(${staticFile('PlayfairDisplay-VF.ttf')})}
`}</style>
);

// 手绘抖动滤镜：InkCircle、手绘线条会引用 url(#rough)，根组件里放一次
export const RoughFilter: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={3} /><feDisplacementMap in="SourceGraphic" scale={4} /></filter>
  </svg>
);
