# 붙이는 법 — total 서버 연결 명세

이 폴더는 `total` 업무 웹에 있던 **우편 발송·반송**을 `stamp`·`pamphlet`처럼 따로 떼어 낸 조립식 모듈입니다.
화면(직원용·고객용)과 업무 규칙은 서버 없이 데모로 완결되고, `assets/config.js`의 **주소 한 줄만 바꾸면** `total` 서버와 그대로 붙습니다.

- 직원 화면: `index.html` — 보낼 것 · 반송 · 현황·분기 · 설정
- 고객 화면: `address-confirm.html` — 생년월일/사업자번호 확인 → 주소 입력 → 완료
- 연결 코드: `assets/api.js` (demo ↔ rest), 규칙: `assets/store.js`, 자료: `assets/demo-seed.js`

`total`의 실제 구현은 `a1app/server/v0994.js`(v0.9.9.4 반송·주소확인, v0.9.9.5 보낼 목록·분기)입니다.
이 모듈의 REST 어댑터는 **그 엔드포인트 이름과 요청·응답 모양을 그대로** 씁니다. 화면을 붙이는 데는 서버 코드를 고칠 것이 없고,
아래 **발송일자(POST_SNDNG_DT) 컬럼 하나만** 추가하면 됩니다(3-2 참고).

---

## 1. 연결 방법 세 가지

### A. total 서버에 같이 올리기 (권장)

1. 이 폴더를 `a1app/public/post/` 로 복사합니다.
2. `a1app` 정적 서빙에 `/post/` 가 잡히면 `https://서버/post/index.html` 로 열립니다.
3. `assets/config.js`:

```js
window.A1POST_CONFIG = {
  mode: 'rest',
  apiBase: '',                 // 같은 서버
  customerPage: '/addr',       // 서버가 만드는 고객 페이지를 그대로 씁니다
  org: '에이원코리아'
};
```

4. 직원 메뉴(증권·배서·해지)에 `우편` → `/post/index.html` 링크를 답니다.
5. 로그인 세션 쿠키를 그대로 쓰므로 CORS 설정이 필요 없습니다.

> 고객 링크도 서버가 만드는 `/addr`를 쓰면 `exp`·`sig` 서명과 7일 만료가 그대로 적용됩니다.
> 이 폴더의 `address-confirm.html`을 쓰고 싶으면 아래 6번(고객 링크)을 보세요.

### B. 화면만 따로 (GitHub Pages) + API는 total

```js
mode: 'rest',
apiBase: 'https://total.example.com',
customerPage: 'address-confirm.html'
```

- total의 CORS 허용 목록에 페이지 출처(예: `https://jiyong9-art.github.io`)를 넣고 `credentials: true` 로 쿠키를 허용해야 합니다.
- `api.js`는 `credentials: 'include'` 로 호출합니다. 서버는 `Access-Control-Allow-Origin`에 **출처를 그대로** 돌려주고 `Access-Control-Allow-Credentials: true` 를 보내야 합니다(와일드카드 `*`는 쿠키와 함께 쓸 수 없음).
- 고객 링크는 서버가 만든 `/addr`를 쓰는 편이 안전합니다. 우리 페이지를 쓰려면 6번 참고.

### C. 데모만 (서버 없이)

```js
mode: 'demo'
```

- `localStorage`의 `a1post.db.v1` 에 저장됩니다. 새로 고침해도 유지, 설정 → ‘데모 자료 처음으로’로 초기화.
- GitHub Pages에 그대로 올려 검토용으로 쓸 수 있습니다(아래 9번).

주소창으로 임시 전환도 됩니다: `?mode=rest&api=https://...`, `?mode=demo`.

---

## 2. total 쪽 준비물 (이미 있는지 확인)

| 항목 | 위치 | 설명 |
|---|---|---|
| 라우트 등록 | `a1app/server/v0994.js` | `module.exports = function(app,{staff,audit,bad,canSee})` — 앱에서 한 번 등록 |
| 자료실 → 보낼 목록 | `v0992.onExtDoc` → `v0994.onPostDoc(docId,user,source)` | 증권·가입증명서 등록 때 자동 1줄(납입증명서 제외) |
| 자동 문자 순회 | `v0994.sweep()` | 30초마다 — 기다리는 시간이 지난 건 발송, 3일 재안내, 7일 연락 필요 |
| 상단 알림 | `v0994.alertsFor(user)` | 업무팀 전원·대표: 보낼 것 N건(2일 넘음), 반송 처리 N건 / 관리자: 분기 결정 |
| 내 할 일 | `v0994.todoItems(user)` | 반송 등록 직원에게 ‘주소 받기 · 보험사 반영’ |
| 문자 게이트웨이 | `outreach.queueSmsFrom`, `sms_phones` | 고객 문자는 **취급자 폰**으로만, 지입사는 등록 직원 폰 → 없으면 법인폰 |
| 링크 서명 | `storage.signTag('a', id, 7*86400)` | `/addr?r=&exp=&sig=` |
| 홈페이지 주소 | `out.baseUrl()` | 문자에 들어가는 링크·자료실 주소 |
| 업무 기준값 | `settings`: `post_return`, `post_return_hold`, `post_cost`, `main_phone` | 반송 문자 켜기/끄기, 기다리는 시간(0~60분), 1통 비용 |

이 모듈은 위 기능을 **화면 쪽에서** 다시 구현해 두었습니다. total에 이미 붙어 있다면 A 방식으로 화면만 갈아 끼우면 됩니다.

---

## 3. 엔드포인트 명세

모든 경로는 `apiBase` 기준입니다. 응답은 JSON, 오류는 `{ok:false, why}` + 4xx.
`staff` = 로그인 직원, `업무팀·관리자` = 발송/반송 처리 권한, `관리자` = 대표·부대표·업무팀 관리자.

### 3-1. 설정

| Method | Path | 권한 | 요청 | 응답 |
|---|---|---|---|---|
| GET | `/api/post-returns/config` | staff | — | `{on, hold, base, reasons:[...], days:{link:7, remind:3, giveup:7}}` |
| POST | `/api/post-returns/config` | 관리자 | `{on?:bool, hold?:0~60}` | `{ok, on, hold}` |

### 3-2. 보낼 것 (post_sends)

| Method | Path | 권한 | 요청 | 응답 |
|---|---|---|---|---|
| GET | `/api/post-sends` | staff | `?state=` (기본 보낼 것) `&contract_id=` | `{mail_on, pref, rows:[sendOut]}` |
| POST | `/api/post-sends` | staff | `{contract_id}` | `{id, docs}` 또는 `{id, merged:true}` — 빠진 우편 직접 넣기 |
| POST | `/api/post-sends/sent` | 업무팀·관리자 | `{ids:[...], no?:'등기번호'}` | `{ok, done, skipped, why}` |
| POST | `/api/post-sends/:id/skip` | 업무팀·관리자 | `{why}` (2자 이상) | `{ok}` |
| POST | `/api/post-sends/:id/back` | staff | — | `{ok}` — **오늘 처리한 것만** 되돌림 |

`sendOut` 모양:

```json
{
  "id": 31, "contract_id": 12, "customer_id": 11,
  "status": "보낼 것", "source": "자료실 등록",
  "customer": "대성중기", "customer_kind": "법인", "pref": "",
  "contract": "현대해상 건설기계", "policy_no": "2026-31-004821", "reg": "01가1234",
  "kinds": ["증권"], "cur_addr": "경기 …", "cur_zip": "12256",
  "jiip": "", "age": 3, "created_at": "2026-11-16 09:12:00",
  "addr": "", "zip": "", "sent_at": null, "post_sndng_dt": null, "reg_no": null,
  "sent_name": ""
}
```

**발송일자(POST_SNDNG_DT)**: 이 모듈은 `post_sndng_dt`(YYYY-MM-DD)를 씁니다. total v0.9.9.5의 `post_sends`에는 `sent_at`만 있으므로
다음 중 하나를 서버에 넣어 주세요(둘 다 하면 원장 조회에도 바로 보입니다).

```js
// a1app/server/v0994.js  — postSendRoutes 안 '/api/post-sends/sent'
// ① 보낼 목록 표에 발송일자 컬럼 (한 번만)
try { db.exec("ALTER TABLE post_sends ADD COLUMN post_sndng_dt TEXT"); } catch { /* 이미 있음 */ }

// ② 보냄 처리 때 함께 기록
q("UPDATE post_sends SET status='보냄', addr=?, zip=?, sent_at=datetime('now','localtime'), sent_by=?, reg_no=?, " +
  "post_sndng_dt=date('now','localtime') WHERE id=?").run(c.address, c.zip || null, req.user.id, ids.length === 1 ? no : null, id);

// ③ (선택) 계약 원장의 우편발송일자에도 같은 날짜 — 컬럼명은 total 표기에 맞춤
try {
  q("UPDATE contracts SET post_sndng_dt=date('now','localtime') WHERE id=?").run(p.contract_id);
} catch { /* 계약 표에 그 컬럼이 없으면 건너뜀 */ }
```

컬럼이 없어도 화면은 `sent_at`의 날짜를 발송일자로 대신 보여 줍니다(어댑터가 자동 대체).

### 3-3. 반송 (post_returns)

| Method | Path | 권한 | 요청 | 응답 |
|---|---|---|---|---|
| GET | `/api/post-returns/find` | staff | `?q=이름·주소·차량번호·증권번호·전화끝4` 또는 `?cid=고객id` | `[ {id,name,kind,address,zip,phone,has_id,contracts:[...],open} ]` |
| POST | `/api/post-returns` | staff | `{customer_id, contract_ids:[], reason, addr_sent, note}` | `{id, merged, status, send_at, hold, round, plan}` |
| GET | `/api/post-returns` | staff | `?state=open\|done` `&customer_id=` `&contract_id=` | `[rowOut]` |
| POST | `/api/post-returns/:id/cancel` | staff | — | 문자 나가기 전에만 |
| POST | `/api/post-returns/:id/now` | staff | — | 기다리지 않고 바로 문자 |
| POST | `/api/post-returns/:id/resms` | staff | — | 연락 필요·주소 기다림·지입사 확인 중에서 다시 문자 |
| POST | `/api/post-returns/:id/addr` | staff | `{zip, addr1, addr2, no_detail, via, same?}` | 주소 저장(전화·지입사 회신) |
| POST | `/api/post-returns/:id/resend` | staff | `{no?}` | 재발송 기록 |
| POST | `/api/post-returns/:id/insurer` | staff | — | 보험사 주소 반영 완료 |
| POST | `/api/post-returns/:id/close` | staff | `{why}` (2자 이상) | 끝내기 |

사유 코드: `반송 · 이사감 · 주소불명 · 수취인불명 · 폐문부재 · 기타`

`rowOut` 주요 필드:

```json
{
  "id": 21, "customer_id": 11, "contract_ids": [12],
  "customer": "노경수", "customer_kind": "개인", "phone": "010-****-4471",
  "reason": "주소불명", "reason_txt": "주소 불명", "round": 1,
  "status": "주소 기다림", "target": "고객",
  "addr_sent": "경기 …", "new_addr": null, "new_zip": null, "addr_same": 0,
  "addr_at": null, "addr_via": null, "resend_at": null, "insurer_at": null,
  "next": "고객이 주소 넣기를 기다림 (3일 뒤 한 번 더 안내)",
  "done": false, "turn": false,
  "contracts": [{"id":12,"label":"현대해상 건설기계","policy_no":"…","reg":"11카2210","jiip":""}],
  "jiip": "", "cur_addr": "…", "cur_zip": "14585",
  "plan": {"to":"고객","tel":"010-****-4471","warn":[]}
}
```

상태(`status`)와 다음 할 일:

| 상태 | 뜻 | 다음 |
|---|---|---|
| `문자 대기` | 등록 직후, 기다리는 시간(기본 10분) | 그 사이 `cancel` 가능 |
| `주소 기다림` | 고객에게 링크 문자 나감 (7일) | 3일 무응답이면 한 번 더, 7일이면 `연락 필요` |
| `지입사 확인 중` | 지입사 담당자에게 링크 없이 문자 | 회신 받아 직원이 `addr` |
| `연락 필요` | 전화·번호 없음·7일 경과 | `addr` 또는 `resms` |
| `주소 받음` | 주소 확정 (`addr_same` 1이면 같은 주소) | `resend`, 바뀐 주소면 `insurer` |
| `재발송함` | 다시 부침 | 바뀐 주소면 `insurer` 까지 해야 종결 |
| `취소` / `끝` | 종결 | — |

### 3-4. 고객별 우편 설정

| Method | Path | 요청 | 응답 |
|---|---|---|---|
| POST | `/api/customers/:id/post-pref` | `{pref: '' \| '우편' \| '전자'}` | `{ok, pref}` |

`''` = 회사 기준 · `우편` = 항상 우편(분기 그만이어도 보냄) · `전자` = 우편 안 받음.

### 3-5. 분기 현황·결정

| Method | Path | 권한 | 요청 | 응답 |
|---|---|---|---|---|
| GET | `/api/post-policy` | staff | — | `{mail_on, now, cost, can_edit, cur, next, cur_label, next_label, quarters:[…], due, prefs, decisions:[…]}` |
| POST | `/api/post-policy/decide` | 관리자 | `{quarter:'2026-Q4', mail:'on'\|'off', note}` | `{ok, mail_on}` |
| POST | `/api/post-policy/config` | 관리자 | `{cost: 430}` | `{ok, cost}` |

분기 통계 한 줄:

```json
{"quarter":"2026-Q4","label":"2026년 4분기","from":"2026-10-01","to":"2026-12-31",
 "sent":48,"skipped":3,"opened":29,"opened_pct":60.4,
 "returned":4,"return_pct":8.3,"fixed":2,"cost":20640,"decision":{...}}
```

- `opened_pct` = 보낸 우편 중 고객이 문자 링크·자료실에서 서류를 연 비율(우편을 끊어도 되는지 보는 숫자)
- `return_pct` = 반송률, `fixed` = 주소 고침 건수
- 지난 분기 결정은 바꿀 수 없음(서버가 400)

### 3-6. 고객 주소 확인 페이지

total은 `GET /addr` 로 **서버가 그리는 페이지**를 씁니다. 이 모듈의 `address-confirm.html`은 같은 검증·저장 API를 부릅니다.

| Method | Path | 요청 | 응답 |
|---|---|---|---|
| POST | `/addr/check` | `{r, exp, sig, idv}` | `{ok, sent, reason, same_ok}` / 오류 `{ok:false, why}` |
| POST | `/addr/save` | `{r, exp, sig, idv, same:true}` 또는 `{…, zip, addr1, addr2, no_detail}` | `{ok, msg, same, addr, zip, files:[{kind,url}]}` |

- `idv` = 개인 생년월일 6자리(YYMMDD), 법인 사업자번호 10자리
- 5회 틀리면 그 링크 30분 잠금, 같은 IP 10분에 20회 제한
- 상세주소가 없으면 `no_detail: true` 를 눌러야 저장 (동·호수 누락이 반송의 흔한 이유)
- `addr_sent`와 같은 주소를 넣으면 서버가 ‘주소 맞음’으로 처리

**우리 페이지를 고객 링크로 쓰려면** total의 `v0994.js` 안 `addrLink()`를 다음처럼 바꾸고, `exp`·`sig`를 함께 넘깁니다:

```js
const addrLink = (id) => {
  const { exp, sig } = storage.signTag('a', id, LINK_DAYS * 86400);
  return `${out.baseUrl()}/post/address-confirm.html?r=${id}&exp=${exp}&sig=${encodeURIComponent(sig)}`;
};
```

우리 페이지는 `mode=rest`일 때 `POST /addr/check`·`/addr/save` 로 같은 검증을 합니다.
고객 페이지도 같은 `assets/config.js` 를 읽으므로, 실제 배포에서는 **`mode:'rest'`로 저장해 두세요**.
주소창의 `?mode=` 는 시험용이고 문자 링크에는 붙지 않습니다.

---

## 4. 일이 흘러가는 순서

```
[자료실] 증권·가입증명서 등록
   └─ v0994.onPostDoc  (납입증명서 제외 · 우편 안 받음/분기 그만이면 건너뜀)
        └─ post_sends  '보낼 것'  (같은 계약은 한 줄로 묶음)

[직원] 보낼 것 → 선택 발송
   └─ post_sends  '보냄' + sent_at + post_sndng_dt + 그 순간 주소/우편번호
        └─ 폼텍 라벨 · 발송 대장(인쇄) · CSV

[봉투 반송]  직원이 찾아 등록 (이름·주소·차량번호·증권번호·전화 끝4)
   └─ post_returns  '문자 대기'  (기다리는 시간 0~60분, 그 사이 취소)
        └─ sweep: 고객이면 취급자 폰 → '주소 기다림'
                  지입사면 지입사 담당자 → '지입사 확인 중' (링크 없음)
                  번호·생년월일 없음·폰 미연결 → '연락 필요'

[고객] 문자 링크 → 생년월일/사업자번호 확인 → 주소 찾기 + 상세주소
   └─ customers.address·zip 갱신 + addr_changes(이전 주소)
        ├─ post_sends '보낼 것' (재발송분 자동)
        ├─ todoItems '보험사 주소 반영' (주소가 바뀐 경우)
        └─ post_returns '주소 받음'

[직원] 재발송 → '재발송함' → 보험사 포털 반영 → insurer_at → 종결
       (주소가 같으면 재발송만, 보험사 반영은 필요 없음)
```

3일 무응답 재안내 1회, 7일이면 `연락 필요` — 전화로 받아 `addr`로 넣습니다.

---

## 5. 문자 문구 (서버가 만드는 그대로)

**고객 (첫 안내)**

```
[에이원코리아] 김도현님, 현대해상 건설기계 증권 우편이 주소를 찾을 수 없어 돌아왔습니다.
바른 주소를 알려 주시면 다시 보내 드립니다.
주소 확인: https://…/addr?r=21&exp=…&sig=…
생년월일 6자리(법인은 사업자번호 10자리)로 확인하며 7일간 열립니다. 주소만 받으며 카드번호·비밀번호는 묻지 않습니다. 전화로 알려 주셔도 됩니다.
증권은 홈페이지 자료실에서도 받으실 수 있습니다. https://…/
— 에이원코리아 김대리 010-0000-1001
```

**지입사 (링크 없음)**

```
[에이원코리아] 태양운수 담당님, 고객 서진건설님(DB손해보험 건설기계 · 04라3312) 증권 우편이 반송(으)로 돌아왔습니다.
바른 주소를 회신해 주시면 다시 보내 드리겠습니다.
— 에이원코리아 김대리 010-0000-1001
```

**다시 안내(3일)** — 링크 + “전화로 알려 주셔도 됩니다”

서명은 **취급자 이름·폰**입니다. 고객 문자는 취급자 폰 게이트웨이로만 보냅니다(법인폰 대신 안 씀).
데모에서는 이 문구를 화면에서 만들고 `복사`만 합니다(실제 발송 없음).

---

## 6. 데이터 표 (SQLite, total과 동일)

```sql
post_sends(id, contract_id, customer_id, doc_ids, status, addr, zip,
           sent_at, sent_by, post_sndng_dt, reg_no, skip_why, source, created_by, created_at)

post_returns(id, customer_id, contract_ids, reason, round, addr_sent,
             target, target_user_id, status, send_at, sms_status, sms_at, remind_at,
             new_zip, new_addr, addr_same, addr_at, addr_via,
             resend_at, resend_by, resend_no, insurer_at, insurer_by,
             closed_at, closed_by, note, created_by, created_at)

addr_changes(id, customer_id, old_addr, new_addr, zip, via, return_id, by_id, at)
post_policy(id, quarter, eff_from, mail, note, stats, decided_by, decided_at)
customers: + zip, + post_pref  (NULL 회사 기준 · '우편' · '전자')
```

이 모듈의 REST 행은 위 컬럼을 그대로 씁니다(카멜케이스 없음). 데모 저장소도 같은 모양입니다.

---

## 7. 권한

| 동작 | 권한 |
|---|---|
| 보낼 것 보기 · 반송 등록 · 주소 넣기 · 재발송 | 로그인 직원 (고객 열람 범위 `canSee`) |
| 선택 발송 · 안 보냄 · 되돌리기 | 업무팀 · 관리자 |
| 반송 자동 문자 켜기/끄기 · 기다리는 시간 | 대표 · 부대표 · 업무팀 관리자 |
| 분기 결정 · 우편 1통 비용 | 대표 · 부대표 · 업무팀 관리자 |

화면은 데모에서 모두 열려 있지만, REST 모드에서는 서버가 위 권한을 강제합니다.

---

## 8. 개인정보·보안

- 카드번호·비밀번호는 **묻지도 저장하지도 않습니다**. 문자에도 그렇게 적혀 있습니다.
- 생년월일·사업자번호는 **본인 확인에만** 씁니다. 화면에는 이름을 `김*현`처럼 가립니다.
- 링크는 7일 만료(`exp`·`sig`), 5회 오답 → 30분 잠금, IP 10분 20회 제한.
- 고객 페이지: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- 주소는 보험 서류 발송(계약 이행) 목적 — 페이지에 그 문구를 표시합니다.
- 본인 확인·주소 변경·보험사 반영은 `audit_log` 에 남깁니다.

---

## 9. 데모와 실제의 차이

| 항목 | 데모 | total 연결 |
|---|---|---|
| 저장 | 브라우저 localStorage | SQLite |
| 문자 | 화면에 문구·기록만 (복사 가능) | 취급자 폰 게이트웨이로 실제 발송 |
| 링크 서명 | 없음 (`?r=`) | `exp`·`sig` 7일 |
| 우편번호 검색 | 다음 우편번호(네트워크 필요, 실패 시 직접 입력) | 같음 |
| 증권 받기 | 없음 | 고객 자료실 링크 |
| 할 일 | 화면의 ‘할 일’ 카드 | `todoItems` (내 할 일) |
| 고객별 설정 | 현황 탭에서 바로 | 고객 화면에서 (다음 단계에서 이 탭에도 붙이면 됨) |

---

## 10. 시험

```bash
cd work/a1-post-module
python3 -m http.server 8791 --bind 127.0.0.1 &     # 정적 서버
LD_LIBRARY_PATH=../libdeb/usr/lib/x86_64-linux-gnu:../blibs/usr/lib/x86_64-linux-gnu \
  python3 test/verify.py                          # 모바일 390 · PC 1366, 52개 항목
python3 test/mock_total.py &                      # total 흉내 서버(8792)
python3 test/verify_rest.py                       # REST 연결 12개 항목
python3 test/audit_layout.py                      # 넘침·터치 크기·라벨 210×297mm
```

최근 결과: `verify.py` **52/52**, `verify_rest.py` **12/12**, 콘솔·페이지 오류 0건,
모바일·PC 가로 넘침 0건, 라벨 63.5×38.1mm(3열×7행) A4 210×297mm.

---

## 11. GitHub에 올리기

```
a1-post-module/
├─ index.html
├─ address-confirm.html
├─ INTEGRATION.md
├─ README.md
├─ .nojekyll
├─ assets/ (config.js, post.css, api.js, store.js, demo-seed.js, app.js)
└─ test/   (검증 스크립트 — 올리지 않아도 됩니다)
```

1. 새 저장소(예: `a1-post`)를 만들고 이 폴더를 그대로 올립니다.
2. Settings → Pages → Branch `main` / root.
3. 바로 열리는 주소: `https://<계정>.github.io/a1-post/` — 데모로 동작합니다.
4. 서버에 붙일 때는 `assets/config.js` 의 `mode`·`apiBase`만 바꿉니다.
   (설정을 저장소마다 다르게 두기 싫으면 `?mode=rest&api=https://…` 로 열어도 됩니다.)
