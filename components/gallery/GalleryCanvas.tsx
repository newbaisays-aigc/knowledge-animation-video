// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
/**
 * 美术馆组件库 · WebGL 画布
 * <GalleryCanvas arts={作品数组} state={(f) => FrameState} />
 * 每帧调用 state(f) 得到背景视图和镜片列表，交给液态玻璃着色器一次画完。
 * 渲染时需要 WebGL：命令行加 --gl=swangle（或 angle）。
 */
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FRAG, MAXL, MAXT, VERT} from './glass';
import type {Artwork, FrameState} from './view';

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

export const GalleryCanvas: React.FC<{arts: Artwork[]; state: (f: number) => FrameState; ring?: string; ink?: string}> =
  ({arts, state, ring = '#D9A273', ink = '#0E0E03'}) => {
  if (arts.length > MAXT) throw new Error(`最多 ${MAXT} 张画作`);
  const f = useCurrentFrame(); const {width, height} = useVideoConfig();
  const cv = useRef<HTMLCanvasElement>(null); const g = useRef<any>(null);
  const [handle] = useState(() => delayRender('gallery textures'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const gl = cv.current!.getContext('webgl', {preserveDrawingBuffer: true, antialias: false})!;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
    const prg = gl.createProgram()!; gl.attachShader(prg, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prg, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prg); if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prg) || 'link'); gl.useProgram(prg);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prg, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U: any = {}; const n = gl.getProgramParameter(prg, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(prg, i)!.name.replace('[0]', ''); U[nm] = gl.getUniformLocation(prg, nm); }
    const asp = new Float32Array(MAXT).fill(1); arts.forEach((a, i) => (asp[i] = a.aspect));
    gl.uniform1fv(U.uAsp, asp); gl.uniform3fv(U.uRing, hex(ring)); gl.uniform3fv(U.uInk, hex(ink));
    for (let i = arts.length; i < MAXT; i++) gl.uniform1i(U['T' + i], 0);
    Promise.all(arts.map((a, i) => new Promise<void>((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
        // WebGL1 只能给 2 的幂尺寸生成 mipmap，否则纹理不完整、整幅画渲染成黑色。这里统一缩放到 2 的幂（宽高比由 uAsp 负责）
        const pot = (n: number) => Math.min(4096, Math.pow(2, Math.round(Math.log2(n))));
        const c = document.createElement('canvas'); c.width = pot(img.width); c.height = pot(img.height);
        const cx = c.getContext('2d')!; cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, c.width, c.height);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(U['T' + i], i); res();
      };
      img.onerror = rej; img.src = staticFile(a.src);
    }))).then(() => document.fonts.ready).then(() => { g.current = {gl, U}; setReady(true); });
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    const {gl, U} = g.current; const S = state(f);
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; gl.viewport(0, 0, W, H);
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uTime, f);
    const setV = (vn: string, an: string, v: any) => { gl.uniform4f(U[vn], v.c[0], v.c[1], v.h, v.t); gl.uniform2f(U[an], v.a[0], v.a[1]); };
    setV('uBgV', 'uBgA', S.bg); setV('uBg2V', 'uBg2A', S.bg2 || S.bg);
    gl.uniform1f(U.uMix, S.bg2 ? S.mix ?? 0 : 0); gl.uniform1f(U.uBlur, S.blur ?? 0); gl.uniform1f(U.uDim, S.dim ?? 1); gl.uniform1f(U.uFade, S.fade ?? 1);
    const L = new Float32Array(MAXL * 4), LV = new Float32Array(MAXL * 4), LA = new Float32Array(MAXL * 4), LS = new Float32Array(MAXL * 4);
    const ls = S.lenses.filter(Boolean).slice(-MAXL);
    ls.forEach((l, i) => {
      L.set([l.x, l.y, l.r, l.alpha], i * 4); LV.set([l.view.c[0], l.view.c[1], l.view.h, l.view.t], i * 4);
      LA.set([l.view.a[0], l.view.a[1], l.active ?? 1, l.blur ?? 0], i * 4); LS.set([l.stretch?.[0] ?? 0, l.stretch?.[1] ?? 0, l.dim ?? 1, 0], i * 4);
    });
    gl.uniform1i(U.uN, ls.length); gl.uniform4fv(U.uL, L); gl.uniform4fv(U.uLV, LV); gl.uniform4fv(U.uLA, LA); gl.uniform4fv(U.uLS, LS);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.finish(); continueRender(handle);
  }, [f, ready]);
  return <AbsoluteFill><canvas ref={cv} width={width} height={height} style={{position: 'absolute', width, height}} /></AbsoluteFill>;
};
