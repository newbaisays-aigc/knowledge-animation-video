# 复古档案组件库（vintage-archive）

配合 `templates/vintage-archive.md` 使用。所有组件基于 Remotion，动画全部由帧驱动。

## 快速开始

1. 建 Remotion 项目，把本目录的 `kit.tsx`、`motion.tsx`、`index.ts` 复制到 `src/lib/`
2. 准备素材：`bash scripts/setup_assets.sh public`（下载字体，生成木桌、纸张、颗粒贴图）
3. 取图：`python3 scripts/fetch_commons.py public/raw "study|File:xxx.jpg" ...`，然后做旧：
   `python3 scripts/gen_textures.py public --age public/raw/*.jpg`（输出 `xxx_aged.jpg`）
4. 配音：`python ../common/scripts/tts.py 稿件.txt vo/`（自己录的音频用 `align.py`），再运行 `python ../common/scripts/cues_convert.py vo/ src/cues.json`
5. 写镜头：照 `example/Napoleon.tsx`，每幕一个组件，用 `ArchiveFrame` 串起来
6. 混音：写 `mix.json`，运行 `python3 ../common/scripts/mix_audio.py mix.json`，一次输出三条音轨
7. 导出：`bash ../common/scripts/export_versions.sh <入口> <id> out/片名 [full no_voice no_music]`（画面渲染一次，合成三个声音版本，音效始终保留）。**入口必须是含 `registerRoot()` 的文件**（通常是 `src/index.ts`），传 `Root.tsx` 会报 "does not contain registerRoot"

## 组件清单

### 基础元件（kit.tsx）

| 组件 | 用途 | 关键参数 |
|---|---|---|
| `Paper` | 撕边做旧纸标签，所有文字的载体 | `seed`（撕边形状）、`style`（位置宽高）、`tint` |
| `PhotoCard` | 带纸边框的做旧照片卡 | `src` `w` `h` `pos` `zoom` `gray` `caption` |
| `Ribbon` | 从中间展开的丝带横幅（大标题，可带副标题） | `text` `at` `w` `size` `sub`（副标题，已按纸面弧线留出空间，不会再掉出纸外） |
| `Stamp` | 黄底红字印章，盖下时有缩放冲击 | `text` `at` `size` |
| `InkCircle` | 手绘红墨圈，描线生长 | `w` `h` `start` `seed` `sw` |
| `Typed` | 打字机逐字出现 | `text` `at` `cps` |
| `Wood` | 旧木桌背景，缓慢漂移 | — |
| `Overlay` | 暗角 + 顶光 + 胶片颗粒 + 闪烁 + 划痕 | — |
| `FontFaces` / `RoughFilter` | 字体注册、手绘抖动滤镜 | ArchiveFrame 已内置 |
| `C` / `SERIF` `TYPE` `DISPLAY` `CJK` | 配色和字体常量 | 换风格时改这里 |
| `lerp` `useSpring` | 带缓动的插值、弹簧 | — |

### 动效与复合组件（motion.tsx）

| 组件 | 用途 | 关键参数 |
|---|---|---|
| `ArchiveFrame` | 根容器：木桌、叠层、字幕、音频、每幕转场全装好 | `total` `cues` `scenes=[{el,end,fullBleed}]` `subtitles`（默认 true，用户不要字幕时传 false） |
| `Scene` | 每幕镜头运动：侧向滑入、缓推、反向滑出 | ArchiveFrame 自动套用 |
| `Drop` | 卡片带旋转落到桌上（弹簧） | `at` `from` `rot` `endRot` |
| `BookOpen` | 合书滑入 → 封面绕书脊翻开 → 书脊居中，带光影 | `leftImage` `coverTitle` `coverSub`；children 是右页内容 |
| `BrassPlaque` | 黄铜铭牌 + 数字滚动 | `at` `value` `suffix` `unit` `x` `y` |
| `Magnifier` | 黄铜放大镜，放大底图局部（皇冠、签名、年份），弹簧落下；不需要 WebGL | `at` `src` `box`（底图在屏幕上的矩形）`focus`（要放大的点，0..1）`x` `y` `r` `m` |
| `FullPainting` | 名画铺满全屏，推拉平移，可褪成黑白 | `src` `pos` `zoomFrom` `panX` `fadeToGray` |
| `Subtitles` | 逐句字幕 | `cues` `bottom` `size` |
| `sec()` | 秒转帧 | — |

## 写镜头的规矩

- **帧号**：每幕内部帧号从 0 开始（Sequence 会重置）。
- **文字**：所有文字放在 `Paper`、`Ribbon`、`Stamp`、`BrassPlaque` 里，不要裸放在背景上。
- **节奏**：每幕元素间隔 8～20 帧依次出场，不要同时出现。
- **右页时机**：`BookOpen` 的右页内容从第 32 帧以后再出现（书第 34 帧才完全翻开）。
- **整屏名画**：铺满全屏的幕在 `ArchiveFrame` 里标 `fullBleed: true`，避免叠加推近。
- **放大镜焦点**：`focus` 坐标要用 `common/scripts/uv_grid.py` 给原图叠网格后读出来，不要凭感觉估（凭感觉很容易偏到旁边的柱子上）。示例见 `example/MagnifierDemo.tsx`
- **竖构图照片不要整屏铺**：`FullPainting` 是 cover 裁切，竖图会被裁成中段、主角消失。竖图一律走 `PhotoCard`（桌上摆照片），只有横图或局部质感特写才用 `FullPainting`
- **相片卡 caption**：`PhotoCard` 的 caption 是英文衬线小字，长度控制在 24 字符内（`w=600` 时实测可用宽约 380px）。更长的名字改短，或拆成两行纸片
- **文字边界自检**：丝带、纸片、铭牌里的字，渲染单帧后 **裁切该区域放大 2 倍** 目视，确认四周留白 ≥ 字号的 0.3 倍。整帧缩略图看不出的溢出，放大后很明显
- **取图先看图**：Wikimedia 的文件名经常与内容不符（标题写雕像，图是墙上的刻字）。下载后先逐张看图，再决定放进哪一幕
- **竖屏 9:16**：坐标需要重排，`BookOpen` 建议改成 `W=420 H=580`。

## 音效动作对照（以 D:\00shortviedo\2025短视频\00音效库 为例）

| 画面动作 | 音效文件前缀 | 建议音量 |
|---|---|---|
| 换幕 | 154-呼-3 / 221-呼-8 / 152-呼-1（轮换） | -17 dB，提前 0.25 秒 |
| 照片落桌 | 229-拍立得照片 | -16～-18 |
| 纸片出场 | 134-纸张翻页-2 / 005-翻页 | -18 |
| 打字机文字 | 032-复古打字机 | -20 |
| 横幅展开 | 334-撕纸声 | -15 |
| 画红圈 | 335-铅笔划过 | -19 |
| 盖章 / 重点 | 008-带回音的鼓击 | -12 |
| 转折、失败 | 重低音 | -12 |
| 翻书 | 133-纸张翻页-1（对齐书翻开第 10 帧左右） | -14 |
| 海、岛、结尾 | 117-海浪声（作 bed） | -22 |

---

*Copyright (c) 2026 小白姐姐 · MIT License · https://github.com/newbaisays-aigc/knowledge-animation-video*
