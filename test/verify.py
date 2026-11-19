# -*- coding: utf-8 -*-
"""A1 우편 모듈 — 실제 브라우저 검증 (모바일 390×844 · PC 1366×900)

  실행:  python3 test/verify.py [http://127.0.0.1:8791]
  확인:  주요 화면 동작 · 콘솔 에러 0건 · 가로 넘침 없음 · 인쇄/CSV 산출물
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8791').rstrip('/')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots')
os.makedirs(OUT, exist_ok=True)

checks = []


def check(name, ok, detail=''):
    checks.append((name, bool(ok), detail))
    print(('  OK   ' if ok else '  FAIL ') + name + ((' — ' + str(detail)) if detail and not ok else ''))


def js(page, expr):
    return page.evaluate(expr)


errors = []
console_errors = []


def attach(page, tag):
    page.on('pageerror', lambda e: errors.append('%s pageerror: %s' % (tag, e)))
    page.on('console', lambda m: console_errors.append('%s console.%s: %s' % (tag, m.type, m.text)) if m.type == 'error' else None)


def shot(page, name, full=True):
    page.screenshot(path=os.path.join(OUT, name + '.png'), full_page=full)


def open_staff(ctx, tag='staff'):
    page = ctx.new_page()
    attach(page, tag)
    page.goto(BASE + '/index.html', wait_until='load')
    page.wait_for_selector('.qrow', timeout=8000)
    page.wait_for_timeout(400)
    return page


def tab(page, name):
    sel = '.tabs .tab[data-tab="%s"]:visible' % name
    if page.locator(sel).count() == 0:
        sel = '.tabbar button[data-tab="%s"]:visible' % name
    page.click(sel)
    page.wait_for_timeout(350)


def modal_ok(page):
    page.click('#modalF button[type=submit]')
    page.wait_for_timeout(350)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ───────────────────────── 모바일 ─────────────────────────
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True, locale='ko-KR')
        page = ctx.new_page()
        attach(page, 'mobile')
        page.goto(BASE + '/index.html', wait_until='load')
        page.evaluate("localStorage.clear()")
        page.reload(wait_until='load')
        page.wait_for_selector('.qrow', timeout=8000)
        page.wait_for_timeout(500)

        check('첫 화면 제목', page.title().startswith('A1 우편'))
        check('보낼 것 목록 11건', page.locator('.qrow').count() == 11, page.locator('.qrow').count())
        check('알림 띠에 보낼 것·반송 표시', '보낼 것' in page.inner_text('#alerts') and '반송' in page.inner_text('#alerts'))
        check('모바일 하단 탭 보임', page.locator('.tabbar button[data-tab="send"]').is_visible())
        check('넓은 화면 탭 숨김', not page.locator('.tabs').is_visible())
        check('우편 안 받음 고객 제외 안내', '박수경' in page.inner_text('#view'))
        check('지입사 구분 표시', '지입사' in page.inner_text('#view'))
        check('2일 넘은 건 강조', page.locator('.qage.old').count() >= 1)
        shot(page, '01-send-mobile')

        # 발송 2건
        boxes = page.locator('.qrow input[type=checkbox]')
        boxes.nth(0).check()
        boxes.nth(1).check()
        page.wait_for_timeout(150)
        check('고른 건수 표시', '2건 골랐습니다' in page.inner_text('#selCount'), page.inner_text('#selCount'))
        page.click('[data-act="send-go"]')
        page.wait_for_timeout(250)
        check('발송 확인 창', page.locator('#modal.open').count() == 1)
        shot(page, '02-send-confirm-mobile')
        modal_ok(page)
        page.wait_for_timeout(500)
        check('발송 뒤 목록 9건', page.locator('.qrow').count() == 9, page.locator('.qrow').count())
        saved = page.evaluate("JSON.parse(localStorage.getItem('a1post.db.v1')).sends.filter(s=>s.post_sndng_dt).slice(-2)")
        check('POST_SNDNG_DT 기록', len(saved) == 2 and all(s.get('post_sndng_dt') for s in saved), saved)
        check('보낸 순간 주소 남김', all(s.get('addr') for s in saved))
        shot(page, '03-send-done-mobile')

        # 폼텍 라벨
        page.locator('.qrow input[type=checkbox]').nth(0).check()
        page.locator('.qrow input[type=checkbox]').nth(1).check()
        page.click('[data-act="labels"]')
        page.wait_for_timeout(250)
        check('라벨 설정 창', page.locator('#labCols').count() == 1)
        modal_ok(page)
        page.wait_for_timeout(250)
        lp = page.evaluate("window.A1Post.lastPrint && window.A1Post.lastPrint.html")
        check('라벨 2장 생성', bool(lp) and lp.count('class="label-to"') == 2, lp.count('class="label-to"') if lp else 'none')
        page.emulate_media(media='print')
        shot(page, '04-labels-print')
        page.emulate_media(media='screen')
        page.wait_for_timeout(900)
        if page.locator('#modal.open').count():
            page.click('#modalF [data-act="close-modal"]')
            page.wait_for_timeout(200)

        # CSV
        with page.expect_download(timeout=8000) as dl:
            page.click('[data-act="csv"]')
        d = dl.value
        path = d.path()
        raw = open(path, 'rb').read()
        text = raw.decode('utf-8-sig')
        check('CSV 내려받기', '고객명' in text and 'POST_SNDNG_DT' in text and text.count('\n') >= 2, text[:120])
        # 발송 대장 (인쇄)
        page.click('[data-act="ledger"]')
        page.wait_for_timeout(300)
        led = page.evaluate("window.A1Post.lastPrint && window.A1Post.lastPrint.html")
        check('발송 대장 인쇄물', bool(led) and '우편 발송 대장' in led and led.count('<tr>') >= 3)

        # ── 반송: 지입사 분기 ──
        tab(page, 'ret')
        page.wait_for_selector('#regSearch')
        page.fill('#regSearch', '서진건설')
        page.wait_for_timeout(500)
        check('봉투 보고 찾기 결과', page.locator('[data-act="reg-pick"]').count() >= 1)
        page.locator('[data-act="reg-pick"]').first.click()
        page.wait_for_timeout(300)
        page.click('[data-act="reg-reason"][data-r="반송"]')
        page.wait_for_timeout(250)
        page.click('[data-act="reg-submit"]')
        page.wait_for_timeout(600)
        body = page.inner_text('#view')
        check('지입사 계약은 지입사에 문자', '지입사 담당자' in body and '태양운수' in body, body[:300])
        preview = page.evaluate("window.A1Post.state.regResult && window.A1Post.state.regResult.preview")
        check('지입사 문자 문구에 링크 없음', bool(preview) and 'address-confirm' not in preview and '태양운수' in preview, preview)
        shot(page, '05-return-jiip-mobile')
        rid_jiip = page.evaluate("window.A1Post.state.regResult.id")
        page.click('[data-act="ret-cancel"]')
        page.wait_for_timeout(400)

        # ── 반송: 개인 고객 등록 → 고객 주소 페이지 ──
        page.wait_for_selector('#regSearch')
        page.fill('#regSearch', '노경수')
        page.wait_for_timeout(450)
        page.locator('[data-act="reg-pick"]').first.click()
        page.wait_for_timeout(300)
        page.click('[data-act="reg-reason"][data-r="주소불명"]')
        page.wait_for_timeout(200)
        page.click('[data-act="reg-submit"]')
        page.wait_for_timeout(600)
        check('개인 고객 문자 미리보기', '주소 확인' in page.inner_text('#view'))
        shot(page, '06-return-registered-mobile')
        rid = page.evaluate("window.A1Post.state.regResult.id")

        # 주소 확인 페이지
        pub = ctx.new_page()
        attach(pub, 'address')
        pub.goto(BASE + '/address-confirm.html?r=%s' % rid, wait_until='load')
        pub.wait_for_timeout(500)
        check('고객 페이지 — 본인 확인 단계', pub.locator('#step1').is_visible() and pub.locator('#idv').count() == 1)
        shot(pub, '07-address-verify-mobile')
        pub.fill('#idv', '000000')
        pub.click('#fVerify button[type=submit]')
        pub.wait_for_timeout(400)
        check('틀린 생년월일 거부', '맞지 않습니다' in pub.inner_text('#verifyErr'), pub.inner_text('#verifyErr'))
        pub.fill('#idv', '830809')
        pub.click('#fVerify button[type=submit]')
        pub.wait_for_timeout(500)
        check('본인 확인 뒤 주소 단계', pub.locator('#step2').is_visible())
        check('보낸 주소 보임', '평천로' in pub.inner_text('#sentAddr'), pub.inner_text('#sentAddr'))
        check('반송 사유 보임', '주소' in pub.inner_text('#reasonTxt'))
        shot(pub, '08-address-form-mobile')
        pub.fill('#zip', '14586')
        pub.fill('#road', '경기 부천시 평천로 660')
        pub.click('#fAddr button[type=submit]')
        pub.wait_for_timeout(300)
        check('상세주소 없으면 막힘', '상세주소' in pub.inner_text('#addrErr'), pub.inner_text('#addrErr'))
        pub.fill('#detail', '105동 403호')
        pub.click('#fAddr button[type=submit]')
        pub.wait_for_timeout(600)
        check('주소 저장 완료 화면', pub.locator('#step3').is_visible(), pub.inner_text('#doneMsg'))
        check('새 주소 안내', '14586' in pub.inner_text('#doneMsg') and '403' in pub.inner_text('#doneMsg'))
        shot(pub, '09-address-done-mobile')

        # 직원 화면 반영
        page.goto(BASE + '/index.html', wait_until='load')
        page.wait_for_selector('.qrow', timeout=8000)
        page.wait_for_timeout(500)
        db = page.evaluate("JSON.parse(localStorage.getItem('a1post.db.v1'))")
        cust = [c for c in db['customers'] if c['name'] == '노경수'][0]
        check('고객 정보 주소 갱신', '660' in cust['address'] and cust['zip'] == '14586', cust['address'])
        chg = [a for a in db['addr_changes'] if a['customer_id'] == cust['id']]
        check('이전 주소 기록', len(chg) >= 1 and '평천로 655' in (chg[-1]['old_addr'] or ''), chg[-1] if chg else None)
        re_send = [s for s in db['sends'] if s['customer_id'] == cust['id'] and s['status'] == '보낼' + ' 것']
        check('재발송 대기열 자동 등록', len(re_send) >= 1, len(re_send))
        tasks = [t for t in db['tasks'] if t['customer_id'] == cust['id'] and not t['done']]
        check('보험사 주소 반영 할 일 생성', any('보험사' in t['title'] for t in tasks), tasks)
        page.click('.tabbar button[data-tab="send"]')
        page.wait_for_timeout(300)
        check('보낼 것에 재발송 건', '재발송' in page.inner_text('#view'))
        shot(page, '10-send-resend-mobile')

        # 반송 처리 패널
        page.click('.tabbar button[data-tab="ret"]')
        page.wait_for_timeout(300)
        page.locator('[data-act="ret-panel"]').first.click()
        page.wait_for_timeout(400)
        check('반송 상세 패널', page.locator('#panel.open').count() == 1 and '보낸 주소' in page.inner_text('#panelB'))
        shot(page, '11-return-panel-mobile')
        if page.locator('[data-act="close-panel"]').count():
            page.locator('#panelH [data-act="close-panel"]').click()
            page.wait_for_timeout(300)

        # ── 현황·분기 ──
        tab(page, 'status')
        page.wait_for_timeout(400)
        body = page.inner_text('#view')
        check('분기 현황 통계', '보낸 우편' in body and '반송' in body and '전자로 열어 봄' in body and '우편료' in body)
        check('고객별 우편 설정', '항상 우편' in body and '우편 안 받음' in body)
        shot(page, '12-status-mobile')
        page.locator('[data-act="decide"]').first.click()
        page.wait_for_timeout(350)
        check('분기 결정 창', page.locator('#modal.open').count() == 1)
        page.fill('#pNote', '검증 시험 — 계속 보냄')
        modal_ok(page)
        page.wait_for_timeout(500)
        pol = page.evaluate("JSON.parse(localStorage.getItem('a1post.db.v1')).policies")
        check('분기 결정 기록', any('검증 시험' in (x.get('note') or '') for x in pol), pol[-1])

        # 설정
        tab(page, 'settings')
        page.wait_for_timeout(300)
        page.fill('#cfgHold', '15')
        page.click('[data-act="save-cfg"]')
        page.wait_for_timeout(400)
        hold = page.evaluate("JSON.parse(localStorage.getItem('a1post.db.v1')).settings.hold_min")
        check('기다리는 시간 저장', hold == 15, hold)
        check('연결 안내 보임', '데모' in page.inner_text('#view'))
        shot(page, '13-settings-mobile')

        # ── 자동 필터·분기 규칙 ──
        rule = page.evaluate("""async () => {
          const api = window.A1Post.api;
          const cur = window.A1Post.state.pol.cur;
          const always = await api.docRegister(9, '증권');     // 청솔산업 — 항상 우편
          const optout = await api.docRegister(6, '증권');     // 박수경 — 우편 안 받음
          await api.decide({ quarter: cur, mail: 'off', note: '검증 — 그만' });
          const basic = await api.docRegister(3, '증권');      // 한빛물류 — 회사 기준
          await api.decide({ quarter: cur, mail: 'on', note: '검증 — 원복' });
          return { always, optout, basic, cur };
        }""")
        check('항상 우편 고객은 목록에 추가', bool(rule['always'].get('id')), rule['always'])
        check('우편 안 받음 고객은 제외', '우편 안 받음' in (rule['optout'].get('skipped') or ''), rule['optout'])
        check('분기 그만이면 회사 기준 고객 제외', '그만' in (rule['basic'].get('skipped') or ''), rule['basic'])

        # ── PC ──
        ctx2 = browser.new_context(viewport={'width': 1366, 'height': 900}, locale='ko-KR')
        pc = ctx2.new_page()
        attach(pc, 'desktop')
        pc.goto(BASE + '/index.html', wait_until='load')
        pc.evaluate("localStorage.clear()")
        pc.reload(wait_until='load')
        pc.wait_for_selector('.qrow', timeout=8000)
        pc.wait_for_timeout(500)
        check('PC 위쪽 탭 보임', pc.locator('.tabs .tab[data-tab="send"]').is_visible())
        check('PC 하단 탭 숨김', not pc.locator('.tabbar').is_visible())
        w = pc.evaluate("({sw:document.documentElement.scrollWidth, iw:window.innerWidth})")
        check('PC 가로 넘침 없음', w['sw'] <= w['iw'] + 1, w)
        shot(pc, '14-send-desktop')
        pc.click('.tabs .tab[data-tab="ret"]')
        pc.wait_for_timeout(400)
        shot(pc, '15-return-desktop')
        pc.click('.tabs .tab[data-tab="status"]')
        pc.wait_for_timeout(400)
        shot(pc, '16-status-desktop')
        w2 = pc.evaluate("({sw:document.documentElement.scrollWidth, iw:window.innerWidth})")
        check('현황 화면 가로 넘침 없음', w2['sw'] <= w2['iw'] + 1, w2)
        pc.click('.tabs .tab[data-tab="send"]')
        pc.wait_for_timeout(300)
        pc.locator('[data-act="send-panel"]').first.click()
        pc.wait_for_timeout(400)
        shot(pc, '17-panel-desktop')

        # 모바일 가로 넘침
        mw = page.evaluate("({sw:document.documentElement.scrollWidth, iw:window.innerWidth})")
        check('모바일 가로 넘침 없음', mw['sw'] <= mw['iw'] + 1, mw)

        # 잘못된 링크
        bad = ctx.new_page()
        attach(bad, 'address-bad')
        bad.goto(BASE + '/address-confirm.html?r=9999', wait_until='load')
        bad.wait_for_timeout(400)
        check('없는 반송 링크 안내', bad.locator('#stepErr').is_visible() and '열 수 없' in bad.inner_text('#errTitle'))

        browser.close()

    check('콘솔 에러 0건', len(console_errors) == 0, console_errors[:5])
    check('페이지 오류 0건', len(errors) == 0, errors[:5])

    failed = [c for c in checks if not c[1]]
    print('\n결과: %d/%d 통과' % (len(checks) - len(failed), len(checks)))
    if failed:
        print('실패:')
        for name, _, detail in failed:
            print(' -', name, detail)
        sys.exit(1)


if __name__ == '__main__':
    main()
