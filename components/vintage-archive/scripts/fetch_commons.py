"""从维基共享资源下载公版图片（带限速和重试，避免被限流）
用法：python3 fetch_commons.py <输出目录> "名字|File:标题" "名字|File:标题" ...
      python3 fetch_commons.py --search "关键词"     列出候选文件名和原图宽度
规则：
- 原图宽度 > 1920 才取 1920 缩略图；否则取原图（小图请求缩略图会被拒）
- 每次请求间隔 6 秒；返回内容不是图片就等 15 秒重试，最多 3 次
- 失败的条目会打印出来，换一个候选即可；下载成功的写入 sources.txt 方便注明来源"""
import sys, json, time, urllib.parse, urllib.request, os
UA = 'KnowledgeVideoBot/1.0 (educational use)'
API = 'https://commons.wikimedia.org/w/api.php?'

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=40) as r: return r.read(), r.headers.get('Content-Type', '')

def info(title):
    q = API + urllib.parse.urlencode({'action': 'query', 'titles': title, 'prop': 'imageinfo', 'iiprop': 'url|size', 'iiurlwidth': 1920, 'format': 'json'})
    d = json.loads(get(q)[0]); p = list(d['query']['pages'].values())[0]
    ii = p['imageinfo'][0]; return ii['thumburl'] if ii['width'] > 1920 else ii['url'], ii['descriptionurl']

if sys.argv[1] == '--search':
    q = API + urllib.parse.urlencode({'action': 'query', 'generator': 'search', 'gsrnamespace': 6, 'gsrlimit': 10, 'gsrsearch': sys.argv[2], 'prop': 'imageinfo', 'iiprop': 'size', 'format': 'json'})
    for p in json.loads(get(q)[0])['query']['pages'].values(): print(p['imageinfo'][0]['width'], p['title'])
    sys.exit()
out = sys.argv[1]; os.makedirs(out, exist_ok=True); failed = []
for item in sys.argv[2:]:
    name, title = item.split('|', 1)
    ok = False
    for attempt in range(3):
        try:
            time.sleep(6); url, page = info(title); time.sleep(6)
            data, ct = get(url)
            if ct.startswith('image/'):
                open(os.path.join(out, name + '.jpg'), 'wb').write(data)
                open(os.path.join(out, 'sources.txt'), 'a', encoding='utf-8').write(f'{name}: {page}\n'); ok = True; print('OK', name); break
        except Exception as e: print('retry', name, e)
        time.sleep(15)
    if not ok: failed.append(name); print('FAILED', name)
if failed: print('以下条目失败，请换候选：', failed)
