# -*- coding: utf-8 -*-
"""total 서버 흉내 (연결 시험용) — 실제 v0.9.9.4/v0.9.9.5 API 모양 그대로."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

STATE = {
    'sends': [
        {'id': 11, 'customer': '대성중기', 'customer_kind': '법인', 'contract': '현대해상 건설기계', 'policy_no': '2026-31-004821',
         'kinds': ['증권'], 'cur_addr': '경기 남양주시 와부읍 예봉로 24 한솔아파트 103동 502호', 'cur_zip': '12256',
         'pref': '', 'jiip': '', 'age': 3, 'source': '자료실 등록', 'created_at': '2026-11-16 09:12:00', 'status': '보낼 것', 'reg': '01가1234'},
        {'id': 12, 'customer': '서진건설', 'customer_kind': '법인', 'contract': 'DB손해보험 건설기계', 'policy_no': '2026-04-775102',
         'kinds': ['증권'], 'cur_addr': '경기 화성시 향남읍 상신하길 17 서진빌딩', 'cur_zip': '18534',
         'pref': '', 'jiip': '태양운수', 'age': 1, 'source': '자료실 등록', 'created_at': '2026-11-18 14:10:00', 'status': '보낼 것', 'reg': '04라3312'},
        {'id': 13, 'customer': '청솔산업', 'customer_kind': '법인', 'contract': 'KB손해보험 건설기계', 'policy_no': '2026-11-332870',
         'kinds': ['가입증명서'], 'cur_addr': '경기 의정부시 천보로122번길 22 청솔공장', 'cur_zip': '11768',
         'pref': '우편', 'jiip': '', 'age': 0, 'source': '자료실 등록', 'created_at': '2026-11-19 09:45:00', 'status': '보낼 것', 'reg': '08아5521'}
    ],
    'returns': [
        {'id': 21, 'customer': '노경수', 'customer_kind': '개인', 'reason': '주소불명', 'reason_txt': '주소 불명', 'status': '주소 기다림',
         'contracts': [{'id': 12, 'label': '현대해상 건설기계', 'policy_no': '2026-31-008877', 'reg': '11카2210', 'jiip': ''}],
         'addr_sent': '경기 부천시 평천로 655 105동 402호', 'cur_addr': '경기 부천시 평천로 655 105동 402호', 'cur_zip': '14585',
         'next': '고객이 주소 넣기를 기다림 (3일 뒤 한 번 더 안내)', 'done': False, 'turn': True, 'plan_to': '고객', 'plan_tel': '010-****-4471',
         'created_at': '2026-11-17 10:05:00', 'round': 1, 'phone': '', 'sms_log': []}
    ],
    'policy': {
        'mail_on': True, 'cur': '2026-Q4', 'next': '2027-Q1', 'cur_label': '2026년 4분기', 'next_label': '2027년 1분기',
        'cost': 430, 'prefs': {'': 12, '우편': 1, '전자': 1}, 'due': None, 'can_edit': True,
        'quarters': [
            {'quarter': '2026-Q4', 'label': '2026년 4분기', 'sent': 18, 'opened': 11, 'opened_pct': 61.1, 'returned': 1, 'return_pct': 5.6, 'fixed': 1, 'skipped': 2, 'cost': 7740, 'decision': None},
            {'quarter': '2026-Q3', 'label': '2026년 3분기', 'sent': 41, 'opened': 24, 'opened_pct': 58.5, 'returned': 3, 'return_pct': 7.3, 'fixed': 2, 'skipped': 5, 'cost': 17630, 'decision': {'mail': 'on', 'note': '계속', 'who': '대표'}}
        ],
        'decisions': [{'quarter': '2026-Q4', 'mail': 'on', 'note': '4분기 회의 — 계속', 'who': '대표', 'decided_at': '2026-10-02 09:30:00'}]
    }
}


class H(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get('Origin') or '*'
        self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Headers', 'content-type')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Credentials', 'true')

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('content-type', 'application/json; charset=utf-8')
        self.send_header('content-length', str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/post-returns/config':
            return self._json({'on': True, 'hold': 10, 'base': True, 'reasons': ['반송', '이사감', '주소불명', '수취인불명', '폐문부재', '기타'], 'days': {'link': 7, 'remind': 3, 'giveup': 7}})
        if path == '/api/post-sends':
            return self._json({'mail_on': True, 'pref': '', 'rows': STATE['sends']})
        if path == '/api/post-returns':
            return self._json(STATE['returns'] if 'state=open' in self.path else [])
        if path == '/api/post-policy':
            return self._json(STATE['policy'])
        if path == '/api/post-returns/find':
            return self._json([{'id': 11, 'name': '노경수', 'kind': '개인', 'address': '경기 부천시 평천로 655 105동 402호', 'zip': '14585',
                                'phone': '010-****-4471', 'has_id': True, 'jiip': '',
                                'contracts': [{'id': 12, 'label': '현대해상 건설기계', 'policy_no': '2026-31-008877', 'status': '유효', 'reg': '11카2210', 'jiip': ''}],
                                'open': {'id': 21, 'status': '주소 기다림'}}])
        return self._json({'error': 'not found'}, 404)

    def do_POST(self):
        path = self.path.split('?')[0]
        n = int(self.headers.get('content-length') or 0)
        body = json.loads(self.rfile.read(n) or b'{}')
        if path == '/api/post-sends/sent':
            ids = body.get('ids') or []
            STATE['sends'] = [s for s in STATE['sends'] if s['id'] not in ids]
            return self._json({'ok': True, 'done': len(ids), 'skipped': 0})
        if path == '/api/post-sends' or path.startswith('/api/post-sends/'):
            return self._json({'ok': True})
        if path == '/api/post-returns':
            return self._json({'id': 31, 'merged': False, 'status': '문자 대기', 'send_at': '2026-11-19 17:30:00', 'plan': {'to': '고객', 'tel': '010-****-4471'}})
        if path.startswith('/api/post-returns/'):
            return self._json({'id': 21, 'status': '문자 대기', 'next': '문자를 보냅니다', 'done': False, 'contracts': []})
        if path == '/api/post-policy/decide':
            STATE['policy']['decisions'].insert(0, {'quarter': body.get('quarter'), 'mail': body.get('mail'), 'note': body.get('note'), 'who': '김대리', 'decided_at': '2026-11-19 17:10:00'})
            return self._json({'ok': True, 'mail_on': True})
        if path == '/api/post-policy/config':
            STATE['policy']['cost'] = body.get('cost')
            return self._json({'ok': True, 'cost': body.get('cost')})
        if path.startswith('/api/customers/'):
            return self._json({'ok': True, 'pref': body.get('pref')})
        if path == '/addr/check':
            if str(body.get('idv')) != '830809':
                return self._json({'ok': False, 'why': '맞지 않습니다 (4번 남음)'}, 400)
            return self._json({'ok': True, 'sent': '경기 부천시 평천로 655 105동 402호', 'reason': '주소 불명', 'same_ok': True})
        if path == '/addr/save':
            return self._json({'ok': True, 'msg': '아래 주소로 다시 보내 드리겠습니다.\n(14586) 경기 부천시 평천로 660 105동 403호', 'files': []})
        return self._json({'error': 'not found'}, 404)

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    HTTPServer(('127.0.0.1', 8792), H).serve_forever()
