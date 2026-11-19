# -*- coding: utf-8 -*-
"""가장자리 동작 — 긴 이름·주소, 안 보냄, 잠금, 서버 없음, 분기 그만 안내, 라벨 시작 칸"""
import json
import os
import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8791').rstrip('/')
HERE = os.path.dirname(os.path.abspath(__file__))
checks, errs = [], []


def check(n, ok, d=''):
    checks.append((n, bool(ok), d))
    print(('  OK   ' if ok else '  FAIL ') + n + ((' — ' + str(d)) if d and not ok else ''))


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, locale='ko-KR')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    pg.goto(BASE + '/index.html', wait_until='load')
    pg.evaluate("localStorage.clear()")
    pg.reload(wait_until='load')
    pg.wait_for_selector('.qrow')
    pg.wait_for_timeout(300)

    # 긴 이름·긴 주소
    pg.evaluate("""() => {
      const d = JSON.parse(localStorage.getItem('a1post.db.v1'));
      d.customers[0].name = '주식회사 대한민국초장기건설기계종합정비센터남양주지점';
      d.customers[0].address = '경기 남양주시 와부읍 예봉로 24 한솔아파트 103동 502호 (예봉로 24, 한솔아파트 103동 502호 3층 302호)';
      localStorage.setItem('a1post.db.v1', JSON.stringify(d));
    }""")
    pg.reload(wait_until='load')
    pg.wait_for_selector('.qrow')
    pg.wait_for_timeout(300)
    ov = pg.evaluate("({sw:document.documentElement.scrollWidth, iw:innerWidth})")
    check('긴 이름·주소 가로 넘침 없음', ov['sw'] <= ov['iw'] + 1, ov)
    pg.screenshot(path=os.path.join(HERE, 'shots', '30-longtext-mobile.png'), full_page=True)

    # 안 보냄
    pg.locator('.qrow input[type=checkbox]').nth(0).check()
    pg.click('[data-act="send-go"]')
    pg.wait_for_timeout(200)
    pg.click('#modalF button[type=submit]')
    pg.wait_for_timeout(600)
    before = pg.evaluate("JSON.parse(localStorage.getItem('a1post.db.v1')).sends.filter(s=>s.status==='보낼 것').length")
    # 상세에서 안 보냄
    pg.locator('[data-act="send-panel"]').first.click()
    pg.wait_for_timeout(400)
    pg.click('[data-act="skip-one"]')
    pg.wait_for_timeout(250)
    pg.fill('#why', '검증 — 고객이 전자로만 받음')
    pg.click('#modalF button[type=submit]')
    pg.wait_for_timeout(1200)
    after = pg.evaluate("JSON.parse(localStorage.getItem('a1post.db.v1')).sends.filter(s=>s.status==='보낼 것').length")
    check('안 보냄 처리', after == before - 1 and pg.locator('.qrow').count() == after, {'before': before, 'after': after, 'dom': pg.locator('.qrow').count()})
    st = pg.evaluate("JSON.parse(localStorage.getItem('a1post.db.v1')).sends.filter(s=>s.status==='안 보냄').map(s=>s.skip_why)")
    check('안 보냄 이유 기록', any('전자' in (x or '') for x in st), st[-3:])

    # 분기 그만 → 안내 띠
    pg.evaluate("""async () => { const api = window.A1Post.api; const cur = window.A1Post.state.pol.cur;
      await api.decide({quarter: cur, mail: 'off', note: '가장자리 검증'}); }""")
    pg.reload(wait_until='load')
    pg.wait_for_selector('.qrow')
    pg.wait_for_timeout(400)
    check('분기 그만 안내', '전자만' in pg.inner_text('#alerts') and '그만' in pg.inner_text('#view'), pg.inner_text('#alerts'))
    pg.evaluate("""async () => { const api = window.A1Post.api; const cur = window.A1Post.state.pol.cur;
      await api.decide({quarter: cur, mail: 'on', note: '가장자리 검증 원복'}); }""")
    pg.reload(wait_until='load')
    pg.wait_for_timeout(400)

    # 라벨 시작 칸
    pg.locator('.qrow input[type=checkbox]').nth(0).check()
    pg.click('[data-act="labels"]')
    pg.wait_for_timeout(250)
    pg.fill('#labStart', '3')
    pg.click('#modalF button[type=submit]')
    pg.wait_for_timeout(250)
    lp = pg.evaluate("window.A1Post.lastPrint.html")
    check('라벨 시작 칸 건너뛰기', lp.count('label-cell empty') >= 2 and lp.count('class="label-to"') == 1, lp.count('label-cell empty'))
    pg.emulate_media(media='print')
    pg.screenshot(path=os.path.join(HERE, 'shots', '31-labels-skip-print.png'))
    pg.emulate_media(media='screen')
    pg.wait_for_timeout(900)
    if pg.locator('#modal.open').count():
        pg.click('#modalF [data-act="close-modal"]')

    # 라벨 안 글자 넘침 (긴 이름·주소)
    pg.emulate_media(media='print')
    ovf = pg.evaluate("""() => [...document.querySelectorAll('.label-cell')].map(c => ({o: c.scrollHeight - c.clientHeight, w: c.scrollWidth - c.clientWidth}))""")
    check('라벨 칸 안에서 글자 넘침 없음', all(x['o'] <= 2 and x['w'] <= 2 for x in ovf), ovf)
    pg.emulate_media(media='screen')

    # 법인 페이지 (사업자번호 · 이사감이면 '주소 맞음' 숨김)
    rid2 = pg.evaluate("""() => window.PostDemo.registerReturn({customerId: 8, contractIds: [9], reason: '이사감', addrSent: '경기 의정부시 천보로122번길 22 청솔공장'}).id""")
    corp = ctx.new_page()
    corp.on('pageerror', lambda e: errs.append(str(e)))
    corp.goto(BASE + '/address-confirm.html?r=%s' % rid2, wait_until='load')
    corp.wait_for_timeout(300)
    check('법인은 사업자번호 안내', '사업자번호' in corp.inner_text('#idvLabel'), corp.inner_text('#idvLabel'))
    corp.fill('#idv', '2018633012')
    corp.click('#fVerify button[type=submit]')
    corp.wait_for_timeout(400)
    check('법인 본인 확인', corp.locator('#step2').is_visible(), corp.inner_text('#verifyErr'))
    check('이사감은 주소 맞음 숨김', not corp.locator('#tabSame').is_visible())
    corp.screenshot(path=os.path.join(HERE, 'shots', '34-corp-address.png'), full_page=True)

    # 잠금 (5회 오답)
    rid = pg.evaluate("""() => window.PostDemo.registerReturn({customerId: 9, contractIds: [10], reason: '반송', addrSent: '서울 구로구 경인로 445 201동 1103호'}).id""")
    pub = ctx.new_page()
    pub.on('pageerror', lambda e: errs.append(str(e)))
    pub.goto(BASE + '/address-confirm.html?r=%s' % rid, wait_until='load')
    pub.wait_for_timeout(300)
    for i in range(5):
        pub.fill('#idv', '000000')
        pub.click('#fVerify button[type=submit]')
        pub.wait_for_timeout(250)
    pub.fill('#idv', '900317')
    pub.click('#fVerify button[type=submit]')
    pub.wait_for_timeout(400)
    body = pub.inner_text('body')
    check('5회 오답 뒤 잠금', '잠겼습니다' in body, pub.inner_text('#verifyErr') or pub.inner_text('#errMsg'))
    pub.screenshot(path=os.path.join(HERE, 'shots', '32-locked-mobile.png'), full_page=True)

    # 서버 없음 (rest)
    bad = ctx.new_page()
    bad.on('pageerror', lambda e: errs.append(str(e)))
    bad.goto(BASE + '/index.html?mode=rest&api=' + 'http://127.0.0.1:9', wait_until='load')
    bad.wait_for_timeout(1200)
    check('서버 없을 때 안내', '연결하지 못했습니다' in bad.inner_text('#view'), bad.inner_text('#view')[:120])
    bad.screenshot(path=os.path.join(HERE, 'shots', '33-rest-down.png'), full_page=True)

    # 검색 빈 결과
    pg.reload(wait_until='load')
    pg.wait_for_selector('.qrow')
    pg.fill('#sendSearch', '없는고객이름')
    pg.wait_for_timeout(300)
    check('검색 결과 없음 안내', '조건에 맞는 건이 없습니다' in pg.inner_text('#sendList'))

    b.close()

check('오류 0건', len(errs) == 0, errs[:4])
failed = [c for c in checks if not c[1]]
print('\n결과: %d/%d' % (len(checks) - len(failed), len(checks)))
if failed:
    sys.exit(1)
