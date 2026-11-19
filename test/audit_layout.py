# -*- coding: utf-8 -*-
"""화면 배치 점검 (그림을 열지 않고 좌표로 확인) — 넘침·터치 크기·인쇄 라벨 치수"""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8791'

AUDIT = """() => {
  const iw = window.innerWidth;
  const bad = [];
  document.querySelectorAll('#app *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (r.right > iw + 1 && el.closest('.tbl-wrap, .alerts, .tabs, .panel-b') === null) {
      bad.push({tag: el.tagName, cls: el.className && String(el.className).slice(0,50), right: Math.round(r.right)});
    }
  });
  const small = [];
  document.querySelectorAll('button, .btn, input[type=checkbox]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.height < 30 && el.closest('.qrow, .tab, .tabbar') === null) small.push({t: (el.innerText||'').slice(0,18), h: Math.round(r.height), w: Math.round(r.width)});
  });
  return {sw: document.documentElement.scrollWidth, iw, bad: bad.slice(0,8), small: small.slice(0,8)};
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, name in [(390, 844, 'mobile'), (1366, 900, 'desktop')]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, is_mobile=(w < 500), has_touch=(w < 500), locale='ko-KR')
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + '/index.html', wait_until='load')
        pg.evaluate("localStorage.clear()")
        pg.reload(wait_until='load')
        pg.wait_for_selector('.qrow')
        pg.wait_for_timeout(400)
        print('==', name)
        for tab in ['send', 'ret', 'status', 'settings']:
            sel = '.tabs .tab[data-tab="%s"]:visible' % tab
            if pg.locator(sel).count() == 0:
                sel = '.tabbar button[data-tab="%s"]:visible' % tab
            pg.click(sel)
            pg.wait_for_timeout(300)
            a = pg.evaluate(AUDIT)
            print(' ', tab, json.dumps(a, ensure_ascii=False))
        # 아래까지 스크롤했을 때 마지막 카드가 하단 탭에 가리지 않는지
        if w < 500:
            pg.click('.tabbar button[data-tab="send"]')
            pg.wait_for_timeout(250)
            pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            pg.wait_for_timeout(250)
            r = pg.evaluate("""() => {
              const cards=[...document.querySelectorAll('#view .card')];
              const last=cards[cards.length-1].getBoundingClientRect();
              const tb=document.querySelector('.tabbar').getBoundingClientRect();
              return {lastBottom: Math.round(last.bottom), tabTop: Math.round(tb.top), bodyH: document.body.scrollHeight};
            }""")
            print('  bottom:', json.dumps(r, ensure_ascii=False))
        print('  errors:', errs)
        ctx.close()

    # 인쇄 라벨·대장 치수
    ctx = b.new_context(viewport={'width': 900, 'height': 1200})
    pg = ctx.new_page()
    pg.goto(BASE + '/index.html', wait_until='load')
    pg.evaluate("localStorage.clear()")
    pg.reload(wait_until='load')
    pg.wait_for_selector('.qrow')
    pg.wait_for_timeout(400)
    pg.locator('.qrow input[type=checkbox]').nth(0).check()
    pg.locator('.qrow input[type=checkbox]').nth(1).check()
    pg.click('[data-act="labels"]')
    pg.wait_for_timeout(250)
    pg.click('#modalF button[type=submit]')
    pg.wait_for_timeout(250)
    pg.emulate_media(media='print')
    dims = pg.evaluate("""() => {
      const sheet=document.querySelector('.sheet'); const grid=document.querySelector('.label-grid');
      const cell=document.querySelector('.label-cell'); const sheet2=document.querySelectorAll('.sheet').length;
      const mm = px => Math.round(px / (96/25.4) * 10) / 10;
      const cs=getComputedStyle(cell);
      return {sheets: sheet2, sheetW: mm(sheet.getBoundingClientRect().width), sheetH: mm(sheet.getBoundingClientRect().height),
              gridW: mm(grid.getBoundingClientRect().width), gridH: mm(grid.getBoundingClientRect().height),
              cellW: mm(cell.getBoundingClientRect().width), cellH: mm(cell.getBoundingClientRect().height),
              border: cs.borderTopStyle, overflowY: document.documentElement.scrollHeight};
    }""")
    print('label print:', json.dumps(dims, ensure_ascii=False))
    pg.emulate_media(media='screen')
    b.close()
