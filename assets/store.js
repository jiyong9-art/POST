/* A1 우편 모듈 — 데모 저장소 + 업무 규칙
 *
 *  total 서버(v0.9.9.4 / v0.9.9.5)의 규칙을 그대로 옮겨 왔습니다.
 *   · 반송 등록 → N분 뒤 고객에게 주소 확인 문자(지입사는 지입사 담당자에게 링크 없이)
 *   · 고객이 주소를 넣으면 고객 정보 갱신 + 이전 주소 기록 + 재발송 대기열 + '보험사 주소 반영' 할 일
 *   · 3일 무응답이면 한 번 더, 7일이면 '연락 필요'
 *   · 우편 보낼 목록은 증권·가입증명서 등록에서 자동 생성(납입증명서 제외), 고객 우편 설정·분기 결정이 앞선다
 */
(function () {
  'use strict';

  var KEY = 'a1post.db.v1';
  var REASONS = ['반송', '이사감', '주소불명', '수취인불명', '폐문부재', '기타'];
  var REASON_TXT = { 반송: '반송', 이사감: '이사 감', 주소불명: '주소 불명', 수취인불명: '받는 분 불명', 폐문부재: '계시지 않음(폐문부재)', 기타: '반송' };
  var WHY = { 이사감: '이사 가신 것으로 확인되어 ', 주소불명: '주소를 찾을 수 없어 ', 수취인불명: '받는 분을 찾을 수 없어 ', 폐문부재: '여러 번 찾아갔지만 계시지 않아 ' };
  var OPEN = ['문자 대기', '주소 기다림', '지입사 확인 중', '연락 필요', '주소 받음'];
  var LINK_DAYS = 7, REMIND_DAYS = 3, GIVEUP_DAYS = 7, MAX_TRY = 5, LOCK_MIN = 30;
  var MAILKIND = function (k) { return String(k || '').indexOf('납입') !== 0; };

  function p2(n) { return String(n).padStart(2, '0'); }
  function dstr(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function dt(d, hh, mm, ss) { return dstr(d) + ' ' + p2(hh) + ':' + p2(mm) + ':' + p2(ss || 0); }
  function nowDT() { var d = new Date(); return dt(d, d.getHours(), d.getMinutes(), d.getSeconds()); }
  function todayISO() { return dstr(new Date()); }
  function parse(s) {
    if (!s) return null;
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  function dateOnly(s) { return String(s || '').slice(0, 10); }
  function addMinutes(base, n) { var d = new Date(base.getTime() + n * 60000); return dt(d, d.getHours(), d.getMinutes(), d.getSeconds()); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
  function digits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function okTel(p) { return /^01\d{8,9}$/.test(digits(p)); }
  function maskTel(p) { var d = digits(p); return /^01\d{8,9}$/.test(d) ? d.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-****-$3') : ''; }
  function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 120); }
  function normAddr(s) { return String(s || '').replace(/\(\d{5}\)/g, '').replace(/[\s,.\-()]/g, ''); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- 분기 ---------- */
  function qOf(d) { return d.slice(0, 4) + '-Q' + (Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1); }
  function qParts(Q) { return [Number(Q.slice(0, 4)), Number(Q.slice(6))]; }
  function qStart(Q) { var p = qParts(Q); return p[0] + '-' + p2((p[1] - 1) * 3 + 1) + '-01'; }
  function qNext(Q) { var p = qParts(Q); return p[1] === 4 ? (p[0] + 1) + '-Q1' : p[0] + '-Q' + (p[1] + 1); }
  function qPrev(Q) { var p = qParts(Q); return p[1] === 1 ? (p[0] - 1) + '-Q4' : p[0] + '-Q' + (p[1] - 1); }
  function qEnd(Q) { var d = parse(qStart(qNext(Q))); d.setDate(d.getDate() - 1); return dstr(d); }
  function qLabel(Q) { var p = qParts(Q); return p[0] + '년 ' + p[1] + '분기'; }
  function okQ(Q) { return /^\d{4}-Q[1-4]$/.test(String(Q || '')); }

  /* ---------- 저장소 ---------- */
  var listeners = [];
  function rawRead() {
    try {
      var s = localStorage.getItem(KEY);
      if (!s) return null;
      var db = JSON.parse(s);
      if (!db || !db.meta || !db.customers) return null;
      return db;
    } catch (e) { return null; }
  }
  function save(db) {
    localStorage.setItem(KEY, JSON.stringify(db));
    listeners.forEach(function (fn) { try { fn(db); } catch (e) { /* 무시 */ } });
  }
  function db() {
    var d = rawRead();
    if (!d) { d = window.A1POST_SEED(); localStorage.setItem(KEY, JSON.stringify(d)); }
    return d;
  }
  function nextId(list) { return list.reduce(function (m, x) { return Math.max(m, x.id || 0); }, 0) + 1; }

  function setting(key, def) { var s = db().settings || {}; return s[key] === undefined || s[key] === '' ? def : s[key]; }
  function sender() { return Object.assign({ name: '에이원코리아', tel: '02-407-6610', addr: '서울 강동구 성안로 156 우주빌딩 901호' }, db().settings.sender || {}); }

  function policyRow(d) {
    var list = db().policies.map(function (p) {
      return Object.assign({}, p, { eff_from: p.eff_from || qStart(p.quarter) });
    }).sort(function (a, b) {
      return String(a.eff_from).localeCompare(String(b.eff_from)) || (a.id || 0) - (b.id || 0);
    });
    var hit = null;
    list.forEach(function (p) { if (p.eff_from <= d) hit = p; });
    return hit;
  }
  function mailOn(d) { var p = policyRow(d || todayISO()); return (p ? p.mail : 'on') !== 'off'; }

  /* ---------- 고객·계약 ---------- */
  function customer(id) { return db().customers.find(function (c) { return c.id === Number(id); }) || null; }
  function contract(id) { return db().contracts.find(function (k) { return k.id === Number(id); }); }
  function contractsOf(cid) { return db().contracts.filter(function (k) { return k.customer_id === Number(cid); }); }
  function docsOf(kid) { return db().documents.filter(function (d) { return d.contract_id === Number(kid); }); }
  function returnOpenFor(cid) {
    return db().returns.filter(function (r) { return r.customer_id === Number(cid) && OPEN.indexOf(r.status) >= 0; })
      .sort(function (a, b) { return b.id - a.id; })[0] || null;
  }
  function contractLabel(k) { return k.insurer + ' ' + k.product; }
  function hasIdInfo(c) { return !!(c && ((c.kind === '법인' && digits(c.bizno).length === 10) || (c.kind !== '법인' && String(c.birth || '').length >= 6))); }
  function idMatch(c, idv) {
    var d = digits(idv);
    if (!c || !d) return false;
    if (c.kind === '법인') return d === digits(c.bizno);
    var b = String(c.birth || '');
    return (b.length === 8 && d === b.slice(2)) || (b.length === 8 && d === b);
  }

  /* ---------- 반송 계획(누구에게 어떤 문자) ---------- */
  function ctxOf(r) {
    var c = customer(r.customer_id) || {};
    var ks = (r.contract_ids || []).map(contract).filter(Boolean);
    var jiip = ks.filter(function (k) { return k.channel === '지입사'; })[0] || null;
    if (jiip && (!jiip.jiip_phone || !jiip.jiip_name)) {
      jiip = Object.assign({}, jiip, { jiip_name: jiip.jiip_name || c.jiip_name || '', jiip_phone: jiip.jiip_phone || c.jiip_phone || '' });
    }
    var main = ks.filter(function (k) { return k.channel !== '지입사'; })[0] || null;
    return { c: c, ks: ks, jiip: jiip, main: main };
  }
  function whatOf(ks) {
    if (!ks.length) return '보험 서류';
    return ks[0].insurer + ' ' + ks[0].product + (ks.length > 1 ? ' 등 ' + ks.length + '건의' : '') + ' 증권';
  }
  function planOf(r) {
    var x = ctxOf(r), warn = [];
    if (!setting('return_on', true)) return { to: '직원', warn: ['반송 자동 문자가 꺼져 있어 직접 연락해야 합니다(설정)'] };
    if (x.jiip) {
      return okTel(x.jiip.jiip_phone || '')
        ? { to: '지입사', name: x.jiip.jiip_name, tel: maskTel(x.jiip.jiip_phone), warn: warn }
        : { to: '직원', warn: ['지입사(' + (x.jiip.jiip_name || '') + ') 휴대폰 번호가 없어 직접 연락해야 합니다'] };
    }
    if (!okTel(x.c.phone)) return { to: '직원', warn: ['고객 휴대폰 번호가 없어 직접 연락해야 합니다'] };
    if (!hasIdInfo(x.c)) return { to: '직원', warn: ['고객 생년월일·사업자번호가 없어 주소 확인 링크를 보낼 수 없습니다 — 고객 정보에 넣고 [다시 문자]'] };
    if (!x.c.handler_phone) return { to: '직원', warn: ['취급자 폰이 문자 게이트웨이에 연결되지 않아 못 보냅니다 — 폰 연결 뒤 [다시 문자]'] };
    return { to: '고객', tel: maskTel(x.c.phone), warn: warn };
  }
  function linkBase() {
    var cfg = window.A1POST_CONFIG || {};
    var path = cfg.customerPage || 'address-confirm.html';
    try { return new URL(path, location.href).href; } catch (e) { return path; }
  }
  function addrLink(id) { return linkBase() + '?r=' + encodeURIComponent(id); }

  function smsText(r, kind) {
    var x = ctxOf(r), c = x.c, home = '';
    var sign = '\n— ' + sender().name + ' ' + (x.c.handler || '') + (x.c.handler_phone ? ' ' + x.c.handler_phone : '');
    if (x.jiip) {
      var k = x.jiip;
      return '[' + sender().name + '] ' + (k.jiip_name || '지입사') + ' 담당님, 고객 ' + c.name + '님(' + k.insurer + ' ' + k.product + (k.reg_no ? ' · ' + k.reg_no : '') + ') 증권 우편이 ' +
        (r.reason === '반송' || r.reason === '기타' ? '반송' : r.reason) + '(으)로 돌아왔습니다.\n바른 주소를 회신해 주시면 다시 보내 드리겠습니다.' + sign;
    }
    var link = addrLink(r.id);
    if (kind === 'remind') {
      return '[' + sender().name + '] ' + c.name + '님, 돌아온 ' + whatOf(x.ks) + ' 우편을 다시 보내 드리려면 바른 주소가 필요합니다.\n주소 확인: ' + link +
        '\n생년월일 6자리(법인은 사업자번호 10자리)로 확인합니다. 전화로 알려 주셔도 됩니다.' + sign;
    }
    return '[' + sender().name + '] ' + c.name + '님, ' + (r.round > 1 ? '다시 보내 드린 ' : '') + whatOf(x.ks) + ' 우편이 ' + (WHY[r.reason] || '') + '돌아왔습니다.\n' +
      '바른 주소를 알려 주시면 다시 보내 드립니다.\n주소 확인: ' + link + '\n' +
      '생년월일 6자리(법인은 사업자번호 10자리)로 확인하며 ' + LINK_DAYS + '일간 열립니다. 주소만 받으며 카드번호·비밀번호는 묻지 않습니다. 전화로 알려 주셔도 됩니다.\n' +
      '증권은 홈페이지 자료실에서도 받으실 수 있습니다.' + sign;
  }

  function sendSmsNow(d, r, kind) {
    var x = ctxOf(r), pl = planOf(r);
    if (pl.to === '직원') return null;
    var to = pl.to === '지입사' ? x.jiip.jiip_phone : x.c.phone;
    var s = {
      id: nextId(d.sms), return_id: r.id, to: to, target: pl.to, kind: kind === 'remind' ? 'remind' : (pl.to === '지입사' ? 'jiip' : 'first'),
      at: nowDT(), status: '보냄', text: smsText(r, kind)
    };
    d.sms.push(s);
    r.sms_at = s.at;
    r.sms_status = '보냄(데모)';
    r.target = pl.to;
    r.status = pl.to === '지입사' ? '지입사 확인 중' : '주소 기다림';
    if (kind === 'remind') r.remind_at = s.at;
    return s;
  }

  /* ---------- 반송 상태·다음 할 일 ---------- */
  function nextOf(r) {
    switch (r.status) {
      case '문자 대기': return String(r.send_at || '').slice(11, 16) + '에 문자 — 그 전에 취소할 수 있어요';
      case '주소 기다림': return r.remind_at ? '다시 안내함 · 고객이 주소 넣기를 기다림' : '고객이 주소 넣기를 기다림 (3일 뒤 한 번 더 안내)';
      case '지입사 확인 중': return '지입사 회신을 받으면 [주소 넣기]';
      case '연락 필요': return '전화로 주소를 받아 [주소 넣기]';
      case '주소 받음': return r.addr_same ? '같은 주소로 다시 보내기' : '새 주소로 다시 보내기' + (r.insurer_at ? '' : ' · 보험사 주소 반영');
      case '재발송함': return (r.addr_same || r.insurer_at || !r.new_addr) ? '' : '보험사 포털에 주소 변경 반영';
      case '취소': return '등록 취소됨';
      case '끝': return '끝난 반송';
      default: return '';
    }
  }
  function isDone(r) {
    if (OPEN.indexOf(r.status) < 0 && r.status !== '재발송함') return true;
    return r.status === '재발송함' && (!!r.addr_same || !r.new_addr || !!r.insurer_at);
  }
  function returnOut(r) {
    var x = ctxOf(r), d = db();
    var owner = r.created_by || '';
    var turn = (r.status === '연락 필요' || r.status === '주소 받음') || (r.status === '지입사 확인 중' && r.sms_at && daysBetween(r.sms_at, nowDT()) >= REMIND_DAYS) ||
      (r.status === '재발송함' && !r.addr_same && !!r.new_addr && !r.insurer_at);
    var logs = d.sms.filter(function (s) { return s.return_id === r.id; }).slice().sort(function (a, b) { return a.id - b.id; });
    return Object.assign({}, r, {
      customer: x.c.name || '', customer_kind: x.c.kind || '', phone: maskTel(x.c.phone), has_id: hasIdInfo(x.c),
      cur_addr: x.c.address || '', cur_zip: x.c.zip || '', jiip: x.jiip ? (x.jiip.jiip_name || '') : '',
      contracts: x.ks.map(function (k) { return { id: k.id, label: contractLabel(k), policy_no: k.policy_no || '', reg: k.reg_no || '', jiip: k.channel === '지입사' ? (k.jiip_name || '') : '' }; }),
      owner_name: owner, next: nextOf(r), done: isDone(r), turn: turn,
      plan: planOf(r), preview: smsText(r, 'first'), remind_preview: smsText(r, 'remind'), sms_log: logs,
      reason_txt: REASON_TXT[r.reason] || '반송'
    });
  }

  /* ---------- 보낼 목록 ---------- */
  function sendOut(p) {
    var c = customer(p.customer_id) || {};
    var k = p.contract_id ? contract(p.contract_id) : null;
    var dbAll = db();
    var kinds = (p.doc_ids || []).map(function (id) { var doc = dbAll.documents.find(function (x) { return x.id === id; }); return doc ? doc.kind : ''; }).filter(Boolean);
    var age = p.created_at ? Math.max(0, daysBetween(dateOnly(p.created_at), todayISO())) : 0;
    return Object.assign({}, p, {
      customer: c.name || '', customer_kind: c.kind || '', cur_addr: c.address || '', cur_zip: c.zip || '',
      pref: c.post_pref || '', jiip: c.channel === '지입사' ? (c.jiip_name || '') : '',
      contract: k ? contractLabel(k) : '', policy_no: k ? (k.policy_no || '') : '', reg: k ? (k.reg_no || '') : '',
      kinds: kinds, age: age, sent_name: p.sent_by || '', has_addr: !!String(c.address || '').trim()
    });
  }
  function openSendFor(kid) {
    return db().sends.filter(function (p) { return p.contract_id === Number(kid) && p.status === '보낼 것'; }).sort(function (a, b) { return b.id - a.id; })[0] || null;
  }

  function docEligible(kind) { return MAILKIND(kind); }

  function queue() {
    var d = db();
    var rows = d.sends.filter(function (p) { return p.status === '보낼 것'; })
      .map(sendOut)
      .filter(function (p) { return !(p.pref === '전자'); })
      .sort(function (a, b) { return b.age - a.age || a.id - b.id; });

    /* 우편 안 받음·분기 그만으로 빠진 건 — 보낼 줄이 아예 생기지 않은 자료에서 센다 */
    var on = mailOn();
    var excluded = [];
    var seen = {};
    d.documents.forEach(function (doc) {
      if (!docEligible(doc.kind)) return;
      var k = contract(doc.contract_id); if (!k) return;
      if (openSendFor(k.id)) return;
      var c = customer(k.customer_id); if (!c) return;
      var why = c.post_pref === '전자' ? '우편 안 받음' : (!on && c.post_pref !== '우편' ? '이번 분기 우편 그만' : '');
      if (!why) return;
      var key = k.customer_id + ':' + why;
      if (seen[key]) return;
      seen[key] = 1;
      excluded.push({ id: k.customer_id, customer: c.name, kind: c.kind, contract: contractLabel(k), why: why });
    });
    return { mail_on: on, rows: rows, excluded: excluded, cost: setting('cost', 430) };
  }

  /* ---------- 발송 ---------- */
  function sendSelected(ids, no) {
    var d = db(), done = 0, skipped = 0, today = nowDT();
    var list = (ids || []).map(Number).filter(Boolean).slice(0, 500);
    list.forEach(function (id) {
      var p = d.sends.find(function (x) { return x.id === Number(id) && x.status === '보낼 것'; });
      if (!p) return;
      var c = customer(p.customer_id) || {};
      if (!String(c.address || '').trim()) { skipped += 1; return; }
      p.status = '보냄';
      p.addr = c.address; p.zip = c.zip || '';
      p.sent_at = today; p.sent_by = (window.A1POST_CONFIG && window.A1POST_CONFIG.staffName) || '직원';
      p.post_sndng_dt = todayISO();
      p.reg_no = list.length === 1 ? (clean(no, 30) || null) : null;
      done += 1;
    });
    save(d);
    return { ok: true, done: done, skipped: skipped, why: skipped ? '주소가 없는 고객은 빼고 처리했습니다 — 고객 정보에 주소를 넣어 주세요' : '' };
  }
  function skipSend(id, why) {
    var d = db();
    var p = d.sends.find(function (x) { return x.id === Number(id) && x.status === '보낼 것'; });
    if (!p) throw new Error('이미 처리된 건입니다');
    why = clean(why, 60);
    if (why.length < 2) throw new Error('왜 안 보내는지 짧게 적어 주세요');
    p.status = '안 보냄'; p.skip_why = why; p.sent_by = (window.A1POST_CONFIG && window.A1POST_CONFIG.staffName) || '직원';
    save(d); return { ok: true };
  }
  function backSend(id) {
    var d = db();
    var p = d.sends.find(function (x) { return x.id === Number(id); });
    if (!p || (p.status !== '보냄' && p.status !== '안 보냄') || dateOnly(p.sent_at || p.created_at) !== todayISO()) {
      throw new Error('오늘 처리한 것만 되돌릴 수 있습니다');
    }
    p.status = '보낼 것'; p.sent_at = null; p.sent_by = null; p.addr = ''; p.zip = ''; p.post_sndng_dt = null; p.reg_no = null; p.skip_why = null;
    save(d); return { ok: true };
  }

  /* ---------- 반송 등록 ---------- */
  function registerReturn(b) {
    var d = db();
    var c = customer(b.customerId);
    if (!c) throw new Error('고객을 찾을 수 없습니다');
    var reason = REASONS.indexOf(b.reason) >= 0 ? b.reason : '반송';
    var kids = Array.from(new Set(([].concat(b.contractIds || [])).map(Number).filter(function (id) { return contract(id) && contract(id).customer_id === c.id; })));
    var open = returnOpenFor(c.id);
    if (open) {
      open.contract_ids = Array.from(new Set((open.contract_ids || []).concat(kids)));
      var add = '봉투 하나 더(' + reason + ')';
      open.note = open.note ? open.note + ' · ' + add : add;
      save(d);
      return { id: open.id, merged: true, status: open.status, send_at: open.send_at, plan: planOf(open), preview: smsText(open, 'first'), row: returnOut(open) };
    }
    var round = 1 + d.returns.filter(function (r) { return r.customer_id === c.id && r.resend_at && daysBetween(dateOnly(r.created_at), todayISO()) <= 180; }).length;
    var hold = Number(setting('hold_min', 10));
    if (!(hold >= 0 && hold <= 60)) hold = 10;
    var r = {
      id: nextId(d.returns), customer_id: c.id, contract_ids: kids, reason: reason, round: round,
      addr_sent: clean(b.addrSent || c.address || '', 200), status: '문자 대기',
      send_at: addMinutes(new Date(), hold), sms_status: null, sms_at: null, target: null,
      new_zip: null, new_addr: null, addr_same: 0, addr_at: null, addr_via: null,
      resend_at: null, resend_no: null, insurer_at: null, closed_at: null,
      note: clean(b.note, 80) || null, created_by: (window.A1POST_CONFIG && window.A1POST_CONFIG.staffName) || '직원',
      created_at: nowDT(), remind_at: null
    };
    d.returns.push(r);
    var pl = planOf(r);
    if (pl.to === '직원') {
      r.status = '연락 필요'; r.target = '직원';
      r.note = (r.note ? r.note + ' ' : '') + pl.warn[0];
      d.tasks.push({ id: nextId(d.tasks), kind: 'call', return_id: r.id, customer_id: c.id, title: '전화로 주소 받기', detail: c.name + ' — ' + pl.warn[0], done: false, done_at: null, created_at: nowDT() });
    }
    save(d);
    if (pl.to !== '직원' && hold === 0) flushReturn(r.id);
    var fresh = db().returns.find(function (x) { return x.id === r.id; });
    return { id: r.id, merged: false, status: fresh.status, send_at: r.send_at, hold: hold, round: round, plan: pl, preview: smsText(fresh, 'first'), row: returnOut(fresh) };
  }

  function flushReturn(id) {
    var d = db();
    var r = d.returns.find(function (x) { return x.id === id; });
    if (!r || r.status !== '문자 대기') return r ? returnOut(r) : null;
    var pl = planOf(r);
    if (pl.to === '직원') {
      r.status = '연락 필요'; r.target = '직원';
      r.note = ((r.note ? r.note + ' ' : '') + (pl.warn[0] || ''));
    } else {
      sendSmsNow(d, r, 'first');
    }
    save(d);
    return returnOut(r);
  }

  /* 데모 시계 — 기다리는 시간이 지난 건 자동으로 문자 발송, 3일·7일 규칙 */
  var sweptAt = 0;
  function sweep() {
    var d = db(), changed = false, now = nowDT();
    d.returns.forEach(function (r) {
      if (r.status === '문자 대기' && r.send_at && r.send_at <= now) {
        var pl = planOf(r);
        if (pl.to === '직원') { r.status = '연락 필요'; r.target = '직원'; }
        else sendSmsNow(d, r, 'first');
        changed = true;
      }
      if (r.status === '주소 기다림' && !r.remind_at && r.sms_at && daysBetween(r.sms_at, now) >= REMIND_DAYS && daysBetween(r.sms_at, now) <= GIVEUP_DAYS) {
        var s = sendSmsNow(d, r, 'remind'); if (s) changed = true;
      }
      if (r.status === '주소 기다림' && r.sms_at && daysBetween(r.sms_at, now) > GIVEUP_DAYS) {
        r.status = '연락 필요';
        r.note = ((r.note ? r.note + ' ' : '') + '고객이 ' + GIVEUP_DAYS + '일 동안 주소를 안 줌 — 전화로 받기');
        changed = true;
      }
    });
    if (changed) save(d);
    sweptAt = Date.now();
  }
  function maybeSweep() { if (Date.now() - sweptAt > 20000) sweep(); }

  /* ---------- 주소 받기 ---------- */
  function addResendQueue(d, r, c) {
    var ks = (r.contract_ids || []).map(contract).filter(Boolean);
    var added = 0;
    ks.forEach(function (k) {
      var open = d.sends.filter(function (p) { return p.contract_id === k.id && p.status === '보낼 것'; })[0];
      var docIds = d.documents.filter(function (doc) { return doc.contract_id === k.id && docEligible(doc.kind); }).slice(-2).map(function (doc) { return doc.id; });
      if (open) {
        open.doc_ids = Array.from(new Set((open.doc_ids || []).concat(docIds)));
        open.source = '반송 재발송';
        added += 1;
        return;
      }
      d.sends.push({
        id: nextId(d.sends), contract_id: k.id, customer_id: c.id, doc_ids: docIds, status: '보낼 것',
        addr: '', zip: '', sent_at: null, sent_by: null, post_sndng_dt: null, reg_no: null, skip_why: null,
        source: '반송 재발송', created_at: nowDT()
      });
      added += 1;
    });
    return added;
  }

  function saveAddrCore(rIn, b, via) {
    var d = db();
    var r = d.returns.find(function (x) { return x.id === Number(rIn.id); });
    if (!r) throw new Error('반송 건을 찾을 수 없습니다');
    var c = d.customers.find(function (x) { return x.id === Number(r.customer_id); });
    if (!c) throw new Error('고객을 찾을 수 없습니다');
    if (OPEN.indexOf(r.status) < 0) throw new Error(r.status === '재발송함' ? '이미 새 주소로 다시 보냈습니다' : '끝난 반송입니다');
    if (b.same) {
      r.status = '주소 받음'; r.addr_same = 1;
      r.new_addr = r.addr_sent || c.address || ''; r.new_zip = c.zip || null;
      r.addr_at = nowDT(); r.addr_via = via + ' · 주소 맞음';
      d.tasks.forEach(function (t) { if (t.return_id === r.id && t.kind === 'call') { t.done = true; t.done_at = nowDT(); } });
      if (!d.tasks.some(function (t) { return t.return_id === r.id && t.kind === 'resend'; })) {
        d.tasks.push({ id: nextId(d.tasks), kind: 'resend', return_id: r.id, customer_id: c.id, title: '같은 주소로 다시 보내기', detail: c.name + ' — 주소가 맞다고 확인함', done: false, done_at: null, created_at: nowDT() });
      }
      addResendQueue(d, r, c);
      save(d);
      return { same: true, addr: r.new_addr, zip: r.new_zip, msg: '같은 주소로 다시 보내 드리겠습니다.' };
    }
    var zip = digits(b.zip), a1 = clean(b.addr1, 120), a2 = clean(b.addr2, 80);
    if (!/^\d{5}$/.test(zip)) throw new Error('우편번호 5자리를 넣어 주세요 (주소 찾기를 누르면 자동으로 들어가요)');
    if (a1.length < 5) throw new Error('주소를 넣어 주세요');
    if (!a2 && !b.noDetail) throw new Error('상세주소(동·호수, 층 등)를 넣어 주세요. 단독주택처럼 없으면 "상세주소 없음"을 눌러 주세요');
    var full = [a1, a2].filter(Boolean).join(' ').slice(0, 200);
    if (r.addr_sent && normAddr(full) === normAddr(r.addr_sent)) {
      return saveAddrCore(r, { same: true }, via);
    }
    var old = c.address || '';
    c.address = full; c.zip = zip;
    d.addr_changes.push({ id: nextId(d.addr_changes), customer_id: c.id, old_addr: old || null, new_addr: full, zip: zip, via: via, return_id: r.id, by_id: via.indexOf('직원') === 0 ? via : null, at: nowDT() });
    r.status = '주소 받음'; r.addr_same = 0; r.new_addr = full; r.new_zip = zip; r.addr_at = nowDT(); r.addr_via = via;
    d.tasks.forEach(function (t) { if (t.return_id === r.id && t.kind === 'call') { t.done = true; t.done_at = nowDT(); } });
    addResendQueue(d, r, c);
    if (!d.tasks.some(function (t) { return t.return_id === r.id && t.kind === 'insurer' && !t.done; })) {
      d.tasks.push({ id: nextId(d.tasks), kind: 'insurer', return_id: r.id, customer_id: c.id, title: '보험사 주소 반영', detail: c.name + ' 새 주소를 보험사 포탈에 반영', done: false, done_at: null, created_at: nowDT() });
    }
    save(d);
    return { same: false, addr: full, zip: zip, msg: '아래 주소로 다시 보내 드리겠습니다.\n(' + zip + ') ' + full };
  }

  function saveAddrStaff(id, body) {
    var r = db().returns.find(function (x) { return x.id === Number(id); });
    if (!r) throw new Error('반송 건을 찾을 수 없습니다');
    var via = '직원 ' + ((window.A1POST_CONFIG && window.A1POST_CONFIG.staffName) || '') + ' · ' + (clean(body.via, 20) || '전화');
    var res = saveAddrCore(r, body, via);
    return Object.assign(res, { row: returnOut(db().returns.find(function (x) { return x.id === r.id; })) });
  }

  /* ---------- 고객 링크 ---------- */
  function triesOf(id) {
    var d = db(); d.tries = d.tries || {};
    var list = (d.tries['r' + id] || []).filter(function (t) { return (new Date().getTime() - new Date(t.at).getTime()) < LOCK_MIN * 60000; });
    d.tries['r' + id] = list; return list;
  }
  function linkInfo(id) {
    var d = db();
    var r = d.returns.find(function (x) { return x.id === Number(id); });
    if (!r) return { ok: false, why: '링크가 만료되었거나 잘못된 주소입니다' };
    if (r.status === '취소' || r.status === '끝') return { ok: false, why: '지금 확인할 내용이 없습니다' };
    if (r.status === '재발송함') return { ok: false, why: '이미 새 주소로 다시 보내 드렸습니다', done: true };
    var c = customer(r.customer_id);
    if (!c || !hasIdInfo(c)) return { ok: false, why: '본인 확인 정보가 없어 열 수 없습니다 — 담당자에게 전화로 알려 주세요' };
    var fails = triesOf(id).filter(function (t) { return !t.ok; }).length;
    if (fails >= MAX_TRY) return { ok: false, locked: true, why: '확인을 여러 번 틀려 잠겼습니다 — ' + LOCK_MIN + '분 뒤 다시 시도하시거나 담당자에게 전화로 알려 주세요' };
    return {
      ok: true, id: r.id, name: maskedName(c.name), kind: c.kind, locked: false,
      left: MAX_TRY - fails, link_days: LINK_DAYS
    };
  }
  function maskedName(n) {
    n = String(n || '');
    if (n.length <= 1) return n;
    if (n.length === 2) return n[0] + '*';
    return n[0] + '*'.repeat(Math.min(2, n.length - 2)) + n[n.length - 1];
  }
  function verify(id, idv) {
    var d = db();
    var r = d.returns.find(function (x) { return x.id === Number(id); });
    if (!r) return { ok: false, why: '링크가 만료되었거나 잘못된 주소입니다' };
    var info = linkInfo(id);
    if (!info.ok) return { ok: false, why: info.why, locked: info.locked };
    var c = customer(r.customer_id);
    var good = idMatch(c, idv);
    d.tries = d.tries || {};
    var key = 'r' + id;
    d.tries[key] = (d.tries[key] || []).concat([{ at: new Date().toISOString(), ok: good }]).slice(-20);
    save(d);
    if (!good) {
      var left = MAX_TRY - triesOf(id).filter(function (t) { return !t.ok; }).length;
      return { ok: false, why: left > 0 ? '맞지 않습니다 (' + left + '번 남음)' : '여러 번 틀려 잠겼습니다 — ' + LOCK_MIN + '분 뒤 다시 시도하시거나 담당자에게 전화로 알려 주세요', left: Math.max(0, left) };
    }
    return { ok: true, sent: r.addr_sent || c.address || '', reason: REASON_TXT[r.reason] || '반송', currency: '원', same_ok: r.reason !== '이사감' };
  }
  function saveAddrCustomer(id, idv, body) {
    var v = verify(id, idv);
    if (!v.ok) return v;
    var r = db().returns.find(function (x) { return x.id === Number(id); });
    try {
      var s = saveAddrCore(r, body, '고객 링크');
      return Object.assign({ ok: true }, s);
    } catch (e) { return { ok: false, why: e.message }; }
  }

  /* ---------- 반송 그 밖의 처리 ---------- */
  function actReturn(id, fn) {
    var d = db();
    var r = d.returns.find(function (x) { return x.id === Number(id); });
    if (!r) throw new Error('반송 건을 찾을 수 없습니다');
    var out = fn(d, r);
    if (out && out._saved !== false) save(d);
    return out && out.row ? out.row : returnOut(db().returns.find(function (x) { return x.id === Number(id); }));
  }
  var actions = {
    cancel: function (id) {
      return actReturn(id, function (d, r) {
        if (r.status !== '문자 대기') throw new Error('문자가 나가기 전에만 취소할 수 있습니다 — 이미 나갔으면 [끝내기]');
        r.status = '취소'; r.closed_at = nowDT(); r.note = ((r.note ? r.note + ' ' : '') + '등록 취소');
      });
    },
    now: function (id) {
      actReturn(id, function (d, r) {
        if (r.status !== '문자 대기') throw new Error('이미 처리된 반송입니다');
        var pl = planOf(r);
        if (pl.to === '직원') throw new Error(pl.warn[0]);
        sendSmsNow(d, r, 'first');
      });
      return returnOut(db().returns.find(function (x) { return x.id === Number(id); }));
    },
    resms: function (id) {
      actReturn(id, function (d, r) {
        if (['연락 필요', '주소 기다림', '지입사 확인 중'].indexOf(r.status) < 0) throw new Error('다시 문자를 보낼 수 있는 상태가 아닙니다');
        var pl = planOf(r); if (pl.to === '직원') throw new Error(pl.warn[0]);
        r.status = '문자 대기'; r.send_at = nowDT(); r.remind_at = null;
        sendSmsNow(d, r, 'first');
      });
      return returnOut(db().returns.find(function (x) { return x.id === Number(id); }));
    },
    resend: function (id, body) {
      return actReturn(id, function (d, r) {
        if (r.status !== '주소 받음') throw new Error('주소를 받은 뒤에 다시 보낼 수 있습니다');
        r.status = '재발송함'; r.resend_at = nowDT();
        r.resend_no = clean(body && body.no, 30) || null;
        d.tasks.forEach(function (t) { if (t.return_id === r.id && t.kind === 'resend') { t.done = true; t.done_at = nowDT(); } });
      });
    },
    insurer: function (id) {
      return actReturn(id, function (d, r) {
        if (!r.new_addr || r.addr_same) throw new Error('주소가 바뀐 건만 보험사 반영이 필요합니다');
        if (['주소 받음', '재발송함'].indexOf(r.status) < 0) throw new Error('주소를 받은 뒤에 표시할 수 있습니다');
        r.insurer_at = nowDT();
        d.tasks.forEach(function (t) { if (t.return_id === r.id && t.kind === 'insurer') { t.done = true; t.done_at = nowDT(); } });
      });
    },
    close: function (id, body) {
      return actReturn(id, function (d, r) {
        var why = clean(body && body.why, 60);
        if (why.length < 2) throw new Error('왜 끝내는지 짧게 적어 주세요 (예: 고객이 우편 필요 없다고 함)');
        if (OPEN.indexOf(r.status) < 0 && r.status !== '재발송함') throw new Error('이미 끝난 반송입니다');
        r.status = '끝'; r.closed_at = nowDT(); r.note = ((r.note ? r.note + ' ' : '') + '끝냄: ' + why);
        d.tasks.forEach(function (t) { if (t.return_id === r.id) { t.done = true; t.done_at = t.done_at || nowDT(); } });
      });
    }
  };

  /* ---------- 찾기 ---------- */
  function find(q) {
    var raw = clean(q, 60); if (raw.length < 2) return [];
    var dg = digits(raw), key = raw.replace(/\s/g, '');
    var d = db(), hits = [];
    d.customers.forEach(function (c) {
      var ks = contractsOf(c.id);
      var hit = String(c.name).indexOf(raw) >= 0 || String(c.address || '').replace(/\s/g, '').indexOf(key) >= 0 ||
        (dg.length >= 4 && digits(c.phone).indexOf(dg) >= 0);
      ks.forEach(function (k) {
        if (String(k.policy_no || '').replace(/-/g, '').indexOf(key) >= 0) hit = true;
        if (String(k.reg_no || '').replace(/\s/g, '').indexOf(key) >= 0) hit = true;
      });
      if (hit) hits.push(c);
    });
    return hits.slice(0, 15).map(function (c) {
      return {
        id: c.id, name: c.name, kind: c.kind, address: c.address || '', zip: c.zip || '',
        phone: maskTel(c.phone), has_id: hasIdInfo(c), jiip: c.channel === '지입사' ? c.jiip_name : '',
        contracts: contractsOf(c.id).map(function (k) { return { id: k.id, label: contractLabel(k), policy_no: k.policy_no, status: k.status, reg: k.reg_no, jiip: k.channel === '지입사' ? k.jiip_name : '' }; }),
        open: (function () { var r = returnOpenFor(c.id); return r ? { id: r.id, status: r.status } : null; })()
      };
    });
  }
  function findById(id) { return findOnId(id); }
  function findOnId(id) {
    var c = customer(id); if (!c) return null;
    return {
      id: c.id, name: c.name, kind: c.kind, address: c.address || '', zip: c.zip || '', phone: maskTel(c.phone), has_id: hasIdInfo(c),
      jiip: c.channel === '지입사' ? c.jiip_name : '',
      contracts: contractsOf(c.id).map(function (k) { return { id: k.id, label: contractLabel(k), policy_no: k.policy_no, status: k.status, reg: k.reg_no, jiip: k.channel === '지입사' ? k.jiip_name : '' }; }),
      open: (function () { var r = returnOpenFor(c.id); return r ? { id: r.id, status: r.status } : null; })()
    };
  }

  /* ---------- 현황·정책 ---------- */
  function quarterStats(Q) {
    var s = qStart(Q), e = qEnd(Q), d = db();
    var sentRows = d.sends.filter(function (p) { return p.status === '보냄' && dateOnly(p.sent_at) >= s && dateOnly(p.sent_at) <= e; });
    var sent = sentRows.length;
    var skipped = d.sends.filter(function (p) { return p.status === '안 보냄' && dateOnly(p.created_at) >= s && dateOnly(p.created_at) <= e; }).length;
    var opened = sentRows.filter(function (p) { return (p.doc_ids || []).some(function (id) { return d.opens.some(function (o) { return o.doc_id === id; }); }); }).length;
    var returned = d.returns.filter(function (r) { return r.status !== '취소' && dateOnly(r.created_at) >= s && dateOnly(r.created_at) <= e; }).length;
    var fixed = d.addr_changes.filter(function (a) { return dateOnly(a.at) >= s && dateOnly(a.at) <= e; }).length;
    var cost = Number(setting('cost', 430)) || 0;
    var pct = function (a, b) { return b ? Math.round(a * 1000 / b) / 10 : null; };
    var decision = d.policies.filter(function (p) { return p.quarter === Q; }).sort(function (a, b) { return b.id - a.id; })[0] || null;
    return {
      quarter: Q, label: qLabel(Q), from: s, to: e, sent: sent, skipped: skipped, opened: opened, opened_pct: pct(opened, sent),
      returned: returned, return_pct: pct(returned, sent), fixed: fixed, cost: cost ? sent * cost : null,
      decision: decision
    };
  }
  function decisionDue() {
    var t = todayISO(), cur = qOf(t), nxt = qNext(cur), d = db();
    var has = function (Q) { return d.policies.some(function (p) { return p.quarter === Q; }); };
    var days = function (a, b) { return Math.round((parse(a) - parse(b)) / 864e5); };
    var summaryOf = function (st) {
      return st.label + ' 지금까지 우편 ' + st.sent + '통 · 반송 ' + st.returned + '건' +
        (st.return_pct != null && st.return_pct <= 100 ? '(' + st.return_pct + '%)' : '') +
        (st.opened_pct != null ? ' · 전자로 열어 봄 ' + st.opened_pct + '%' : '');
    };
    if (days(qStart(nxt), t) <= 14 && !has(nxt)) return { quarter: nxt, summary: summaryOf(quarterStats(cur)), days: days(qStart(nxt), t) };
    if (!has(cur) && days(t, qStart(cur)) <= 30 && d.policies.length) return { quarter: cur, summary: summaryOf(quarterStats(qPrev(cur))), days: 0 };
    return null;
  }
  function policy() {
    var d = db(), t = todayISO(), cur = qOf(t);
    var qs = [cur, qPrev(cur), qPrev(qPrev(cur)), qPrev(qPrev(qPrev(cur)))];
    var prefs = {};
    d.customers.forEach(function (c) { var k = c.post_pref || ''; prefs[k] = (prefs[k] || 0) + 1; });
    var due = decisionDue();
    return {
      mail_on: mailOn(), now: policyRow() || null, cost: Number(setting('cost', 430)) || null,
      cur: cur, next: qNext(cur), cur_label: qLabel(cur), next_label: qLabel(qNext(cur)),
      quarters: qs.map(quarterStats), due: due, prefs: prefs,
      decisions: d.policies.slice().sort(function (a, b) { return b.id - a.id; }).slice(0, 12),
      customers: d.customers.map(function (c) { return { id: c.id, name: c.name, kind: c.kind, pref: c.post_pref || '', jiip: c.channel === '지입사' ? c.jiip_name : '', address: c.address || '' }; })
    };
  }
  function decide(body) {
    var d = db(), Q = String(body.quarter || ''), mail = body.mail === 'off' ? 'off' : body.mail === 'on' ? 'on' : null;
    if (!okQ(Q) || !mail) throw new Error('분기와 결정(계속/그만)을 골라 주세요');
    if (qStart(Q) < qStart(qOf(todayISO()))) throw new Error('지난 분기는 바꿀 수 없습니다');
    d.policies.push({
      id: nextId(d.policies), quarter: Q, eff_from: qStart(Q), mail: mail, note: clean(body.note, 200) || null,
      stats: quarterStats(qOf(todayISO())), decided_by: (window.A1POST_CONFIG && window.A1POST_CONFIG.staffName) || '직원', decided_at: nowDT()
    });
    save(d);
    return { ok: true, mail_on: mailOn() };
  }
  function setCost(n) {
    var d = db();
    var v = (n === '' || n == null) ? '' : Number(n);
    if (v !== '' && !(v > 0 && v < 100000)) throw new Error('우편 1통 비용(원)을 숫자로 넣어 주세요');
    d.settings.cost = v === '' ? '' : Math.round(v);
    save(d); return { ok: true, cost: d.settings.cost };
  }
  function setConfig(body) {
    var d = db(), ch = [];
    if (body.on !== undefined) { d.settings.return_on = !!body.on; ch.push(body.on ? '켬' : '끔'); }
    if (body.hold !== undefined) {
      var h = Number(body.hold);
      if (!(h >= 0 && h <= 60)) throw new Error('기다리는 시간은 0~60분');
      d.settings.hold_min = Math.round(h); ch.push(Math.round(h) + '분');
    }
    save(d); return { ok: true, on: d.settings.return_on, hold: d.settings.hold_min };
  }
  function setPref(cid, pref) {
    var d = db(), c = d.customers.find(function (x) { return x.id === Number(cid); }); if (!c) throw new Error('고객을 찾을 수 없습니다');
    var v = { '': null, '우편': '우편', '전자': '전자' }[String(pref == null ? '' : pref)];
    if (v === undefined) throw new Error('회사 기준 · 항상 우편 · 우편 안 받음 중 하나');
    c.post_pref = v || '';
    save(d); return { ok: true, pref: c.post_pref };
  }

  /* ---------- 자료실 등록 → 우편 보낼 목록 자동 ---------- */
  function onPostDoc(contractId, kind) {
    var d = db(), k = contract(contractId); if (!k || !docEligible(kind)) return { skipped: '우편 대상 서류가 아님' };
    var c = customer(k.customer_id);
    var doc = { id: nextId(d.documents), contract_id: k.id, kind: kind, reg_at: nowDT() };
    d.documents.push(doc);
    if (c.post_pref === '전자') { save(d); return { skipped: c.name + ' — 우편 안 받음' }; }
    if (!mailOn() && c.post_pref !== '우편') { save(d); return { skipped: '이번 분기 우편 그만 — 보내지 않음' }; }
    var open = d.sends.filter(function (p) { return p.contract_id === k.id && p.status === '보낼 것'; })[0];
    if (open) {
      open.doc_ids = Array.from(new Set((open.doc_ids || []).concat([doc.id])));
      save(d); return { merged: true, id: open.id, message: c.name + ' — ' + kind + '을(를) 기존 보낼 것에 합쳤습니다' };
    }
    var row = {
      id: nextId(d.sends), contract_id: k.id, customer_id: c.id, doc_ids: [doc.id], status: '보낼 것',
      addr: '', zip: '', sent_at: null, sent_by: null, post_sndng_dt: null, reg_no: null, skip_why: null,
      source: '자료실 등록', created_at: nowDT()
    };
    d.sends.push(row); save(d);
    return { id: row.id, message: c.name + ' — 보낼 것에 추가했습니다 (' + contractLabel(k) + ' ' + kind + ')' };
  }
  function listDocs() {
    var d = db();
    return d.contracts.map(function (k) {
      var c = customer(k.customer_id);
      return { contract_id: k.id, label: contractLabel(k) + (k.reg_no ? ' · ' + k.reg_no : ''), customer: c.name, customer_id: c.id };
    });
  }

  /* ---------- 할 일 ---------- */
  function tasks() {
    var d = db();
    return d.tasks.filter(function (t) { return !t.done; }).map(function (t) {
      var c = customer(t.customer_id);
      return Object.assign({}, t, { customer: c ? c.name : '' });
    });
  }
  function taskDone(id) {
    var d = db(), t = d.tasks.find(function (x) { return x.id === Number(id); });
    if (!t) throw new Error('할 일을 찾을 수 없습니다');
    t.done = true; t.done_at = nowDT();
    if (t.return_id) {
      var r = d.returns.find(function (x) { return x.id === t.return_id; });
      if (r && t.kind === 'insurer') r.insurer_at = nowDT();
    }
    save(d); return { ok: true };
  }

  function reset() { localStorage.removeItem(KEY); var d = db(); listeners.forEach(function (fn) { fn(d); }); return { ok: true }; }

  /* ---------- 내보내기 ---------- */
  window.PostDemo = {
    mode: 'demo',
    KEY: KEY,
    on: function (fn) { listeners.push(fn); },
    off: function (fn) { listeners = listeners.filter(function (x) { return x !== fn; }); },
    db: db, save: save, reset: reset, sweep: sweep, maybeSweep: maybeSweep,

    config: function () {
      return { mode: 'demo', on: !!setting('return_on', true), hold: Number(setting('hold_min', 10)), reasons: REASONS, days: { link: LINK_DAYS, remind: REMIND_DAYS, giveup: GIVEUP_DAYS }, cost: Number(setting('cost', 430)) || null, sender: sender(), base: true };
    },
    setConfig: setConfig, setCost: setCost, setPref: setPref,
    queue: queue, send: sendSelected, skip: skipSend, back: backSend,
    find: find, findById: function (id) { return findOnId(id); },
    returns: function (state) {
      var d = db();
      var list = d.returns.slice().sort(function (a, b) {
        var dop = function (r) { return !isDone(r) && (r.status !== '문자 대기'); };
        return (dop(a) === dop(b)) ? b.id - a.id : (dop(a) ? -1 : 1);
      });
      if (state === 'done') list = list.filter(isDone);
      else if (state === 'open') list = list.filter(function (r) { return !isDone(r); });
      return list.map(returnOut);
    },
    registerReturn: registerReturn,
    cancelReturn: actions.cancel, nowReturn: actions.now, resmsReturn: actions.resms,
    saveAddrStaff: saveAddrStaff, resendReturn: actions.resend, insurerReturn: actions.insurer, closeReturn: actions.close,
    policy: policy, decide: decide,
    docRegister: onPostDoc, docs: listDocs,
    tasks: tasks, taskDone: taskDone,
    linkInfo: linkInfo, verify: verify, saveAddrCustomer: saveAddrCustomer,
    detail: function (id) { var r = db().returns.find(function (x) { return x.id === Number(id); }); return r ? returnOut(r) : null; },
    mailOn: mailOn, qLabel: qLabel
  };
})();
