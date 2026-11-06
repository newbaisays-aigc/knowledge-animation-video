# knowledge-animation-video

把一段口播稿（或录好的口播音频）加一张风格参考图，做成带背景音乐和音效的知识动画视频。

这是一个 [WorkBuddy](https://www.workbuddy.cn) Skill：Agent 读取 `SKILL.md` 里的流程规范后，负责选模板、设计分镜、写 Remotion 代码、渲染出片。

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
├── templates/               # 6 套模板，每套一个 Markdown
│   ├── 3d-data.md           # A
│   ├── hand-drawn.md        # B
│   ├── math-formula.md      # C
│   ├── infographic.md       # D
│   ├── vintage-archive.md   # E
│   └── gallery.md           # F
└── components/              # 已调好的可复用组件库
    ├── common/scripts/      # 全模板共用脚本（TTS / 对齐 / 混音 / 导出）
    ├── 3d-data/reference/   # 3D 数据参考实现（SpaceX 财报快讯源码）
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

## 通用脚本

| 脚本 | 用途 |
|---|---|
| `components/common/scripts/tts.py` | 文稿 → 配音 + 逐句时间（需 `pip install edge-tts`） |
| `components/common/scripts/align.py` | 自录音频 + 稿件 → 逐句时间（需 `pip install faster-whisper`） |
| `components/common/scripts/cues_convert.py` | 把上面脚本的输出转成 `cues.json` |
| `components/common/scripts/mix_audio.py` | 配音 + BGM + 音效混音，一次输出三条音轨 |
| `components/common/scripts/uv_grid.py` | 给图片叠 0..1 坐标网格，读出精确 uv 坐标 |
| `components/common/scripts/export_versions.sh` | 画面只渲染一次，合成多个声音版本 |

**注意**：`export_versions.sh` 的入口参数必须是含 `registerRoot()` 的文件（通常是 `src/index.ts`），传 `Root.tsx` 会报 `does not contain registerRoot`。

## 安装

把整个 `knowledge-animation-video/` 目录放进 WorkBuddy 的 skills 目录：

- Windows：`C:\Users\<用户>\.workbuddy\skills\knowledge-animation-video\`
- macOS / Linux：`~/.workbuddy/skills/knowledge-animation-video/`

重启 WorkBuddy 后即可被识别。

## 依赖

- **Remotion** 4.x（所有 `@remotion/*` 必须同版本）
- **Node.js** 18+
- **Python** 3.10+（配音 / 对齐 / 混音脚本）
- 渲染 WebGL 内容时必须加 `--gl=swangle`（或 `angle`）

## 素材来源

历史人物、名画、文物等真实图片优先使用维基共享资源等平台的公版图片，交付时需注明来源。

## 实测踩坑清单

第一轮 27 秒复古档案成片跑出来的血泪经验，照做能省很多返工：

1. **维基共享资源的文件名会骗人。** 标题写着 `Winged Victory of Samothrace`，下下来是墙上那块刻字。取图后必须先看图再写镜头。
2. **竖构图照片不能塞整屏。** 竖图一律用相片卡（`PhotoCard`），不是满屏铺图。
3. **带弧边或异形底的容器里放多行字，不能拍脑袋算位置。** 丝带横幅的纸面下缘是中部上弓的曲线，副标题曾经整排掉出纸外。要按"曲线最窄处"校核，或渲染单帧后裁切放大 2 倍目视。
4. **元素入场要留够稳定时间。** 本幕不足 60 帧时，弹簧入场的东西会没落定就被切场。
5. **渲染前先抽 3～5 张关键帧自查**，不要一次渲染到黑。自查方法是裁切放大局部看文字是否溢出，而不是只看整帧缩略图。

## License

MIT
