#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从协议规范 PDF 提取章节文本，自动关联到学习系统知识卡片。

用法:
    python tools/extract-spec.py "<spec.pdf路径>" [--max-excerpt 2000]

输出:
    js/data-spec.js  —— 已被 .gitignore 忽略，仅供本地学习使用，
                        禁止提交到仓库或部署到公开站点（版权要求）。

说明:
    - 章节结构来自 PDF 书签（outline），兼容 "Chapter N." / "Section N.N" 格式
      （PCIe Base / InfiniBand 规范均为此格式）。
    - 自动关联：模块关键词匹配章节标题决定收录范围；卡片标题/标签中的
      英文关键词把章节挂到具体卡片（启发式，供定位精读，非权威）。
    - 换其他规范（如 IBTA IB 规范）重跑即可，--spec-name 指定显示名。
"""
import argparse
import datetime
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'js', 'data-spec.js')
KB = os.path.join(ROOT, 'js', 'data-knowledge.js')

# 各模块的章节标题关键词（决定收录哪些规范章节）
MODULE_KEYS = {
    'm1': ['packet header', 'tlp', 'dllp', 'flow control', 'ack/nak', 'replay',
           'ordered sets', 'link training', 'transaction descriptor',
           'routing and addressing', 'byte enables', 'transaction ordering',
           'acknak', 'configuration transaction'],
    'm2': ['evolving i/o', 'link and link numbers', 'data rates', 'change speed',
           'interoperability', 'speed change', 'link status'],
    'm3': ['flit'],
    'm4': ['pam4', 'precoding'],
    'm5': ['forward error correction', 'reed-solomon', 'crc', 'retry'],
    'm6': ['l0p', 'power management', 'aspm', 'clkreq'],
    'm7': ['flow control', 'credit'],
    'm8': ['equalization', 'preset', 'coefficient', 'loopback', 'compliance'],
    'm9': ['uio', 'unordered', 'ordering'],
    'm10': ['error'],
    'm11': [],
    'm12': [], 'm13': [],
    'r1': ['queue pair', 'memory region', 'memory window', 'completion queue',
           'protection domain', 'work request', 'doorbell', 'transport type'],
    'r2': ['qp state', 'queue pair state', 'modify', 'reset', 'initialize',
           'rtr', 'rts', 'sqd'],
    'r3': ['packet format', 'base transport header', 'datagram extended',
           'rdma extended', 'immediate extended', 'acknowledgement extended',
           'atomic extended', 'global route header', 'opcode', 'icrc'],
    'r4': ['retry', 'timeout', 'rnr', 'acknowledge', 'sequence number',
           'error', 'completion'],
    'r5': ['congestion', 'ecn', 'credit', 'flow control'],
    'r6': [], 'r7': [], 'r8': [], 'r9': [],
}
# 每个模块最多收录的章节数（按深度浅→深、页码排序截断）
MAX_SECS_PER_MODULE = 45
SEC_RE = re.compile(r'^(?:Chapter|Section)\s+(\d+(?:\.\d+)*)\.?\s+(.*)$')
STOP = set('''the a an of for and or to in on with without at by as is are be
new all this that not can may per from into via when while each other any more
most pci pcie express gen6 link data base mode modes spec chapter section
number field fields rules type types use used using'''.split())


def parse_outline(reader):
    out = []

    def walk(items, depth):
        for it in items:
            if isinstance(it, list):
                walk(it, depth + 1)
            else:
                title = (it.title or '').strip()
                try:
                    page = reader.get_destination_page_number(it) + 1
                except Exception:
                    page = -1
                out.append((depth, title, page))

    walk(reader.outline, 0)
    return out


def collect_sections(reader):
    raw = parse_outline(reader)
    secs, seen = [], set()
    for _d, title, page in raw:
        m = SEC_RE.match(title)
        if not m or page < 1:
            continue
        num, t = m.group(1), m.group(2).strip()
        if num in seen:
            continue
        seen.add(num)
        secs.append({'num': num, 'title': t, 'page': page,
                     'depth': num.count('.')})
    secs.sort(key=lambda s: (s['page'], s['depth'], s['num']))
    return secs


def select_sections(secs):
    """按模块关键词收录章节（含命中的浅层章节的后代），返回 {num: set(modules)}"""
    hits = {s['num']: set() for s in secs}
    for mod, keys in MODULE_KEYS.items():
        if not keys:
            continue
        matched = [s for s in secs
                   if any(k in s['title'].lower() for k in keys)]
        matched.sort(key=lambda s: (s['depth'], s['page']))
        for s in matched[:MAX_SECS_PER_MODULE]:
            hits[s['num']].add(mod)
        # 收录命中章节的紧邻后代（正文通常在子节）
        by_page = {s['num']: i for i, s in enumerate(secs)}
        for s in matched[:MAX_SECS_PER_MODULE]:
            i = by_page[s['num']]
            d = s['depth']
            j = i + 1
            while j < len(secs) and secs[j]['depth'] > d \
                    and secs[j]['page'] - s['page'] <= 50:
                hits[secs[j]['num']].add(mod)
                j += 1
    included = [s for s in secs if hits[s['num']]]
    return included, hits


def extract_text(reader, sections, max_excerpt):
    """按收录章节提取文本（每节最多跨 12 页，超出截断）"""
    idx = {s['num']: i for i, s in enumerate(sections)}
    pages = {}
    for i, s in enumerate(sections):
        nxt = sections[i + 1]['page'] if i + 1 < len(sections) else s['page']
        span = min(max(nxt - s['page'], 1), 12)
        s['pages'] = (s['page'], s['page'] + span - 1)
        for p in range(s['page'], s['page'] + span):
            pages[p] = None
    sys.stderr.write('extracting %d pages ...\n' % len(pages))
    for p in sorted(pages):
        try:
            txt = reader.pages[p - 1].extract_text() or ''
        except Exception:
            txt = ''
        txt = re.sub(r'[ \t]+', ' ', txt)
        txt = re.sub(r'\n{3,}', '\n\n', txt).strip()
        pages[p] = txt
    for s in sections:
        lo, hi = s['pages']
        buf = []
        for p in range(lo, hi + 1):
            buf.append(pages.get(p, ''))
        full = '\n\n'.join(b for b in buf if b)
        s['text'] = full[:max_excerpt] + ('…' if len(full) > max_excerpt else '')
    return sections


def load_cards():
    """从 data-knowledge.js 解析卡片 (id, module, title, tags)"""
    if not os.path.exists(KB):
        return []
    src = open(KB, encoding='utf-8').read()
    cards = []
    for m in re.finditer(
            r"id:\s*'([^']+)'\s*,\s*module:\s*'([^']+)'\s*,\s*title:\s*'([^']+)'"
            r"[\s\S]{0,200}?tags:\s*\[([^\]]*)\]", src):
        cid, mod, title, tags = m.groups()
        tags = re.findall(r"'([^']*)'", tags)
        cards.append({'id': cid, 'module': mod,
                      'keys': ascii_keys(title + ' ' + ' '.join(tags))})
    return cards


def ascii_keys(text):
    toks = set(re.findall(r'[A-Za-z][A-Za-z0-9\-]{1,15}', text))
    return {t.lower() for t in toks} - STOP


def build_refs(cards, sections, hits):
    """卡片 → 章节引用：先用卡片自身关键词在所属模块收录章节中匹配，"""
    """无命中则回退到该模块命中的最浅章节。"""
    by_mod = {}
    for s in sections:
        for mod in hits.get(s['num'], ()):
            by_mod.setdefault(mod, []).append(s)
    refs = {}
    low = lambda t: t.lower()
    for c in cards:
        cand = by_mod.get(c['module'], [])
        scored = []
        for s in cand:
            t = low(s['title'])
            score = sum(1 for k in c['keys'] if k in t)
            if score:
                scored.append((-score, s['depth'], s['page'], s['num']))
        scored.sort()
        ref = [x[3] for x in scored[:10]]
        if not ref and cand:
            cand.sort(key=lambda s: (s['depth'], s['page']))
            ref = [s['num'] for s in cand[:4]]
        if ref:
            refs[c['id']] = ref
    return refs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--max-excerpt', type=int, default=2000)
    ap.add_argument('--spec-name', default='PCI Express Base Specification 6.5')
    args = ap.parse_args()

    from pypdf import PdfReader
    reader = PdfReader(args.pdf)
    npages = len(reader.pages)
    secs = collect_sections(reader)
    included, hits = select_sections(secs)
    sys.stderr.write('sections: %d total, %d included\n'
                     % (len(secs), len(included)))
    included = extract_text(reader, included, args.max_excerpt)
    cards = load_cards()
    refs = build_refs(cards, included, hits)

    spec = {
        'meta': {'name': args.spec_name, 'source': os.path.basename(args.pdf),
                 'pages': npages, 'sections': len(included),
                 'cardsLinked': len(refs),
                 'generated': datetime.date.today().isoformat(),
                 'note': '本地生成文件，受版权保护，摘录数据禁止提交/分发'},
        'sections': {s['num']: {'t': s['title'], 'p': s['page'],
                                'x': s['text']} for s in included},
        'refs': refs,
    }
    # 文件 1：章节引用表（仅章节号/标题/页码，事实信息，可发布）
    refs_only = {
        'meta': {'name': args.spec_name, 'source': os.path.basename(args.pdf),
                 'sections': len(included), 'cardsLinked': len(refs),
                 'generated': spec['meta']['generated']},
        'sections': {s['num']: {'t': s['title'], 'p': s['page']} for s in included},
        'refs': refs,
    }
    js_refs = ('/* 自动生成：规范章节引用表（仅章节号/标题/页码，事实信息） */\n'
               '/* 由 tools/extract-spec.py 生成 */\n'
               + 'const SPEC_REFS_META = ' + json.dumps(refs_only['meta'], ensure_ascii=False, indent=1) + ';\n'
               + 'const SPEC_REFS = ' + json.dumps(refs_only['sections'], ensure_ascii=False) + ';\n'
               + 'const CARD_SPEC_REFS = ' + json.dumps(refs, ensure_ascii=False) + ';\n'
               + "if (typeof window !== 'undefined') { window.SPEC_REFS_META = SPEC_REFS_META;"
                 ' window.SPEC_REFS = SPEC_REFS; window.CARD_SPEC_REFS = CARD_SPEC_REFS; }\n')
    with open(os.path.join(ROOT, 'js', 'data-spec-refs.js'), 'w', encoding='utf-8') as f:
        f.write(js_refs)
    # 文件 2：规范原文摘录（版权内容，仅本地使用，已被 .gitignore 忽略）
    js_spec = ('/* 本地生成：规范摘录数据（版权保护，仅限本地个人学习，禁止提交/分发） */\n'
               '/* 由 tools/extract-spec.py 生成，请勿手工编辑 */\n'
               + 'const SPEC_META = ' + json.dumps(spec['meta'], ensure_ascii=False, indent=1) + ';\n'
               + 'const SPEC_SECTIONS = ' + json.dumps({n: v['x'] for n, v in spec['sections'].items()}, ensure_ascii=False) + ';\n'
               + "if (typeof window !== 'undefined') { window.SPEC_META = SPEC_META;"
                 ' window.SPEC_SECTIONS = SPEC_SECTIONS; }\n')
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js_spec)
    print('OK %s' % os.path.join(ROOT, 'js', 'data-spec-refs.js'))
    print('OK %s' % OUT)
    print('sections=%d linked-cards=%d refs=%.0fKB spec=%.0fKB'
          % (len(included), len(refs),
             os.path.getsize(os.path.join(ROOT, 'js', 'data-spec-refs.js')) / 1024,
             os.path.getsize(OUT) / 1024))


if __name__ == '__main__':
    main()
