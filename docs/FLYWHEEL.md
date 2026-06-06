# 데이터 플라이휠 — As-Is / To-Do

> pilaiv2의 학습 데이터 플라이휠 현황과 다음 할 일. 코드: `app/src/lib/flywheel.ts`.
> 갱신: 2026-06-06

## 개요 (왜)

PRD §8의 핵심 아이디어: **"완벽한 출력은 불가능해도, 완벽한 캡처 장치는 1일차부터 가능."**

가장 값진 학습 신호는 **AI 생성본 ↔ 선생님 최종본의 편집 diff** — 틀린 지점과 정답을 *동시에* 담는다. 생성 품질이 아직 완벽하지 않아도, 선생님이 매 수업 고치는 내용을 1일차부터 모아두면 그게 모델·프롬프트를 개선하는 연료가 된다.

핵심 한 줄: **"캡처 장치"는 완비됐고, "플라이휠 회전"(모은 데이터로 개선하는 고리)은 아직 미완.**

---

## As-Is (현재 구현)

### ① 캡처 — 완비됨
- **언제**: `SequenceScreen`에서 **"시퀀스 저장"** 누를 때 (`buildCapturedSession` → `appendSession`)
- **어디**: 로컬 `AsyncStorage`, append-only (키 `pilaiv2.sessions.v1`, 최신이 앞)
- **무엇**: `CapturedSession` 한 건

```
CapturedSession {
  id, memberId?, createdAt
  input          // MemberInput: 통증·목표·기구·길이·컨디션·이력·adjust
  generated      // AI 생성본 (원본 보존)
  final          // 선생님 최종본 (편집 반영)
  diff           // generated→final, DiffOp[]
  edited         // diff.length > 0
  finalValidation// 최종본이 룰(카탈로그/전환≤3/빈블록)을 만족하는지
  attempts, usage// repair 횟수, 비용(토큰)
  note?          // 수업 후 강사 노트 (ClassComplete에서 updateSession)
  nextTags?      // 타입엔 남았으나 UI 제거됨 (미사용)
}
```

- **diff 종류** (`computeDiff`, 블록 단위):
  - `add` / `remove` — 동작 추가·삭제 (이름 멀티셋 비교)
  - `reps` — 운동량 수정 (`from`→`to`)
  - `reorder` — 순서 변경 (add/remove 없는 블록에서만)

### ② 활용 — 지금 실제로 도는 것

| 용도 | 호출처 | 내용 |
|---|---|---|
| **이력 변주(케어 사이클)** | `GeneratingScreen` | 같은 회원 최근 세션의 *최종본* 동작 → `summarizeHistory` → 다음 생성 프롬프트에 주입 ("지난번과 다르게 변주") |
| 근육군 비중·인사이트 | `MemberDetailScreen` | 회원 세션들 → `balance`(부위 비중) + haiku 인사이트(`insight.ts`) |
| 표시 | Home · 기록 · 회원 · 세션상세 | 수업 목록, "편집 N건" 카운트, 수행한 시퀀스 |

### ③ 아직 **안** 연결된 것 ⚠️
- **diff(편집 신호) 자체의 학습 루프가 없음.** 편집을 캡처만 하고, 그걸로 ⓐ 프롬프트 개선 / ⓑ eval 골든셋 라벨 / ⓒ 파인튜닝에 쓰는 고리가 비어 있다.
- **diff 강사 노출 제거됨** — SessionDetail의 "편집 diff(학습 신호)" 표시는 강사에게 불필요해서 제거(데이터는 그대로 캡처).
- **내보내기 없음** — 구버전 `App.legacy.tsx`엔 JSON export가 있었으나 현재 새 UI(`HistoryScreen`)엔 없음.
- **로컬 only** — Supabase 미연결(공개배포 전 보류). 여러 기기·서버 집계 불가.

---

## To-Do (플라이휠 돌리기)

우선순위 순. ①이 "회전"을 시작하는 핵심.

### ① diff ↔ eval 골든셋 연결  ★ 다음 핵심
이번에 만든 **eval 인프라**(`app/eval/`, rubric 채점)와 플라이휠을 잇는다.
- 선생님 편집(= 정답)을 eval 케이스/골든 라벨로 변환: "이 입력에 선생님은 이렇게 고쳤다" → 기대 출력
- 자동 채점: "프롬프트/모델을 바꿨더니 선생님 편집과 가까워졌나"를 같은 `RUBRIC_VERSION`으로 추세 측정
- → 플라이휠 ↔ eval 고리가 닫힘 (캡처 → 측정 → 개선 → 재측정)

### ② diff 집계·분석 → 프롬프트 개선
- 자주 **빠지는/추가되는 동작**, 자주 **바뀌는 reps**, 순서 패턴을 집계
- 예: "목디스크 회원에서 X 동작이 매번 삭제된다" → 프롬프트/카탈로그 룰에 반영
- 가벼운 분석 스크립트 or 화면(강사 아닌 개발용)

### ③ 내보내기 / 백업
- 캡처 세션을 JSON으로 내보내기(분석·백업·이전). 구버전에 있던 기능 복원
- 데이터 초기화 기능과 짝 (초기화 전 백업)

### ④ 백엔드 적재 (공개배포 시)
- Supabase 이동 시 세션을 서버에 적재 → 여러 기기·여러 강사 데이터 집계
- KV 추상화(`storage.ts`) 덕에 저장 구현만 교체

### ⑤ (먼 미래) 파인튜닝 데이터셋
- 충분히 쌓인 (입력 → 선생님 최종본) 쌍으로 모델 파인튜닝 / few-shot 예시 자동 선별

---

## 메모
- 캡처는 **"시퀀스 저장" 시점**에만 일어남 — 실시간 진행/완료(`ClassComplete`)는 노트만 덧붙임(`updateSession`).
- `edited=false`(편집 안 함)인 세션도 캡처됨 — "AI 생성본을 그대로 썼다"도 신호(생성이 충분했다는 뜻).
- diff 로직은 단위테스트 21개로 견고(`flywheel.test.ts`).
