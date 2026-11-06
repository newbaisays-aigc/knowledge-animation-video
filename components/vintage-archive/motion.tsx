// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
/**
 * 复古档案组件库 · 动效与复合组件（motion）
 * Scene        每幕的镜头运动：从桌面一侧平移进入、缓慢推近、从另一侧离开
 * Drop         卡片/纸片带旋转"落"到桌上
 * BookOpen     合着的书滑入 → 封面绕书脊翻开（背面是 leftImage）→ 书脊居中
 * BrassPlaque  黄铜铭牌 + 数字滚动
 * FullPainting 名画铺满全屏并缓慢推拉（可选褪色为黑白）
 * Subtitles    逐句字幕
 * ArchiveFrame 根容器：木桌、字体、滤镜、胶片叠层、字幕、音频一次装好
 */
import React from 'react';
import {AbsoluteFill, Audio, Img, Easing, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, CJK, DISPLAY, SERIF, FontFaces, RoughFilter, Overlay, Wood, lerp, useSpring} from './kit';

export const sec = (s: number, fps = 30) => Math.round(s * fps);

export const Scene: React.FC<{dur: number; children: React.ReactNode; push?: number; dir?: 1 | -1}> = ({dur, children, push = 0.05, dir = 1}) => {
  const f = useCurrentFrame();
  const enter = lerp(f, 0, 14, 1, 0, Easing.out(Easing.cubic));
  const exit = lerp(f, dur - 10, dur, 0, 1, Easing.in(Easing.cubic));
  const sc = 1 + push * (f / dur);
  const x = (enter * 520 - exit * 520) * dir;
  const op = Math.min(lerp(f, 0, 8, 0, 1), 1 - lerp(f, dur - 6, dur, 0, 1));
  return <AbsoluteFill style={{transform: `translateX(${x}px) scale(${sc}) rotate(${(enter - exit) * 1.5 * dir}deg)`, opacity: op}}>{children}</AbsoluteFill>;
};

export const Drop: React.FC<{at: number; from?: [number, number]; rot?: number; endRot?: number; children: React.ReactNode; style?: React.CSSProperties}> =
  ({at, from = [0, 900], rot = 18, endRot = -3, children, style}) => {
  const p = useSpring(at, {damping: 16, mass: 0.9, stiffness: 95});
  const f = useCurrentFrame();
  if (f < at) return null;
  return <div style={{position: 'absolute', transform: `translate(${(1 - p) * from[0]}px, ${(1 - p) * from[1]}px) rotate(${endRot + (1 - p) * rot}deg)`, ...style}}>{children}</div>;
};

/** 翻书。at=开始帧；书在 at..at+8 滑入，at+8..at+34 翻开；右页内容建议从 at+32 之后再出现 */
export const BookOpen: React.FC<{at?: number; leftImage: string; leftPos?: string; coverTitle: string; coverSub?: string;
  W?: number; H?: number; Y?: number; children?: React.ReactNode}> =
  ({at = 0, leftImage, leftPos = '50% 20%', coverTitle, coverSub, W = 560, H = 760, Y = 140, children}) => {
  const f = useCurrentFrame() - at;
  const X = 960;
  const open = lerp(f, 8, 34, 0, 1, Easing.bezier(0.45, 0, 0.2, 1));
  const ang = open * 180, rad = ang * Math.PI / 180;
  const shift = (1 - open) * (-W / 2);
  const lift = Math.sin(open * Math.PI);
  const light = 0.55 + 0.45 * Math.min(1, Math.abs(Math.cos(rad)));
  const castW = W * Math.max(0, Math.cos(rad));
  const pageIn = lerp(f, 0, 8, 0, 1, Easing.out(Easing.cubic));
  if (f < 0) return null;
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translate(${shift}px, ${(1 - pageIn) * 80}px)`, opacity: pageIn}}>
      <div style={{position: 'absolute', left: X - 10 - W * open, top: Y - 4, width: W + 20 + W * open, height: H + 28, background: '#3b2414', borderRadius: 10, boxShadow: '0 40px 70px rgba(0,0,0,.75)'}} />
      <div style={{position: 'absolute', left: X, top: Y + 10, width: W, height: H, backgroundImage: `url(${staticFile('paper.jpg')})`, backgroundSize: 'cover',
        boxShadow: 'inset 30px 0 40px rgba(60,30,0,.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, overflow: 'hidden'}}>
        {children}
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: castW + 60, background: 'linear-gradient(90deg, rgba(20,10,0,.55), rgba(20,10,0,0))',
          opacity: open > 0 && open < 1 ? 0.9 * lift + 0.1 : 0}} />
      </div>
      <div style={{position: 'absolute', left: X, top: Y + 10, width: W, height: H, transformOrigin: '0 50%',
        transform: `perspective(2600px) translateZ(${lift * 40}px) rotateY(${-ang}deg)`, transformStyle: 'preserve-3d'}}>
        <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', borderRadius: '4px 10px 10px 4px',
          background: 'linear-gradient(135deg,#5a3720,#3a2210 60%,#2a170a)', boxShadow: 'inset 0 0 0 14px rgba(0,0,0,.15), inset 0 0 0 18px rgba(184,137,59,.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', filter: `brightness(${light})`}}>
          <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 64, color: C.brass, letterSpacing: 6, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'pre-line'}}>{coverTitle}</div>
          {coverSub && <div style={{fontFamily: SERIF, fontSize: 30, color: C.brass, marginTop: 20}}>{coverSub}</div>}
        </div>
        <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', overflow: 'hidden',
          backgroundImage: `url(${staticFile('paper.jpg')})`, backgroundSize: 'cover', boxShadow: 'inset -30px 0 40px rgba(60,30,0,.35)', filter: `brightness(${light})`}}>
          <Img src={staticFile(leftImage)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: leftPos, mixBlendMode: 'multiply', opacity: .95}} />
        </div>
      </div>
    </div>
  );
};

/** 黄铜铭牌：value 从 0 滚到目标值；suffix 如 "+"；unit 支持换行 "场\n战役" */
export const BrassPlaque: React.FC<{at: number; value: number; suffix?: string; unit: string; x: number; y: number; w?: number; h?: number; rollFrames?: number}> =
  ({at, value, suffix = '', unit, x, y, w = 800, h = 300, rollFrames = 26}) => {
  const f = useCurrentFrame();
  const n = Math.round(lerp(f, at + 6, at + 6 + rollFrames, 0, value, Easing.out(Easing.quad)));
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `scale(${lerp(f, at, at + 12, .7, 1, Easing.out(Easing.back(1.6)))})`, opacity: lerp(f, at, at + 6, 0, 1),
      borderRadius: 26, background: 'linear-gradient(160deg,#e6c27a,#a77a32 45%,#d9b066 60%,#7a5420)', boxShadow: '0 30px 60px rgba(0,0,0,.7), inset 0 2px 0 rgba(255,240,200,.7), inset 0 -4px 10px rgba(60,30,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40}}>
      <div style={{position: 'absolute', inset: 14, border: '3px solid rgba(70,40,5,.55)', borderRadius: 18}} />
      <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: h * 0.63, color: '#3a2208', textShadow: '0 2px 0 rgba(255,230,170,.6)', lineHeight: 1, minWidth: w * 0.38, textAlign: 'right'}}>
        {n}{n >= value ? suffix : ''}</div>
      <div style={{fontFamily: CJK, fontWeight: 900, fontSize: h * 0.21, color: '#3a2208', textShadow: '0 2px 0 rgba(255,230,170,.6)', lineHeight: 1.25, whiteSpace: 'pre-line'}}>{unit}</div>
    </div>
  );
};

/** 名画铺满全屏。panX 每帧平移像素；fadeToGray 为真时在 4..40 帧褪成黑白 */
export const FullPainting: React.FC<{src: string; pos?: string; zoomFrom?: number; zoomPerFrame?: number; panX?: number; fadeToGray?: boolean}> =
  ({src, pos = '50% 50%', zoomFrom = 1.08, zoomPerFrame = 0.0016, panX = -0.6, fadeToGray = false}) => {
  const f = useCurrentFrame();
  const g = fadeToGray ? lerp(f, 4, 40, 0, 0.95) : 0;
  return (
    <AbsoluteFill style={{transform: `scale(${zoomFrom + f * zoomPerFrame}) translateX(${f * panX}px)`}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, filter: `grayscale(${g}) brightness(${1 - g * 0.25}) contrast(1.08)`}} />
      <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(20,10,0,.75), rgba(20,10,0,0) 55%)'}} />
    </AbsoluteFill>
  );
};

export type Cue = {text: string; start: number; end: number};
export const Subtitles: React.FC<{cues: Cue[]; bottom?: number; size?: number}> = ({cues, bottom = 64, size = 46}) => {
  const t = useCurrentFrame() / 30;
  const c = cues.find((c) => t >= c.start - 0.05 && t <= c.end + 0.15);
  if (!c) return null;
  const op = Math.min(lerp(t, c.start - 0.05, c.start + 0.1, 0, 1, Easing.linear), 1 - lerp(t, c.end + 0.05, c.end + 0.15, 0, 1, Easing.linear));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom, textAlign: 'center', opacity: op}}>
      <span style={{fontFamily: CJK, fontWeight: 700, fontSize: size, color: '#f6ead0', letterSpacing: 3,
        textShadow: '0 0 4px #000, 0 2px 8px rgba(0,0,0,.9), 0 0 24px rgba(0,0,0,.7)'}}>{c.text}</span>
    </div>
  );
};

/**
 * 根容器。scenes 按顺序给出每幕的组件和结束时间（秒）；相邻两幕重叠 6 帧做交叉转场。
 * fullBleed 为真的幕（整屏名画）不做推近。subtitles=false 时不渲染字幕（字幕是否需要要先问用户）。
 */
export const ArchiveFrame: React.FC<{total: number; cues: Cue[]; audio?: string; subtitles?: boolean;
  scenes: {el: React.ReactNode; end: number; fullBleed?: boolean}[]}> = ({total, cues, audio = 'mix.wav', subtitles = true, scenes}) => {
  const T = Math.ceil(total * 30);
  const cuts = [0, ...scenes.map((s, i) => (i === scenes.length - 1 ? T : sec(s.end)))];
  return (
    <AbsoluteFill style={{background: '#120a04'}}>
      <FontFaces /><RoughFilter /><Wood />
      {scenes.map((s, i) => {
        const last = i === scenes.length - 1;
        const d = cuts[i + 1] - cuts[i] + (last ? 0 : 6);
        return (
          <Sequence key={i} from={cuts[i]} durationInFrames={d}>
            <Scene dur={d} dir={i % 2 ? -1 : 1} push={s.fullBleed ? 0 : 0.05}>{s.el}</Scene>
          </Sequence>
        );
      })}
      <Overlay />
      {subtitles && <Subtitles cues={cues} />}
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
};


/**
 * 黄铜放大镜（DOM 版，不需要 WebGL）。移植自美术馆组件库的玻璃镜片思路：
 * 圆形镜片里显示同一张图的局部放大，外圈黄铜框 + 高光 + 投影，落下时带弹簧。
 * src/pos/zoom 描述底图在屏幕上的摆放：底图铺在 [bx,by,bw,bh] 矩形里；
 * focus 是要放大的点（底图内 0..1 坐标），镜片中心放在 [x,y]，半径 r，放大 m 倍。
 * 常见用法：PhotoCard 或 FullPainting 上叠一个 Magnifier，看皇冠、签名、年份等细节。
 */
export const Magnifier: React.FC<{at: number; src: string; box: [number, number, number, number]; focus: [number, number];
  x: number; y: number; r?: number; m?: number; handle?: boolean}> = ({at, src, box, focus, x, y, r = 170, m = 2.4, handle = true}) => {
  const f = useCurrentFrame();
  const s = useSpring(at, {damping: 11, mass: 0.7, stiffness: 120});
  if (f < at) return null;
  const [bx, by, bw, bh] = box; const R = r * s;
  // 放大后底图左上角相对镜片中心的位置：让 focus 点落在镜片中心
  const W = bw * m, H = bh * m; const ox = -focus[0] * W, oy = -focus[1] * H;
  return (
    <div style={{position: 'absolute', left: x - R, top: y - R, width: R * 2, height: R * 2, opacity: Math.min(1, s * 3)}}>
      {handle && <div style={{position: 'absolute', left: R * 1.55, top: R * 1.55, width: R * 0.9, height: R * 0.2, borderRadius: R * 0.1, transformOrigin: '0 50%', transform: 'rotate(45deg)',
        background: 'linear-gradient(180deg,#5a3720,#2a170a)', boxShadow: '0 10px 18px rgba(0,0,0,.6)'}} />}
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 22px 40px rgba(0,0,0,.65)'}}>
        <Img src={staticFile(src)} style={{position: 'absolute', left: R + ox, top: R + oy, width: W, height: H, objectFit: 'cover', filter: 'sepia(.2) contrast(1.08)'}} />
        <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, rgba(255,245,220,.28), rgba(255,245,220,0) 40%), radial-gradient(circle, rgba(0,0,0,0) 62%, rgba(40,20,0,.45) 100%)'}} />
      </div>
      <div style={{position: 'absolute', inset: -R * 0.09, borderRadius: '50%', border: `${R * 0.11}px solid ${C.brass}`,
        boxShadow: `inset 0 0 0 2px rgba(255,235,180,.7), inset 0 ${R * 0.03}px ${R * 0.05}px rgba(255,240,200,.6), inset 0 -${R * 0.03}px ${R * 0.06}px rgba(60,30,0,.7), 0 0 0 2px rgba(60,30,0,.6)`,
        background: 'transparent'}} />
    </div>
  );
};
