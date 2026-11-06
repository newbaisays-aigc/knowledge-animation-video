# 美术馆组件库（gallery）

配合 `templates/gallery.md` 使用。来源：《蒙娜丽莎》32 秒知识动画（已出片），这里拆成了可复用组件。
核心是一个**液态玻璃着色器**：一次全屏绘制，同时画背景画作和最多 8 个玻璃镜片。镜片带球冠折射、RGB 色散、金属厚边、高光和投影，移动快时还会像水滴一样拉伸。

## 快速开始

1. 把 `glass.ts`、`view.ts`、`GalleryCanvas.tsx`、`type.tsx`、`index.ts` 复制到 `src/lib/`
2. 素材放进 `public/`：
   - **画作**：最多 5 张，用 `vintage-archive/scripts/fetch_commons.py` 下载公版高清图，例如 `example/artworks.txt`
   - **字体**：Instrument Serif（Regular、Italic）和 JetBrains Mono，在 Google Fonts 下载，文件名见 `type.tsx`
3. 量坐标：用 `common/scripts/uv_grid.py` 给每张画叠网格，读出脸、嘴、眼、细节点的 uv
4. 写 `state(f)`：每帧返回背景视图和镜片列表（照 `example/MonaLisa.tsx`）
5. 写文字层：用 `ArtworkCard`、`DetailNote`、`CenterTitle`、`Plaque`、`IndexMark`、`CompareMarks`
6. 渲染：**必须加 `--gl=swangle`**（或 angle）开启 WebGL，例如 `npx remotion render ... --gl=swangle`

## 组件清单

### 镜头与视图（view.ts，纯函数）

| 函数 | 用途 |
|---|---|
| `makeViews(arts)` | 返回下面这组工具 |
| `full(t, h, a)` | 整幅画居中 |
| `focus(t, uv, h, a)` | 把画上 uv 点对准屏幕锚点 a，h 越大越近（推镜头） |
| `mixView(P, Q, t)` | 两个视图之间平滑过渡，缩放走对数，推拉更自然 |
| `magnifier(bg, uv, r, m, appear)` | 在背景视图上，对 uv 点放一个放大 m 倍的镜片，appear 用 `spring()` |
| `magView` / `uvToScreen` / `reanchor` / `portrait` | 底层工具：放大视图、uv 转屏幕坐标、换锚点、肖像取景 |
| `makeWheel(arts, {order})` | **作品轮盘**：圆形镜片排在大圆弧上旋转选择；`lenses(theta)`、`background(theta)`、`centered(theta)` |
| `tickFrames(theta, a, b)` | 轮盘每过一格的帧号，用来配"滴答"声 |
| `spring` `inOut` `outBack` `smooth` `prog` | 缓动函数 |

### 画布（GalleryCanvas.tsx）

`<GalleryCanvas arts={ARTS} state={state} ring="#D9A273" ink="#0E0E03" />`

- `ring`：镜框金属色。铜色是 `#D9A273`，换成 `#B8893B` 就是黄铜，能和复古档案统一
- `ink`：画外底色
- 已处理好 WebGL1 的非 2 的幂纹理问题（会自动缩放），任意尺寸的图都能直接用

### 文字（type.tsx）

| 组件 | 用途 |
|---|---|
| `ArtworkCard` | 作品档案：标题、外文名、作者、年代（铜色斜体）、分隔线、材质/尺寸/收藏地 |
| `DetailNote` | 细节说明：大标题（支持铜色强调词）加说明行，配合放大镜用 |
| `CenterTitle` | 居中大标题加副标题（开场、结语） |
| `Plaque` / `IndexMark` | 左上栏目标签 / 右上进度 `01 / 03` |
| `CompareMarks` | 双镜对比：两个镜片间的铜线、虚线和高差标尺 |
| `Rich` | 富文本，`{em:'词', it:true}` 显示为铜色斜体 |
| `reveal(f, a, b)` | 入场动画：上浮、去模糊、弹簧 |

## 叙事结构（示例用的四段式，推荐照搬）

1. **选择**：作品轮盘旋转，经过中心的作品名闪现，停在主角上
2. **讲解**：中心镜片渗满全屏，画作右移让位，左侧出现作品档案卡
3. **细节**：推镜到局部，放大镜落下；镜片像水滴一样滑到下一个细节；双镜对比
4. **结语**：画作缩回镜片，轮盘整转一圈，定格在标题上

## 注意

- 画作纹理最多 5 张，镜片最多 8 个（`MAXT`、`MAXL`）
- 所有动画都是帧号的纯函数，可以分段并行渲染：`--frames=0-179` 这类写法
- **文件名不要用 `MSI` 这类和系统用户名相同的词**：某些沙盒环境会把它当个人文件清掉。示例里的《施洗者圣约翰》已改名为 `baptist.jpg`
- `example/original/` 是原始一体化源码，`example/MonaLisa.tsx` 是用组件库重写的版本，两者效果一致

---

*Copyright (c) 2026 小白姐姐 · MIT License · https://github.com/newbaisays-aigc/knowledge-animation-video*
