/**
 * 美术馆组件库 · 液态玻璃着色器（WebGL1，兼容 swangle 软件渲染）
 * 一次全屏绘制：背景画作（可模糊/压暗/两张交叉）+ 最多 MAXL 个玻璃镜片
 * 镜片 = 球冠折射 + RGB 色散 + 厚玻璃环（折射外部世界并透出金属色）+ 菲涅尔高光 + 投影 + 液态拉伸
 * 最多 5 张画作纹理（T0..T4），每张的宽高比由 uAsp 传入。
 */
export const MAXL = 8;
export const MAXT = 5;

export const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAG = `
precision highp float;
uniform sampler2D T0; uniform sampler2D T1; uniform sampler2D T2; uniform sampler2D T3; uniform sampler2D T4;
uniform vec2 uRes;
uniform float uTime;
uniform vec4 uBgV;  uniform vec2 uBgA;
uniform vec4 uBg2V; uniform vec2 uBg2A;
uniform float uMix, uBlur, uDim, uFade;
uniform int uN;
uniform vec4 uL[${MAXL}];   // x, y, r, alpha
uniform vec4 uLV[${MAXL}];  // view c.x, c.y, h, tex
uniform vec4 uLA[${MAXL}];  // anchor x, y, active, blur
uniform vec4 uLS[${MAXL}];  // stretch x, y, dim, -
uniform float uAsp[${MAXT}]; // 每张画的 宽/高
uniform vec3 uRing;          // 镜框金属色（默认铜色 #D9A273）
uniform vec3 uInk;           // 画外底色（默认 #0E0E03）

float aspectOf(float t){
  if (t < 0.5) return uAsp[0];
  if (t < 1.5) return uAsp[1];
  if (t < 2.5) return uAsp[2];
  if (t < 3.5) return uAsp[3];
  return uAsp[4];
}
vec3 tex(float t, vec2 uv, float b){
  if (t < 0.5) return texture2D(T0, uv, b).rgb;
  if (t < 1.5) return texture2D(T1, uv, b).rgb;
  if (t < 2.5) return texture2D(T2, uv, b).rgb;
  if (t < 3.5) return texture2D(T3, uv, b).rgb;
  return texture2D(T4, uv, b).rgb;
}
// 视图 V=(c.x,c.y,h,tex)  A=锚点  p=屏幕像素
vec3 painting(vec4 V, vec2 A, vec2 p, float b){
  float asp = aspectOf(V.w);
  vec2 uv = V.xy + (p - A) / vec2(V.z * asp, V.z);
  vec2 px = 1.5 / vec2(V.z * asp, V.z);
  vec2 m2 = smoothstep(vec2(0.0), px, uv) * smoothstep(vec2(0.0), px, 1.0 - uv);
  float m = m2.x * m2.y;
  vec3 c = tex(V.w, clamp(uv, 0.0, 1.0), b);
  // 油画暗部更沉，像博物馆打光
  c = pow(c, vec3(1.08)) * 1.02;
  return mix(uInk, c, m);
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (1920.0 / uRes.x);
  vec2 uvS = p / vec2(1920.0, 1080.0);

  // ---------- 背景层
  vec3 col = painting(uBgV, uBgA, p, uBlur);
  if (uMix > 0.001) col = mix(col, painting(uBg2V, uBg2A, p, uBlur), uMix);
  col *= uDim;
  float vig = smoothstep(1.25, 0.35, length((uvS - 0.5) * vec2(1.25, 1.0)));
  col *= mix(0.55, 1.0, vig);

  // ---------- 镜片
  for (int i = 0; i < ${MAXL}; i++){
    if (i >= uN) break;
    vec4 L = uL[i]; vec4 LV = uLV[i]; vec4 LA = uLA[i]; vec4 LS = uLS[i];
    float r = L.z;
    if (r < 1.0 || L.w < 0.003) continue;
    vec2 q = p - L.xy;
    if (abs(q.x) > r * 1.7 || abs(q.y) > r * 1.7) continue;

    // 液态拉伸（沿速度方向拉长、垂直方向收窄）
    float k = length(LS.xy);
    vec2 qs = q;
    if (k > 0.001){
      vec2 dir = LS.xy / k;
      float al = dot(q, dir);
      vec2 pe = q - al * dir;
      qs = dir * (al / (1.0 + k)) + pe * (1.0 + k * 0.6);
    }
    float d = length(qs) / r;
    float active = LA.z;

    // 投影
    if (d > 1.0){
      float sh = exp(-pow((d - 1.0) * 6.0, 1.6));
      col *= 1.0 - 0.5 * sh * L.w;
      continue;
    }

    vec2 n = qs / r;
    vec2 nd = normalize(n + 1e-5);

    // 镜片内部：球冠折射 + RGB 色散
    float edge = pow(d, 3.2);
    vec2 off = nd * edge * r * mix(0.05, 0.10, active);
    float b = LA.w;
    vec3 inner;
    inner.r = painting(LV, LA.xy, p + off * 1.00, b).r;
    inner.g = painting(LV, LA.xy, p + off * 1.05, b).g;
    inner.b = painting(LV, LA.xy, p + off * 1.11, b).b;
    inner *= LS.z;

    // 厚玻璃环：折射外部世界 + 暖铜透光
    float ringW = mix(0.045, 0.15, active);
    float rs = 1.0 - ringW;
    float rf = smoothstep(rs - 0.006, rs + 0.006, d);
    vec3 ringCol = inner;
    if (rf > 0.0){
      float rt = clamp((d - rs) / ringW, 0.0, 1.0);
      float bend = sin(rt * 3.14159);
      vec2 ro = -nd * r * (0.30 + 0.25 * bend);
      vec3 w;
      w.r = painting(uBgV, uBgA, p + ro * 1.00, 1.5).r;
      w.g = painting(uBgV, uBgA, p + ro * 1.06, 1.5).g;
      w.b = painting(uBgV, uBgA, p + ro * 1.13, 1.5).b;
      float lum = dot(w, vec3(0.3, 0.55, 0.15));
      vec3 copper = mix(w * 0.9, uRing * (0.35 + lum * 1.4), 0.62) * (0.75 + 0.45 * bend);
      vec3 dark = mix(w * 0.25, vec3(0.03, 0.03, 0.02), 0.5) + vec3(0.08) * bend;
      ringCol = mix(dark, copper, active);
    }
    vec3 lc = mix(inner, ringCol, rf);

    // 内沿暗线 + 菲涅尔高光
    lc *= 1.0 - 0.55 * exp(-pow((d - rs) * r / 2.2, 2.0));
    float hlA = pow(clamp(dot(nd, normalize(vec2(-0.55, -0.83))), 0.0, 1.0), 5.0);
    float hlB = pow(clamp(dot(nd, normalize(vec2(0.7, 0.7))), 0.0, 1.0), 8.0);
    float rim = smoothstep(rs + 0.2 * ringW, 0.985, d) * smoothstep(1.0, 0.975, d);
    lc += vec3(1.0, 0.95, 0.88) * (hlA * 0.75 + hlB * 0.25) * rim * mix(0.35, 1.0, active);
    lc += vec3(1.0, 0.9, 0.8) * 0.12 * exp(-pow((d - 0.995) * r / 1.2, 2.0));

    float m = L.w * (1.0 - smoothstep(1.0 - 1.4 / r, 1.0, d));
    col = mix(col, lc, m);
  }

  // ---------- 胶片颗粒 + 淡入淡出
  float g = hash(p + fract(uTime * 0.618) * 913.0) - 0.5;
  col += g * 0.035;
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;
