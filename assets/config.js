/* A1 우편 모듈 — 실행 설정
 *
 *  mode: 'demo'  → 브라우저(localStorage) 안에서 바로 동작. 서버 없이 시험·시연용.
 *        'rest'  → apiBase 의 total 서버와 연결. 화면·동작은 같고 데이터만 서버가 준다.
 *
 *  apiBase: '' 이면 이 페이지와 같은 서버(예: total 에 붙였을 때),
 *           'https://a1-xxx.example.com' 처럼 다른 서버면 그 주소.
 *
 *  customerPage: 고객에게 문자로 보내는 주소 확인 페이지 경로.
 *           total 서버에 붙이면 서버가 만드는 /addr 를 쓴다(문자 문구도 서버가 만든다).
 *           데모에서는 같은 폴더의 address-confirm.html.
 */
window.A1POST_CONFIG = {
  mode: 'demo',
  apiBase: '',
  customerPage: 'address-confirm.html',
  org: '에이원코리아',
  staffName: '김대리',
  /* 라벨 기본값 — 폼텍 LS-3100 계열(3열 × 7행) */
  label: { cols: 3, rows: 7, width: 63.5, height: 38.1, page: 'A4' }
};

/* 주소창에 ?mode=demo|rest 로 임시 전환 (시험용) */
(function () {
  try {
    var u = new URL(location.href);
    var m = u.searchParams.get('mode');
    var api = u.searchParams.get('api');
    if (m === 'demo' || m === 'rest') window.A1POST_CONFIG.mode = m;
    if (api !== null) window.A1POST_CONFIG.apiBase = api.replace(/\/+$/, '');
  } catch (e) { /* 구형 브라우저 */ }
})();
