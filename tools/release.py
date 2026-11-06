# Copyright (c) 2026 小白姐姐. MIT License.
# https://github.com/newbaisays-aigc/knowledge-animation-video

"""发布脚本：版本号 → 打包 → 提交 → 打 tag → 推送 → 发 GitHub Release。

用法：
    python tools/release.py --bump patch        # 1.0.0 -> 1.0.1
    python tools/release.py --bump minor        # 1.0.0 -> 1.1.0
    python tools/release.py --bump major        # 1.0.0 -> 2.0.0
    python tools/release.py --set 1.2.3
    python tools/release.py --bump patch --dry-run
    python tools/release.py --bump patch --note "修掉素材授权记录"

约定：每次向 GitHub 推送更新都必须打一个新 tag。tag 格式 vMAJOR.MINOR.PATCH，
与 SKILL.md frontmatter 里的 metadata.version 保持一致，由本脚本统一维护。
"""
import argparse
import os
import re
import subprocess
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pack_skill  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILL_MD = os.path.join(ROOT, 'SKILL.md')
CHANGELOG = os.path.join(ROOT, 'CHANGELOG.md')
REPO = 'newbaisays-aigc/knowledge-animation-video'


def run(args, cwd=ROOT, check=True, capture=True):
    """执行命令，返回 (returncode, stdout)。"""
    p = subprocess.run(args, cwd=cwd, capture_output=capture,
                       text=True, encoding='utf-8', errors='replace')
    if check and p.returncode != 0:
        sys.stderr.write((p.stderr or '') + '\n')
        raise SystemExit('命令失败：%s（退出码 %d）' % (' '.join(args), p.returncode))
    return p.returncode, (p.stdout or '').strip()


def read_version():
    """从 SKILL.md frontmatter 读取 metadata.version。"""
    with open(SKILL_MD, encoding='utf-8') as f:
        head = f.read().split('---')[1]
    m = re.search(r'^\s+version:\s*["\']?([0-9]+\.[0-9]+\.[0-9]+)', head, re.M)
    if not m:
        raise SystemExit('SKILL.md frontmatter 里找不到 metadata.version')
    return m.group(1)


def write_version(v):
    """把新版本写回 SKILL.md frontmatter。"""
    with open(SKILL_MD, encoding='utf-8') as f:
        text = f.read()
    new = re.sub(r'(\n\s+version:\s*)["\']?[0-9]+\.[0-9]+\.[0-9]+["\']?',
                 lambda m: m.group(1) + '"%s"' % v, text, count=1)
    if new == text:
        raise SystemExit('SKILL.md 版本号替换失败')
    with open(SKILL_MD, 'w', encoding='utf-8', newline='\n') as f:
        f.write(new)


def vtuple(v):
    """版本号转成可比较的元组。"""
    return tuple(int(x) for x in v.split('.'))


def bump(cur, level):
    maj, mi, pa = (int(x) for x in cur.split('.'))
    if level == 'major':
        return '%d.0.0' % (maj + 1)
    if level == 'minor':
        return '%d.%d.0' % (maj, mi + 1)
    return '%d.%d.%d' % (maj, mi, pa + 1)


def last_tag():
    _, out = run(['git', 'describe', '--tags', '--abbrev=0'])
    return out or None


def commits_since(ref):
    """列出 ref..HEAD 的提交标题。"""
    _, out = run(['git', 'log', '--pretty=format:%s', '%s..HEAD' % ref])
    return [l for l in out.splitlines() if l.strip()]


def update_changelog(version, notes):
    """在 CHANGELOG.md 顶部插入本次版本条目。"""
    date = datetime.now().strftime('%Y-%m-%d')
    lines = notes if isinstance(notes, list) else [notes]
    body = '\n'.join('- %s' % l for l in lines)
    entry = '## v%s · %s\n\n%s\n\n' % (version, date, body)

    header = ('# Changelog\n\n'
              '本文件记录 knowledge-animation-video 的版本变更。\n'
              '每次推送 GitHub 都会打一个新 tag，版本号与 SKILL.md 的 '
              '`metadata.version` 一致。\n\n')
    if os.path.exists(CHANGELOG):
        with open(CHANGELOG, encoding='utf-8') as f:
            old = f.read()
        if old.startswith('# Changelog'):
            idx = old.index('\n\n') + 2
            # 跳过表头说明段，插到第一条版本条目之前
            rest = old[idx:]
            m = re.search(r'^## v', rest, re.M)
            if m:
                rest = rest[:m.start()] + entry + rest[m.start():]
            else:
                rest = rest + '\n' + entry
            content = old[:idx] + rest
        else:
            content = header + entry + old
    else:
        content = header + entry
    with open(CHANGELOG, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)


def build_notes(version, notes):
    """拼装 Release 说明。"""
    ref = last_tag()
    lines = ['## knowledge-animation-video v%s' % version, '']
    if notes:
        lines.append('### 本次更新')
        for n in notes:
            lines.append('- %s' % n)
        lines.append('')
    if ref:
        cs = commits_since(ref)
        if cs:
            lines.append('### 变更明细')
            for c in cs:
                lines.append('- %s' % c)
            lines.append('')
    lines += [
        '**作者：[小白姐姐（Xiao Bai）](https://github.com/newbaisays-aigc)** · MIT 协议',
        '',
        '**工具无关的 Agent Skill** —— 只要你的 AI 助手能读 Markdown、跑 shell、写文件，就能用。',
        '',
        '### 安装',
        '',
        '下载 `knowledge-animation-video.skill` 解压后，把 `knowledge-animation-video/` 目录放到你的 agent 能读到的 skill 位置：',
        '',
        '| Agent / 工具 | 路径 |',
        '|---|---|',
        '| Claude Code | `~/.claude/skills/knowledge-animation-video/` |',
        '| Cursor | `~/.cursor/rules/` 或项目内 `.cursor/rules/` |',
        '| Windsurf | `~/.codeium/windsurf/rules/` |',
        '| 通用 Agent Skills 规范 | `~/.agent/skills/knowledge-animation-video/` |',
        '',
        '### 依赖',
        '',
        'Remotion 4.x（所有 `@remotion/*` 须同版本）、Node.js 18+、Python 3.10+、ffmpeg 6+。',
        'Python 依赖缺失时可降级使用宿主自带的 TTS。',
        '',
        '### 授权',
        '',
        '代码 MIT，所有源文件带 `Copyright (c) 2026 小白姐姐` 版权头。',
        '图片素材授权各异（公有领域 / CC BY / CC BY-SA），`fetch_commons.py` 抓取时自动生成 '
        '`ATTRIBUTION.md` 记录署名要求；字体为 OFL 1.1 / Apache 2.0。',
        '',
        '### 完整文档',
        '',
        'https://github.com/' + REPO,
    ]
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser(description='发布新版本：提交 → 打 tag → 推送 → 发 Release')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--bump', choices=['patch', 'minor', 'major'], help='按语义化版本递增')
    g.add_argument('--set', dest='setver', help='直接指定版本号，如 1.2.3')
    ap.add_argument('--note', action='append', default=[], help='本次更新说明，可重复')
    ap.add_argument('--out', help='.skill 分发包输出路径（默认与 skill 目录同级）')
    ap.add_argument('--remote', default='origin', help='远端名称，默认 origin')
    ap.add_argument('--no-push', action='store_true', help='只做本地提交与打 tag，不推送')
    ap.add_argument('--no-release', action='store_true', help='不打 GitHub Release')
    ap.add_argument('--dry-run', action='store_true', help='只演练，不写文件不提交')
    args = ap.parse_args()

    cur = read_version()
    newv = args.setver if args.setver else bump(cur, args.bump)
    tag = 'v' + newv
    branch = run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])[1] or 'main'

    prev = last_tag()
    if prev and vtuple(newv) <= vtuple(cur):
        print('版本号未递增（当前 %s -> 目标 %s），请用 --set 指定更大的版本' % (cur, newv))
        return 1

    _, tags = run(['git', 'tag', '-l', tag])
    if tags.strip():
        print('tag %s 已存在，请换版本号' % tag)
        return 1

    if args.note:
        notes = args.note
    elif prev:
        notes = commits_since(prev)
    else:
        notes = []
    if not notes:
        notes = ['常规维护更新']

    print('当前版本 : %s' % cur)
    print('目标版本 : %s  (tag %s)' % (newv, tag))
    print('更新说明 :')
    for n in notes:
        print('  - %s' % n)

    if args.dry_run:
        print('\n[dry-run] 未做任何改动')
        return 0

    # 1. 版本号写回 SKILL.md
    write_version(newv)
    print('\n[1/6] SKILL.md 版本号 -> %s' % newv)

    # 2. CHANGELOG
    update_changelog(newv, notes)
    print('[2/6] CHANGELOG.md 已更新')

    # 3. 打包（输出到 skill 目录的实际物理位置同级，解析符号链接）
    if args.out:
        out = os.path.abspath(args.out)
    else:
        real = os.path.realpath(ROOT)
        out = os.path.join(os.path.dirname(real), os.path.basename(real) + '.skill')
    n, size = pack_skill.pack(ROOT, out)
    print('[3/6] 分发包已打包：%s（%d 个文件，%.1f KB）' % (out, n, size / 1024))

    # 4. 提交
    run(['git', 'add', '-A'])
    status = run(['git', 'status', '--short'])[1]
    if not status.strip():
        print('[4/6] 无改动，跳过提交')
    else:
        msg = 'release: v%s\n\n%s' % (newv, '\n'.join('- %s' % n for n in notes))
        run(['git', 'commit', '-q', '-m', msg])
        print('[4/6] 已提交')

    # 5. 打 tag
    tagmsg = 'v%s\n\n%s' % (newv, '\n'.join(notes))
    run(['git', 'tag', '-a', tag, '-m', tagmsg])
    print('[5/6] 已打 tag %s' % tag)

    # 6. 推送
    if args.no_push:
        print('[6/6] --no-push，跳过推送（本地已就绪）')
        return 0

    # 远端可能有人直接在 GitHub 网页上改了文件（如编辑 README），
    # 先 rebase 再推，避免 non-fast-forward 被拒。
    run(['git', 'fetch', args.remote])
    _, behind = run(['git', 'rev-list', '--count', 'HEAD..%s/%s' % (args.remote, branch)])
    if behind.strip() and behind.strip() != '0':
        print('检测到远端有 %s 个新提交，先 rebase...' % behind.strip())
        run(['git', 'rebase', '%s/%s' % (args.remote, branch)])
        # rebase 会改写 commit hash，tag 需要重新指向
        run(['git', 'tag', '-f', '-a', tag, '-m', tagmsg], check=False)
        print('rebase 完成，tag 已重新指向 %s' % run(['git', 'rev-parse', '--short', 'HEAD'])[1])

    run(['git', 'push', args.remote, 'HEAD:%s' % branch])
    run(['git', 'push', args.remote, tag])
    print('[6/6] 已推送提交与 tag')

    if args.no_release:
        print('未创建 GitHub Release（--no-release）')
        return 0

    rel_notes = build_notes(newv, notes)
    rc, _ = run(['gh', 'release', 'view', tag], check=False)
    if rc == 0:
        run(['gh', 'release', 'upload', tag, out, '--clobber'], check=False)
        run(['gh', 'release', 'edit', tag, '--notes', rel_notes], check=False)
        print('已更新 GitHub Release %s' % tag)
    else:
        rc2, o = run(['gh', 'release', 'create', tag, out,
                      '--title', 'v%s · 知识动画视频 Skill 分发包' % newv,
                      '--notes', rel_notes, '--latest'], check=False)
        if rc2 != 0:
            print('GitHub Release 创建失败（可手动执行）：gh release create %s' % tag)
            return 1
        print('已创建 GitHub Release %s' % tag)

    print('\n完成：%s' % tag)
    print('  仓库    : https://github.com/%s' % REPO)
    print('  Release : https://github.com/%s/releases/tag/%s' % (REPO, tag))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
