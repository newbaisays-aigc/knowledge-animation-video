# knowledge-animation-video

把一段口播稿（或录好的口播音频）加一张风格参考图，做成带背景音乐和音效的知识动画视频。

这是一个**工具无关的 Agent Skill**，支持在任何agent里使用：核心是 `SKILL.md` 里的流程规范 + `templates/` 里的 6 套视觉模板 + `components/` 里的 Remotion 组件库。只要你的 AI 助手能读 Markdown、跑 shell、写文件，就能用它出片。

**技术栈**：Remotion（React 写视频）+ Python 脚本（配音/对齐/混音）+ ffmpeg。

**作者**：小白姐姐（Xiao Bai）· [@newbaisays-aigc](https://github.com/newbaisays-aigc) · MIT 协议
**项目地址**：https://github.com/newbaisays-aigc/knowledge-animation-video

---

## 核心原则：风格决定工具

先定视觉类型，再按该类型的模板选工具和写画面。6 种类型：

| 编号 | 类型 | 适合的内容 | 适合的人 |
|---|---|---|---|
| A | 3D 数据 | 有硬数据：数据新闻、产品发布、行业报告、财报解读 | 财经科技博主、新媒体编辑、市场和产品同学 |
| B | 手绘涂鸦 | 偏观点和故事：历史人文、社会现象、读书笔记、心理学 | 文科老师、知识付费讲师、读书博主 |
| C | 数学公式 | 抽象的数学、物理公式，算法和 AI 原理 | 理科老师、做课件的学生、技术博主 |
| D | 信息图 | 流程、方法、系统架构、产品功能、业务流程 | 职场汇报、企业培训、B 端和 SaaS 运营 |
| E | 复古档案 | 历史人物、历史事件、发明史、品牌故事、老物件 | 历史博主、人文科普、品牌内容、文旅 |
| F | 美术馆 | 名画赏析、艺术史、文物、设计、建筑、摄影作品 | 艺术博主、美育老师、博物馆和文旅、设计师 |

## 目录结构

```
├── SKILL.md                 # Agent 主流程说明（本仓库的核心）
├── LICENSE                  # MIT + 第三方素材授权说明
├── templates/               # 6 套模板，每套一个 Markdown
│   ├── 3d-data.md           # A
│   ├── hand-drawn.md        # B
│   ├── math-formula.md      # C
│   ├── infographic.md       # D
│   ├── vintage-archive.md   # E
│   └── gallery.md           # F
└── components/              # 已调好的可复用组件库
    ├── common/scripts/      # 全模板共用脚本（TTS / 对齐 / 混音 / 导出）
    ├── 3d-data/reference/   # 3D 数据参考实现（SpaceX 财报快讯）
    ├── gallery/             # 美术馆组件 + 蒙娜丽莎完整示例
    └── vintage-archive/     # 复古档案组件 + 拿破仑完整示例
```

每个模板都按 7 块结构写成：**规格定尺寸，风格定长相，节奏定时间，画面定动作，音乐定情绪，工具定实现，交付定检查。**

## 工作流程

1. **开场选择** —— 一次性确认：视频类型 / 比例（16:9、9:16、1:1）/ 口播来源（文稿、音频、无配音）/ 要不要字幕
2. **收集素材** —— 两样：口播（文稿或录音）+ 风格参考图（图片或链接）
3. **分析参考图** —— 提取主色、背景、质感、字体气质、构图特点
4. **处理口播** —— 出配音并对齐时间轴，得到句子时间表
5. **出分镜方案** —— 表格形式等用户确认，确认后才渲染
6. **生成视频** —— 每镜头独立组件（Scene01、Scene02……），便于单点返修
7. **交付与修改** —— 导出多个声音版本，指定镜头单独改

## 安装

把整个 `knowledge-animation-video/` 目录放到你的 agent 能读到的 skill 位置即可。常见约定：

| Agent / 工具 | 路径 |
|---|---|
| Claude Code | `~/.claude/skills/knowledge-animation-video/` |
| Cursor | `~/.cursor/rules/` 或项目内 `.cursor/rules/` |
| Windsurf | `~/.codeium/windsurf/rules/` |
| OpenCode / Cline / Roo 等 | 项目内 `.agent/skills/` 或自定义 skills 目录 |
| 通用 Agent Skills 规范 | `~/.agent/skills/knowledge-animation-video/` |

**通用做法**：把目录放到任意位置，然后在你的 agent 配置里把它注册为 skill，或者直接把 `SKILL.md` 的内容作为系统提示 / 首条消息喂给它 —— 只要 agent 能读到 `SKILL.md` 和 `templates/`、`components/` 相对路径下的文件，就能工作。

> 用 symlink 指向统一存放位置最省事：
> ```bash
> ln -s /path/to/knowledge-animation-video ~/.claude/skills/knowledge-animation-video
> ```

## 依赖

| 依赖 | 版本 | 用途 | 缺失时的降级 |
|---|---|---|---|
| **Remotion** | 4.x（所有 `@remotion/*` 必须同版本） | 渲染视频 | 必需 |
| **Node.js** | 18+ | Remotion 运行时 | 必需 |
| **Python** | 3.10+ | 配音 / 对齐 / 混音脚本 | 改用 agent 自带的 TTS |
| **ffmpeg** | 6+ | 音视频处理 | 必需 |
| **edge-tts** | `pip install edge-tts` | 文稿转配音 | 改用 agent 自带的 TTS |
| **faster-whisper** | `pip install faster-whisper`（首次下载约 500MB 模型） | 自录音频对齐 | 人工标注时间点 |

渲染 WebGL 内容时必须加 `--gl=swangle`（或 `angle`）。

## 通用脚本

| 脚本 | 用途 |
|---|---|
| `components/common/scripts/tts.py` | 文稿 → 配音 + 逐句时间 |
| `components/common/scripts/align.py` | 自录音频 + 稿件 → 逐句时间 |
| `components/common/scripts/cues_convert.py` | 把上面脚本的输出转成 `cues.json` |
| `components/common/scripts/mix_audio.py` | 配音 + BGM + 音效混音，一次输出三条音轨 |
| `components/common/scripts/uv_grid.py` | 给图片叠 0..1 坐标网格，读出精确 uv 坐标 |
| `components/common/scripts/export_versions.sh` | 画面只渲染一次，合成多个声音版本 |

**注意**：`export_versions.sh` 的入口参数必须是含 `registerRoot()` 的文件（通常是 `src/index.ts`），传 `Root.tsx` 会报 `does not contain registerRoot`。

## 素材来源与授权

**图片素材**由 `components/vintage-archive/scripts/fetch_commons.py` 从维基共享资源下载。维基共享资源每张图授权独立：

- `Public domain`（公有领域）—— 无需署名
- `CC BY` / `CC BY-SA` —— **必须署名**；`CC BY-SA` 还要求衍生作品同协议发布

脚本会自动生成 `ATTRIBUTION.md`，列出每张素材的作品名、作者、授权协议、来源页面和署名要求。**交付成片前请照它逐条落实署名。**

**字体**由 `components/vintage-archive/scripts/setup_assets.sh` 从 google/fonts 官方仓库下载（Special Elite = Apache 2.0；Old Standard / Playfair Display / Instrument Serif / JetBrains Mono = OFL 1.1），可商用、可嵌入，需随成品保留许可声明。脚本会做 sha256 完整性校验。

## 实测踩坑清单

第一轮 27 秒复古档案成片跑出来的经验，照做能省很多返工：

1. **维基共享资源的文件名会骗人。** 标题写着 `Winged Victory of Samothrace`，下下来是墙上那块刻字。取图后必须先看图再写镜头。
2. **竖构图照片不能塞整屏。** 竖图一律用相片卡（`PhotoCard`），不是满屏铺图。
3. **带弧边或异形底的容器里放多行字，不能拍脑袋算位置。** 丝带横幅的纸面下缘是中部上弓的曲线，副标题曾经整排掉出纸外。要按"曲线最窄处"校核，或渲染单帧后裁切放大 2 倍目视。
4. **元素入场要留够稳定时间。** 本幕不足 60 帧时，弹簧入场的东西会没落定就被切场。
5. **渲染前先抽 3～5 张关键帧自查**，不要一次渲染到黑。自查方法是裁切放大局部看文字是否溢出，而不是只看整帧缩略图。

## 作者与致谢

**作者**：小白姐姐（Xiao Bai）—— 产品设计师 / 科技博主

- GitHub：[@newbaisays-aigc](https://github.com/newbaisays-aigc)
- 项目主页：https://github.com/newbaisays-aigc/knowledge-animation-video
- 协议：MIT

所有源文件均带有 `Copyright (c) 2026 小白姐姐. MIT License.` 版权头。

**贡献**：欢迎提 issue 和 PR。改模板、加视觉类型、补组件都可以，提交前请确认：

- 跑一遍 `python -m py_compile` 和 `bash -n` 确认没语法错误
- 新增的图片素材按上文「素材来源与授权」处理，能自动生成 `ATTRIBUTION.md`
- 别把本地绝对路径写进代码或文档

## License

代码部分 MIT，见 [LICENSE](LICENSE)。图片与字体等第三方素材各有独立授权，详见上文「素材来源与授权」。

