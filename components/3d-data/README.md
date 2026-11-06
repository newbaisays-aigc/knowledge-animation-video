# 3D 数据组件参考（3d-data）

来源：SpaceX Q3 财报 10 秒 3D 数据快讯（已实际渲染出片）。
这里先作为**参考实现**收录，还没有拆成独立组件。做 3D 数据模板时，先读 `reference/scene.js`，直接复用里面的工具函数，不要从零写。

## reference/scene.js 里可以直接拿来用的部分

| 函数 / 段落 | 作用 |
|---|---|
| `Text3D(str, size, color)` | 中文 3D 立体字（金属侧面 + 自发光正面），支持 `set()` 换字、`op()` 调透明度 |
| `Letters()` + `animLetters()` | 逐字 3D 文字，每个字依次翻转弹入；`accent` 参数可以给部分字换颜色 |
| `Chip()` | 3D 标签牌（角标、关键词） |
| `Path()` + `reveal()` | 发光轨迹管，按进度逐段亮起（路线、折线图） |
| `Points()` / `Glow()` | 粒子层、发光光晕 |
| `Floor()` | 无限延伸的发光网格地面（shader） |
| `Holo()` | 全息线框体：半透明填充 + 线框 + 轮廓 |
| `makeShot()` | 每个镜头独立的场景、灯光和相机，自带远景星尘和近景浮尘两层视差 |
| `addHUD()` | 贴在相机上的新闻角标和数据来源 |
| 合成段（`mix` ShaderPass） | 两个镜头之间的遮罩转场（圆形扩散 / 斜向光刃）+ 暗角 + 颗粒 + Bloom 辉光 |
| `render(T)` | 所有动画都是时间 T 的纯函数，可以分段并行渲染 |

## 其他文件

- `index.jsx`：用 `@remotion/three` 的 `ThreeCanvas` 接入 Remotion，加载字体后调用 `buildWorld`
- `mkfont.py`：把稿子里用到的中文字形从 Noto Sans CJK 导出成 three.js 字体 JSON。用法是 `python mkfont.py chars.txt public/font.json`，chars.txt 里放所有要显示的文字
- `audio_synth.py`：程序合成科技感 BGM 和音效。只在没有素材库时使用，有素材库就用 `common/scripts/mix_audio.py`
- `package.json`：依赖版本（three 0.180、@remotion/three 4.0.537）

## 已知要点

- 渲染需要 WebGL：Remotion 的 chromiumOptions 设 `gl: 'swangle'`
- 3D 场景渲染慢：用 `frameRange` 分段并行渲染，最后再拼接
- 文字只能显示 `chars.txt` 里有的字，改稿后要重新跑 `mkfont.py`

---

*Copyright (c) 2026 小白姐姐 · MIT License · https://github.com/newbaisays-aigc/knowledge-animation-video*
