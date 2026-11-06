"""把 skill 目录打包成 .skill（zip）分发包。
用法：python pack_skill.py <skill目录> [输出路径]
规范（与同目录其他 .skill 包一致）：
- 顶层是 skill 目录本身，内部相对路径引用才有效
- 目录条目用 STORE，文件用 DEFLATE
- 排除 .git、node_modules、__pycache__、渲染产物等
"""
import os, sys, zipfile

SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.remotion', 'out', 'dist', 'build', '.venv', 'venv', '.idea', '.vscode'}
SKIP_EXT = {'.pyc', '.pyo', '.mp4', '.mp3', '.wav', '.mov'}
SKIP_NAMES = {'.DS_Store', 'Thumbs.db'}


def should_skip(path, name):
    if name in SKIP_NAMES:
        return True
    if os.path.isdir(path) and name in SKIP_DIRS:
        return True
    if os.path.splitext(name)[1].lower() in SKIP_EXT:
        return True
    return False


def pack(src, out):
    src = os.path.abspath(src)
    base = os.path.basename(src.rstrip(os.sep))
    files = []
    for root, dirs, fnames in os.walk(src):
        dirs[:] = [d for d in dirs if not should_skip(os.path.join(root, d), d)]
        for fn in fnames:
            if should_skip(os.path.join(root, fn), fn):
                continue
            files.append(os.path.join(root, fn))

    if os.path.exists(out):
        os.remove(out)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        # 顶层目录条目
        z.writestr(zipfile.ZipInfo(base + '/'), b'', compress_type=zipfile.ZIP_STORED)
        # 子目录条目
        dirs_seen = set()
        for f in sorted(files):
            rel = os.path.relpath(f, src).replace(os.sep, '/')
            parent = os.path.dirname(rel)
            while parent and parent not in dirs_seen:
                dirs_seen.add(parent)
                z.writestr(zipfile.ZipInfo(base + '/' + parent + '/'), b'', compress_type=zipfile.ZIP_STORED)
                parent = os.path.dirname(parent)
            z.write(f, base + '/' + rel)

    with zipfile.ZipFile(out) as z:
        n = len([i for i in z.infolist() if not i.is_dir()])
    return n, os.path.getsize(out)


if __name__ == '__main__':
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(src)),
                                                             os.path.basename(src.rstrip(os.sep)) + '.skill')
    n, size = pack(src, out)
    print('打包完成：%s（%d 个文件，%.1f KB）' % (out, n, size / 1024))
