// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
/**
 * 美术馆组件库 · 文字排版
 * 风格：中文宋体 + 意大利斜体外文 + 等宽小字；铜色强调；入场 = 上浮 + 去模糊 + 弹簧
 */
import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {clamp, smooth, spring, prog} from './view';

export const G = {white: '#F2EDE4', muted: '#A39A8B', copper: '#D9A273', soft: '#E7DCCB', label: '#C9BBA2'};
export const SERIF = "'Instrument Serif','Noto Serif CJK SC',serif";
export const CJK = "'Noto Serif CJK SC',serif";
export const MONO = "'JB Mono','Noto Sans Mono',monospace";
export const SHADOW = '0 2px 24px rgba(0,0,0,.55), 0 0 2px rgba(0,0,0,.5)';

export const GalleryFonts: React.FC = () => (
  <style>{`
@font-face{font-family:'Instrument Serif';src:url(${staticFile('InstrumentSerif-Regular.ttf')});font-style:normal;}
@font-face{font-family:'Instrument Serif';src:url(${staticFile('InstrumentSerif-Italic.ttf')});font-style:italic;}
@font-face{font-family:'JB Mono';src:url(${staticFile('JetBrainsMono.ttf')});font-weight:100 800;}
`}</style>
);

/** 入场/退场样式：a 开始帧，b 结束帧，d 延迟 */
export const reveal = (f: number, a: number, b: number, d = 0): React.CSSProperties => {
  const t = clamp((f - a - d) / 20), e = spring(t), out = 1 - smooth(clamp((f - b + 10) / 10));
  return {opacity: clamp(t * 2.2) * out, transform: `translateY(${(1 - e) * 26}px)`, filter: `blur(${(1 - clamp(t * 1.6)) * 8}px)`};
};

/** 富文本：字符串原样；{em:'词', it:true} 铜色（可斜体） */
export type Seg = string | {em: string; it?: boolean; color?: string};
export const Rich: React.FC<{parts: Seg[]}> = ({parts}) => <>{parts.map((p, i) => typeof p === 'string'
  ? <span key={i}>{p}</span> : <span key={i} style={{color: p.color ?? G.copper, fontStyle: p.it ? 'italic' : 'normal'}}>{p.em}</span>)}</>;

/** 左上角栏目标签，如"细节 · 局部放大" */
export const Plaque: React.FC<{a: number; b: number; children: React.ReactNode}> = ({a, b, children}) => {
  const f = useCurrentFrame(); const r = reveal(f, a, b);
  return <div style={{position: 'absolute', left: 96, top: 72, ...r, opacity: 0.86 * (r.opacity as number), fontFamily: CJK, fontSize: 32, letterSpacing: '0.32em', color: G.label}}>{children}</div>;
};
/** 右上角进度，如 01 / 03 */
export const IndexMark: React.FC<{a: number; b: number; n: number; total: number}> = ({a, b, n, total}) => {
  const f = useCurrentFrame();
  return <div style={{position: 'absolute', right: 96, top: 72, ...reveal(f, a, b), fontFamily: MONO, fontSize: 32, letterSpacing: '0.12em', color: G.muted}}>
    <span style={{color: G.copper}}>{String(n).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}</div>;
};
/** 作品档案卡：标题 + 外文名 + 作者 + 年代 + 材质/尺寸/收藏地，左侧排版 */
export const ArtworkCard: React.FC<{a: number; b: number; title: string; foreign?: string; author: string; year: string; meta?: string[]; left?: number; top?: number}> =
  ({a, b, title, foreign, author, year, meta = [], left = 120, top = 330}) => {
  const f = useCurrentFrame();
  return (<>
    <div style={{position: 'absolute', left, top, ...reveal(f, a, b), fontFamily: SERIF, fontSize: 104, color: G.white, lineHeight: 1.05}}>
      {title}{foreign && <div style={{fontStyle: 'italic', fontSize: 72, color: G.soft, marginTop: 10}}>{foreign}</div>}</div>
    <div style={{position: 'absolute', left, top: top + 230, ...reveal(f, a, b, 12), fontFamily: CJK, fontSize: 40, color: G.white, letterSpacing: '0.08em'}}>{author}</div>
    <div style={{position: 'absolute', left, top: top + 310, ...reveal(f, a, b, 40), fontFamily: SERIF, fontSize: 80, color: G.copper, fontStyle: 'italic', lineHeight: 1}}>{year}</div>
    <div style={{position: 'absolute', left, top: top + 412, width: 520 * spring(prog(f, a + 45, a + 75)), height: 2, background: G.copper, opacity: 0.7 * (1 - smooth(prog(f, b - 10, b)))}} />
    <div style={{position: 'absolute', left, top: top + 430, ...reveal(f, a, b, 50), fontFamily: MONO, fontSize: 32, color: G.muted, lineHeight: 1.6}}>{meta.map((m, i) => <div key={i}>{m}</div>)}</div>
  </>);
};
/** 细节说明：大标题 + 说明行，左侧排版，配合放大镜使用 */
export const DetailNote: React.FC<{a: number; b: number; title: Seg[]; lines: string[]; left?: number; top?: number}> = ({a, b, title, lines, left = 120, top = 380}) => {
  const f = useCurrentFrame();
  return (<>
    <div style={{position: 'absolute', left, top, ...reveal(f, a, b, 4), fontFamily: SERIF, fontSize: 96, color: G.white, textShadow: SHADOW, lineHeight: 1.1}}><Rich parts={title} /></div>
    <div style={{position: 'absolute', left, top: top + 160, width: 700, ...reveal(f, a, b, 14), fontFamily: CJK, fontSize: 40, color: G.soft, lineHeight: 1.65, textShadow: SHADOW}}>{lines.map((l, i) => <div key={i}>{l}</div>)}</div>
  </>);
};
/** 居中大标题 + 副标题（开场、结语） */
export const CenterTitle: React.FC<{a: number; b: number; title: Seg[]; sub?: Seg[]; top?: number}> = ({a, b, title, sub, top = 752}) => {
  const f = useCurrentFrame();
  return (<>
    <div style={{position: 'absolute', left: 0, right: 0, top, textAlign: 'center', ...reveal(f, a, b), fontFamily: SERIF, fontSize: 92, color: G.white, textShadow: SHADOW, lineHeight: 1}}><Rich parts={title} /></div>
    {sub && <div style={{position: 'absolute', left: 0, right: 0, top: top + 120, textAlign: 'center', ...reveal(f, a, b, 10), fontFamily: CJK, fontSize: 40, color: G.soft, letterSpacing: '0.1em'}}><Rich parts={sub} /></div>}
  </>);
};
/** 双镜对比标注：两镜片间铜色横线、虚线和高差标尺 */
export const CompareMarks: React.FC<{A: {x: number; y: number; r: number}; B: {x: number; y: number; r: number}; a: number; b: number; labels?: [string, string]}> =
  ({A, B, a, b, labels = ['左', '右']}) => {
  const f = useCurrentFrame(); const line = spring(prog(f, a, a + 24)); const out = 1 - smooth(prog(f, b - 12, b));
  const x = (A.x + B.x) / 2;
  return (<>
    {([[A, labels[0], 'right'], [B, labels[1], 'left']] as const).map(([P, lbl, al]) => (<React.Fragment key={lbl}>
      <div style={{position: 'absolute', left: P.x - P.r * 0.86, top: P.y - 1, width: P.r * 1.72 * line, height: 2, background: G.copper, opacity: out, boxShadow: '0 0 6px rgba(217,162,115,.6)'}} />
      <div style={{position: 'absolute', left: al === 'right' ? P.x - P.r - 190 : P.x + P.r + 26, top: P.y - 22, width: 170, textAlign: al === 'right' ? 'right' : 'left', fontFamily: CJK, fontSize: 34, color: G.copper, ...reveal(f, a + 12, b), textShadow: SHADOW}}>{lbl}</div>
    </React.Fragment>))}
    <div style={{position: 'absolute', left: A.x + A.r, top: A.y, width: (B.x - B.r - (A.x + A.r)) * line, borderTop: `2px dashed ${G.copper}`, opacity: 0.55 * out}} />
    <div style={{position: 'absolute', left: A.x + A.r, top: B.y, width: (B.x - B.r - (A.x + A.r)) * line, borderTop: `2px dashed ${G.copper}`, opacity: 0.55 * out}} />
    <div style={{position: 'absolute', left: x - 1, top: Math.min(A.y, B.y), width: 2, height: Math.abs(A.y - B.y) * line, background: G.copper, opacity: 0.8 * out}} />
  </>);
};
