"""从维基共享资源下载公版图片（带限速和重试，避免被限流）
用法：python3 fetch_commons.py <输出目录> "名字|File:标题" "名字|File:标题" ...
      python3 fetch_commons.py --search "关键词"     列出候选文件名和原图宽度
规则：
- 原图宽度 > 1920 才取 1920 缩略图；否则取原图（小图请求缩略图会被拒）
- 每次请求间隔 6 秒；返回内容不是图片就等 15 秒重试，最多 3 次
- 失败的条目会打印出来，换一个候选即可；下载成功的写入 sources.txt 方便注明来源

授权（重要）：
- 下载时会一并记录每张素材的作者、授权协议、来源页面，输出到 ATTRIBUTION.md
- Public domain 的无需署名；CC BY / CC BY-SA 必须署名，CC BY-SA 还要求衍生作品同协议发布
- 交付成片前必须把 ATTRIBUTION.md 里对应条目的署名信息放进片尾或说明文案
"""
import sys, json, time, urllib.parse, urllib.request, os, re, html
UA = 'KnowledgeVideoBot/1.0 (educational use)'
API = 'https://commons.wikimedia.org/w/api.php?'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read(), r.headers.get('Content-Type', '')


def strip_tags(s):
    """把 extmetadata 里的 HTML 片段转成纯文本"""
    s = re.sub(r'<[^>]+>', ' ', s or '')
    s = html.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()


def info(title):
    q = API + urllib.parse.urlencode({'action': 'query', 'titles': title, 'prop': 'imageinfo',
                                      'iiprop': 'url|size|extmetadata', 'iiurlwidth': 1920, 'format': 'json'})
    d = json.loads(get(q)[0])
    p = list(d['query']['pages'].values())[0]
    if 'imageinfo' not in p:
        raise KeyError('维基上找不到：' + title)
    ii = p['imageinfo'][0]
    url = ii['thumburl'] if ii['width'] > 1920 else ii['url']
    m = ii.get('extmetadata', {})

    def g(k):
        return strip_tags(m.get(k, {}).get('value', ''))

    meta = {
        'title': title,
        'artist': g('Artist') or g('Credit') or '未知作者',
        'license': g('LicenseShortName') or '未标注',
        'license_url': g('LicenseUrl'),
        'terms': g('UsageTerms'),
        'page': ii.get('descriptionurl', ''),
        'date': g('DateTimeOriginal'),
    }
    return url, meta


def safe_name(name):
    """防路径穿越：只允许字母数字、连字符、下划线、点（且不能以点开头）"""
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,63}', name):
        raise ValueError(
            '非法的素材名：%r\n只允许字母、数字、连字符、下划线和点，且必须以字母或数字开头。' % name)
    if '..' in name:
        raise ValueError('素材名不能包含 "..": %r' % name)
    return name


def write_attribution(path, records):
    """生成 ATTRIBUTION.md：交付成片时照抄这里的署名行"""
    lines = [
        '# 素材授权与署名',
        '',
        '由 `fetch_commons.py` 自动生成。**交付成片前请检查本文件**：',
        '',
        '- Public domain：无需署名，但建议保留来源',
        '- CC BY / CC BY-SA：**必须署名**（作者 + 作品名 + 来源页 + 协议名）',
        '- CC BY-SA：衍生作品还须以相同协议发布',
        '',
    ]
    for r in records:
        needs = r['license'].upper().startswith('CC') or 'BY' in r['license'].upper()
        lines += [
            '## %s' % r['name'],
            '',
            '- 作品名：%s' % r['title'].replace('File:', ''),
            '- 作者：%s' % r['artist'],
            '- 授权：%s' % r['license'],
            '- 来源：%s' % r['page'],
            '- 署名要求：%s' % ('需要（CC BY 系列）' if needs else '不需要（公有领域）'),
            '',
        ]
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def main():
    if sys.argv[1] == '--search':
        q = API + urllib.parse.urlencode({'action': 'query', 'generator': 'search', 'gsrnamespace': 6,
                                          'gsrlimit': 10, 'gsrsearch': sys.argv[2], 'prop': 'imageinfo',
                                          'iiprop': 'size', 'format': 'json'})
        for p in json.loads(get(q)[0])['query']['pages'].values():
            print(p['imageinfo'][0]['width'], p['title'])
        return

    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    failed = []
    records = []
    for item in sys.argv[2:]:
        name, title = item.split('|', 1)
        try:
            name = safe_name(name)
        except ValueError as e:
            print('SKIP', e)
            failed.append(name)
            continue
        ok = False
        for attempt in range(3):
            try:
                time.sleep(6)
                url, meta = info(title)
                time.sleep(6)
                data, ct = get(url)
                if ct.startswith('image/'):
                    with open(os.path.join(out, name + '.jpg'), 'wb') as f:
                        f.write(data)
                    with open(os.path.join(out, 'sources.txt'), 'a', encoding='utf-8') as f:
                        f.write('%s: %s | %s | %s\n' % (name, meta['page'], meta['artist'], meta['license']))
                    meta['name'] = name
                    records.append(meta)
                    print('OK', name, '|', meta['license'], '|', meta['artist'][:40])
                    ok = True
                    break
            except Exception as e:
                print('retry', name, e)
            time.sleep(15)
        if not ok:
            failed.append(name)
            print('FAILED', name)

    if records:
        write_attribution(os.path.join(out, 'ATTRIBUTION.md'), records)
        print('已生成 ATTRIBUTION.md（交付前请按里面的要求署名）')
    if failed:
        print('以下条目失败，请换候选：', failed)


if __name__ == '__main__':
    main()
