import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {FRAG, MAXL, VERT} from './shader';
// @ts-ignore
import {frameState, TEX, NAMES, centeredSlot, prog, spring, smooth, clamp, lerp, uvToScreen, SEG, HZ_L_UV, HZ_R_UV, wheelTheta} from './timeline.mjs';

// ---------------------------------------------------------------- 字体
const fontCss = `
@font-face{font-family:'Instrument Serif';src:url(${staticFile('InstrumentSerif-Regular.ttf')});font-style:normal;}
@font-face{font-family:'Instrument Serif';src:url(${staticFile('InstrumentSerif-Italic.ttf')});font-style:italic;}
@font-face{font-family:'JB Mono';src:url(${staticFile('JetBrainsMono.ttf')});font-weight:100 800;}
`;
const SERIF = "'Instrument Serif','Noto Serif CJK SC','Noto Serif CJK','serif'";
const CJK = "'Noto Serif CJK SC','Noto Serif CJK','serif'";
const MONO = "'JB Mono','Noto Sans Mono',monospace";
const WHITE = '#F2EDE4';
const MUTED = '#A39A8B';
const COPPER = '#D9A273';

// ---------------------------------------------------------------- WebGL
function useGL(canvas: React.RefObject<HTMLCanvasElement>, onReady: () => void) {
  const st = useRef<any>(null);
  useEffect(() => {
    const gl = canvas.current!.getContext('webgl', {preserveDrawingBuffer: true, antialias: false})!;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const prg = gl.createProgram()!;
    gl.attachShader(prg, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prg, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prg) || 'link');
    gl.useProgram(prg);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prg, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U: any = {};
    const n = gl.getProgramParameter(prg, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prg, i)!;
      const name = info.name.replace('[0]', '');
      U[name] = gl.getUniformLocation(prg, name);
    }
    Promise.all(
      TEX.map(
        (name: string, i: number) =>
          new Promise<void>((res, rej) => {
            const img = new Image();
            img.onload = () => {
              const t = gl.createTexture();
              gl.activeTexture(gl.TEXTURE0 + i);
              gl.bindTexture(gl.TEXTURE_2D, t);
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
              gl.generateMipmap(gl.TEXTURE_2D);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
              gl.uniform1i(U['T' + i], i);
              res();
            };
            img.onerror = rej;
            img.src = staticFile(name + '.jpg');
          })
      )
    )
      .then(() => document.fonts.ready)
      .then(() => {
        st.current = {gl, U};
        onReady();
      })
      .catch((e) => {
        console.error(e);
        throw e;
      });
  }, []);
  return st;
}

function draw(g: any, f: number) {
  const {gl, U} = g;
  const S = frameState(f);
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  gl.viewport(0, 0, W, H);
  gl.uniform2f(U.uRes, W, H);
  gl.uniform1f(U.uTime, f);
  const setV = (vName: string, aName: string, v: any) => {
    gl.uniform4f(U[vName], v.c[0], v.c[1], v.h, v.t);
    gl.uniform2f(U[aName], v.a[0], v.a[1]);
  };
  setV('uBgV', 'uBgA', S.bg);
  setV('uBg2V', 'uBg2A', S.bg2 || S.bg);
  gl.uniform1f(U.uMix, S.bg2 ? S.mix : 0);
  gl.uniform1f(U.uBlur, S.blur);
  gl.uniform1f(U.uDim, S.dim);
  gl.uniform1f(U.uFade, S.fade);
  const L = new Float32Array(MAXL * 4), LV = new Float32Array(MAXL * 4), LA = new Float32Array(MAXL * 4), LS = new Float32Array(MAXL * 4);
  const lenses = S.lenses.slice(-MAXL);
  lenses.forEach((l: any, i: number) => {
    L.set([l.x, l.y, l.r, l.alpha], i * 4);
    LV.set([l.view.c[0], l.view.c[1], l.view.h, l.view.t], i * 4);
    LA.set([l.view.a[0], l.view.a[1], l.active, l.blur], i * 4);
    LS.set([l.stretch[0], l.stretch[1], l.dim ?? 1, 0], i * 4);
  });
  gl.uniform1i(U.uN, lenses.length);
  gl.uniform4fv(U.uL, L);
  gl.uniform4fv(U.uLV, LV);
  gl.uniform4fv(U.uLA, LA);
  gl.uniform4fv(U.uLS, LS);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.finish();
  return S;
}

// ---------------------------------------------------------------- 文字
type Seg = string | {em: string; it?: boolean};
const Rich: React.FC<{parts: Seg[]}> = ({parts}) => (
  <>
    {parts.map((p, i) =>
      typeof p === 'string' ? (
        <span key={i}>{p}</span>
      ) : (
        <span key={i} style={{color: COPPER, fontStyle: p.it ? 'italic' : 'normal'}}>{p.em}</span>
      )
    )}
  </>
);

// 入场：上浮 + 去模糊 + 字距收拢；退场：淡出
const reveal = (f: number, a: number, b: number, d = 0) => {
  const t = clamp((f - a - d) / 20);
  const e = spring(t);
  const out = 1 - smooth(clamp((f - b + 10) / 10));
  return {
    opacity: clamp(t * 2.2) * out,
    transform: `translateY(${(1 - e) * 26}px)`,
    filter: `blur(${(1 - clamp(t * 1.6)) * 8}px)`,
  } as React.CSSProperties;
};

const Plaque: React.FC<{f: number; a: number; b: number; children: React.ReactNode}> = ({f, a, b, children}) => (
  <div style={{position: 'absolute', left: 96, top: 72, ...reveal(f, a, b), fontFamily: CJK, fontSize: 32, letterSpacing: '0.32em', color: '#C9BBA2', opacity: 0.86 * (reveal(f, a, b).opacity as number), textShadow: '0 0 1px rgba(0,0,0,.6)'}}>
    {children}
  </div>
);
const Index: React.FC<{f: number; a: number; b: number; n: string}> = ({f, a, b, n}) => (
  <div style={{position: 'absolute', right: 96, top: 72, ...reveal(f, a, b), fontFamily: MONO, fontSize: 32, letterSpacing: '0.12em', color: MUTED}}>
    <span style={{color: COPPER}}>{n}</span> / 03
  </div>
);
const shadow = '0 2px 24px rgba(0,0,0,.55), 0 0 2px rgba(0,0,0,.5)';

const TextLayer: React.FC<{f: number}> = ({f}) => {
  const els: React.ReactNode[] = [];

  // ① 选择
  if (f < 190) {
    els.push(<Plaque key="p1" f={f} a={10} b={186}>列奥纳多·达·芬奇 · 作品</Plaque>);
    // 旋转中：经过中心的作品名闪现
    if (f < 128) {
      const c = centeredSlot(f);
      const op = clamp(1 - c.dist * 3.2) * smooth(prog(f, 14, 30));
      els.push(
        <div key="flash" style={{position: 'absolute', left: 0, right: 0, top: 772, textAlign: 'center', fontFamily: CJK, fontSize: 40, letterSpacing: '0.2em', color: WHITE, opacity: op * 0.85, textShadow: shadow}}>
          {NAMES[c.tex]}
        </div>
      );
    } else {
      els.push(
        <div key="t1" style={{position: 'absolute', left: 0, right: 0, top: 752, textAlign: 'center', ...reveal(f, 132, 186), fontFamily: SERIF, fontSize: 92, color: WHITE, textShadow: shadow, lineHeight: 1}}>
          蒙娜丽莎 <span style={{fontStyle: 'italic'}}>Mona Lisa</span>
        </div>,
        <div key="m1" style={{position: 'absolute', left: 0, right: 0, top: 872, textAlign: 'center', ...reveal(f, 140, 186), fontFamily: MONO, fontSize: 32, letterSpacing: '0.14em', color: MUTED}}>
          约 1503 — 1519
        </div>
      );
    }
  }

  // ② 讲解
  if (f >= 236 && f < 392) {
    const L = 120;
    els.push(
      <Plaque key="p2" f={f} a={236} b={392}>讲解 · 作品档案</Plaque>,
      <div key="t2" style={{position: 'absolute', left: L, top: 330, ...reveal(f, 240, 392), fontFamily: SERIF, fontSize: 104, color: WHITE, lineHeight: 1.05}}>
        蒙娜丽莎
        <div style={{fontStyle: 'italic', fontSize: 72, color: '#E7DCCB', marginTop: 10}}>La Gioconda</div>
      </div>,
      <div key="a2" style={{position: 'absolute', left: L, top: 560, ...reveal(f, 252, 392), fontFamily: CJK, fontSize: 40, color: WHITE, letterSpacing: '0.08em'}}>
        列奥纳多·达·芬奇
      </div>,
      <div key="y2" style={{position: 'absolute', left: L, top: 640, ...reveal(f, 315, 392), fontFamily: SERIF, fontSize: 80, color: WHITE, lineHeight: 1}}>
        <span style={{fontFamily: CJK, fontSize: 40, verticalAlign: '18%', marginRight: 14}}>约</span>
        <span style={{fontStyle: 'italic', color: COPPER}}>1503—1519</span>
      </div>,
      <div key="m2" style={{position: 'absolute', left: L, top: 760, ...reveal(f, 325, 392), fontFamily: MONO, fontSize: 32, color: MUTED, letterSpacing: '0.04em', lineHeight: 1.6}}>
        杨木板油画 · 77 × 53 cm
        <br />
        巴黎卢浮宫
      </div>,
      <div key="ln2" style={{position: 'absolute', left: L, top: 742, width: 520 * spring(prog(f, 320, 350)), height: 2, background: COPPER, opacity: 0.7 * (1 - smooth(prog(f, 382, 392)))}} />
    );
  }

  // ③ 细节 1 / 2
  const detail = (key: string, a: number, b: number, n: string, title: Seg[], lines: string[]) => {
    els.push(
      <Plaque key={'p' + key} f={f} a={a} b={b}>细节 · 局部放大</Plaque>,
      <Index key={'i' + key} f={f} a={a} b={b} n={n} />,
      <div key={'t' + key} style={{position: 'absolute', left: 120, top: 380, ...reveal(f, a + 4, b), fontFamily: SERIF, fontSize: 96, color: WHITE, textShadow: shadow, lineHeight: 1.1}}>
        <Rich parts={title} />
      </div>,
      <div key={'b' + key} style={{position: 'absolute', left: 120, top: 540, width: 700, ...reveal(f, a + 14, b), fontFamily: CJK, fontSize: 40, color: '#E7DCCB', lineHeight: 1.65, textShadow: shadow}}>
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    );
  };
  if (f >= 440 && f < 527) detail('d1', 440, 527, '01', [{em: 'Sfumato', it: true}, ' 晕涂法'], ['轮廓化入烟雾般的阴影，', '嘴角若有似无']);
  if (f >= 562 && f < 662) detail('d2', 562, 662, '02', ['没有', {em: '眉毛'}], ['眉毛与睫毛几乎不可见']);

  // ③ 细节 3：双镜对比 + 铜线
  if (f >= 700 && f < 790) {
    const S = frameState(f);
    els.push(<Plaque key="p5" f={f} a={704} b={790}>细节 · 双镜对比</Plaque>, <Index key="i5" f={f} a={704} b={790} n="03" />);
    const lens = S.lenses.filter((l: any) => l.r > 20 && l.r < 200);
    const line = spring(prog(f, 728, 752));
    const out = 1 - smooth(prog(f, 778, 790));
    if (lens.length >= 2) {
      const [A, B] = lens.slice(-2);
      // 两条地平线：横贯镜片的铜线，延伸成虚线
      for (const [P, lbl, al] of [[A, '左 · 低', 'right'], [B, '右 · 高', 'left']] as any) {
        els.push(
          <div key={'hz' + lbl} style={{position: 'absolute', left: P.x - P.r * 0.86, top: P.y - 1, width: P.r * 1.72 * line, height: 2, background: COPPER, opacity: out, boxShadow: '0 0 6px rgba(217,162,115,.6)'}} />,
          <div key={'lb' + lbl} style={{position: 'absolute', left: al === 'right' ? P.x - P.r - 190 : P.x + P.r + 26, top: P.y - 22, width: 170, textAlign: al === 'right' ? 'right' : 'left', fontFamily: CJK, fontSize: 34, color: COPPER, ...reveal(f, 740, 790), textShadow: shadow}}>
            {lbl}
          </div>
        );
      }
      // 高差标尺
      const x = (A.x + B.x) / 2;
      els.push(
        <div key="dash" style={{position: 'absolute', left: A.x + A.r, top: A.y, width: (B.x - B.r - (A.x + A.r)) * line, height: 0, borderTop: `2px dashed ${COPPER}`, opacity: 0.55 * out}} />,
        <div key="dash2" style={{position: 'absolute', left: A.x + A.r, top: B.y, width: (B.x - B.r - (A.x + A.r)) * line, height: 0, borderTop: `2px dashed ${COPPER}`, opacity: 0.55 * out}} />,
        <div key="gap" style={{position: 'absolute', left: x - 1, top: B.y, width: 2, height: (A.y - B.y) * line, background: COPPER, opacity: 0.8 * out}} />
      );
    }
    els.push(
      <div key="t5" style={{position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center', ...reveal(f, 735, 790), fontFamily: SERIF, fontSize: 88, color: WHITE, textShadow: shadow, lineHeight: 1}}>
        <span style={{color: COPPER}}>地平线</span>左低右高
      </div>,
      <div key="m5" style={{position: 'absolute', left: 0, right: 0, top: 916, textAlign: 'center', ...reveal(f, 745, 790), fontFamily: CJK, fontSize: 36, color: '#E7DCCB', letterSpacing: '0.06em', textShadow: shadow}}>
        人物身后的风景并不对称
      </div>
    );
  }

  // ④ 结语
  if (f >= 884) {
    els.push(
      <Plaque key="p6" f={f} a={884} b={2000}>列奥纳多·达·芬奇 · 卢浮宫</Plaque>,
      <div key="t6" style={{position: 'absolute', left: 0, right: 0, top: 752, textAlign: 'center', ...reveal(f, 888, 2000), fontFamily: SERIF, fontSize: 92, color: WHITE, textShadow: shadow, lineHeight: 1}}>
        蒙娜丽莎 <span style={{fontStyle: 'italic'}}>Mona Lisa</span>
      </div>,
      <div key="m6" style={{position: 'absolute', left: 0, right: 0, top: 872, textAlign: 'center', ...reveal(f, 898, 2000), fontFamily: CJK, fontSize: 40, color: '#E7DCCB', letterSpacing: '0.1em'}}>
        一抹<span style={{color: COPPER}}>微笑</span>，被凝视了五百多年
      </div>
    );
  }
  // 结语前半：轮盘旋转时的作品名闪现
  if (f >= 828 && f < 884) {
    const c = centeredSlot(f);
    els.push(
      <div key="flash2" style={{position: 'absolute', left: 0, right: 0, top: 772, textAlign: 'center', fontFamily: CJK, fontSize: 40, letterSpacing: '0.2em', color: WHITE, opacity: clamp(1 - c.dist * 3.2) * 0.85, textShadow: shadow}}>
        {NAMES[c.tex]}
      </div>
    );
  }
  const fade = 1 - smooth(prog(f, 948, 960)) * 0.85;
  return <AbsoluteFill style={{opacity: fade}}>{els}</AbsoluteFill>;
};

// ---------------------------------------------------------------- 合成
export const MonaLisa: React.FC = () => {
  const f = useCurrentFrame();
  const cv = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender('webgl textures'));
  const [loaded, setLoaded] = useState(false);
  const g = useGL(cv, () => setLoaded(true));
  useLayoutEffect(() => {
    if (!loaded || !g.current) return;
    draw(g.current, f);
    continueRender(handle);
  }, [f, loaded]);
  return (
    <AbsoluteFill style={{background: '#0E0E03'}}>
      <style>{fontCss}</style>
      <canvas ref={cv} width={1920} height={1080} style={{position: 'absolute', width: 1920, height: 1080}} />
      <TextLayer f={f} />
      <Audio src={staticFile('audio.wav')} />
    </AbsoluteFill>
  );
};
