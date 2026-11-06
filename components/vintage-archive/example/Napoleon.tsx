// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
/**
 * 示例：《拿破仑》20 秒复古档案风知识动画（16:9）
 * 演示组件库的全部元件。新项目照这个结构写：每幕一个组件 + ArchiveFrame 串起来。
 * 时间单位：幕内用帧（30fps），sec() 把秒换成帧；幕的起点由 ArchiveFrame 根据 end 自动计算。
 */
import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {C, CJK, DISPLAY, TYPE, Paper, PhotoCard, Ribbon, Stamp, Typed, InkCircle, lerp,
  Drop, BookOpen, BrassPlaque, FullPainting, ArchiveFrame, sec, Cue} from '../index';
import data from './cues.json';

// 幕 1：照片 + 尺子 + 打字标签 + 外号卡片 + 印章 + 丝带标题（幕起点 0s，帧号即全局帧号）
const S1: React.FC = () => {
  const f = useCurrentFrame();
  return (<>
    <Drop at={0} from={[-700, 300]} rot={-25} endRot={-4} style={{left: 240, top: 110}}>
      <PhotoCard src="study_aged.jpg" w={420} h={620} pos="50% 32%" zoom={1.05} caption="Napoléon · 1812" />
    </Drop>
    <Drop at={8} from={[0, -900]} rot={6} endRot={1} style={{left: 780, top: 130}}>
      <div style={{width: 70, height: 760, background: 'linear-gradient(90deg,#c9a46a,#e4c78f 40%,#b38a4e)', boxShadow: '0 18px 30px rgba(0,0,0,.55)', position: 'relative', borderRadius: 4}}>
        {Array.from({length: 38}).map((_, i) => <div key={i} style={{position: 'absolute', left: 0, top: 10 + i * 19.5, width: i % 5 === 0 ? 34 : 18, height: 2, background: '#3b2612'}} />)}
        <div style={{position: 'absolute', left: 6, top: 70, width: 60, height: 6, background: C.red}} />
      </div>
    </Drop>
    <Drop at={16} from={[900, 0]} rot={12} endRot={3} style={{left: 900, top: 170}}>
      <Paper seed="h" style={{width: 360, height: 130}}><div style={{fontFamily: TYPE, fontSize: 64, color: C.ink}}><Typed text="1.69 m" at={24} cps={14} /></div></Paper>
    </Drop>
    <Drop at={34} from={[900, 300]} rot={-10} endRot={-2} style={{left: 960, top: 390}}>
      <Paper seed="nick" style={{width: 640, height: 230}}>
        <div style={{fontFamily: CJK, fontSize: 30, color: '#5a4630', letterSpacing: 4}}>两百年来的外号</div>
        <div style={{fontFamily: CJK, fontWeight: 900, fontSize: 96, color: C.ink, letterSpacing: 10, marginTop: 4}}>“小个子”</div>
      </Paper>
    </Drop>
    <Stamp text="误 会" at={sec(2.3)} style={{left: 1300, top: 540}} size={80} />
    {f >= sec(3.25) && <AbsoluteFill style={{background: `rgba(10,5,0,${lerp(f, sec(3.25), sec(3.6), 0, .35)})`}} />}
    <Ribbon text="NAPOLÉON" at={sec(3.25)} w={1180} size={120} style={{left: 370, top: 360}} />
    {f >= sec(3.55) && <Paper seed="name" style={{left: 710, top: 580, width: 500, height: 110, opacity: lerp(f, sec(3.55), sec(3.7), 0, 1),
      transform: `rotate(-2deg) translateY(${(1 - lerp(f, sec(3.55), sec(3.8), 0, 1)) * -60}px)`}}>
      <div style={{fontFamily: CJK, fontWeight: 900, fontSize: 52, color: C.red, letterSpacing: 10, whiteSpace: 'nowrap'}}>拿破仑 · 波拿巴</div></Paper>}
  </>);
};

// 带红圈的年龄标签（复用两次）
const AgeTag: React.FC<{at: number; n: number; text: string; x: number; y: number; rot: number; seed: string}> = ({at, n, text, x, y, rot, seed}) => {
  const f = useCurrentFrame(); if (f < at) return null;
  return (<>
    <Paper seed={seed} style={{left: x, top: y, width: 400, height: 150, transform: `rotate(${rot}deg) scale(${lerp(f, at, at + 8, .6, 1)})`, opacity: lerp(f, at, at + 6, 0, 1)}}>
      <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 76, color: C.red, lineHeight: 1}}>{n}<span style={{fontFamily: CJK, fontSize: 38}}>岁</span>
        <span style={{fontFamily: CJK, fontSize: 44, color: C.ink, marginLeft: 16}}>{text}</span></div>
    </Paper>
    <InkCircle w={440} h={200} start={at + 6} style={{left: x - 20, top: y - 25}} seed={seed} />
  </>);
};

// 幕 2（幕内帧号从 0 开始；a/b 是相对本幕起点的帧）
const S2: React.FC = () => {
  const t0 = sec(4.6), a = sec(6.6) - t0, b = sec(8.25) - t0;
  return (<>
    <Drop at={0} from={[-800, 0]} rot={-8} endRot={-5} style={{left: 110, top: 150}}>
      <Paper seed="cor" style={{width: 470, height: 620}}>
        <div style={{fontFamily: TYPE, fontSize: 30, color: '#5a4630', letterSpacing: 3}}>AJACCIO · CORSE</div>
        <div style={{fontFamily: CJK, fontWeight: 900, fontSize: 52, color: C.ink, marginTop: 30}}>科西嘉 · 1769</div>
        <div style={{fontFamily: CJK, fontSize: 30, color: '#5a4630', marginTop: 6}}>没落小贵族之家</div>
      </Paper>
    </Drop>
    <Drop at={a} from={[200, 1000]} rot={14} endRot={4} style={{left: 640, top: 60}}><PhotoCard src="alps_aged.jpg" w={460} h={560} pos="50% 35%" caption="Bonaparte · Alpes" /></Drop>
    <AgeTag at={a + 8} n={24} text="当上将军" x={1150} y={110} rot={-4} seed="g" />
    <Drop at={b} from={[1200, 200]} rot={-12} endRot={2} style={{left: 900, top: 330}}><PhotoCard src="coron_aged.jpg" w={640} h={400} pos="62% 45%" caption="Le Sacre · 1804" /></Drop>
    <AgeTag at={b + 10} n={35} text="加冕称帝" x={1400} y={640} rot={5} seed="k" />
  </>);
};

const S3: React.FC = () => {
  const f = useCurrentFrame();
  return (<>
    <FullPainting src="austerlitz_aged.jpg" pos="55% 40%" />
    <Drop at={6} from={[0, -700]} rot={0} endRot={0} style={{left: 1240, top: 90}}><Paper seed="aus" style={{width: 520, height: 110}}><div style={{fontFamily: TYPE, fontSize: 36, color: C.ink}}>AUSTERLITZ · 1805</div></Paper></Drop>
    <BrassPlaque at={12} value={60} suffix="+" unit={'场\n战役'} x={560} y={520} />
    {f >= 50 && <Paper seed="win" style={{left: 1280, top: 760, width: 420, height: 110, transform: `rotate(-4deg) translateY(${(1 - lerp(f, 50, 62, 0, 1)) * 300}px)`}}>
      <div style={{fontFamily: CJK, fontWeight: 900, fontSize: 48, color: C.red}}>大多数都赢了</div></Paper>}
  </>);
};

const S4: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <BookOpen leftImage="code_aged.jpg" coverTitle={'CODE\nCIVIL'} coverSub="MDCCCIV">
      <div style={{fontFamily: TYPE, fontSize: 30, color: '#5a4630', opacity: lerp(f, 32, 38, 0, 1)}}>— AN XII · 1804 —</div>
      <div style={{fontFamily: CJK, fontWeight: 900, fontSize: 66, color: C.ink, whiteSpace: 'nowrap', opacity: lerp(f, 36, 44, 0, 1)}}>《拿破仑法典》</div>
      <div style={{width: 360, height: 3, background: C.ink, opacity: .6, transform: `scaleX(${lerp(f, 40, 52, 0, 1)})`}} />
      <div style={{position: 'relative', marginTop: 40}}>
        <div style={{fontFamily: CJK, fontWeight: 900, fontSize: 64, color: C.red, opacity: lerp(f, 50, 56, 0, 1)}}>影响至今</div>
        {f >= 52 && <InkCircle w={330} h={130} start={52} style={{left: -24, top: -18}} seed="z" />}
      </div>
    </BookOpen>
  );
};

const S5: React.FC = () => {
  const f = useCurrentFrame();
  return (<>
    <FullPainting src="waterloo_aged.jpg" zoomFrom={1.25} zoomPerFrame={-0.002} panX={0} fadeToGray />
    <Drop at={8} from={[0, 700]} rot={-6} endRot={-3} style={{left: 640, top: 360}}>
      <Paper seed="wat" style={{width: 640, height: 300}} tint="rgba(120,110,100,.25)">
        <div style={{fontFamily: TYPE, fontSize: 34, color: '#4a3a2a', letterSpacing: 4}}>WATERLOO</div>
        <div style={{fontFamily: CJK, fontWeight: 900, fontSize: 92, color: C.ink, letterSpacing: 10}}>滑铁卢</div>
      </Paper>
    </Drop>
    {f >= 22 && <><Paper seed="1815" style={{left: 1180, top: 600, width: 340, height: 150, transform: `rotate(-6deg) scale(${lerp(f, 22, 30, .6, 1)})`, opacity: lerp(f, 22, 27, 0, 1)}}>
      <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 100, color: C.red, lineHeight: 1}}>1815</div></Paper>
      <InkCircle w={400} h={200} start={28} style={{left: 1150, top: 575}} seed="w" sw={8} /></>}
  </>);
};

const S6: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame(); const close = lerp(f, dur - 26, dur, 0, 1, Easing.in(Easing.quad));
  return (<>
    <Drop at={0} from={[-300, 900]} rot={10} endRot={-2} style={{left: 330, top: 120}}>
      <PhotoCard src="longwood_aged.jpg" w={900} h={560} pos="50% 70%" zoom={1.25} gray={0.3} caption="Longwood House · Sainte-Hélène" />
    </Drop>
    <Drop at={14} from={[800, 0]} rot={-10} endRot={4} style={{left: 1180, top: 560}}>
      <Paper seed="sh" style={{width: 520, height: 210}}>
        <div style={{fontFamily: CJK, fontWeight: 900, fontSize: 64, color: C.ink, letterSpacing: 4}}>圣赫勒拿岛</div>
        <div style={{fontFamily: TYPE, fontSize: 34, color: '#5a4630', marginTop: 4}}>1821 · 南大西洋</div>
      </Paper>
    </Drop>
    {/* 结尾暗角收拢 */}
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, rgba(0,0,0,0) ${Math.max(0, 70 - close * 75)}%, rgba(5,2,0,1) ${Math.max(8, 95 - close * 80)}%)`}} />
  </>);
};

export const Napoleon: React.FC = () => {
  const lastDur = Math.ceil(data.total * 30) - sec(18.8);
  return <ArchiveFrame total={data.total} cues={data.cues as Cue[]} scenes={[
    {el: <S1 />, end: 4.6}, {el: <S2 />, end: 10.2}, {el: <S3 />, end: 13.5, fullBleed: true},
    {el: <S4 />, end: 16.6}, {el: <S5 />, end: 18.8, fullBleed: true}, {el: <S6 dur={lastDur} />, end: data.total},
  ]} />;
};
