# -*- coding: utf-8 -*-
"""REST 연결 모드 검증 — total 서버 모양(흉내 서버)에 붙여 화면·동작이 그대로인지."""
import json
import os
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8791').rstrip('/')
API = 'http://127.0.0.1:8792'
checks = []
errs = []


def check(n, ok, d=''):
    checks.append((n, bool(ok), d))
    print(('  OK   ' if ok else '  FAIL ') + n + ((' — ' + str(d)) if d and not ok else ''))


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, locale='ko-KR')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    pg.goto(BASE + '/index.html?mode=rest&api=' + API, wait_until='load')
    pg.wait_for_selector('.qrow', timeout=8000)
    pg.wait_for_timeout(500)
    check('서버 모드 표시', '서버 연결' in pg.inner_text('#modeBadge'), pg.inner_text('#modeBadge'))
    check('서버 목록 3건', pg.locator('.qrow').count() == 3, pg.locator('.qrow').count())
    check('서버 고객·주소 표시', '대성중기' in pg.inner_text('#view'))
    pg.screenshot(path=os.path.join(HERE, 'shots', '20-rest-desktop.png'), full_page=True)

    # 발송 → 서버 POST
    pg.locator('.qrow input[type=checkbox]').nth(0).check()
    pg.click('[data-act="send-go"]')
    pg.wait_for_timeout(200)
    pg.click('#modalF button[type=submit]')
    pg.wait_for_timeout(700)
    check('발송 뒤 서버 목록 2건', pg.locator('.qrow').count() == 2, pg.locator('.qrow').count())

    # 반송 목록
    pg.click('.tabs .tab[data-tab="ret"]')
    pg.wait_for_timeout(400)
    check('서버 반송 목록', '노경수' in pg.inner_text('#view'))
    check('서버 반송 다음 할 일', '주소' in pg.inner_text('#view'))
    pg.screenshot(path=os.path.join(HERE, 'shots', '21-rest-return.png'), full_page=True)

    # 반송 등록 (서버가 문자를 만든다 — 미리보기는 없음)
    pg.fill('#regSearch', '노경수')
    pg.wait_for_timeout(500)
    pg.locator('[data-act="reg-pick"]').first.click()
    pg.wait_for_timeout(300)
    pg.click('[data-act="reg-submit"]')
    pg.wait_for_timeout(600)
    check('서버 반송 등록 응답', '등록했습니다' in pg.inner_text('#view') or '묶었습니다' in pg.inner_text('#view'), pg.inner_text('#view')[:200])

    # 현황
    pg.click('.tabs .tab[data-tab="status"]')
    pg.wait_for_timeout(400)
    body = pg.inner_text('#view')
    check('서버 분기 현황', '2026년 4분기' in body and '전자로 열어 봄' in body)
    pg.screenshot(path=os.path.join(HERE, 'shots', '22-rest-status.png'), full_page=True)

    # 고객 페이지 (서버 /addr/check · /addr/save)
    pub = ctx.new_page()
    pub.on('pageerror', lambda e: errs.append(str(e)))
    pub.goto(BASE + '/address-confirm.html?mode=rest&api=' + API + '&r=21&exp=999&sig=x', wait_until='load')
    pub.wait_for_timeout(400)
    check('서버 모드 고객 페이지 열림', pub.locator('#step1').is_visible())
    pub.fill('#idv', '830809')
    pub.click('#fVerify button[type=submit]')
    pub.wait_for_timeout(500)
    check('서버 본인 확인', pub.locator('#step2').is_visible(), pub.inner_text('#verifyErr'))
    pub.fill('#zip', '14586')
    pub.fill('#road', '경기 부천시 평천로 660')
    pub.fill('#detail', '105동 403호')
    pub.click('#fAddr button[type=submit]')
    pub.wait_for_timeout(500)
    check('서버 주소 저장', pub.locator('#step3').is_visible())
    pub.screenshot(path=os.path.join(HERE, 'shots', '23-rest-address.png'), full_page=True)

    b.close()

check('콘솔·페이지 오류 0건', len(errs) == 0, errs[:5])
failed = [c for c in checks if not c[1]]
print('\n결과: %d/%d' % (len(checks) - len(failed), len(checks)))
if failed:
    sys.exit(1)
