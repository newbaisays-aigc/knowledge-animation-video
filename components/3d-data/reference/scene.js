// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
// SpaceX Q3 财报 · 10 秒 3D 数据快讯
// 每个镜头是独立 Scene + Camera，转场时分别渲染到两张 RT，再用遮罩 shader 合成（圆形扩散 / 斜向光刃）。
// 所有动画都是时间 T 的纯函数，可任意分段渲染。
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

export const TOTAL = 10;
export const STARTS = [0, 2.6, 5.2, 7.7];   // 镜头切换完成时刻
const TR = 0.5;                              // 转场时长（下一镜头提前 TR 开始）
const MODES = [0, 1, 2, 1];                  // 进入第 k 镜头的遮罩：1 圆形扩散 2 斜向光刃

const C = { cy: 0x3fd2ff, bl: 0x2f7bff, vi: 0x8a6bff, wh: 0xffffff, mint: 0x3dffc8, red: 0xff4d5e, grey: 0x8fa6c2 };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = t => 1 - Math.pow(1 - clamp(t), 3);
const eInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = t => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const prog = (t, a, d) => clamp((t - a) / d);
function rand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export function buildWorld({ gl, font, W = 1920, H = 1080 }) {
  gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; gl.setPixelRatio(1);
  const pmrem = new THREE.PMREMGenerator(gl);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // ---------- 通用贴图 ----------
  const radial = (stops) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, s]) => g.addColorStop(o, s)); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); };
  const dotTex = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
  const glowTex = radial([[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);

  // ---------- 3D 文字 ----------
  const geoCache = new Map();
  function textGeo(str, size, depth) {
    const k = str + '|' + size + '|' + depth; if (geoCache.has(k)) return geoCache.get(k);
    const g = new TextGeometry(str, { font, size, depth, curveSegments: 5, bevelEnabled: depth > 0.08, bevelThickness: depth * 0.12, bevelSize: size * 0.018, bevelSegments: 2 });
    g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -size * 0.36, -depth / 2);   // 统一按基线对齐，避免逐字居中导致大小写错位 g.computeBoundingBox();
    geoCache.set(k, g); return g;
  }
  const faceMat = (color, emi) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emi, metalness: 0.3, roughness: 0.25, transparent: true });
  const sideMat = color => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0x061428), 0.75), metalness: 0.95, roughness: 0.2, transparent: true });
  function Text3D(str, size, color, depth = size * 0.3, emi = 0.14) {
    const m = new THREE.Mesh(textGeo(str, size, depth), [faceMat(color, emi), sideMat(color)]);
    m.userData = { size, depth, str };
    m.set = s => { if (s !== m.userData.str) { m.geometry = textGeo(s, size, depth); m.userData.str = s; } };
    m.op = o => { m.material.forEach(x => x.opacity = o); m.visible = o > 0.003; };
    m.width = () => { const b = m.geometry.boundingBox; return b.max.x - b.min.x; };
    return m;
  }
  function setOp(obj, o) { obj.traverse(n => { if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { if (m.userData.base === undefined) m.userData.base = m.opacity; m.transparent = true; m.opacity = m.userData.base * o; }); }); obj.visible = o > 0.003; }
  // 逐字 3D 文字；accent: [起始下标, 结束下标, 颜色]
  function Letters(str, size, color, depth = size * 0.3, accent = null) {
    const g = new THREE.Group(); const chars = [...str]; let x = 0; const items = [];
    const adv = ch => (font.data.glyphs[ch]?.ha ?? 500) / font.data.resolution * size;
    const gap = size * 0.03, total = chars.reduce((s, c) => s + adv(c), 0) + (chars.length - 1) * gap;
    chars.forEach((ch, i) => { const w = adv(ch); if (ch.trim()) { const col = accent && i >= accent[0] && i < accent[1] ? accent[2] : color; const m = Text3D(ch, size, col, depth, col === color ? 0.14 : 0.55); m.position.x = -total / 2 + x + w / 2; g.add(m); items.push(m); } x += w + gap; });
    g.userData.items = items; g.userData.width = total; return g;
  }
  function animLetters(g, t, stagger = 0.04, dur = 0.5) {
    g.userData.items.forEach((m, i) => { const p = prog(t, i * stagger, dur), e = eBack(p); m.op(eOut(p * 1.6)); m.position.y = (1 - e) * -m.userData.size * 1.1; m.rotation.x = (1 - e) * 1.5; m.position.z = (1 - e) * 5; });
  }
  function Chip(str, color, size, txtColor = C.wh) {
    const g = new THREE.Group(); const t = Text3D(str, size, txtColor, 0.02, 0.8); t.position.z = 0.06;
    const w = t.width() + size * 1.4, h = size * 1.9;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    g.add(bg, edge, t); g.userData.w = w; return g;
  }
  // 发光轨迹管（drawRange 逐步揭示）
  function Path(points, color, radius = 0.12, seg = 200, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points, closed); const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius, 8, closed), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2) }));
    const shell = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius * 3, 8, closed), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(shell, core); g.userData.curve = curve;
    g.reveal = (a, b = null) => { const s = b === null ? 0 : Math.floor(clamp(a) * seg); const e = Math.floor(clamp(b === null ? a : b) * seg); [core, shell].forEach(m => m.geometry.setDrawRange(s * 48, Math.max(0, e - s) * 48)); };
    return g;
  }
  function Points(n, gen, size, color, op, seed = 1) {
    const r = rand(seed), pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = gen(r, i); pos.set([v[0], v[1], v[2]], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  }
  function Glow(color, scale, op = 0.5) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(scale); return s; }
  function Floor(color, y, op = 1) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { c: { value: new THREE.Color(color) }, op: { value: op } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform vec3 c; uniform float op; varying vec3 vW;
        float grid(vec2 p,float s){ vec2 q=p/s; vec2 g=abs(fract(q-.5)-.5)/fwidth(q); return 1.-min(min(g.x,g.y),1.); }
        void main(){ vec2 p=vW.xz; float l=grid(p,4.)*.35+grid(p,20.)*.9; float d=length(p-cameraPosition.xz); float f=exp(-d*.014);
          gl_FragColor=vec4(c*1.6, l*f*op); }`,
    }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; return m;
  }
  // 全息线框体：半透明填充 + 结构线 + 外轮廓线（参考图里的线框货车/货轮质感）
  function Holo(geo, color, fillOp = 0.1, wireOp = 0.22, edgeAngle = 25) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: fillOp, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    g.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color, transparent: true, opacity: wireOp, blending: THREE.AdditiveBlending, depthWrite: false })));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, edgeAngle), new THREE.LineBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5).multiplyScalar(1.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
    return g;
  }

  // ---------- 镜头基础 ----------
  const SHOTS = [];
  function makeShot(build) {
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x01040b); scene.environment = envTex; scene.environmentIntensity = 0.55;
    scene.fog = new THREE.FogExp2(0x01040b, 0.0045);
    scene.add(new THREE.AmbientLight(0x2a3d66, 0.6));
    const key = new THREE.DirectionalLight(0xbfe2ff, 2.2); key.position.set(-30, 40, 50); scene.add(key);
    const rim = new THREE.DirectionalLight(0x3f7bff, 1.6); rim.position.set(40, 10, -30); scene.add(rim);
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 3000); scene.add(camera);
    // 远景星尘 + 近景浮尘（视差层）
    scene.add(Points(1400, r => [(r() - .5) * 900, (r() - .5) * 500, -250 - r() * 500], 2.2, 0x9ccfff, 0.55, SHOTS.length * 7 + 3));
    const near = Points(260, r => [(r() - .5) * 120, (r() - .5) * 70, 75 - r() * 60], 0.9, 0x9fe3ff, 0.55, SHOTS.length * 7 + 5); scene.add(near);
    addHUD(camera);
    const s = { scene, camera, ...build(scene, camera) }; SHOTS.push(s); return s;
  }
  // HUD：贴在摄像机上的新闻角标，内容在其后运动，自然形成前后景视差
  function addHUD(cam) {
    const h = new THREE.Group(); h.position.z = -20; cam.add(h);
    const hv = 20 * Math.tan(THREE.MathUtils.degToRad(20)), hw = hv * W / H;
    const chip = Chip('10.21 今日热点', C.bl, 0.36); chip.position.set(-hw + 0.9 + chip.userData.w / 2, hv - 0.95, 0); h.add(chip);
    const t = Text3D('SpaceX Q3 财报速览', 0.42, C.wh, 0.02, 0.6); t.position.set(-hw + 1.3 + chip.userData.w + t.width() / 2, hv - 0.95, 0); h.add(t);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 1.8, 0.015), new THREE.MeshBasicMaterial({ color: C.cy, transparent: true, opacity: 0.35 })); line.position.set(0, hv - 1.75, 0); h.add(line);
    const src = Text3D('数据来源：SpaceX 2026年Q3初步财报（未经审计）', 0.26, C.grey, 0.01, 0.4); src.position.set(hw - 0.9 - src.width() / 2, -hv + 0.7, 0); h.add(src);
    h.traverse(n => { if (n.material) [].concat(n.material).forEach(m => { m.depthTest = false; m.fog = false; }); n.renderOrder = 999; });
    h.userData = { hv, hw }; cam.userData.hud = h;
  }
  const project = (cam, v) => { const p = v.clone().project(cam); return [p.x * 0.5 + 0.5, p.y * 0.5 + 0.5]; };

  // ================= S0 开场提问：暗夜地球 + 全息火箭 =================
  makeShot((scene, camera) => {
    const G = new THREE.Vector3(10, -1.5, -6), R = 10.5;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.ShaderMaterial({
      uniforms: { uL: { value: new THREE.Vector3(-0.6, 0.5, 0.6).normalize() }, rot: { value: 0 } },
      vertexShader: `uniform float rot; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){ float c=cos(rot), s=sin(rot); vP = vec3(c*position.x+s*position.z, position.y, -s*position.x+c*position.z);
          vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform vec3 uL; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
        float fbm(vec3 p){ float v=0., a=.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
        void main(){
          vec3 n=normalize(vP); float h=fbm(n*2.1+vec3(3.1,1.7,.4));
          float land=smoothstep(.505,.52,h); float rel=fbm(n*16.);
          vec3 col=mix(vec3(.003,.008,.02), mix(vec3(.02,.03,.045),vec3(.09,.11,.14),rel*rel*1.4), land);
          float coast=exp(-abs(h-.512)*230.); col+=vec3(.2,.55,1.6)*coast*1.2;
          float lat=asin(n.y), lon=atan(n.z,n.x);
          float g=max(smoothstep(.992,1.,abs(cos(lat*9.))), smoothstep(.992,1.,abs(cos(lon*9.))));
          col+=vec3(.1,.3,.8)*g*.1;
          float d=dot(normalize(vN),uL); col*=clamp(d*.9+.35,.12,1.2);
          float fr=pow(1.-max(dot(normalize(vN),vV),0.),3.); col+=vec3(.15,.45,1.4)*fr*1.3;
          gl_FragColor=vec4(col,1.); }`,
    }));
    globe.position.copy(G); scene.add(globe);
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 64, 48), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float i=pow(clamp(.72+dot(vN,vV),0.,1.),4.); gl_FragColor=vec4(vec3(.2,.55,1.5)*i*1.6, i); }`,
    }));
    atm.position.copy(G); scene.add(atm);
    const halo = Glow(0x2f7bff, 60, 0.35); halo.position.copy(G).add(new THREE.Vector3(0, 0, -8)); scene.add(halo);

    // 星链卫星壳层
    const shells = [];
    [[13.5, 0.4, 0.2], [15.2, -0.3, 0.9], [17, 0.15, 1.8]].forEach(([r, tx, tz], k) => {
      const grp = new THREE.Group(); grp.position.copy(G); grp.rotation.set(tx, 0, tz); scene.add(grp);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 200), new THREE.MeshBasicMaterial({ color: C.cy, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.x = Math.PI / 2; grp.add(ring);
      const sats = Points(140, (rr, i) => { const a = i / 140 * Math.PI * 2 + rr() * 0.02; return [Math.cos(a) * r, (rr() - .5) * 0.3, Math.sin(a) * r]; }, 0.35, 0xbff0ff, 0.95, 40 + k); grp.add(sats);
      shells.push([grp, ring, sats, k]);
    });

    // 全息火箭
    const prof = [[0, -3.8], [0.45, -3.8], [0.45, -3.5], [0.42, 1.9], [0.42, 2.5], [0.33, 3.1], [0.16, 3.6], [0, 3.8]].map(([x, y]) => new THREE.Vector2(x, y));
    const rocket = new THREE.Group();
    rocket.add(Holo(new THREE.LatheGeometry(prof, 14), C.cy, 0.12, 0.3, 20));
    for (let k = 0; k < 4; k++) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.9, -0.5); s.lineTo(0.9, -1.1); s.lineTo(0, -0.9); const fg = new THREE.ShapeGeometry(s); fg.translate(0.42, -2.6, 0); const f = Holo(fg, C.cy, 0.15, 0.3); f.rotation.y = k * Math.PI / 2; rocket.add(f); }
    const flame = Glow(0x9fdcff, 3.2, 0.9); flame.position.y = -4.4; rocket.add(flame);
    const flame2 = Glow(0x3f8bff, 6, 0.5); flame2.position.y = -5.2; rocket.add(flame2);
    rocket.scale.setScalar(0.85); scene.add(rocket);
    const orbit = new THREE.Group(); orbit.position.copy(G); orbit.rotation.set(0.28, 0, 0.42); scene.add(orbit);
    const RO = 14.5, a0 = -0.2, a1 = 2.3;
    const arcPts = []; for (let i = 0; i <= 60; i++) { const a = lerp(a0, a1, i / 60); arcPts.push(new THREE.Vector3(Math.cos(a) * RO, 0, Math.sin(a) * RO)); }
    const trail = Path(arcPts, C.cy, 0.07, 240); orbit.add(trail);

    // 文字
    const tag = Chip('NEWS · 美股盘前', C.bl, 0.75); tag.position.set(-14, 10.8, 2); scene.add(tag);
    const l1 = Letters('SpaceX', 6.4, C.wh, 2.0); l1.position.set(-13, 5.2, 2); scene.add(l1);
    const l2 = Letters('凭什么一夜涨超10%？', 2.45, C.wh, 0.8, [7, 10, C.cy]); l2.position.set(-13, -1.6, 2); scene.add(l2);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.cy).multiplyScalar(2) })); bar.position.set(-13, -4.6, 2); scene.add(bar);

    const tmp = new THREE.Vector3();
    return {
      update: t => {
        const D = 2.6;
        camera.position.set(lerp(-4, 3, eInOut(t / D)), lerp(5, 2, t / D), lerp(78, 46, eOut(t / 2.3)));
        camera.lookAt(-2, 1, -2); camera.rotateZ(lerp(-0.05, 0, eOut(t / D)));
        globe.material.uniforms.rot.value = t * 0.12;
        shells.forEach(([grp, ring, sats, k]) => { grp.rotation.y = t * (0.25 + k * 0.08) * (k % 2 ? -1 : 1); setOp(ring, eOut(prog(t, 0.2 + k * 0.15, 0.6))); sats.material.opacity = 0.95 * eOut(prog(t, 0.3 + k * 0.15, 0.6)); });
        const pr = eInOut(prog(t, 0.0, 2.4)), a = lerp(a0, a1, pr);
        tmp.set(Math.cos(a) * RO, 0, Math.sin(a) * RO); rocket.position.copy(orbit.localToWorld(tmp.clone()));
        const tan = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).applyEuler(orbit.rotation).normalize();
        rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
        trail.reveal(Math.max(0, pr - 0.45), pr);
        setOp(tag, eOut(prog(t, 0, 0.35))); tag.position.x = lerp(-22, -14, eOut(prog(t, 0, 0.5)));
        animLetters(l1, t - 0.1, 0.06, 0.55); animLetters(l2, t - 0.55, 0.045, 0.5);
        const bp = eOut(prog(t, 1.2, 0.6)); bar.scale.x = Math.max(0.01, bp * 22); bar.position.x = -13 - 11 + bp * 11;
      },
      center: () => project(camera, G),
    };
  });

  // ================= S1 AI 业务收入 +830%：3D 文字环绕 + 全息柱 =================
  makeShot((scene, camera) => {
    scene.add(Floor(C.bl, -9));
    const glow = Glow(0x2f6bff, 70, 0.35); glow.position.set(0, 2, -25); scene.add(glow);
    const NC = new THREE.Vector3(-6, 3, 0);
    const title = Letters('AI 业务收入 · 同比', 2.4, C.wh, 0.7, [0, 2, C.cy]); title.position.set(-6, 13.2, 0); scene.add(title);
    const num = Text3D('+0%', 8.5, C.cy, 2.6, 0.45); num.position.copy(NC); scene.add(num);
    const sub = Chip('Q3 收入 75.6 亿美元', C.bl, 0.95); sub.position.set(-6, -4.6, 2); scene.add(sub);
    const tag2 = Chip('首次超过星链 · 第一大收入', 0x6a4bff, 0.75); tag2.position.set(20, 11.5, 2); scene.add(tag2);
    // 文字环
    const ringG = new THREE.Group(); ringG.position.copy(NC); ringG.rotation.set(0.32, 0, -0.12); scene.add(ringG);
    { const str = 'SUPER INTELLIGENCE · AI REVENUE +830% · '; const Rr = 17, size = 1.05; const adv = ch => (font.data.glyphs[ch]?.ha ?? 500) / font.data.resolution * size;
      const one = [...str].reduce((s, c) => s + adv(c) + size * 0.06, 0); const reps = Math.max(1, Math.floor(Math.PI * 2 * Rr / one)); const k = Math.PI * 2 * Rr / (one * reps);
      let a = 0; for (let r = 0; r < reps; r++) for (const ch of str) { const w = (adv(ch) + size * 0.06) * k; if (ch.trim()) { const m = Text3D(ch, size, C.cy, 0.12, 0.6); const ang = (a + w / 2) / Rr; m.position.set(Math.sin(ang) * Rr, 0, Math.cos(ang) * Rr); m.rotation.y = ang; ringG.add(m); } a += w; } }
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(19.5, 0.03, 6, 240), new THREE.MeshBasicMaterial({ color: C.cy, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })); ring2.rotation.x = Math.PI / 2; ringG.add(ring2);
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(14.8, 0.02, 6, 240), new THREE.MeshBasicMaterial({ color: C.vi, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); ring3.rotation.x = Math.PI / 2; ringG.add(ring3);
    // 全息柱：去年同期 vs 今年（高度比 = 9.3 倍，对应 +830%）
    const bars = [];
    [[13, 1.6, '2025 Q3', C.bl], [20, 1.6 * 9.3, '2026 Q3', C.cy]].forEach(([x, h, lab, col]) => {
      const g = new THREE.Group(); g.position.set(x, -9, 2); scene.add(g);
      const geo = new THREE.BoxGeometry(4.2, 1, 4.2, 1, 6, 1).translate(0, 0.5, 0);
      const holo = Holo(geo, col, 0.16, 0.25, 30); g.add(holo);
      const cap = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.5), transparent: true, opacity: 0.9 })); cap.rotation.x = -Math.PI / 2; g.add(cap);
      const l = Text3D(lab, 1.1, C.wh, 0.2, 0.5); l.position.set(0, -1.6, 2.5); g.add(l);
      bars.push({ g, holo, cap, h, l });
    });
    const x93 = Text3D('×9.3', 1.8, C.mint, 0.5, 0.8); scene.add(x93);
    return {
      update: t => {
        const D = 3.1, a = lerp(-0.62, 0.22, eInOut(t / D)), Rd = lerp(60, 50, eOut(t / D));
        camera.position.set(4 + Math.sin(a) * Rd, lerp(9, 3.5, eInOut(t / D)), Math.cos(a) * Rd); camera.lookAt(3, 1.5, 0);
        animLetters(title, t - 0.15, 0.05, 0.5);
        const cp = eOut(prog(t, 0.25, 1.5)); num.set('+' + Math.round(830 * cp) + '%');
        num.op(eOut(prog(t, 0.15, 0.3))); num.scale.setScalar(Math.max(0.01, lerp(0.6, 1, eBack(prog(t, 0.15, 0.6)))));
        num.rotation.y = lerp(-0.5, 0, eOut(prog(t, 0.15, 1.2))) + Math.sin(t * 1.2) * 0.04;
        ringG.rotation.y = -t * 0.55; setOp(ringG, eOut(prog(t, 0.1, 0.7))); ringG.scale.setScalar(lerp(1.5, 1, eOut(prog(t, 0, 1.0))));
        setOp(sub, eOut(prog(t, 1.0, 0.3))); sub.scale.setScalar(lerp(1.5, 1, eBack(prog(t, 1.0, 0.4))));
        setOp(tag2, eOut(prog(t, 1.6, 0.3))); tag2.position.x = lerp(30, 20, eOut(prog(t, 1.6, 0.45)));
        bars.forEach((b, i) => { const p = eOut(prog(t, 0.3 + i * 0.35, 1.2)); const hh = Math.max(0.02, b.h * p); b.holo.scale.y = hh; b.cap.position.y = hh + 0.01; setOp(b.holo, eOut(prog(t, 0.2 + i * 0.3, 0.3))); b.l.op(eOut(prog(t, 0.3 + i * 0.3, 0.3))); });
        x93.position.set(20, -9 + 1.6 * 9.3 * eOut(prog(t, 0.65, 1.2)) + 2.2, 2); x93.op(eOut(prog(t, 1.5, 0.3)));
      },
      center: () => project(camera, NC),
    };
  });

  // ================= S2 首次盈利：粒子汇聚成 44 =================
  makeShot((scene, camera) => {
    scene.add(Floor(C.bl, -11, 0.7));
    const glow = Glow(0x1fd8b0, 55, 0.22); glow.position.set(-3, 1, -20); scene.add(glow);
    const NC = new THREE.Vector3(-4, 1.5, 0);
    const head = Letters('首次实现季度盈利', 3.1, C.wh, 1.0, [0, 2, C.mint]); head.position.set(0, 13.2, 0); scene.add(head);
    const num = Text3D('44', 13, C.mint, 3.6, 0.4); num.position.copy(NC); scene.add(num);
    const unit = Text3D('亿美元', 3.0, C.wh, 0.9); unit.position.set(NC.x + num.width() / 2 + 6.2, NC.y - 3.6, 0); scene.add(unit);
    const lab = Letters('Q3 净利润', 2.0, C.grey, 0.5); lab.position.set(NC.x, NC.y - 10, 0); scene.add(lab);
    const loss = Chip('去年同期：净亏损', 0x7a1d2a, 0.8, 0xffd0d5); loss.position.set(15, 7.8, 2); scene.add(loss);
    const strike = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), new THREE.MeshBasicMaterial({ color: 0xff8090 })); strike.position.set(15, 7.8, 2.2); scene.add(strike);
    const win = Chip('扭亏为盈', 0x0f8a6e, 1.0); win.position.set(15, 4.4, 3); scene.add(win);
    // 粒子
    const N = 6000, tgt = new Float32Array(N * 3), src = new Float32Array(N * 3), dl = new Float32Array(N);
    { const sm = new MeshSurfaceSampler(new THREE.Mesh(textGeo('44', 13, 3.6))).build(); const v = new THREE.Vector3(), r = rand(77);
      for (let i = 0; i < N; i++) { sm.sample(v); tgt.set([v.x + NC.x, v.y + NC.y, v.z + NC.z], i * 3);
        const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), rr = 35 + r() * 55; src.set([Math.sin(ph) * Math.cos(th) * rr, Math.cos(ph) * rr * 0.6, Math.sin(ph) * Math.sin(th) * rr - 25], i * 3); dl[i] = r(); } }
    const pg = new THREE.BufferGeometry(); const pos = new Float32Array(N * 3); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const parts = new THREE.Points(pg, new THREE.PointsMaterial({ map: dotTex, size: 0.42, color: 0x9ffff0, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(parts);
    return {
      update: t => {
        const D = 3.0;
        camera.position.set(lerp(9, -2, eInOut(t / D)), lerp(4, 2, t / D), lerp(88, 47, eOut(t / 2.4))); camera.lookAt(1, 1.5, 0); camera.rotateZ(lerp(0.07, 0, eOut(t / D)));
        for (let i = 0; i < N; i++) {
          const p = eInOut(prog(t, 0.05 + dl[i] * 0.6, 0.95)), sw = (1 - p) * 2.2, c = Math.cos(sw), s = Math.sin(sw);
          const sx = src[i * 3], sz = src[i * 3 + 2], rx = c * sx - s * sz, rz = s * sx + c * sz;
          const j = p > 0.99 ? Math.sin(t * 9 + i) * 0.04 : 0;
          pos[i * 3] = lerp(rx, tgt[i * 3], p) + j; pos[i * 3 + 1] = lerp(src[i * 3 + 1], tgt[i * 3 + 1], p); pos[i * 3 + 2] = lerp(rz, tgt[i * 3 + 2], p) + j;
        }
        pg.attributes.position.needsUpdate = true;
        parts.material.opacity = lerp(1, 0.35, eOut(prog(t, 1.4, 0.6))) * eOut(prog(t, 0, 0.3));
        num.op(eOut(prog(t, 1.3, 0.5))); num.scale.setScalar(lerp(1.08, 1, eOut(prog(t, 1.3, 0.6))));
        unit.op(eOut(prog(t, 1.5, 0.3))); unit.position.z = lerp(8, 0, eOut(prog(t, 1.5, 0.4)));
        animLetters(head, t - 0.1, 0.05, 0.5); animLetters(lab, t - 1.6, 0.05, 0.4);
        setOp(loss, eOut(prog(t, 0.35, 0.3)) * lerp(1, 0.45, eOut(prog(t, 1.7, 0.3))));
        const sp = eOut(prog(t, 1.6, 0.3)); strike.scale.x = Math.max(0.01, sp * loss.userData.w); strike.visible = sp > 0.01;
        setOp(win, eOut(prog(t, 1.85, 0.25))); win.scale.setScalar(lerp(1.8, 1, eBack(prog(t, 1.85, 0.4))));
      },
      center: () => project(camera, NC),
    };
  });

  // ================= S3 收入结构 3D 环形图 + 总结 =================
  makeShot((scene, camera) => {
    scene.add(Floor(C.bl, -0.05, 0.8));
    const glow = Glow(0x2f6bff, 60, 0.3); glow.position.set(0, -2, -10); scene.add(glow);
    const ring = new THREE.Group(); scene.add(ring);
    const segs = [['超级智能 AI', '52%', 0.52, 5.2, C.cy], ['星链', '36%', 0.36, 3.4, C.bl], ['发射', '12%', 0.12, 1.9, C.vi]];
    let a = Math.PI / 2; const R0 = 8, R1 = 13, gap = 0.035;
    const items = segs.map(([name, pct, f, h, col], i) => {
      const a0 = a + gap, a1 = a + f * Math.PI * 2 - gap; a += f * Math.PI * 2;
      const s = new THREE.Shape(); s.moveTo(Math.cos(a0) * R1, Math.sin(a0) * R1); s.absarc(0, 0, R1, a0, a1, false); s.lineTo(Math.cos(a1) * R0, Math.sin(a1) * R0); s.absarc(0, 0, R0, a1, a0, true);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 64 }); geo.rotateX(-Math.PI / 2);
      const g = new THREE.Group(); ring.add(g);
      g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(0.4), emissive: col, emissiveIntensity: 0.12, metalness: 0.1, roughness: 0.55, envMapIntensity: 0.15, transparent: true, opacity: 0.92 })));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.6).multiplyScalar(1.8), transparent: true })));
      const lg = new THREE.Group(); scene.add(lg);
      const n1 = Text3D(pct, i ? 2.2 : 3.0, i ? C.wh : C.cy, 0.6, i ? 0.4 : 0.9); n1.position.y = 1.4; lg.add(n1);
      const n2 = Text3D(name, 1.05, C.grey, 0.15, 0.5); n2.position.y = -0.9; lg.add(n2);
      return { g, h, lg, mid: (a0 + a1) / 2 };
    });
    const cen = new THREE.Group(); scene.add(cen);
    const tot = Text3D('145.8', 3.6, C.wh, 1.0, 0.5); tot.position.y = 1.2; cen.add(tot);
    const tl = Text3D('亿美元 · Q3总营收', 0.95, C.grey, 0.12, 0.5); tl.position.y = -1.4; cen.add(tl);
    const yoy = Chip('同比 +161%', C.bl, 0.7); yoy.position.y = -3.3; cen.add(yoy);
    // 总结字幕（HUD 层）
    const hud = camera.userData.hud;
    const fin = Letters('AI，已成SpaceX第一大收入来源', 1.15, C.wh, 0.1, [0, 2, C.cy]); fin.position.set(0, -hud.userData.hv + 2.3, 0); hud.add(fin);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.cy).multiplyScalar(2), transparent: true })); fl.position.set(0, -hud.userData.hv + 1.3, 0); hud.add(fl);
    fin.traverse(n => { if (n.material) [].concat(n.material).forEach(m => { m.depthTest = false; m.fog = false; }); n.renderOrder = 1000; }); fl.material.depthTest = false; fl.renderOrder = 1000;
    const v = new THREE.Vector3();
    return {
      update: t => {
        const D = 2.8;
        camera.position.set(lerp(-6, 13, eInOut(t / D)), lerp(46, 21, eInOut(t / D)), lerp(14, 36, eInOut(t / D))); camera.lookAt(0, 1, 0);
        ring.rotation.y = lerp(0.9, 0, eOut(t / 1.6)) + t * 0.05;
        items.forEach((it, i) => {
          const p = eBack(prog(t, 0.15 + i * 0.18, 0.6)); it.g.scale.set(Math.max(0.01, eOut(prog(t, 0.05 + i * 0.18, 0.4))), Math.max(0.01, it.h * clamp(p, 0.01, 1.2)), Math.max(0.01, eOut(prog(t, 0.05 + i * 0.18, 0.4))));
          v.set(Math.cos(it.mid) * 16.5, it.h + 2.6, -Math.sin(it.mid) * 16.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), ring.rotation.y);
          it.lg.position.copy(v); it.lg.quaternion.copy(camera.quaternion); setOp(it.lg, eOut(prog(t, 0.55 + i * 0.15, 0.3)));
        });
        cen.position.set(0, 4.5, 0); cen.quaternion.copy(camera.quaternion); setOp(cen, eOut(prog(t, 0.3, 0.4))); cen.scale.setScalar(lerp(0.6, 1, eBack(prog(t, 0.3, 0.5))));
        animLetters(fin, t - 1.15, 0.035, 0.45);
        const fp = eOut(prog(t, 1.1, 0.7)); fl.scale.x = Math.max(0.01, fp * 20); fl.material.opacity = fp;
      },
      center: () => [0.5, 0.5],
    };
  });

  // ---------- 合成：遮罩转场 + 暗角 + 颗粒 → Bloom → 色调映射 ----------
  const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const rtB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const mix = new ShaderPass({
    uniforms: { tA: { value: rtA.texture }, tB: { value: rtB.texture }, p: { value: 0 }, mode: { value: 0 }, aspect: { value: W / H }, ctr: { value: new THREE.Vector2(0.5, 0.5) }, zA: { value: 1 }, zB: { value: 1 }, fade: { value: 1 }, seed: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tA,tB; uniform float p,mode,aspect,zA,zB,fade,seed; uniform vec2 ctr; varying vec2 vUv;
      float h(vec2 q){ return fract(sin(dot(q,vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec3 a=texture2D(tA, ctr+(vUv-ctr)/zA).rgb, b=texture2D(tB, ctr+(vUv-ctr)/zB).rgb;
        float m=0., e=0.;
        if(mode>0.5 && mode<1.5){ float d=length((vUv-ctr)*vec2(aspect,1.)); float r=p*p*2.3; m=smoothstep(r+.004,r-.004,d); e=exp(-abs(d-r)*55.)*step(.001,p)*(1.-p*p); }
        else if(mode>1.5){ float d=(vUv.x*aspect+(vUv.y-.5)*.7)/aspect; float r=p*1.5-.25; m=smoothstep(r+.004,r-.004,d); e=exp(-abs(d-r)*80.)*step(.001,p)*(1.-p*p); }
        vec3 col=mix(a,b,m)+vec3(.35,.8,1.7)*e*2.5;
        float v=smoothstep(1.3,.3,length((vUv-.5)*vec2(aspect*.72,1.)));
        col*=mix(.45,1.,v);
        col+=(h(vUv*1000.+seed)-.5)*.018;
        gl_FragColor=vec4(col*fade,1.); }`,
  }, 'none');
  mix.uniforms.tA.value = rtA.texture; mix.uniforms.tB.value = rtB.texture;   // ShaderPass 会克隆 uniforms，需重新绑定 RT 纹理
  const composer = new EffectComposer(gl); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(mix);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.45, 0.86));
  composer.addPass(new OutputPass());

  const localT = (i, T) => T - (i ? STARTS[i] - TR : 0);
  const draw = (i, T, rt) => { const s = SHOTS[i]; s.update(localT(i, T)); const c = s.camera; c.position.x += Math.sin(T * 1.7) * 0.12; c.position.y += Math.sin(T * 1.3 + 1) * 0.1; c.updateMatrixWorld(); gl.setRenderTarget(rt); gl.clear(); gl.render(s.scene, c); return s; };
  const U = mix.uniforms;

  return function render(T) {
    let k = -1; for (let i = 1; i < SHOTS.length; i++) if (T >= STARTS[i] - TR && T < STARTS[i]) k = i;
    if (k > 0) {
      const p = eInOut((T - (STARTS[k] - TR)) / TR);
      const a = draw(k - 1, T, rtA); const c = a.center(); draw(k, T, rtB);
      U.p.value = p; U.mode.value = MODES[k]; U.ctr.value.set(c[0], c[1]); U.zA.value = 1 + 0.6 * p * p; U.zB.value = 1 + 0.18 * (1 - p);
    } else {
      let i = 0; while (i < SHOTS.length - 1 && T >= STARTS[i + 1]) i++;
      draw(i, T, rtA); U.p.value = 0; U.mode.value = 0; U.zA.value = 1; U.zB.value = 1;
    }
    U.fade.value = eOut(prog(T, 0, 0.25)) * (1 - prog(T, TOTAL - 0.35, 0.35));
    U.seed.value = Math.round(T * 30) % 97;
    gl.setRenderTarget(null);
    composer.render();
  };
}
