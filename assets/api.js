/* A1 우편 모듈 — API 어댑터
 *
 *  같은 화면이 두 가지로 돕니다.
 *   demo : 브라우저 저장소(PostDemo) — 서버 없이 바로.
 *   rest : total 서버의 /api/post-* — 주소만 바꾸면 그대로 연결.
 *
 *  rest 모드에서 쓰는 주소는 total v0.9.9.4 / v0.9.9.5(a1app/server/v0994.js)와 같습니다.
 *  자세한 표는 INTEGRATION.md.
 */
(function () {
  'use strict';

  var cfg = window.A1POST_CONFIG || {};
  var mode = cfg.mode === 'rest' ? 'rest' : 'demo';
  var base = String(cfg.apiBase || '').replace(/\/+$/, '');
  var demo = window.PostDemo;

  function qs(params) {
    var p = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) { if (params[k] !== undefined && params[k] !== null && params[k] !== '') p.set(k, params[k]); });
    var s = p.toString();
    return s ? '?' + s : '';
  }
  async function req(method, path, body) {
    var res = await fetch(base + path, {
      method: method,
      credentials: 'include',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    var data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || (data && data.ok === false && data.why)) {
      var why = (data && (data.why || data.error || data.message)) || ('서버 오류 (' + res.status + ')');
      var err = new Error(why); err.status = res.status; throw err;
    }
    return data;
  }

  function normalizeSendRow(p) {
    var pdt = p.post_sndng_dt || (p.sent_at ? String(p.sent_at).slice(0, 10) : '');
    return Object.assign({
      customer: '', customer_kind: '', cur_addr: '', cur_zip: '', pref: '', jiip: '', contract: '', policy_no: '',
      kinds: [], age: 0, has_addr: !!p.cur_addr, sent_name: '', post_sndng_dt: pdt
    }, p, { post_sndng_dt: pdt });
  }
  function normalizeReturn(r) {
    var plan = r.plan || (r.plan_to ? { to: r.plan_to, tel: r.plan_tel || '', warn: [] } : { to: '', tel: '', warn: [] });
    return Object.assign({ contracts: [], sms_log: [], reason_txt: r.reason || '', phone: '' }, r, { plan: plan, preview: r.preview || '' });
  }

  var api = {
    mode: mode,
    isDemo: mode === 'demo',
    base: base,

    async config() {
      if (mode === 'demo') return demo.config();
      var c = await req('GET', '/api/post-returns/config');
      return Object.assign({ reasons: [], sender: {} }, c);
    },
    async setConfig(body) {
      if (mode === 'demo') return demo.setConfig(body);
      return req('POST', '/api/post-returns/config', body);
    },

    async queue() {
      if (mode === 'demo') return demo.queue();
      var r = await req('GET', '/api/post-sends');
      return {
        mail_on: r.mail_on !== false,
        rows: (r.rows || []).map(normalizeSendRow),
        excluded: [],
        cost: null
      };
    },
    async send(ids, no) {
      if (mode === 'demo') return demo.send(ids, no);
      return req('POST', '/api/post-sends/sent', { ids: ids, no: no || null });
    },
    async skip(id, why) {
      if (mode === 'demo') return demo.skip(id, why);
      return req('POST', '/api/post-sends/' + id + '/skip', { why: why });
    },
    async back(id) {
      if (mode === 'demo') return demo.back(id);
      return req('POST', '/api/post-sends/' + id + '/back');
    },

    async find(q) {
      if (mode === 'demo') return demo.find(q);
      return req('GET', '/api/post-returns/find' + qs({ q: q }));
    },
    async findById(id) {
      if (mode === 'demo') return demo.findById(id);
      var rows = await req('GET', '/api/post-returns/find' + qs({ cid: id }));
      return (rows || [])[0] || null;
    },
    async returns(state) {
      if (mode === 'demo') return demo.returns(state);
      var rows = await req('GET', '/api/post-returns' + qs({ state: state }));
      return (rows || []).map(normalizeReturn);
    },
    async detail(id) {
      if (mode === 'demo') return demo.detail(id);
      var rows = await req('GET', '/api/post-returns');
      return (rows || []).map(normalizeReturn).filter(function (r) { return r.id === Number(id); })[0] || null;
    },
    async registerReturn(b) {
      if (mode === 'demo') return demo.registerReturn(b);
      var r = await req('POST', '/api/post-returns', {
        customer_id: b.customerId, contract_ids: b.contractIds, reason: b.reason, addr_sent: b.addrSent, note: b.note
      });
      r.preview = '';
      r.row = r.row ? normalizeReturn(r.row) : null;
      return r;
    },
    async cancelReturn(id) {
      if (mode === 'demo') return demo.cancelReturn(id);
      return normalizeReturn(await req('POST', '/api/post-returns/' + id + '/cancel'));
    },
    async nowReturn(id) {
      if (mode === 'demo') return demo.nowReturn(id);
      return normalizeReturn(await req('POST', '/api/post-returns/' + id + '/now'));
    },
    async resmsReturn(id) {
      if (mode === 'demo') return demo.resmsReturn(id);
      return normalizeReturn(await req('POST', '/api/post-returns/' + id + '/resms'));
    },
    async saveAddrStaff(id, b) {
      if (mode === 'demo') return demo.saveAddrStaff(id, b);
      return req('POST', '/api/post-returns/' + id + '/addr', {
        zip: b.zip, addr1: b.addr1, addr2: b.addr2, no_detail: !!b.noDetail, via: b.via
      });
    },
    async resendReturn(id, b) {
      if (mode === 'demo') return demo.resendReturn(id, b || {});
      return normalizeReturn(await req('POST', '/api/post-returns/' + id + '/resend', b || {}));
    },
    async insurerReturn(id) {
      if (mode === 'demo') return demo.insurerReturn(id);
      return normalizeReturn(await req('POST', '/api/post-returns/' + id + '/insurer'));
    },
    async closeReturn(id, why) {
      if (mode === 'demo') return demo.closeReturn(id, { why: why });
      return normalizeReturn(await req('POST', '/api/post-returns/' + id + '/close', { why: why }));
    },

    async policy() {
      if (mode === 'demo') return demo.policy();
      return req('GET', '/api/post-policy');
    },
    async decide(b) {
      if (mode === 'demo') return demo.decide(b);
      return req('POST', '/api/post-policy/decide', b);
    },
    async setCost(n) {
      if (mode === 'demo') return demo.setCost(n);
      return req('POST', '/api/post-policy/config', { cost: n });
    },
    async setPref(cid, pref) {
      if (mode === 'demo') return demo.setPref(cid, pref);
      return req('POST', '/api/customers/' + cid + '/post-pref', { pref: pref });
    },

    async tasks() {
      if (mode === 'demo') return demo.tasks();
      return [];
    },
    async taskDone(id) {
      if (mode === 'demo') return demo.taskDone(id);
      return { ok: true };
    },
    async docRegister(contractId, kind) {
      if (mode === 'demo') return demo.docRegister(contractId, kind);
      throw new Error('서버에서는 자료실 등록 때 서버가 자동으로 넣습니다');
    },
    async docs() {
      if (mode === 'demo') return demo.docs();
      return [];
    },

    /* 고객 주소 확인 페이지 — total 은 /addr(서버가 그리는 페이지), 우리 페이지는 /addr/check · /addr/save 를 부른다 */
    async linkInfo(params) {
      if (mode === 'demo') return demo.linkInfo(params.r);
      return { ok: true, name: '고객', kind: '', link_days: 7 };
    },
    async verify(params) {
      if (mode === 'demo') return demo.verify(params.r, params.idv);
      return req('POST', '/addr/check', { r: params.r, exp: params.exp, sig: params.sig, idv: params.idv });
    },
    async saveAddrCustomer(params, body) {
      if (mode === 'demo') return demo.saveAddrCustomer(params.r, params.idv, body);
      var r = await req('POST', '/addr/save', Object.assign({ r: params.r, exp: params.exp, sig: params.sig, idv: params.idv }, body, {
        no_detail: !!body.noDetail
      }));
      return Object.assign({ ok: true }, r);
    },
    on: function (fn) { if (mode === 'demo' && demo.on) demo.on(fn); },
    sweep: function () { if (mode === 'demo') demo.maybeSweep(); }
  };

  window.PostAPI = api;
})();
