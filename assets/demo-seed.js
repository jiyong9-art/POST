/* A1 우편 모듈 — 데모 자료
 * 실제 고객 정보가 아닌 가짜 자료입니다. (이름·번호·주소 모두 시험용)
 * 화면에서 '새 증권 등록'을 누르면 자료실 등록 → 우편 보낼 목록 자동 생성이 이어서 보입니다.
 */
(function () {
  'use strict';

  function p2(n) { return String(n).padStart(2, '0'); }
  function dstr(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function dt(d, hh, mm) { return dstr(d) + ' ' + p2(hh || 9) + ':' + p2(mm || 0) + ':00'; }
  function daysAgo(n, hh, mm) { var d = new Date(); d.setDate(d.getDate() - n); return dt(d, hh, mm); }
  function daysAhead(n, hh, mm) { var d = new Date(); d.setDate(d.getDate() + n); return dt(d, hh, mm); }
  function minsAhead(n) { var d = new Date(Date.now() + n * 60000); return dt(d, d.getHours(), d.getMinutes(), d.getSeconds()); }
  function minsAgo(n) { var d = new Date(Date.now() - n * 60000); return dt(d, d.getHours(), d.getMinutes(), d.getSeconds()); }
  function dateOnly(s) { return String(s || '').slice(0, 10); }

  window.A1POST_SEED = function () {
    var C = function (id, name, kind, channel, o) {
      o = o || {};
      return {
        id: id, name: name, kind: kind, bizno: o.bizno || '', birth: o.birth || '',
        phone: o.phone || '', address: o.address || '', zip: o.zip || '',
        post_pref: o.pref || '', channel: channel,
        jiip_name: o.jiip || '', jiip_phone: o.jiipPhone || '',
        handler: o.handler || '김대리', handler_phone: o.handlerPhone || '010-0000-1001'
      };
    };

    var customers = [
      C(1, '대성중기', '법인', '직접', { bizno: '214-87-30125', phone: '010-0000-0001', zip: '12256', address: '경기 남양주시 와부읍 예봉로 24 한솔아파트 103동 502호', handler: '김대리' }),
      C(2, '한빛물류', '법인', '직접', { bizno: '135-81-40277', phone: '010-0000-0002', zip: '10326', address: '경기 고양시 일산동구 백마로 195 한빛빌딩 4층', handler: '박주임' }),
      C(3, '김도현', '개인', '직접', { birth: '19840211', phone: '010-0000-0003', zip: '15073', address: '경기 시흥시 군자로 125 3층', handler: '이사원' }),
      C(4, '서진건설', '법인', '지입사', { bizno: '126-45-88190', phone: '010-0000-0004', zip: '18534', address: '경기 화성시 향남읍 상신하길 17 서진빌딩', jiip: '태양운수', jiipPhone: '010-0000-2001', handler: '김대리' }),
      C(5, '박수경', '개인', '직접', { birth: '19790523', phone: '010-0000-0005', zip: '21045', address: '인천 계양구 계산새로 88 102동 705호', pref: '전자', handler: '이사원' }),
      C(6, '정우기계', '법인', '지입사', { bizno: '312-77-22901', phone: '010-0000-0006', zip: '03187', address: '서울 종로구 종로 112 정우빌딩 5층', jiip: '한성화물', jiipPhone: '010-0000-2002', handler: '박주임' }),
      C(7, '이만수', '개인', '직접', { birth: '19671130', phone: '010-0000-0007', zip: '', address: '', handler: '이사원' }),
      C(8, '청솔산업', '법인', '직접', { bizno: '201-86-33012', phone: '010-0000-0008', zip: '11768', address: '경기 의정부시 천보로122번길 22 청솔공장', pref: '우편', handler: '최팀장' }),
      C(9, '조은하', '개인', '직접', { birth: '19900317', phone: '010-0000-0009', zip: '08216', address: '서울 구로구 경인로 445 201동 1103호', handler: '김대리' }),
      C(10, '태강물산', '법인', '지입사', { bizno: '606-57-11902', phone: '010-0000-0010', zip: '46721', address: '부산 강서구 녹산산단로 45 태강창고', jiip: '대한운수', jiipPhone: '010-0000-2003', handler: '박주임' }),
      C(11, '노경수', '개인', '직접', { birth: '19830809', phone: '010-0000-0011', zip: '14585', address: '경기 부천시 평천로 655 105동 402호', handler: '이사원' }),
      C(12, '주식회사 하늘', '법인', '직접', { bizno: '409-81-55320', phone: '', zip: '16229', address: '경기 수원시 팔달구 매산로 118 하늘타워 8층', handler: '최팀장' }),
      C(13, '유진중공업', '법인', '지입사', { bizno: '608-33-77120', phone: '010-0000-0013', zip: '45953', address: '부산 남구 신선로 365 유진공장', jiip: '서해물류', jiipPhone: '010-0000-2004', handler: '김대리' }),
      C(14, '서원기업', '법인', '직접', { bizno: '133-80-22174', phone: '010-0000-0014', zip: '15808', address: '경기 군포시 산본로323번길 12 서원빌딩 3층', handler: '박주임' }),
      C(15, '최현석', '개인', '직접', { birth: '19891102', phone: '010-0000-0015', zip: '16052', address: '경기 의왕시 왕곡로 77 302호', handler: '이사원' }),
      C(16, '한강기계', '법인', '지입사', { bizno: '110-81-66043', phone: '010-0000-0016', zip: '12929', address: '경기 하남시 미사강변한강로 135 한강빌딩 6층', jiip: '태양운수', jiipPhone: '010-0000-2001', handler: '최팀장' }),
      C(17, '대원중장비', '법인', '직접', { bizno: '129-86-55270', phone: '010-0000-0017', zip: '12035', address: '경기 남양주시 다산중앙로 132 대원빌딩', handler: '김대리' })
    ];

    var K = function (id, cid, insurer, product, policy, reg, o) {
      o = o || {};
      return {
        id: id, customer_id: cid, insurer: insurer, product: product, policy_no: policy,
        reg_no: reg, status: o.status || '유효', start: o.start || '2026-03-01', end: o.end || '2027-02-28',
        channel: o.channel || '', handler: o.handler || '',
        jiip_name: o.channel === '지입사' ? (o.jiip || '') : '', jiip_phone: o.channel === '지입사' ? (o.jiipPhone || '') : ''
      };
    };

    var contracts = [
      K(1, 1, '현대해상', '건설기계', '2026-31-004821', '01가1234', { start: '2026-04-01', end: '2027-03-31' }),
      K(2, 1, '현대해상', '건설기계', '2026-31-004822', '01가5678', { start: '2026-04-01', end: '2027-03-31' }),
      K(3, 2, 'KB손해보험', '건설기계', '2026-11-330251', '02나4410', { start: '2026-05-12', end: '2027-05-11' }),
      K(4, 3, '삼성화재', '건설기계', '2026-22-118840', '03다9021', { start: '2026-02-20', end: '2027-02-19' }),
      K(5, 4, 'DB손해보험', '건설기계', '2026-04-775102', '04라3312', { channel: '지입사', handler: '태양운수', jiip: '태양운수', jiipPhone: '010-0000-2001', start: '2026-01-15', end: '2027-01-14' }),
      K(6, 5, '메리츠화재', '건설기계', '2026-33-551908', '05마7781', { start: '2026-06-01', end: '2027-05-31' }),
      K(7, 6, '현대해상', '건설기계', '2026-31-009912', '06바2245', { channel: '지입사', handler: '한성화물', jiip: '한성화물', jiipPhone: '010-0000-2002', start: '2026-03-11', end: '2027-03-10' }),
      K(8, 7, '롯데손해보험', '건설기계', '2026-12-201188', '07사1190', { start: '2026-07-01', end: '2027-06-30' }),
      K(9, 8, 'KB손해보험', '건설기계', '2026-11-332870', '08아5521', { start: '2026-04-22', end: '2027-04-21' }),
      K(10, 9, '삼성화재', '건설기계', '2026-22-119044', '09자6632', { start: '2026-08-01', end: '2027-07-31' }),
      K(11, 10, '한화손해보험', '건설기계', '2026-51-880231', '10차7712', { channel: '지입사', handler: '대한운수', jiip: '대한운수', jiipPhone: '010-0000-2003', start: '2026-02-05', end: '2027-02-04' }),
      K(12, 11, '현대해상', '건설기계', '2026-31-008877', '11카2210', { start: '2026-05-30', end: '2027-05-29' }),
      K(13, 12, 'KB손해보험', '건설기계', '2026-11-331402', '12타9081', { start: '2026-03-18', end: '2027-03-17' }),
      K(14, 13, 'DB손해보험', '건설기계', '2026-04-778819', '13파4471', { channel: '지입사', handler: '서해물류', jiip: '서해물류', jiipPhone: '010-0000-2004', start: '2026-01-08', end: '2027-01-07' }),
      K(15, 14, '메리츠화재', '건설기계', '2026-33-552773', '14하1102', { start: '2026-06-20', end: '2027-06-19' }),
      K(16, 15, '삼성화재', '건설기계', '2026-22-120331', '15거8890', { start: '2026-09-01', end: '2027-08-31' }),
      K(17, 16, '한화손해보험', '건설기계', '2026-51-881904', '16너3345', { channel: '지입사', handler: '태양운수', jiip: '태양운수', jiipPhone: '010-0000-2001', start: '2026-04-09', end: '2027-04-08' }),
      K(18, 17, '현대해상', '건설기계', '2026-31-007745', '17더5512', { start: '2026-02-14', end: '2027-02-13' })
    ];

    var docId = 0;
    function D(contractId, kind, ago) {
      docId += 1;
      return { id: docId, contract_id: contractId, kind: kind, reg_at: daysAgo(ago == null ? 0 : ago, 10, 20) };
    }
    var documents = [
      D(1, '증권', 0), D(2, '증권', 1), D(3, '가입증명서', 0), D(4, '증권', 0), D(5, '증권', 2),
      D(6, '증권', 0), D(7, '가입증명서', 1), D(8, '증권', 3), D(9, '증권', 0), D(10, '증권', 0),
      D(11, '증권', 2), D(12, '증권', 1), D(13, '증권', 1), D(14, '증권', 4), D(15, '증권', 1),
      D(16, '증권', 0), D(17, '증권', 0), D(3, '납입증명서', 0)
    ];

    var sendId = 0;
    function S(cid, kid, docIds, status, o) {
      sendId += 1;
      o = o || {};
      return {
        id: sendId, contract_id: kid, customer_id: cid, doc_ids: docIds, status: status,
        addr: o.addr || '', zip: o.zip || '', sent_at: o.sent_at || null, sent_by: o.sent_by || null,
        post_sndng_dt: o.post_sndng_dt || null, reg_no: o.reg_no || null, skip_why: o.skip_why || null,
        source: o.source || '자료실 등록', created_at: o.created_at || daysAgo(0, 9, 5)
      };
    }

    /* 보낼 것 — 자료실에 증권·가입증명서가 올라오면 자동으로 생긴 줄.
       납입증명서(18번)는 우편 대상이 아니라 줄이 없다. 박수경(5)은 '우편 안 받음'이라 줄이 없다. */
    var sends = [
      S(1, 1, [1], '보낼 것', { created_at: daysAgo(3, 9, 12) }),
      S(1, 2, [2], '보낼 것', { created_at: daysAgo(1, 10, 5) }),
      S(2, 3, [3], '보낼 것', { created_at: daysAgo(0, 9, 30) }),
      S(3, 4, [4], '보낼 것', { created_at: daysAgo(0, 9, 32) }),
      S(4, 5, [5], '보낼 것', { created_at: daysAgo(2, 14, 10) }),
      S(6, 7, [6], '보낼 것', { created_at: daysAgo(0, 9, 40) }),
      S(7, 8, [7], '보낼 것', { created_at: daysAgo(0, 9, 41) }),
      S(8, 9, [8], '보낼 것', { created_at: daysAgo(0, 9, 45) }),
      S(9, 10, [9], '보낼 것', { created_at: daysAgo(1, 16, 20) }),
      S(10, 11, [10], '보낼 것', { created_at: daysAgo(0, 10, 2) }),
      S(14, 15, [15], '보낼 것', { created_at: daysAgo(1, 11, 0), source: '반송 재발송' })
    ];

    /* 지난 보낸 우편 — 분기 현황(보낸 우편·반송률·전자 열람·우편료) 계산용 */
    var opens = [];
    var histContract = [1, 3, 4, 9, 12, 13, 18, 16, 8, 6, 2, 11, 15, 17, 10, 5, 7, 14];
    var rnd = (function () { var s = 20261119; return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
    var histSends = [];
    for (var i = 0; i < 52; i += 1) {
      var kid = histContract[i % histContract.length];
      var k = contracts[kid - 1];
      var ago = 8 + Math.floor(rnd() * 130);
      var sentAt = daysAgo(ago, 9 + Math.floor(rnd() * 8), Math.floor(rnd() * 59));
      if (dateOnly(sentAt) < '2026-07-01') sentAt = daysAgo(ago, 10, 0);
      var hdoc = D(kid, rnd() < 0.35 ? '가입증명서' : '증권', ago);
      documents.push(hdoc);
      var c = customers[k.customer_id - 1];
      var skip = rnd() < 0.12;
      var sent = S(k.customer_id, kid, [hdoc.id], skip ? '안 보냄' : '보냄', {
        sent_at: skip ? null : sentAt,
        sent_by: skip ? '이사원' : '김대리',
        post_sndng_dt: skip ? null : dateOnly(sentAt),
        addr: skip ? '' : c.address,
        zip: skip ? '' : c.zip,
        reg_no: !skip && rnd() < 0.3 ? 'R' + (700000 + Math.floor(rnd() * 90000)) : null,
        skip_why: skip ? '고객이 전자로만 받겠다고 함' : null,
        created_at: sentAt
      });
      histSends.push(sent);
      if (!skip && rnd() < 0.62) opens.push({ doc_id: hdoc.id, at: daysAgo(Math.max(0, ago - 1), 15, 0) });
    }
    sends = sends.concat(histSends);

    /* 반송 — 화면에서 상태별로 골고루 보이도록 */
    var returns = [
      {
        id: 1, customer_id: 16, contract_ids: [17], reason: '반송', round: 1,
        addr_sent: '경기 하남시 미사강변한강로 135 한강빌딩 6층', status: '문자 대기',
        send_at: minsAhead(9), sms_status: null, sms_at: null, target: null,
        new_zip: null, new_addr: null, addr_same: 0, addr_at: null, addr_via: null,
        resend_at: null, resend_no: null, insurer_at: null, closed_at: null,
        note: null, created_by: '최팀장', created_at: minsAgo(12), remind_at: null
      },
      {
        id: 2, customer_id: 11, contract_ids: [12], reason: '주소불명', round: 1,
        addr_sent: '경기 부천시 평천로 655 105동 402호', status: '주소 기다림',
        send_at: daysAgo(2, 10, 20), sms_status: '보냄', sms_at: daysAgo(2, 10, 20), target: '고객',
        new_zip: null, new_addr: null, addr_same: 0, addr_at: null, addr_via: null,
        resend_at: null, resend_no: null, insurer_at: null, closed_at: null,
        note: null, created_by: '이사원', created_at: daysAgo(2, 10, 5), remind_at: null
      },
      {
        id: 3, customer_id: 12, contract_ids: [13], reason: '수취인불명', round: 1,
        addr_sent: '경기 수원시 팔달구 매산로 118 하늘타워 8층', status: '연락 필요',
        send_at: daysAgo(1, 9, 15), sms_status: null, sms_at: null, target: '직원',
        new_zip: null, new_addr: null, addr_same: 0, addr_at: null, addr_via: null,
        resend_at: null, resend_no: null, insurer_at: null, closed_at: null,
        note: '고객 휴대폰 번호가 없어 직접 연락해야 합니다', created_by: '최팀장', created_at: daysAgo(1, 9, 5), remind_at: null
      },
      {
        id: 4, customer_id: 13, contract_ids: [14], reason: '반송', round: 1,
        addr_sent: '부산 남구 신선로 365 유진공장', status: '지입사 확인 중',
        send_at: daysAgo(0, 13, 40), sms_status: '보냄', sms_at: daysAgo(0, 13, 40), target: '지입사',
        new_zip: null, new_addr: null, addr_same: 0, addr_at: null, addr_via: null,
        resend_at: null, resend_no: null, insurer_at: null, closed_at: null,
        note: null, created_by: '김대리', created_at: daysAgo(0, 13, 25), remind_at: null
      },
      {
        id: 5, customer_id: 14, contract_ids: [15], reason: '이사감', round: 1,
        addr_sent: '경기 군포시 산본로323번길 12 서원빌딩 3층', status: '주소 받음',
        send_at: daysAgo(4, 10, 0), sms_status: '보냄', sms_at: daysAgo(4, 10, 0), target: '고객',
        new_zip: '15809', new_addr: '경기 군포시 산본로323번길 14 서원빌딩 2층', addr_same: 0,
        addr_at: daysAgo(1, 11, 20), addr_via: '고객 링크',
        resend_at: null, resend_no: null, insurer_at: null, closed_at: null,
        note: null, created_by: '박주임', created_at: daysAgo(4, 9, 50), remind_at: null
      },
      {
        id: 6, customer_id: 15, contract_ids: [16], reason: '폐문부재', round: 1,
        addr_sent: '경기 의왕시 왕곡로 77 302호', status: '주소 받음',
        send_at: daysAgo(3, 14, 0), sms_status: '보냄', sms_at: daysAgo(3, 14, 0), target: '고객',
        new_zip: '16052', new_addr: '경기 의왕시 왕곡로 77 302호', addr_same: 1,
        addr_at: daysAgo(2, 9, 10), addr_via: '고객 링크',
        resend_at: null, resend_no: null, insurer_at: null, closed_at: null,
        note: null, created_by: '이사원', created_at: daysAgo(3, 13, 50), remind_at: null
      },
      {
        id: 7, customer_id: 17, contract_ids: [18], reason: '반송', round: 1,
        addr_sent: '경기 남양주시 다산중앙로 132 대원빌딩', status: '재발송함',
        send_at: daysAgo(40, 10, 0), sms_status: '보냄', sms_at: daysAgo(40, 10, 0), target: '고객',
        new_zip: '12036', new_addr: '경기 남양주시 다산중앙로 134 대원빌딩', addr_same: 0,
        addr_at: daysAgo(39, 11, 0), addr_via: '고객 링크',
        resend_at: daysAgo(38, 9, 30), resend_no: 'R771802', insurer_at: daysAgo(38, 10, 0), closed_at: null,
        note: null, created_by: '김대리', created_at: daysAgo(42, 9, 0), remind_at: null
      },
      {
        id: 8, customer_id: 9, contract_ids: [10], reason: '기타', round: 1,
        addr_sent: '서울 구로구 경인로 445 201동 1103호', status: '끝',
        send_at: daysAgo(66, 10, 0), sms_status: '보냄', sms_at: daysAgo(66, 10, 0), target: '고객',
        new_zip: null, new_addr: null, addr_same: 0, addr_at: null, addr_via: null,
        resend_at: null, resend_no: null, insurer_at: null, closed_at: daysAgo(60, 9, 0),
        note: '끝냄: 고객이 우편 필요 없다고 함(자료실에서 받음)', created_by: '김대리', created_at: daysAgo(66, 9, 40), remind_at: null
      }
    ];

    var addr_changes = [
      { id: 1, customer_id: 14, old_addr: '경기 군포시 산본로323번길 12 서원빌딩 3층', new_addr: '경기 군포시 산본로323번길 14 서원빌딩 2층', zip: '15809', via: '고객 링크', return_id: 5, by_id: null, at: daysAgo(1, 11, 20) },
      { id: 2, customer_id: 17, old_addr: '경기 남양주시 다산중앙로 132 대원빌딩', new_addr: '경기 남양주시 다산중앙로 134 대원빌딩', zip: '12036', via: '고객 링크', return_id: 7, by_id: null, at: daysAgo(39, 11, 0) },
      { id: 3, customer_id: 4, old_addr: '경기 화성시 향남읍 상신하길 15', new_addr: '경기 화성시 향남읍 상신하길 17 서진빌딩', zip: '18534', via: '직원 김대리 · 전화', return_id: null, by_id: '김대리', at: daysAgo(55, 15, 0) },
      { id: 4, customer_id: 2, old_addr: '경기 고양시 일산동구 백마로 190', new_addr: '경기 고양시 일산동구 백마로 195 한빛빌딩 4층', zip: '10326', via: '고객 링크', return_id: null, by_id: null, at: daysAgo(72, 10, 0) }
    ];

    var tasks = [
      { id: 1, kind: 'insurer', return_id: 5, customer_id: 14, title: '보험사 주소 반영', detail: '서원기업 새 주소를 메리츠화재 포탈에 반영', done: false, done_at: null, created_at: daysAgo(1, 11, 20) },
      { id: 2, kind: 'resend', return_id: 6, customer_id: 15, title: '같은 주소로 다시 보내기', detail: '최현석 — 주소가 맞다고 확인함', done: false, done_at: null, created_at: daysAgo(2, 9, 10) },
      { id: 3, kind: 'call', return_id: 3, customer_id: 12, title: '전화로 주소 받기', detail: '(주)하늘 — 휴대폰 번호 없음', done: false, done_at: null, created_at: daysAgo(1, 9, 5) }
    ];

    var sms = [
      { id: 1, return_id: 2, to: '010-0000-0011', target: '고객', kind: 'first', at: daysAgo(2, 10, 20), status: '보냄', text: '（데모 — 지난 문자 기록）' },
      { id: 2, return_id: 4, to: '010-0000-2004', target: '지입사', kind: 'jiip', at: daysAgo(0, 13, 40), status: '보냄', text: '（데모 — 지입사 안내 문자）' },
      { id: 3, return_id: 5, to: '010-0000-0014', target: '고객', kind: 'first', at: daysAgo(4, 10, 0), status: '보냄', text: '（데모 — 지난 문자 기록）' }
    ];

    var policies = [
      { id: 1, quarter: '2026-Q3', eff_from: '2026-07-01', mail: 'on', note: '3분기 회의 — 계속 보냄', stats: null, decided_by: '대표', decided_at: '2026-09-15 10:00:00' },
      { id: 2, quarter: '2026-Q4', eff_from: '2026-10-01', mail: 'on', note: '4분기 회의 — 계속 보냄, 반송률 보며 1분기 재검토', stats: null, decided_by: '대표', decided_at: '2026-10-02 09:30:00' }
    ];

    return {
      meta: { version: 1, seededAt: new Date().toISOString(), demo: true },
      settings: { return_on: true, hold_min: 10, cost: 430, sender: { name: '에이원코리아', tel: '02-407-6610', addr: '서울 강동구 성안로 156 우주빌딩 901호' } },
      customers: customers,
      contracts: contracts,
      documents: documents,
      sends: sends,
      returns: returns,
      addr_changes: addr_changes,
      tasks: tasks,
      policies: policies,
      sms: sms,
      opens: opens,
      tries: {}
    };
  };
})();
