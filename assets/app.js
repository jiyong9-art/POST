/* A1 우편 모듈 — 화면 동작 */
(function () {
  'use strict';

  var api = window.PostAPI;
  var cfg = window.A1POST_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var S = {
    tab: 'send',
    cfg: { on: true, hold: 10, reasons: [], days: { link: 7, remind: 3, giveup: 7 }, sender: {} },
    queue: { rows: [], excluded: [], mail_on: true },
    rets: [],
    retsDone: [],
    pol: null,
    tasks: [],
    sel: {},
    filter: 'all',
    q: '',
    retFilter: 'open',
    reg: { customer: null, contracts: {}, reason: '', addr: '', note: '' },
    regQ: '',
    regResults: null,
    regResult: null,
    panel: null,
    polQ: null,
    custQ: '',
    modalSubmit: null,
    busy: false
  };

  var ICON = {
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 13l9-5.5"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a1.7 1.7 0 0 0-1.6-1H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3 8.6a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 8.6 3H9a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.4 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    box: '<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="m3 8 9-4 9 4v9l-9 4-9-4z"/><path d="m3 8 9 4 9-4M12 12v9"/></svg>',
    stamp: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20h16M6 17h12v-3H6zM9 14V9a3 3 0 1 1 6 0v5"/></svg>',
    print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 17h10v4H7z"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
    csv: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/></svg>',
    phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>'
  };

  /* ───────── 작은 도구 ───────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function digits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtDay(s) {
    if (!s) return '';
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(s);
    return (m[1] === String(new Date().getFullYear()) ? '' : m[1].slice(2) + '.') + Number(m[2]) + '.' + Number(m[3]);
  }
  function fmtTime(s) {
    var m = String(s || '').match(/(\d{2}):(\d{2})/);
    return m ? m[1] + ':' + m[2] : '';
  }
  function money(n) { return n == null || n === '' ? '—' : Number(n).toLocaleString('ko-KR') + '원'; }
  function ageTxt(n) { return n <= 0 ? '오늘' : n === 1 ? '1일' : n + '일'; }
  function kindBadge(kind) { return '<span class="badge ' + (kind === '법인' ? '' : 'off') + '">' + esc(kind) + '</span>'; }
  function prefBadge(pref) {
    if (pref === '우편') return '<span class="badge always">항상 우편</span>';
    if (pref === '전자') return '<span class="badge off">우편 안 받음</span>';
    return '';
  }
  function statusBadge(r) {
    var map = {
      '문자 대기': 'warn', '주소 기다림': 'brand', '지입사 확인 중': 'jiip', '연락 필요': 'bad',
      '주소 받음': 'good', '재발송함': 'good', '취소': 'off', '끝': 'off'
    };
    return '<span class="badge ' + (map[r.status] || '') + '">' + esc(r.status) + '</span>';
  }
  function toast(msg, kind) {
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    $('#toast').appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; }, 2600);
    setTimeout(function () { t.remove(); }, 2900);
  }
  function busy(on) { S.busy = !!on; $$('[data-act]').forEach(function (b) { if (b.tagName === 'BUTTON') b.disabled = !!on; }); }

  /* ───────── 탭 ───────── */
  var TABS = [
    { id: 'send', label: '보낼 것', icon: ICON.send, short: '보낼 것' },
    { id: 'ret', label: '반송', icon: ICON.back, short: '반송' },
    { id: 'status', label: '현황·분기', icon: ICON.chart, short: '현황' },
    { id: 'settings', label: '설정', icon: ICON.gear, short: '설정' }
  ];
  function buildTabs() {
    var counts = tabCounts();
    $('#tabs').innerHTML = TABS.map(function (t) {
      return '<button class="tab" role="tab" data-act="go" data-tab="' + t.id + '" aria-selected="' + (S.tab === t.id) + '">' + esc(t.label) +
        (counts[t.id] ? '<span class="n" data-count="' + t.id + '">' + counts[t.id] + '</span>' : '<span class="n" data-count="' + t.id + '" hidden></span>') + '</button>';
    }).join('');
    $('#tabbar').innerHTML = TABS.map(function (t) {
      return '<button role="tab" data-act="go" data-tab="' + t.id + '" aria-selected="' + (S.tab === t.id) + '">' + t.icon + '<span>' + esc(t.short) + '</span>' +
        '<span class="n" data-count="' + t.id + '"' + (counts[t.id] ? '' : ' hidden') + '>' + (counts[t.id] || '') + '</span></button>';
    }).join('');
  }
  function tabCounts() {
    var pendingRet = S.rets.filter(function (r) { return !r.done; }).length;
    return {
      send: S.queue.rows.length,
      ret: pendingRet,
      status: S.pol && S.pol.due ? 1 : 0,
      settings: 0
    };
  }
  function syncTabs() {
    var counts = tabCounts();
    $$('#tabs .tab, #tabbar button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === S.tab));
    });
    $$('[data-count]').forEach(function (n) {
      var v = counts[n.getAttribute('data-count')] || 0;
      n.textContent = v || '';
      if (v) n.removeAttribute('hidden'); else n.setAttribute('hidden', '');
    });
  }

  function renderAlerts() {
    var rows = S.queue.rows || [];
    var old = rows.filter(function (r) { return r.age >= 2; }).length;
    var turn = S.rets.filter(function (r) { return !r.done && r.turn; }).length;
    var due = S.pol && S.pol.due;
    var items = [];
    if (rows.length) items.push('<button class="alert ' + (old ? 'hot' : 'info') + '" data-act="go" data-tab="send"><span class="dot"></span>보낼 것 <b>' + rows.length + '건</b>' + (old ? ' · ' + old + '건은 2일 넘음' : '') + '</button>');
    if (turn) items.push('<button class="alert warn" data-act="go" data-tab="ret"><span class="dot"></span>우편 반송 <b>' + turn + '건</b> 처리할 차례</button>');
    if (due) items.push('<button class="alert hot" data-act="go" data-tab="status"><span class="dot"></span>분기 회의 · ' + esc(due.quarter) + ' 우편 계속 보낼지 정하기</button>');
    if (!S.queue.mail_on) items.push('<button class="alert quiet" data-act="go" data-tab="status"><span class="dot"></span>이번 분기는 전자만 — 항상 우편 고객만 보냅니다</button>');
    if (!items.length) items.push('<span class="alert quiet"><span class="dot" style="background:#12924f"></span>오늘 처리할 우편이 없습니다</span>');
    $('#alerts').innerHTML = items.join('');
  }

  /* ───────── 불러오기 ───────── */
  async function refreshAll() {
    try {
      api.sweep();
      var res = await Promise.all([api.config(), api.queue(), api.returns('open'), api.returns('done'), api.policy(), api.tasks()]);
      S.cfg = res[0]; S.queue = res[1]; S.rets = res[2]; S.retsDone = res[3]; S.pol = res[4]; S.tasks = res[5] || [];
      if (!S.polQ && S.pol) S.polQ = S.pol.cur;
      renderAll();
    } catch (e) {
      renderFatal(e);
    }
  }
  function renderAll() {
    var alive = {};
    (S.queue.rows || []).forEach(function (r) { alive[String(r.id)] = 1; });
    Object.keys(S.sel).forEach(function (k) { if (!alive[k]) delete S.sel[k]; });
    $('#modeBadge').textContent = api.isDemo ? '데모' : '서버 연결';
    $('#modeBadge').className = 'pill-mode' + (api.isDemo ? '' : ' rest');
    buildTabs(); renderAlerts(); renderView(); syncTabs(); markSel();
  }
  function renderFatal(e) {
    $('#view').innerHTML = '<div class="card"><div class="card-b">' +
      '<div class="callout bad"><div><b>서버에 연결하지 못했습니다.</b><br>' + esc(e.message || e) + '</div></div>' +
      '<p class="hint" style="margin-top:10px">설정에서 서버 주소(apiBase)를 확인하거나, 데모 모드로 열어 보세요.</p>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn" data-act="reload">다시 시도</button>' +
      (api.isDemo ? '' : '<button class="btn soft" data-act="to-demo">데모로 보기</button>') + '</div></div></div>';
  }

  /* ───────── 화면 ───────── */
  function renderView() {
    if (S.tab === 'send') renderSend();
    else if (S.tab === 'ret') renderReturns();
    else if (S.tab === 'status') renderStatus();
    else renderSettings();
  }

  /* ===== 1. 보낼 것 ===== */
  function sendFiltered() {
    var q = S.q.trim().toLowerCase();
    return S.queue.rows.filter(function (r) {
      if (S.filter === 'jiip' && !r.jiip) return false;
      if (S.filter === 'direct' && r.jiip) return false;
      if (S.filter === 'always' && r.pref !== '우편') return false;
      if (S.filter === 'noaddr' && r.cur_addr) return false;
      if (!q) return true;
      return [r.customer, r.contract, r.policy_no, r.reg, r.cur_addr].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }
  function renderSend() {
    var rows = sendFiltered();
    var total = S.queue.rows.length;
    var selCount = Object.keys(S.sel).filter(function (k) { return S.sel[k] && S.queue.rows.some(function (r) { return String(r.id) === k; }); }).length;
    var ex = S.queue.excluded || [];
    $('#view').innerHTML =
      '<div class="card">' +
        '<div class="card-h"><h2>보낼 것 <span class="badge brand num">' + total + '건</span></h2>' +
          '<div class="right">' +
            '<div class="search">' + ICON.search + '<input class="inp" id="sendSearch" type="search" placeholder="고객 · 증권번호 · 차량번호 · 주소" value="' + esc(S.q) + '" aria-label="보낼 것 검색"></div>' +
            (api.isDemo ? '<button class="btn sm" data-act="demo-doc">＋ 새 증권 등록</button>' : '') +
          '</div>' +
        '</div>' +
        (!S.queue.mail_on ? '<div class="card-b" style="padding-bottom:0"><div class="callout warn"><div><b>이번 분기는 우편을 그만 보내기로 했습니다.</b> 새로 올라오는 서류는 ‘항상 우편’ 고객에게만 보낼 목록에 들어갑니다. 바꾸려면 <b>현황·분기</b>에서 결정하세요.</div></div></div>' : '') +
        '<div class="card-b" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
          '<div class="seg" role="group" aria-label="거르기">' +
            filterBtn('all', '전체 ' + total) + filterBtn('jiip', '지입사') + filterBtn('direct', '직접') +
            filterBtn('always', '항상 우편') + filterBtn('noaddr', '주소 없음') +
          '</div>' +
          '<span class="hint" style="margin-left:auto">자료실에 증권·가입증명서가 올라오면 자동으로 생깁니다. 납입증명서는 빼고요.</span>' +
        '</div>' +
        '<div class="card-b tight" style="border-top:1px solid var(--line-2)">' +
          '<div id="sendList">' + sendListHtml(rows) + '</div>' +
        '</div>' +
        (ex.length ? '<div class="card-b" style="padding-top:0"><p class="hint">' + esc(ex.map(function (x) { return x.customer + '(' + x.why + ')'; }).join(', ')) + ' — 보내지 않습니다.</p></div>' : '') +
        '<div class="card-f">' +
          '<label class="btn sm" style="gap:8px"><input type="checkbox" id="selAll" ' + (rows.length && rows.every(function (r) { return S.sel[r.id]; }) ? 'checked' : '') + '> 전체 고르기</label>' +
          '<span class="small mute" id="selCount">' + (selCount ? selCount + '건 골랐습니다' : '보낼 것을 고르세요') + '</span>' +
          '<div class="right" style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn sm" data-act="copy-addr">주소 복사</button>' +
            '<button class="btn sm" data-act="labels">폼텍 라벨</button>' +
            '<button class="btn sm" data-act="ledger">발송 대장</button>' +
            '<button class="btn sm" data-act="csv">CSV</button>' +
            '<button class="btn primary" data-act="send-go" ' + (selCount ? '' : 'disabled') + '>선택 발송</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function filterBtn(k, label) {
    return '<button data-act="filter" data-f="' + k + '" aria-pressed="' + (S.filter === k) + '">' + esc(label) + '</button>';
  }
  function sendListHtml(rows) {
    if (!rows.length) {
      return '<div class="empty">' + ICON.box + '<div class="big">' + (S.queue.rows.length ? '조건에 맞는 건이 없습니다' : '보낼 우편이 없습니다') + '</div>' +
        '<div class="small">' + (S.queue.rows.length ? '거르기를 바꿔 보세요.' : '고객 자료실에 증권·가입증명서가 올라오면 여기에 자동으로 쌓입니다.') + '</div></div>';
    }
    return rows.map(function (r) {
      var checked = !!S.sel[r.id];
      return '<div class="qrow' + (checked ? ' sel' : '') + '" data-row="' + r.id + '">' +
        '<div class="qchk"><input type="checkbox" data-act="pick" data-id="' + r.id + '" ' + (checked ? 'checked' : '') + ' aria-label="' + esc(r.customer) + ' 고르기"></div>' +
        '<div class="qmain"><div class="qname">' + esc(r.customer) + kindBadge(r.customer_kind) + prefBadge(r.pref) + (r.jiip ? '<span class="badge jiip">지입사 ' + esc(r.jiip) + '</span>' : '') + '</div>' +
          '<div class="qsub">' + esc(r.contract) + (r.policy_no ? ' · ' + esc(r.policy_no) : '') + (r.reg ? ' · ' + esc(r.reg) : '') + '</div></div>' +
        '<div class="qaddr"><span class="zip">' + esc(r.cur_zip || '—') + '</span><span class="txt">' + (r.cur_addr ? esc(r.cur_addr) : '<b style="color:var(--bad)">주소 없음 — 발송에서 빠집니다</b>') + '</span></div>' +
        '<div class="qfoot"><div class="qdocs">' + (r.kinds || []).map(function (k) { return '<span class="badge">' + esc(k) + '</span>'; }).join('') + '</div>' +
        '<span class="qage ' + (r.age >= 2 ? 'old' : '') + '">' + ageTxt(r.age) + (r.source === '반송 재발송' ? ' · 재발송' : '') + '</span></div>' +
        '<div class="qright"><button class="btn sm ghost" data-act="send-panel" data-id="' + r.id + '">보기</button></div>' +
      '</div>';
    }).join('');
  }
  function currentSendRows() {
    var rows = sendFiltered();
    var ids = Object.keys(S.sel).filter(function (k) { return S.sel[k]; });
    if (ids.length) return S.queue.rows.filter(function (r) { return S.sel[r.id]; });
    return rows;
  }
  function markSel() {
    $$('.qrow').forEach(function (el) {
      var id = el.getAttribute('data-row');
      var on = !!S.sel[id];
      el.classList.toggle('sel', on);
      var cb = el.querySelector('input[type=checkbox]');
      if (cb) cb.checked = on;
    });
    var n = Object.keys(S.sel).filter(function (k) { return S.sel[k]; }).length;
    var sc = $('#selCount'); if (sc) sc.textContent = n ? n + '건 골랐습니다' : '보낼 것을 고르세요';
    var b = $('[data-act="send-go"]'); if (b) b.disabled = !n;
    var all = $('#selAll'); if (all) all.checked = $$('.qrow').length > 0 && $$('.qrow').every(function (el) { return S.sel[el.getAttribute('data-row')]; });
  }

  /* ===== 2. 반송 ===== */
  function renderReturns() {
    var open = S.rets;
    var done = S.retsDone;
    var list = S.retFilter === 'done' ? done : S.retFilter === 'all' ? open.concat(done) : open;
    list = list.slice().sort(function (a, b) {
      var at = a.turn ? 0 : 1, bt = b.turn ? 0 : 1;
      return at - bt || String(b.created_at).localeCompare(String(a.created_at));
    });
    $('#view').innerHTML =
      regCardHtml() +
      '<div class="card">' +
        '<div class="card-h"><h2>반송 처리 <span class="badge brand num">' + open.filter(function (r) { return !r.done; }).length + '건</span></h2>' +
          '<div class="right"><div class="seg">' +
            retFilterBtn('open', '처리할 것') + retFilterBtn('all', '전체') + retFilterBtn('done', '끝난 것') +
          '</div></div>' +
        '</div>' +
        '<div class="card-b tight">' + retListHtml(list) + '</div>' +
      '</div>' +
      taskCardHtml();
  }
  function retFilterBtn(k, l) { return '<button data-act="ret-filter" data-f="' + k + '" aria-pressed="' + (S.retFilter === k) + '">' + l + '</button>'; }
  function retListHtml(list) {
    if (!list.length) return '<div class="empty">' + ICON.box + '<div class="big">반송이 없습니다</div><div class="small">돌아온 봉투가 있으면 위에서 찾아 등록하세요.</div></div>';
    return list.map(function (r) {
      return '<div class="rrow">' +
        '<div><div class="rname">' + esc(r.customer) + kindBadge(r.customer_kind) + statusBadge(r) +
          (r.round > 1 ? '<span class="badge warn">' + r.round + '차</span>' : '') + (r.jiip ? '<span class="badge jiip">지입사 ' + esc(r.jiip) + '</span>' : '') + '</div>' +
          '<div class="rnext">' + esc(r.reason_txt) + (r.contracts && r.contracts[0] ? ' · ' + esc(r.contracts[0].label) : '') + (r.contracts.length > 1 ? ' 외 ' + (r.contracts.length - 1) : '') + '</div>' +
          '<div class="rnext" style="margin-top:3px;color:var(--ink-2)">' + esc(r.next || '') + '</div></div>' +
        '<div class="rright"><span class="qage ' + (r.turn ? 'old' : '') + '">' + (r.turn ? '처리할 차례' : fmtDay(r.created_at)) + '</span>' +
          '<button class="btn sm" data-act="ret-panel" data-id="' + r.id + '">열기</button></div>' +
      '</div>';
    }).join('');
  }
  function regCardHtml() {
    var r = S.reg;
    var head = '<div class="card-h"><h2>봉투 보고 반송 등록</h2><div class="right"><span class="hint">이름 · 봉투 주소 · 차량번호 · 증권번호 · 전화 끝 4자리</span></div></div>';
    if (S.regResult) return resultCardHtml();
    if (!r.customer) {
      return '<div class="card">' + head + '<div class="card-b" style="display:flex;flex-direction:column;gap:10px">' +
        '<div class="search">' + ICON.search + '<input class="inp" id="regSearch" type="search" placeholder="예: 노경수 / 01가2210 / 010-2889 / 부천시 평천로" value="' + esc(S.regQ) + '" aria-label="반송 고객 찾기"></div>' +
        (S.regResults === null ? '<p class="hint">찾을 이름이나 번호를 넣으면 고객이 나옵니다.</p>' :
          S.regResults.length ? '<div class="kbox">' + S.regResults.map(function (c) {
            return '<div class="kopt"><div style="flex:1"><div class="qname">' + esc(c.name) + kindBadge(c.kind) + (c.jiip ? '<span class="badge jiip">' + esc(c.jiip) + '</span>' : '') + (c.open ? ' <span class="badge warn">반송 진행 중</span>' : '') + '</div>' +
              '<div class="kmeta">' + esc(c.address || '주소 없음') + (c.phone ? ' · ' + esc(c.phone) : '') + '</div></div>' +
              '<button class="btn sm" data-act="reg-pick" data-id="' + c.id + '">고르기</button></div>';
          }).join('') + '</div>' : '<p class="hint">찾는 고객이 없습니다. 이름을 다르게 넣어 보세요.</p>') +
        '</div></div>';
    }
    var c = r.customer;
    var klist = (c.contracts || []).map(function (k) {
      var on = r.contracts[k.id] !== false;
      return '<label class="kopt"><input type="checkbox" data-act="reg-k" data-id="' + k.id + '" ' + (on ? 'checked' : '') + '>' +
        '<div style="flex:1"><div class="qname">' + esc(k.label) + (k.jiip ? ' <span class="badge jiip">지입사 ' + esc(k.jiip) + '</span>' : '') + '</div>' +
        '<div class="kmeta">' + esc(k.policy_no || '') + (k.reg ? ' · ' + esc(k.reg) : '') + '</div></div></label>';
    }).join('');
    return '<div class="card">' + head + '<div class="card-b" style="display:flex;flex-direction:column;gap:14px">' +
      '<div class="steps"><span class="step done"><i>1</i>고객</span><span class="step on"><i>2</i>계약·사유</span><span class="step"><i>3</i>등록</span></div>' +
      '<div class="found"><div class="qname" style="font-size:16px">' + esc(c.name) + kindBadge(c.kind) + (c.open ? '<span class="badge warn">진행 중인 반송에 묶입니다</span>' : '') + '</div>' +
        '<div class="kmeta">' + esc(c.address || '주소 없음') + (c.phone ? ' · ' + esc(c.phone) : '') + '</div>' +
        (c.open ? '<div class="callout info"><div>이 고객에게 진행 중인 반송이 있어 <b>봉투를 하나 더한 것으로 묶고 문자는 1통만</b> 나갑니다.</div></div>' : '') +
        '<div class="lbl">봉투에 든 계약 (여러 개면 모두 고르세요)</div><div class="kbox">' + (klist || '<div class="kmeta">계약이 없습니다</div>') + '</div>' +
        '<div class="lbl">반송 사유</div><div class="reasons">' + (S.cfg.reasons || ['반송', '이사감', '주소불명', '수취인불명', '폐문부재', '기타']).map(function (x) {
          return '<button class="reason" data-act="reg-reason" data-r="' + esc(x) + '" aria-pressed="' + (r.reason === x) + '">' + esc(x) + '</button>';
        }).join('') + '</div>' +
        '<div class="field"><label for="regAddr">봉투에 적힌 주소 (보낸 주소)</label><input class="inp" id="regAddr" value="' + esc(r.addr || c.address || '') + '" placeholder="봉투 주소"></div>' +
        '<div class="field"><label for="regNote">메모 (선택)</label><input class="inp" id="regNote" value="' + esc(r.note) + '" placeholder="예: 봉투 2장, 2차 반송"></div>' +
        '<div class="btn-row"><button class="btn primary lg" data-act="reg-submit">반송 등록</button><button class="btn" data-act="reg-reset">다시 찾기</button></div>' +
      '</div></div></div>';
  }
  function resultCardHtml() {
    var x = S.regResult;
    var plan = x.plan || {};
    var to = plan.to === '지입사' ? '지입사 담당자(' + esc(plan.name || '') + ' ' + esc(plan.tel || '') + ')에게' :
      plan.to === '고객' ? '고객(' + esc(plan.tel || '') + ')에게' : '직원이 직접 연락';
    return '<div class="card">' +
      '<div class="card-h"><h2>' + (x.merged ? '진행 중인 반송에 묶었습니다' : '반송을 등록했습니다') + '</h2>' +
        '<div class="right"><button class="btn sm" data-act="reg-reset">다음 봉투</button></div></div>' +
      '<div class="card-b" style="display:flex;flex-direction:column;gap:12px">' +
        '<div class="callout ' + (plan.to === '직원' ? 'warn' : 'info') + '"><div>' +
          (plan.to === '직원' ? '<b>문자를 보내지 않습니다.</b> ' + esc((plan.warn || [])[0] || '') :
            '<b>' + to + ' 문자를 보냅니다.</b> ' + (x.status === '문자 대기' ? esc(fmtTime(x.send_at)) + '에 나갑니다 — 그 전에 취소할 수 있어요.' : '문자를 보냈습니다.')) +
        '</div></div>' +
        (x.preview ? '<div><div class="lbl" style="margin-bottom:6px">보낼 문자</div><div class="preview">' + esc(x.preview) + '</div></div>' : '') +
        '<div class="btn-row">' +
          (x.preview ? '<button class="btn" data-act="copy-sms" data-id="' + x.id + '">' + ICON.copy + ' 문자 복사</button>' : '') +
          (x.status === '문자 대기' ? '<button class="btn soft" data-act="ret-now" data-id="' + x.id + '">지금 보내기</button>' +
            '<button class="btn danger" data-act="ret-cancel" data-id="' + x.id + '">등록 취소</button>' : '') +
          '<button class="btn ghost" data-act="ret-panel" data-id="' + x.id + '">이 건 열기</button>' +
        '</div>' +
      '</div></div>';
  }
  function taskCardHtml() {
    if (!S.tasks.length) return '';
    return '<div class="card"><div class="card-h"><h2>할 일 <span class="badge warn num">' + S.tasks.length + '</span></h2>' +
      '<div class="right"><span class="hint">주소가 바뀐 건은 보험사 반영까지 끝나야 종결됩니다</span></div></div>' +
      '<div class="card-b tight">' + S.tasks.map(function (t) {
        return '<div class="todo"><input type="checkbox" data-act="task-done" data-id="' + t.id + '" style="width:20px;height:20px;margin-top:2px;accent-color:var(--brand)" aria-label="완료">' +
          '<div style="flex:1"><div class="t">' + esc(t.title) + ' · ' + esc(t.customer) + '</div><div class="d">' + esc(t.detail || '') + '</div></div>' +
          (t.return_id ? '<button class="btn sm ghost" data-act="ret-panel" data-id="' + t.return_id + '">열기</button>' : '') + '</div>';
      }).join('') + '</div></div>';
  }

  /* ===== 3. 현황·분기 ===== */
  function renderStatus() {
    var pol = S.pol;
    if (!pol) { $('#view').innerHTML = '<div class="card"><div class="card-b">불러오는 중…</div></div>'; return; }
    var Q = S.polQ || pol.cur;
    var st = (pol.quarters || []).filter(function (x) { return x.quarter === Q; })[0] || pol.quarters[0];
    var nextDec = (pol.decisions || []).filter(function (d) { return d.quarter === pol.next; })[0];
    var curDec = (pol.decisions || []).filter(function (d) { return d.quarter === pol.cur; })[0];
    $('#view').innerHTML =
      (pol.due ? '<div class="callout warn"><div><b>' + esc(pol.due.quarter) + ' 우편 결정이 필요합니다.</b><br>' + esc(pol.due.summary || '') + ' — 분기 회의에서 계속 보낼지 정하세요.</div></div>' : '') +
      '<div class="card"><div class="card-h"><h2>분기 현황</h2><div class="right"><div class="seg">' +
        (pol.quarters || []).map(function (x) { return '<button data-act="pol-q" data-q="' + x.quarter + '" aria-pressed="' + (Q === x.quarter) + '">' + esc(x.label) + '</button>'; }).join('') +
      '</div></div></div>' +
      '<div class="card-b"><div class="stats">' +
        stat('보낸 우편', st.sent + '통', '우편 발송일 기록 기준') +
        stat('반송', st.returned + '건', st.return_pct != null ? '반송률 ' + st.return_pct + '%' : '반송률 —') +
        stat('주소 고침', st.fixed + '건', '고객이 넣은 새 주소') +
        stat('전자로 열어 봄', st.opened_pct != null ? st.opened_pct + '%' : '—', st.opened + '통 / 보낸 ' + st.sent + '통') +
        stat('우편료', st.cost != null ? money(st.cost) : '—', pol.cost ? '1통 ' + money(pol.cost) + ' × ' + st.sent : '1통 비용을 넣으면 계산') +
        stat('안 보냄', st.skipped + '건', '이유를 남긴 건') +
      '</div>' +
      '<p class="hint" style="margin-top:10px">‘전자로 열어 봄’은 보낸 우편 가운데 고객이 문자 링크·자료실에서 서류를 연 비율입니다. 이 숫자가 높으면 우편을 끊어도 되는지 판단하는 근거가 됩니다.</p></div></div>' +

      '<div class="grid2">' +
        '<div class="card"><div class="card-h"><h2>분기 결정</h2><div class="right"><span class="hint">대표·부대표·업무팀 관리자</span></div></div>' +
          '<div class="card-b" style="display:flex;flex-direction:column;gap:12px">' +
            '<div class="found"><div class="qname">' + esc(pol.next_label || pol.next) + ' <span class="badge ' + (nextDec ? (nextDec.mail === 'on' ? 'good' : 'warn') : '') + '">' + (nextDec ? (nextDec.mail === 'on' ? '계속 보냄' : '그만 — 전자만') : '아직 결정 전') + '</span></div>' +
              (nextDec ? '<div class="kmeta">' + esc(nextDec.note || '') + ' · ' + esc(nextDec.who || nextDec.decided_by || '') + ' ' + esc(fmtDay(nextDec.decided_at)) + '</div>' : '<div class="kmeta">다음 분기 시작 14일 전부터 알림이 뜹니다.</div>') +
              '<div class="btn-row"><button class="btn sm primary" data-act="decide" data-q="' + pol.next + '">' + esc(pol.next_label || pol.next) + ' 결정</button>' +
              '<button class="btn sm" data-act="decide" data-q="' + pol.cur + '">' + esc(pol.cur_label || pol.cur) + ' 다시 결정</button></div></div>' +
            '<div class="callout info"><div>‘그만 — 전자만’으로 정해도 <b>항상 우편을 원한 고객</b>에게는 계속 보냅니다. 그만두기 전에 그 고객을 한 번 확인하세요.</div></div>' +
            (pol.decisions && pol.decisions.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>분기</th><th>결정</th><th>메모</th><th>결정자</th><th>날짜</th></tr></thead><tbody>' +
              pol.decisions.map(function (d) {
                return '<tr><td>' + esc(d.quarter) + '</td><td>' + (d.mail === 'on' ? '<span class="badge good">계속</span>' : '<span class="badge warn">그만</span>') + '</td><td>' + esc(d.note || '') + '</td><td>' + esc(d.who || d.decided_by || '') + '</td><td>' + esc(fmtDay(d.decided_at)) + '</td></tr>';
              }).join('') + '</tbody></table></div>' : '') +
          '</div></div>' +
        '<div class="card"><div class="card-h"><h2>우편 1통 비용</h2></div><div class="card-b" style="display:flex;flex-direction:column;gap:10px">' +
          '<div class="field"><label for="cost">1통 비용 (원)</label><input class="inp" id="cost" inputmode="numeric" value="' + (pol.cost || '') + '" placeholder="예: 430"></div>' +
          '<p class="hint">분기 현황의 우편료가 이 값 × 보낸 통수로 계산됩니다.</p>' +
          '<div class="btn-row"><button class="btn soft" data-act="save-cost">저장</button></div>' +
          '<div class="callout info"><div>고객별로 <b>기본(회사 기준) / 항상 우편 / 우편 안 받음</b>을 정할 수 있습니다. 분기 결정보다 고객 설정이 먼저입니다.</div></div>' +
        '</div></div>' +
      '</div>' +

      customerPrefCard();
  }
  function stat(k, v, s) { return '<div class="stat accent"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div><div class="s">' + esc(s) + '</div></div>'; }
  function customerPrefCard() {
    var list = (S.pol.customers || []).filter(function (c) {
      var q = S.custQ.trim().toLowerCase();
      return !q || (c.name + ' ' + (c.address || '') + ' ' + (c.jiip || '')).toLowerCase().indexOf(q) >= 0;
    });
    var prefs = S.pol.prefs || {};
    return '<div class="card"><div class="card-h"><h2>고객별 우편 설정</h2>' +
      '<div class="right"><span class="hint">기본 ' + (prefs[''] || 0) + ' · 항상 우편 ' + (prefs['우편'] || 0) + ' · 우편 안 받음 ' + (prefs['전자'] || 0) + '</span>' +
      '<div class="search" style="max-width:260px">' + ICON.search + '<input class="inp" id="custSearch" type="search" placeholder="고객명 · 주소" value="' + esc(S.custQ) + '" aria-label="고객 검색"></div></div></div>' +
      '<div class="card-b tight">' + (S.pol.customers ? (list.length ? list.map(function (c) {
        return '<div class="todo" style="align-items:center"><div style="flex:1;min-width:0"><div class="t">' + esc(c.name) + ' ' + kindBadge(c.kind) + (c.jiip ? '<span class="badge jiip">' + esc(c.jiip) + '</span>' : '') + '</div>' +
          '<div class="d">' + esc(c.address || '주소 없음') + '</div></div>' +
          '<div class="seg" data-pref="' + c.id + '">' +
            prefBtn(c, '') + prefBtn(c, '우편') + prefBtn(c, '전자') +
          '</div></div>';
      }).join('') : '<div class="empty"><div class="big">조건에 맞는 고객이 없습니다</div></div>') : '<div class="empty"><div class="big">서버 모드에서는 고객 화면에서 설정합니다</div></div>') + '</div></div>';
  }
  function prefBtn(c, v) {
    var label = v === '' ? '기본' : v === '우편' ? '항상 우편' : '우편 안 받음';
    return '<button data-act="set-pref" data-id="' + c.id + '" data-p="' + v + '" title="' + (v === '' ? '회사 기준' : label) + '" aria-pressed="' + ((c.pref || '') === v) + '">' + label + '</button>';
  }

  /* ===== 4. 설정 ===== */
  function renderSettings() {
    var c = S.cfg || {};
    $('#view').innerHTML =
      '<div class="card"><div class="card-h"><h2>반송 자동 문자</h2></div><div class="card-b" style="display:flex;flex-direction:column;gap:14px">' +
        '<label class="todo" style="border:1px solid var(--line);border-radius:12px"><input type="checkbox" id="cfgOn" ' + (c.on ? 'checked' : '') + ' style="width:22px;height:22px;accent-color:var(--brand)">' +
          '<div style="flex:1"><div class="t">반송 등록 뒤 고객에게 주소 확인 문자 보내기</div><div class="d">끄면 바로 ‘연락 필요’로 두고 직원이 전화로 받습니다.</div></div></label>' +
        '<div class="field" style="max-width:280px"><label for="cfgHold">기다리는 시간 (분)</label><input class="inp" id="cfgHold" inputmode="numeric" value="' + (c.hold != null ? c.hold : 10) + '">' +
          '<span class="hint">0~60분. 잘못 등록했을 때 취소할 수 있는 시간입니다. 0이면 바로 보냅니다.</span></div>' +
        '<div class="btn-row"><button class="btn primary" data-act="save-cfg">저장</button><span class="hint">데모에서는 이대로 문자 기록이 쌓입니다.</span></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h2>연결</h2></div><div class="card-b">' +
        '<table class="tbl"><tbody>' +
          '<tr><th>모드</th><td>' + (api.isDemo ? '<b>데모</b> — 이 브라우저(localStorage)에만 저장' : '<b>서버 연결</b> — ' + esc(api.base || '(같은 서버)')) + '</td></tr>' +
          '<tr><th>서버 주소</th><td>' + esc(api.base || '(같은 서버)') + '</td></tr>' +
          '<tr><th>고객 확인 페이지</th><td>' + esc(cfg.customerPage || 'address-confirm.html') + '</td></tr>' +
        '</tbody></table>' +
        '<p class="hint" style="margin-top:10px">total 서버에 붙일 때는 <code>assets/config.js</code>의 <code>mode</code>를 <code>rest</code>, <code>apiBase</code>를 서버 주소로 바꾸면 됩니다. 주소 규격은 <a href="INTEGRATION.md" target="_blank" rel="noopener">INTEGRATION.md</a>에 있습니다.</p>' +
        (api.isDemo ? '<div class="btn-row" style="margin-top:12px"><button class="btn" data-act="demo-doc">새 증권 등록 시험</button><button class="btn danger" data-act="reset">데모 자료 처음으로</button></div>' : '') +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h2>폼텍 라벨</h2></div><div class="card-b">' +
        '<p class="small">기본값은 <b>3열 × 7행 (63.5 × 38.1mm)</b>입니다. 인쇄할 때 A4 · 여백 없음 · 배율 100%로 맞춰 주세요. 라벨 인쇄 창에서 시작 칸과 열 수를 바꿀 수 있습니다.</p>' +
        '<p class="hint" style="margin-top:8px">주소는 도로명이 있으면 도로명으로 나갑니다(우체국·택배 기준).</p>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h2>이 모듈이 하는 일</h2></div><div class="card-b">' +
        '<ul class="small" style="margin:0;padding-left:18px;line-height:1.8">' +
          '<li>자료실에 증권·가입증명서가 등록되면 보낼 목록이 자동으로 생깁니다(납입증명서 제외).</li>' +
          '<li>발송 완료를 누르면 <code>POST_SNDNG_DT</code>(발송일자)와 그 순간의 주소가 기록됩니다.</li>' +
          '<li>반송을 등록하면 고객(지입사 계약은 지입사)에게 주소 확인 문자를 보냅니다.</li>' +
          '<li>고객이 주소를 넣으면 고객 정보·이전 주소가 바로 갱신되고, 재발송 대기열과 ‘보험사 주소 반영’ 할 일이 생깁니다.</li>' +
          '<li>분기마다 ‘계속 보냄 / 그만(전자만)’을 기록하고, 보낸 우편·반송률·전자 열람·우편료를 모아 봅니다.</li>' +
        '</ul></div></div>';
  }

  /* ───────── 패널 ───────── */
  function openPanel(h, b, f) {
    $('#panelH').innerHTML = h;
    $('#panelB').innerHTML = b;
    $('#panelF').innerHTML = f || '';
    $('#panel').classList.add('open');
    $('#panel').setAttribute('aria-hidden', 'false');
    S.panel = true;
    document.body.style.overflow = 'hidden';
  }
  function closePanel() {
    $('#panel').classList.remove('open');
    $('#panel').setAttribute('aria-hidden', 'true');
    S.panel = null;
    document.body.style.overflow = '';
  }
  function showSendPanel(id) {
    var r = S.queue.rows.filter(function (x) { return x.id === Number(id); })[0];
    if (!r) return;
    var h = '<div><div class="qname" style="font-size:17px">' + esc(r.customer) + kindBadge(r.customer_kind) + prefBadge(r.pref) + '</div>' +
      '<div class="qsub">' + esc(r.contract) + (r.policy_no ? ' · ' + esc(r.policy_no) : '') + '</div></div>' +
      '<button class="icon-btn x" data-act="close-panel" aria-label="닫기">✕</button>';
    var b = '<div class="callout info"><div>이 줄은 <b>' + esc(r.source || '자료실 등록') + '</b>에서 자동으로 생겼습니다. 자료실에 서류가 올라오면 같은 계약은 한 줄로 묶입니다.</div></div>' +
      '<div class="field"><span class="lbl">받는 주소</span><div class="kbox"><div class="qaddr" style="margin:0"><span class="zip">' + esc(r.cur_zip || '—') + '</span><span class="txt">' + esc(r.cur_addr || '주소 없음') + '</span></div></div></div>' +
      '<div class="field"><span class="lbl">서류</span><div class="qdocs" style="justify-content:flex-start">' + (r.kinds || []).map(function (k) { return '<span class="badge">' + esc(k) + '</span>'; }).join('') + '</div></div>' +
      '<div class="field"><span class="lbl">기록</span><div class="kbox"><div class="kmeta">보낼 목록에 생긴 날: ' + esc(fmtDay(r.created_at)) + ' (' + ageTxt(r.age) + ')</div>' +
        '<div class="kmeta">발송일자(POST_SNDNG_DT): ' + esc(r.post_sndng_dt || '아직') + '</div>' +
        (r.reg_no ? '<div class="kmeta">등기번호: ' + esc(r.reg_no) + '</div>' : '') + '</div></div>' +
      '<div class="callout warn"><div>발송을 누르면 <b>그 순간의 주소</b>가 대장에 남습니다. 주소가 없는 고객은 발송에서 빠집니다.</div></div>';
    var f = '<button class="btn primary" data-act="send-one" data-id="' + r.id + '">이 건 발송 완료</button>' +
      '<button class="btn" data-act="copy-one-addr" data-id="' + r.id + '">주소 복사</button>' +
      '<button class="btn danger" data-act="skip-one" data-id="' + r.id + '">안 보냄</button>';
    openPanel(h, b, f);
  }
  function showReturnPanel(id) {
    var r = S.rets.concat(S.retsDone).filter(function (x) { return x.id === Number(id); })[0];
    if (!r) return;
    var h = '<div><div class="qname" style="font-size:17px">' + esc(r.customer) + kindBadge(r.customer_kind) + statusBadge(r) + '</div>' +
      '<div class="qsub">' + esc(r.reason_txt) + ' · ' + esc(fmtDay(r.created_at)) + ' 등록' + (r.round > 1 ? ' · ' + r.round + '차' : '') + '</div></div>' +
      '<button class="icon-btn x" data-act="close-panel" aria-label="닫기">✕</button>';
    var addr = '<div class="field"><span class="lbl">보낸 주소</span><div class="kbox"><div class="small">' + esc(r.addr_sent || '기록 없음') + '</div></div></div>';
    if (r.new_addr && !r.addr_same) {
      addr += '<div class="field"><span class="lbl">새 주소' + (r.addr_at ? ' · ' + esc(fmtDay(r.addr_at)) : '') + '</span><div class="kbox" style="border-color:#bfe3cd;background:#f6fdf9">' +
        '<div class="small"><b>(' + esc(r.new_zip || '') + ')</b> ' + esc(r.new_addr) + '</div><div class="kmeta">' + esc(r.addr_via || '') + '</div></div></div>';
    } else if (r.addr_same) {
      addr += '<div class="callout good"><div>고객이 <b>위 주소가 맞다</b>고 확인했습니다. 같은 주소로 다시 보내면 됩니다.</div></div>';
    }
    var logs = (r.sms_log || []).length ? '<div class="field"><span class="lbl">문자 기록</span><ul class="tl">' + r.sms_log.map(function (s) {
      return '<li class="hot"><div class="t">' + esc(fmtDay(s.at)) + ' ' + esc(fmtTime(s.at)) + ' · ' + esc(s.target) + ' ' + esc(s.to) + ' · ' + esc(s.kind === 'remind' ? '다시 안내' : s.kind === 'jiip' ? '지입사 안내' : '첫 안내') + '</div>' +
        '<div style="white-space:pre-wrap;margin-top:4px">' + esc(s.text) + '</div></li>';
    }).join('') + '</ul></div>' : '';
    var ct = '<div class="field"><span class="lbl">계약</span><div class="kbox">' + (r.contracts || []).map(function (k) {
      return '<div class="small">' + esc(k.label) + (k.policy_no ? ' · ' + esc(k.policy_no) : '') + (k.reg ? ' · ' + esc(k.reg) : '') + (k.jiip ? ' <span class="badge jiip">지입사</span>' : '') + '</div>';
    }).join('') + '</div></div>';
    var b = '<div class="callout ' + (r.turn ? 'warn' : 'info') + '"><div><b>' + esc(r.status) + '</b> — ' + esc(r.next || '') + '</div></div>' +
      addr + ct + logs +
      (r.note ? '<div class="field"><span class="lbl">메모</span><div class="small">' + esc(r.note) + '</div></div>' : '') +
      (r.new_addr && !r.addr_same && !r.insurer_at ? '<div class="callout warn"><div>약관상 계약자가 주소를 알리지 않으면 보험사의 옛 주소 통지도 도달한 것으로 봅니다. <b>보험사 주소 반영</b>까지 끝내야 고객 손해를 막습니다.</div></div>' :
        (r.insurer_at ? '<div class="callout good"><div>보험사 주소 반영 완료 — ' + esc(fmtDay(r.insurer_at)) + '</div></div>' : ''));
    var f = '';
    if (r.status === '문자 대기') f += '<button class="btn soft" data-act="ret-now" data-id="' + r.id + '">지금 보내기</button><button class="btn danger" data-act="ret-cancel" data-id="' + r.id + '">등록 취소</button>';
    if (['주소 기다림', '지입사 확인 중', '연락 필요'].indexOf(r.status) >= 0) {
      f += '<button class="btn primary" data-act="addr-open" data-id="' + r.id + '">주소 넣기</button>';
      f += '<button class="btn" data-act="ret-resms" data-id="' + r.id + '">다시 문자</button>';
      f += '<button class="btn danger" data-act="ret-close" data-id="' + r.id + '">끝내기</button>';
    }
    if (r.status === '주소 받음') {
      f += '<button class="btn primary" data-act="ret-resend" data-id="' + r.id + '">' + (r.addr_same ? '같은 주소로 재발송' : '새 주소로 재발송') + '</button>';
      if (r.new_addr && !r.addr_same && !r.insurer_at) f += '<button class="btn soft" data-act="ret-insurer" data-id="' + r.id + '">보험사 주소 반영</button>';
      f += '<button class="btn danger" data-act="ret-close" data-id="' + r.id + '">끝내기</button>';
    }
    if (r.status === '재발송함' && r.new_addr && !r.addr_same && !r.insurer_at) f += '<button class="btn soft" data-act="ret-insurer" data-id="' + r.id + '">보험사 주소 반영</button>';
    f += '<button class="btn ghost" data-act="copy-sms" data-id="' + r.id + '" title="문자 문구 복사">' + ICON.copy + ' 문자 복사</button>';
    if (api.isDemo && ['문자 대기', '주소 기다림', '지입사 확인 중', '연락 필요'].indexOf(r.status) >= 0) {
      f += '<button class="btn ghost" data-act="demo-open-addr" data-id="' + r.id + '">고객 링크 열기</button>';
    }
    openPanel(h, b, f);
  }

  /* ───────── 모달 ───────── */
  function openModal(opt) {
    $('#modalTitle').textContent = opt.title || '';
    $('#modalB').innerHTML = opt.body || '';
    $('#modalF').innerHTML = (opt.foot || '') +
      '<button type="button" class="btn" data-act="close-modal">' + (opt.cancel || '닫기') + '</button>' +
      (opt.ok ? '<button type="submit" class="btn primary">' + opt.ok + '</button>' : '');
    S.modalSubmit = opt.onSubmit || null;
    $('#modal').classList.add('open');
    $('#modal').setAttribute('aria-hidden', 'false');
    setTimeout(function () { var el = $('#modalB input, #modalB select, #modalB textarea'); if (el) el.focus(); }, 30);
  }
  function closeModal() {
    $('#modal').classList.remove('open');
    $('#modal').setAttribute('aria-hidden', 'true');
    S.modalSubmit = null;
  }
  function modalErr(msg) { var e = $('#modalErr'); if (e) e.textContent = msg || ''; }

  /* ───────── 인쇄·내보내기 ───────── */
  function targetRows() {
    var all = currentSendRows();
    return { rows: all.filter(function (r) { return r.cur_addr; }), noAddr: all.filter(function (r) { return !r.cur_addr; }).length };
  }
  function labelsModal() {
    var t = targetRows(), rows = t.rows;
    if (!rows.length) return toast(t.noAddr ? '주소가 없는 건은 라벨로 뽑을 수 없습니다 — 고객 정보에 주소를 넣어 주세요' : '먼저 보낼 것을 고르세요', 'bad');
    if (t.noAddr) toast('주소 없는 ' + t.noAddr + '건은 빼고 인쇄합니다', '');
    openModal({
      title: '폼텍 라벨 인쇄',
      body: '<div class="callout info"><div>' + rows.length + '건을 라벨로 인쇄합니다. A4 · 여백 없음 · 배율 100%로 인쇄하세요.</div></div>' +
        (t.noAddr ? '<div class="callout warn"><div>주소가 없는 <b>' + t.noAddr + '건</b>은 빠집니다.</div></div>' : '') +
        '<div class="field"><label for="labCols">라벨 열 수</label><select class="inp" id="labCols"><option value="2">2열</option><option value="3" selected>3열 (기본)</option><option value="4">4열</option></select></div>' +
        '<div class="field"><label for="labStart">시작 칸 (이미 쓴 라벨 건너뛰기)</label><input class="inp" id="labStart" inputmode="numeric" value="1" min="1" max="21"></div>' +
        '<p class="hint">3열 × 7행이면 A4 한 장에 21칸입니다.</p><div class="err" id="modalErr"></div>',
      ok: '인쇄하기',
      onSubmit: function () {
        var cols = Number($('#labCols').value) || 3;
        var start = Math.max(1, Math.min(21, Number($('#labStart').value) || 1));
        closeModal();
        printLabels(rows, cols, start - 1);
      }
    });
  }
  function printLabels(rows, cols, skip) {
    var sender = S.cfg.sender || {};
    var rowsPerPage = 7;
    var per = cols * rowsPerPage;
    var all = [];
    for (var i = 0; i < skip; i += 1) all.push('<div class="label-cell empty"></div>');
    rows.forEach(function (r) {
      all.push('<div class="label-cell">' +
        '<div class="label-top"><span class="label-zip">' + esc(r.cur_zip || '') + '</span><span>' + esc((r.kinds || [])[0] || '') + '</span></div>' +
        '<div class="label-to">' + esc(r.customer) + '</div>' +
        '<div class="label-addr">' + esc(r.cur_addr || '') + '</div>' +
        '<div class="label-foot"><span class="label-sender">보내는 사람 ' + esc(sender.name || '에이원코리아') + ' ' + esc(sender.tel || '') + '</span><span class="pol">' + esc(r.policy_no || '') + '</span></div>' +
      '</div>');
    });
    while (all.length % per) all.push('<div class="label-cell empty"></div>');
    var html = '';
    for (var page = 0; page < all.length / per; page += 1) {
      html += '<div class="sheet"><div class="label-grid" style="--cols:' + cols + '">' + all.slice(page * per, (page + 1) * per).join('') + '</div></div>';
    }
    doPrint(html);
    toast(rows.length + '건 라벨 — 인쇄 창에서 A4·여백 없음을 확인하세요');
    setTimeout(function () { maybeAskSent(rows); }, 600);
  }
  function maybeAskSent(rows) {
    if (!rows.length) return;
    openModal({
      title: '라벨을 인쇄했습니다',
      body: '<div class="callout info"><div>' + rows.length + '건을 실제로 부쳤다면 발송 완료로 기록하세요. 발송일자(POST_SNDNG_DT)와 그 순간의 주소가 남습니다.</div></div>' +
        (rows.length === 1 ? '<div class="field"><label for="regNo">등기번호 (선택)</label><input class="inp" id="regNo" placeholder="예: R771802"></div>' : '') +
        '<div class="err" id="modalErr"></div>',
      ok: '발송 완료로 기록',
      cancel: '아직',
      onSubmit: function () {
        var no = rows.length === 1 && $('#regNo') ? $('#regNo').value : '';
        closeModal();
        doSend(rows.map(function (r) { return r.id; }), no);
      }
    });
  }
  function printLedger(rows) {
    var sender = S.cfg.sender || {};
    var today = new Date();
    var html = '<div class="sheet ledger-sheet"><h1>우편 발송 대장</h1>' +
      '<div class="meta"><span>' + esc(sender.name || '에이원코리아') + '</span><span>출력일 ' + todayISO() + '</span><span>대상 ' + rows.length + '건</span></div>' +
      '<table><thead><tr><th>#</th><th>고객</th><th>구분</th><th>계약·증권번호</th><th>서류</th><th>우편번호</th><th>주소</th><th>발송일</th><th>등기번호</th><th>담당</th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr><td class="r">' + (i + 1) + '</td><td>' + esc(r.customer) + '</td><td>' + esc(r.customer_kind + (r.jiip ? ' · 지입사 ' + r.jiip : '')) + '</td>' +
          '<td>' + esc((r.contract || '') + (r.policy_no ? ' ' + r.policy_no : '')) + '</td><td>' + esc((r.kinds || []).join(', ')) + '</td>' +
          '<td>' + esc(r.cur_zip || '') + '</td><td>' + esc(r.cur_addr || '') + '</td><td>' + esc(r.post_sndng_dt || '') + '</td><td>' + esc(r.reg_no || '') + '</td><td>' + esc(r.sent_name || '') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="sign"><span>담당자 ______________</span><span>확인 ______________</span></div></div>';
    doPrint(html);
    toast('발송 대장을 인쇄합니다');
  }
  function csvDownload(rows) {
    if (!rows.length) return toast('먼저 보낼 것을 고르세요', 'bad');
    var head = ['고객명', '고객유형', '지입사', '계약', '증권번호', '차량번호', '서류', '우편번호', '주소', '발송일(POST_SNDNG_DT)', '등기번호', '담당'];
    var lines = [head.join(',')];
    rows.forEach(function (r) {
      lines.push([r.customer, r.customer_kind, r.jiip || '', r.contract || '', r.policy_no || '', r.reg || '', (r.kinds || []).join(' / '),
        r.cur_zip || '', r.cur_addr || '', r.post_sndng_dt || '', r.reg_no || '', r.sent_name || ''].map(function (v) {
        var s = String(v == null ? '' : v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? '"' + s + '"' : s;
      }).join(','));
    });
    download('우편발송대장_' + todayISO().replace(/-/g, '') + '.csv', '\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    toast(rows.length + '건 CSV 저장');
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }
  function doPrint(html) {
    $('#printRoot').innerHTML = html;
    window.A1Post.lastPrint = { at: new Date().toISOString(), html: html };
    setTimeout(function () { window.print(); }, 80);
  }
  window.addEventListener('afterprint', function () {
    setTimeout(function () { $('#printRoot').innerHTML = ''; }, 1500);
  });

  /* ───────── 동작 ───────── */
  async function doSend(ids, no) {
    try {
      busy(true);
      var r = await api.send(ids, no);
      S.sel = {};
      await refreshAll();
      toast(r.done + '건 발송 완료 · 발송일자 기록' + (r.skipped ? ' · 주소 없음 ' + r.skipped + '건 제외' : ''), 'good');
      if (r.why) setTimeout(function () { toast(r.why); }, 900);
    } catch (e) { toast(e.message, 'bad'); }
    finally { busy(false); markSel(); }
  }
  async function doSkip(id, why) {
    try { await api.skip(id, why); closePanel(); await refreshAll(); toast('안 보냄으로 기록했습니다'); }
    catch (e) { toast(e.message, 'bad'); }
  }
  async function copy(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); toast('복사했습니다'); return; }
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('복사했습니다');
    } catch (e) { toast('복사하지 못했습니다 — 길게 눌러 복사하세요', 'bad'); }
  }
  function copyReturnSms(id) {
    var r = S.rets.concat(S.retsDone).filter(function (x) { return x.id === Number(id); })[0];
    if (!r) return;
    if (!r.preview && !api.isDemo) return toast('서버가 문자를 만들어 보냅니다 — 미리보기는 데모에서만 보입니다');
    copy(r.preview || buildPreview(r));
  }
  function buildPreview(r) {
    var sign = '\n— ' + ((S.cfg.sender && S.cfg.sender.name) || '에이원코리아');
    var link = new URL((cfg.customerPage || 'address-confirm.html'), location.href).href + '?r=' + r.id;
    return '[에이원코리아] ' + r.customer + '님, 보내 드린 우편이 ' + (r.reason_txt || '반송') + '(으)로 돌아왔습니다.\n바른 주소를 알려 주시면 다시 보내 드립니다.\n주소 확인: ' + link + sign;
  }
  function copyAddresses(rows) {
    if (!rows.length) return toast('먼저 보낼 것을 고르세요', 'bad');
    var text = rows.map(function (r) { return [r.customer, '(' + (r.cur_zip || '') + ') ' + (r.cur_addr || '')].join('\t'); }).join('\n');
    copy(text);
  }

  /* 반송 등록 */
  function regPick(id) {
    api.findById(id).then(function (c) {
      if (!c) return toast('고객을 찾을 수 없습니다', 'bad');
      S.reg.customer = c;
      S.reg.contracts = {};
      (c.contracts || []).forEach(function (k) { S.reg.contracts[k.id] = true; });
      S.reg.reason = S.reg.reason || '반송';
      S.reg.addr = c.address || '';
      renderView();
    }).catch(function (e) { toast(e.message || '고객을 불러오지 못했습니다', 'bad'); });
  }
  function regSubmit() {
    var c = S.reg.customer;
    if (!c) return;
    var ids = Object.keys(S.reg.contracts).filter(function (k) { return S.reg.contracts[k]; }).map(Number);
    if (!ids.length) return toast('봉투에 든 계약을 하나 이상 고르세요', 'bad');
    if (!S.reg.reason) return toast('반송 사유를 골라 주세요', 'bad');
    var addr = $('#regAddr') ? $('#regAddr').value : S.reg.addr;
    api.registerReturn({ customerId: c.id, contractIds: ids, reason: S.reg.reason, addrSent: addr, note: $('#regNote') ? $('#regNote').value : '' })
      .then(function (res) {
        S.regResult = res;
        S.reg = { customer: null, contracts: {}, reason: '', addr: '', note: '' };
        refreshAll();
      })
      .catch(function (e) { toast(e.message, 'bad'); });
  }

  /* 주소 넣기 (직원) */
  function addrModal(id) {
    var r = S.rets.concat(S.retsDone).filter(function (x) { return x.id === Number(id); })[0];
    if (!r) return;
    openModal({
      title: r.customer + ' — 주소 넣기',
      body: '<div class="callout info"><div>전화·지입사 회신으로 받은 주소를 넣으면 고객 정보가 바로 바뀌고 재발송 대기열에 들어갑니다.</div></div>' +
        '<div class="field"><label for="aZip">우편번호 5자리</label><input class="inp" id="aZip" inputmode="numeric" maxlength="5" value="' + esc(r.new_zip || r.cur_zip || '') + '"></div>' +
        '<div class="field"><label for="aRoad">도로명 주소</label><input class="inp" id="aRoad" value="' + esc(r.new_addr || r.cur_addr || '') + '" placeholder="예: 경기 부천시 평천로 655"></div>' +
        '<div class="field"><label for="aDetail">상세주소 (동·호수)</label><input class="inp" id="aDetail" placeholder="예: 105동 402호"></div>' +
        '<label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="aNoDetail" style="width:20px;height:20px"> 상세주소 없음 (단독주택 등)</label>' +
        '<div class="field"><label for="aVia">어디서 받았나</label><select class="inp" id="aVia"><option>전화</option><option>지입사 회신</option><option>직접</option></select></div>' +
        '<div class="err" id="modalErr"></div>',
      ok: '주소 저장',
      onSubmit: function () {
        var zip = $('#aZip').value.trim(), road = $('#aRoad').value.trim(), detail = $('#aDetail').value.trim();
        if (!/^\d{5}$/.test(digits(zip))) return modalErr('우편번호 5자리를 넣어 주세요');
        if (road.length < 5) return modalErr('주소를 넣어 주세요');
        if (!detail && !$('#aNoDetail').checked) return modalErr('상세주소를 넣거나 "상세주소 없음"을 눌러 주세요');
        api.saveAddrStaff(id, { zip: zip, addr1: road, addr2: detail, noDetail: $('#aNoDetail').checked, via: $('#aVia').value })
          .then(function () { closeModal(); closePanel(); refreshAll(); toast('주소를 저장했습니다 — 재발송 대기열에 넣었습니다', 'good'); })
          .catch(function (e) { modalErr(e.message); });
      }
    });
  }

  /* 반송 처리 공통 */
  function returnAct(fn, okMsg) {
    return fn().then(function () { closePanel(); return refreshAll(); }).then(function () { if (okMsg) toast(okMsg, 'good'); })
      .catch(function (e) { toast(e.message, 'bad'); });
  }

  function resendModal(id) {
    openModal({
      title: '새 주소로 다시 보내기',
      body: '<div class="callout info"><div>재발송으로 기록하면 ‘보낼 것’에 이 고객의 서류가 다시 올라갑니다. 실제 우편은 발송 대장·라벨로 처리하세요.</div></div>' +
        '<div class="field"><label for="rsNo">등기번호 (선택)</label><input class="inp" id="rsNo" placeholder="예: R771802"></div><div class="err" id="modalErr"></div>',
      ok: '재발송 기록',
      onSubmit: function () {
        var no = $('#rsNo').value;
        closeModal();
        returnAct(function () { return api.resendReturn(id, { no: no }); }, '재발송으로 기록했습니다');
      }
    });
  }
  function closeReturnModal(id) {
    openModal({
      title: '반송 끝내기',
      body: '<div class="field"><label for="why">왜 끝내나요?</label><input class="inp" id="why" placeholder="예: 고객이 우편 필요 없다고 함 (자료실에서 받음)"></div><div class="err" id="modalErr"></div>',
      ok: '끝내기',
      onSubmit: function () {
        var why = $('#why').value;
        if (why.trim().length < 2) return modalErr('이유를 짧게 적어 주세요');
        closeModal();
        returnAct(function () { return api.closeReturn(id, why); }, '반송을 끝냈습니다');
      }
    });
  }
  function skipModal(id) {
    openModal({
      title: '안 보냄으로 기록',
      body: '<div class="field"><label for="why">이유</label><input class="inp" id="why" placeholder="예: 고객이 전자로만 받겠다고 함"></div><div class="err" id="modalErr"></div>',
      ok: '기록',
      onSubmit: function () {
        var why = $('#why').value;
        if (why.trim().length < 2) return modalErr('이유를 짧게 적어 주세요');
        closeModal();
        if (S.panel) closePanel();
        doSkip(id, why);
      }
    });
  }
  function decideModal(Q) {
    var pol = S.pol;
    var label = Q === pol.next ? pol.next_label : pol.cur_label;
    openModal({
      title: label + ' 우편 결정',
      body: '<div class="callout info"><div>결정한 분기 첫날부터 적용됩니다. 지난 분기는 바꿀 수 없습니다.</div></div>' +
        '<div class="field"><label>결정</label><div class="btn-row"><label class="btn sm"><input type="radio" name="mail" value="on" checked> 계속 보냄</label>' +
        '<label class="btn sm"><input type="radio" name="mail" value="off"> 그만 — 전자만</label></div></div>' +
        '<div class="field"><label for="pNote">회의 메모 (선택)</label><input class="inp" id="pNote" placeholder="예: 반송률 4% — 1분기까지 더 보기로"></div><div class="err" id="modalErr"></div>',
      ok: '기록',
      onSubmit: function () {
        var mail = ($$('input[name=mail]').filter(function (x) { return x.checked; })[0] || {}).value || 'on';
        api.decide({ quarter: Q, mail: mail, note: $('#pNote').value })
          .then(function () { closeModal(); refreshAll(); toast('분기 결정을 기록했습니다', 'good'); })
          .catch(function (e) { modalErr(e.message); });
      }
    });
  }
  function demoDocModal() {
    api.docs().then(function (list) {
      openModal({
        title: '자료실에 서류 올리기 (시험)',
        body: '<div class="callout info"><div>증권·가입증명서를 올리면 ‘보낼 것’에 자동으로 생기는지 봅니다. 납입증명서는 우편 대상이 아닙니다.</div></div>' +
          '<div class="field"><label for="dContract">계약</label><select class="inp" id="dContract">' + list.map(function (x) {
            return '<option value="' + x.contract_id + '">' + esc(x.customer + ' — ' + x.label) + '</option>';
          }).join('') + '</select></div>' +
          '<div class="field"><label for="dKind">서류</label><select class="inp" id="dKind"><option>증권</option><option>가입증명서</option><option>납입증명서</option></select></div>' +
          '<div class="err" id="modalErr"></div>',
        ok: '올리기',
        onSubmit: function () {
          var cid = Number($('#dContract').value), kind = $('#dKind').value;
          api.docRegister(cid, kind).then(function (r) {
            closeModal();
            refreshAll();
            toast(r.message || r.skipped || '처리했습니다', r.skipped ? '' : 'good');
          }).catch(function (e) { modalErr(e.message); });
        }
      });
    }).catch(function (e) { toast(e.message, 'bad'); });
  }
  function prefModal() { /* 설정은 현황 탭에서 바로 */ }

  function helpModal() {
    openModal({
      title: 'A1 우편 — 쓰는 법',
      body: '<div class="small" style="line-height:1.75">' +
        '<p><b>보낼 것</b> — 자료실에 증권·가입증명서가 올라오면 자동으로 쌓입니다. 고르고 <b>선택 발송</b>을 누르면 발송일자(POST_SNDNG_DT)가 남습니다. 폼텍 라벨·발송 대장·CSV로 뽑아 실제 우편을 부치세요.</p>' +
        '<p style="margin-top:8px"><b>반송</b> — 돌아온 봉투를 보고 이름·차량번호·증권번호·전화 끝 4자리로 찾아 등록합니다. 고객에게 주소 확인 문자(링크)가 가고, 고객이 주소를 넣으면 고객 정보가 바로 바뀌고 재발송 대기열과 ‘보험사 주소 반영’ 할 일이 생깁니다. 지입사 계약은 지입사 담당자에게 링크 없이 문자를 보냅니다.</p>' +
        '<p style="margin-top:8px"><b>현황·분기</b> — 보낸 우편·반송률·전자 열람·우편료를 분기별로 보고, 분기 회의에서 ‘계속/그만’을 기록합니다. 고객별로 항상 우편·우편 안 받음을 정할 수 있습니다.</p>' +
        '<p style="margin-top:8px" class="mute">데모 자료는 모두 가짜입니다. 실제 연결 방법은 INTEGRATION.md를 보세요.</p>' +
        '</div>',
      cancel: '닫기'
    });
  }

  /* ───────── 이벤트 ───────── */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');

    if (act === 'go') {
      S.tab = el.getAttribute('data-tab');
      renderView(); syncTabs();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (act === 'close-panel') return closePanel();
    if (act === 'close-modal') return closeModal();
    if (act === 'reload') return refreshAll();
    if (act === 'to-demo') { var u = new URL(location.href); u.searchParams.set('mode', 'demo'); location.href = u.toString(); return; }
    if (act === 'filter') { S.filter = el.getAttribute('data-f'); renderSend(); return; }
    if (act === 'ret-filter') { S.retFilter = el.getAttribute('data-f'); renderReturns(); return; }
    if (act === 'pol-q') { S.polQ = el.getAttribute('data-q'); renderStatus(); return; }
    if (act === 'send-panel') return showSendPanel(id);
    if (act === 'ret-panel') return showReturnPanel(id);

    if (act === 'labels') return labelsModal();
    if (act === 'ledger') {
      var lt = targetRows();
      if (!lt.rows.length) return toast('먼저 보낼 것을 고르세요', 'bad');
      if (lt.noAddr) toast('주소 없는 ' + lt.noAddr + '건은 빼고 인쇄합니다');
      return printLedger(lt.rows);
    }
    if (act === 'csv') {
      var ct = targetRows();
      if (!ct.rows.length) return toast('먼저 보낼 것을 고르세요', 'bad');
      if (ct.noAddr) toast('주소 없는 ' + ct.noAddr + '건은 빼고 저장합니다');
      return csvDownload(ct.rows);
    }
    if (act === 'copy-addr') return copyAddresses(targetRows().rows);
    if (act === 'copy-one-addr') {
      var r = S.queue.rows.filter(function (x) { return x.id === Number(id); })[0];
      return copy('(' + (r.cur_zip || '') + ') ' + (r.cur_addr || ''));
    }
    if (act === 'send-go') {
      var sel = Object.keys(S.sel).filter(function (k) { return S.sel[k]; });
      if (!sel.length) return toast('보낼 것을 먼저 고르세요', 'bad');
      var rs = S.queue.rows.filter(function (x) { return S.sel[x.id]; });
      var noAddr = rs.filter(function (x) { return !x.cur_addr; }).length;
      openModal({
        title: rs.length + '건 발송 완료로 기록',
        body: '<div class="callout info"><div>발송일자(POST_SNDNG_DT)와 지금 고객 주소가 대장에 남습니다.</div></div>' +
          (noAddr ? '<div class="callout warn"><div>주소가 없는 <b>' + noAddr + '건</b>은 빠집니다. 고객 정보에 주소를 먼저 넣어 주세요.</div></div>' : '') +
          (rs.length === 1 ? '<div class="field"><label for="regNo">등기번호 (선택)</label><input class="inp" id="regNo" placeholder="예: R771802"></div>' : '') +
          '<div class="err" id="modalErr"></div>',
        ok: '발송 완료',
        onSubmit: function () {
          var no = rs.length === 1 && $('#regNo') ? $('#regNo').value : '';
          closeModal();
          doSend(rs.map(function (x) { return x.id; }), no);
        }
      });
      return;
    }
    if (act === 'send-one') {
      var one = S.queue.rows.filter(function (x) { return x.id === Number(id); })[0];
      if (!one) return;
      openModal({
        title: one.customer + ' 발송 완료',
        body: (one.cur_addr ? '' : '<div class="callout warn"><div>주소가 없어 발송할 수 없습니다. 고객 정보에 주소를 넣어 주세요.</div></div>') +
          '<div class="field"><label for="regNo">등기번호 (선택)</label><input class="inp" id="regNo"></div><div class="err" id="modalErr"></div>',
        ok: '기록',
        onSubmit: function () { var no = $('#regNo').value; closeModal(); doSend([one.id], no); }
      });
      return;
    }
    if (act === 'skip-one') return skipModal(id);
    if (act === 'demo-doc') return demoDocModal();
    if (act === 'reset') {
      openModal({
        title: '데모 자료를 처음으로', body: '<p>이 브라우저에 쌓인 데모 기록이 모두 지워지고 처음 자료로 돌아갑니다.</p>',
        ok: '처음으로', cancel: '취소',
        onSubmit: function () {
          window.PostDemo.reset(); closeModal(); S.sel = {}; S.regResult = null; refreshAll(); toast('데모 자료를 처음으로 되돌렸습니다');
        }
      });
      return;
    }

    /* 반송 등록 */
    if (act === 'reg-pick') return regPick(id);
    if (act === 'reg-reset') {
      S.reg = { customer: null, contracts: {}, reason: '', addr: '', note: '' }; S.regResult = null; S.regResults = null; S.regQ = '';
      renderReturns(); return;
    }
    if (act === 'reg-submit') return regSubmit();
    if (act === 'reg-reason') {
      if ($('#regAddr')) S.reg.addr = $('#regAddr').value;
      if ($('#regNote')) S.reg.note = $('#regNote').value;
      S.reg.reason = el.getAttribute('data-r'); renderReturns(); return;
    }

    /* 반송 처리 */
    if (act === 'ret-now') {
      return api.nowReturn(id).then(function (row) {
        if (S.regResult && String(S.regResult.id) === String(id)) {
          S.regResult.status = row.status; S.regResult.send_at = row.send_at;
        }
        return refreshAll();
      }).then(function () { toast('문자를 보냈습니다', 'good'); }).catch(function (e) { toast(e.message, 'bad'); });
    }
    if (act === 'ret-cancel') {
      return api.cancelReturn(id).then(function () {
        if (S.regResult && String(S.regResult.id) === String(id)) S.regResult = null;
        return refreshAll();
      }).then(function () { toast('등록을 취소했습니다', 'good'); }).catch(function (e) { toast(e.message, 'bad'); });
    }
    if (act === 'ret-resms') return returnAct(function () { return api.resmsReturn(id); }, '문자를 다시 보냈습니다');
    if (act === 'ret-resend') return resendModal(id);
    if (act === 'ret-insurer') return returnAct(function () { return api.insurerReturn(id); }, '보험사 주소 반영 완료');
    if (act === 'ret-close') return closeReturnModal(id);
    if (act === 'addr-open') return addrModal(id);
    if (act === 'copy-sms') return copyReturnSms(id);

    /* 현황 */
    if (act === 'save-cost') {
      var v = $('#cost') ? $('#cost').value : '';
      api.setCost(v).then(function () { refreshAll(); toast('저장했습니다', 'good'); }).catch(function (e) { toast(e.message, 'bad'); });
      return;
    }
    if (act === 'decide') return decideModal(el.getAttribute('data-q'));
    if (act === 'set-pref') {
      var p = el.getAttribute('data-p');
      api.setPref(id, p).then(function () { refreshAll(); toast('고객 우편 설정을 바꿨습니다', 'good'); }).catch(function (e) { toast(e.message, 'bad'); });
      return;
    }
    if (act === 'save-cfg') {
      var on = $('#cfgOn').checked, hold = $('#cfgHold').value;
      api.setConfig({ on: on, hold: hold }).then(function () { refreshAll(); toast('저장했습니다', 'good'); }).catch(function (e) { toast(e.message, 'bad'); });
      return;
    }
    if (act === 'demo-open-addr') {
      window.open((cfg.customerPage || 'address-confirm.html') + '?r=' + id, '_blank');
      return;
    }
  });

  document.addEventListener('change', function (ev) {
    var el = ev.target;
    var act = el.getAttribute && el.getAttribute('data-act');
    if (act === 'pick') {
      var id = el.getAttribute('data-id');
      S.sel[id] = el.checked;
      if (!el.checked) delete S.sel[id];
      markSel(); return;
    }
    if (act === 'reg-k') {
      S.reg.contracts[el.getAttribute('data-id')] = el.checked; return;
    }
    if (act === 'task-done') {
      api.taskDone(el.getAttribute('data-id')).then(function () { refreshAll(); toast('할 일을 끝냈습니다', 'good'); });
      return;
    }
    if (el.id === 'selAll') {
      var on = el.checked;
      $$('.qrow').forEach(function (row) {
        var rid = row.getAttribute('data-row');
        S.sel[rid] = on;
        if (!on) delete S.sel[rid];
      });
      markSel(); return;
    }
    if (el.id === 'cfgOn') { /* 저장 버튼에서 처리 */ }
  });

  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.id === 'sendSearch') {
      S.q = el.value;
      var list = $('#sendList');
      if (list) list.innerHTML = sendListHtml(sendFiltered());
      return;
    }
    if (el.id === 'custSearch') {
      S.custQ = el.value;
      var card = el.closest('.card');
      if (card) {
        var html = customerPrefCard();
        var tmp = document.createElement('div'); tmp.innerHTML = html;
        var newBody = tmp.querySelector('.card-b');
        var oldBody = card.querySelector('.card-b');
        if (newBody && oldBody) oldBody.innerHTML = newBody.innerHTML;
      }
      return;
    }
    if (el.id === 'regSearch') {
      S.regQ = el.value;
      if (S.regQ.trim().length < 2) { S.regResults = null; updateRegResults(); return; }
      clearTimeout(S._regT);
      S._regT = setTimeout(function () {
        api.find(S.regQ).then(function (rows) { S.regResults = rows; updateRegResults(); }).catch(function () { });
      }, 180);
    }
  });
  function updateRegResults() {
    var host = $('#regSearch');
    if (!host) return;
    var card = host.closest('.card-b');
    if (!card) return;
    var scroll = window.scrollY;
    renderReturns();
    window.scrollTo({ top: scroll, behavior: 'auto' });
    var inp = $('#regSearch');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }

  document.addEventListener('submit', function (ev) {
    if (ev.target.id !== 'modalForm') return;
    ev.preventDefault();
    modalErr('');
    if (S.modalSubmit) {
      try { S.modalSubmit(ev); } catch (e) { modalErr(e.message); }
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      if ($('#modal').classList.contains('open')) closeModal();
      else if ($('#panel').classList.contains('open')) closePanel();
    }
  });

  /* ───────── 시작 ───────── */
  function tick() {
    if (S.busy) return;
    var typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    api.sweep();
    Promise.all([api.queue(), api.returns('open'), api.returns('done')]).then(function (r) {
      S.queue = r[0]; S.rets = r[1]; S.retsDone = r[2];
      syncTabs(); renderAlerts();
      if (typing || S.panel || $('#modal').classList.contains('open')) return;
      if (S.tab === 'send' || S.tab === 'ret') renderView();
    }).catch(function () { });
  }
  async function boot() {
    var d = new Date();
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    $('#todayLabel').textContent = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + days[d.getDay()] + ')';
    $('#btnHelp').addEventListener('click', helpModal);
    buildTabs();
    await refreshAll();
    setInterval(tick, 30000);
    window.addEventListener('storage', function (e) {
      if (!api.isDemo) return;
      if (e.key === window.PostDemo.KEY) refreshAll();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { api.sweep(); refreshAll(); }
    });
  }

  /* 시험용 손잡이 */
  window.A1Post = { state: S, refresh: refreshAll, api: api };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
