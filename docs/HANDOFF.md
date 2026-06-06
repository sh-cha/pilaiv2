# 핸드오프 — pilaiv2 (필라테스 시퀀스 생성 앱)

> context clear 후 이 문서 → DEVELOPMENT_FLOW.md → PRD.md → ARCHITECTURE.md 순으로 읽으면 그대로 이어갈 수 있음. (도메인 핵심은 아래 "핵심 도메인" 절에 요약 — 별도 SEQUENCE_DESIGN.md는 존재하지 않음)
> 갱신: 2026-06-06

## 한 줄
필라테스 선생님용 **시퀀스 생성 앱**. LLM(Claude) 기반. 아내(현직 BASI 선생님)가 도메인 검증자.

## ⚠️ 작업 방식 (반드시 지킬 것)
- 사용자는 Claude **구독 모델**. 이 대화 안의 작업(텍스트·판단·번역·코드)은 추가 비용 0.
- **텍스트/번역/판단/코드는 대화에서 직접 하라.** API 스크립트는 대화로 불가능한 것만 — 대량 이미지 비전 추출(책 PDF 수백 장)뿐. (텍스트 번역을 API로 돌린 건 실수였음)
- 사용자는 코드 직접 안 봄 → Claude가 구현·검증 주도. 설명은 "무엇을/왜". 빠른 컨펌("ㄱㄱ"), **멈추지 말고 쭉**. TDD 선호.
- 큰 단계 전 docs 업데이트. **기능 단위로 커밋**(기능 + docs 분리 2커밋이 이 repo 관습). main에 직접 커밋(PR 없음). gstack 스킬 안 씀.
- 유료 라이브(생성·eval 등) 돌리기 전 비용 한 줄 고지하고 컨펌받기.
- ⚠️ **키 커밋 금지.** `.env`(app·scripts, 실제 키)·node_modules·BASI 원본(PDF/스캔 ~1GB)·`app/eval/runs.jsonl`은 루트 `.gitignore`로 제외.

## 지금 어디
**기반 (이전 세션들, 완료)**
- ✅ **Phase 0**: 데이터 파이프라인 (232동작 카탈로그, 한글 번역). `scripts/` extract(비전)·transform·translate.
- ✅ **Phase 1**: 시퀀스 생성 실동작 — 진단→처방, 기구 전환 최소, 안전 큐, verifier 통과. **프롬프트 캐싱**(입력 90%↓) + **repair 루프(≤2)** + **플라이휠**(편집 diff 캡처·영속, 로컬).
- ✅ **Phase 2**: **회원 레지스트리 + 이력 기반 변주(케어 사이클)** — 회원 선택→프로필 prefill→최근 이력 요약을 생성에 주입→세션을 회원에 연결. reps·수업모드. **로컬 우선**(Supabase는 공개배포 전 보류 — KV 추상화로 저장만 교체).
- ✅ **디자인 전면 재구축**: Claude Design "A·Studio" 핸드오프(`Pilai Prototype.html`)를 RN으로 재현. **`App.tsx` 단일 → `src/{theme,components,nav,screens,data,lib}` 분해**(구버전 `App.legacy.tsx` 백업, tsconfig `exclude`). **16화면 + 자체 경량 라우터**(`src/nav/router.tsx`), Pretendard+Spline Sans Mono, 앱 아이콘("우아한 S", 딥 포레스트). 회원 AI 인사이트(haiku + 입력 시그니처 캐싱 + 규칙 fallback `src/lib/insight.ts`), 생성폼 progressive disclosure, 재생성 방향 지시(`MemberInput.adjust`).

**이번 세션 (2026-06-05~06)**
- ✅ **편집·UX 다듬기** (사용자 피드백 여러 라운드): 시퀀스 결과 화면 편집을 **드래그 핸들(⋮) 순서변경 + 삭제·추가**로(`src/components/DraggableExercises.tsx`, PanResponder **의존성 0**; 디자인 `proto-edit.jsx` 참고하되 액션시트 아닌 핸들 드래그). "편집" 버튼 토글 — 보기 모드는 깔끔(reps 배지만), 편집 모드만 핸들·삭제·추가. 진단은 **요약(`summary_points` 2문장: 이력 변주+안전 이유, 친근체) + '자세히'로 상세(`member_summary`)**. `ExerciseSheet` 셋업 카드화. caution 쉼표 통일. **저장↔수업진행 분리**: `SequenceScreen`=저장만, **실시간 진행/완료는 `SessionDetailScreen`에서**(회원 로드해 `member` 전달→완료화면 이름 표시). 강사 화면서 **편집 diff 표시 제거**(데이터는 학습용 유지), **nextTags 제거**(노트만), 미동작 **알림 토글 제거**. 동작 추가 시 reps '10회' 기본. 편집 신호 캡처: `computeDiff`가 add/remove + **reps(from→to)·reorder**(`DiffOp` 확장).
- ✅ **eval 인프라 + 모델 결정**: 생성물 품질 rubric 채점 harness `app/eval/` 3종 — `npm run eval`(인사이트)/`eval:seq`(시퀀스 sonnet↔opus)/`eval:regen`(재생성). `rubric.ts`(**`RUBRIC_VERSION`** — 시스템 진화 시 버전업하는 살아있는 자산), `judge.ts`(LLM-as-judge sonnet, `call` 주입 가능), `score.ts`(**버전·모델 인지 추세비교** `compareToPrev`), `seq.ts`(직렬화·비용추정). 순수 로직 테스트 11개(`npm test`), 라이브는 `RUN_EVAL` 가드(**유료**) → `runs.jsonl` 이력(gitignore). **eval이 버그 2개를 잡아 수정**: ① sonnet이 임신 등 진단 복잡 케이스에서 `blocks` 누락(긴 진단으로 — 프롬프트가 "상세 진단" 유도 + max_tokens 4000) → SYSTEM에 blocks 필수·진단 간결화 + **max_tokens 8000** ② 재생성이 과교정(원본 미주입) → **`MemberInput.baseSequence`로 직전 생성본 주입** + "원본 기반 편집·핵심 보존" 지시(재생성 eval 72%→100%). **결론: 프롬프트 개선이 opus보다 우선** — opus 비교는 `EVAL_OPUS=1` opt-in, **프로덕션은 sonnet**.
- ✅ **오프라인·에러 처리**: 생성 실패의 raw 기술 메시지(`API 500`, `Network request failed`)를 **친화 메시지 + 재시도**로(`src/lib/errors.ts classifyError`, offline/auth/rate/server/unknown 분류, **의존성 0**). `GeneratingScreen` 재시도(`retryKey`). 인사이트는 규칙 fallback 유지. 테스트 6개 + `SHOT_ERROR` 셀프 QA.

## 완료된 것 (`app/`, Expo RN+TS)
- `src/lib/generateSequence.ts` — 오케스트레이터 **gen→verify→repair(≤2)**. **프롬프트 캐싱**(system+카탈로그 cache_control, 회원·이력은 후행 비캐시). **이력 주입**. **모델 파라미터화** `makeClaudeCall(model)`·`MODEL` export(eval에서 opus 주입). **재생성 시 `MemberInput.baseSequence` 주입**. max_tokens 8000. `callModel` 주입 가능, `usage` 누적. ⚠️ 앱 직접 호출 → 프로덕션 전 Edge Function 이동 필수
- `src/lib/validateSequence.ts` — verifier(카탈로그 내 동작/전환≤3/빈블록)
- `src/lib/flywheel.ts` — diff 캡처·영속 + 이력. `computeDiff`(add/remove/**reps/reorder**), `buildCapturedSession`, `appendSession`/`loadSessions`, `summarizeHistory`, `updateSession`(노트). `CapturedSession.nextTags`는 타입에 남았으나 UI 미사용.
- `src/lib/storage.ts`(KV 공유 계약, Supabase 가면 이것만 교체) · `members.ts` · `types.ts`(`MemberInput.baseSequence` 포함) · `balance.ts`(근육군 비중+규칙 인사이트) · `insight.ts`(haiku+캐싱) · `catalog.ts` · `kv.ts`
- `src/lib/errors.ts` — `classifyError`(네트워크/API 에러 분류, 의존성 0)
- `src/components/DraggableExercises.tsx` — 핸들 드래그 reorder(PanResponder, ROW=70 근사)
- `app/eval/` — rubric·judge·score·seq·cases + 순수 테스트(`eval.test.ts`) + 라이브(`eval.live`/`sequence.live`/`regen.live`, RUN_EVAL 가드)
- `src/screens/` (16화면, `App.tsx`는 라우터 진입점) · `src/nav/router.tsx`
- 테스트: `npm test`(오프라인 56개, 라이브 4개 스킵). 라이브 생성: `RUN_LIVE=1 EXPO_PUBLIC_ANTHROPIC_API_KEY=… npx vitest run src/lib/generateSequence.live.test.ts`
- **셀프 시각 QA**: `cd app && set -a && . ./.env && set +a && SHOT_GENERATE=1 npm run shots` → expo 웹 빌드 + headless Chrome 스샷(`/tmp/pilai-*.png`, 보기/자세히/편집/셋업). Claude가 Read로 직접 봄. `SHOT_GENERATE`는 라이브 생성(유료), 빼면 무료(로그인 화면까지). `SHOT_ERROR`=오프라인 에러 화면(API 차단, 무료).
- `app/.env` — `EXPO_PUBLIC_ANTHROPIC_API_KEY` (gitignore됨)
- 데이터: `data/basi/catalog/exercises.json`(232동작, 영어+`_ko`) → `app/src/data/exercises.json`. **교재 페이지 참조 174건 제거됨**(텍스트 정규식). ⚠️ `scripts/` 재추출 시 재유입 — transform 정제 반영은 후속.

## 실제 생성 결과 (검증됨)
- 입력: 30대 목디스크/거북목/말린어깨, 자세교정+코어, reformer+cadillac, 50분 → 기능해부 진단 + reformer→cadillac 1회 전환 + 목디스크 주의 큐. verifier `ok:true`.
- 비용(Sonnet 4.6): 입력 캐시분 10,088토큰 → 2차부터 cache read(입력비 90%↓). 생성 1개 ~$0.05(출력 ~3K토큰이 지배). eval 라이브: 인사이트 ~$0.1, 재생성 ~$0.4, 시퀀스 sonnet↔opus 비교 ~$1.5.

## 다음 할 것
- 🔜 **데이터 초기화 기능** (사용자 요청, 미완) — `SettingsScreen`에 "데이터 초기화" 버튼 추가(`AsyncStorage.clear()` 또는 members/sessions/insights 키 삭제 → 빈 상태로 처음부터 테스트). 실기기 AsyncStorage는 Claude가 직접 못 지움 → 앱 내 기능 필요. (`kv.ts`에 clear 추가 검토)
- 🔜 **eval 골든 라벨 + baseline 추세** — 아내가 실사용 판정(인사이트/시퀀스/재생성 품질)을 골든 라벨로 축적. 현재 각 첫 baseline만(인사이트 88%·시퀀스 sonnet 96%·재생성 100%). 같은 RUBRIC_VERSION으로 추세 쌓기.
- 🔜 **플라이휠 회전** — 캡처(편집 diff)는 완비됐으나 학습 루프 미연결. 플라이휠 diff(선생님 편집=정답)를 eval 골든셋에 잇는 게 다음 핵심. 현황·As-Is/To-Do: **`docs/FLYWHEEL.md`**.
- 🔜 **디바이스 QA** — 아내 실사용. 특히 셀프 스샷이 안 닿는 흐름: 편집 핸들 드래그(web PanResponder 제한), 저장→기록→SessionDetail 실시간/완료, 완료화면 이름. + 진단 요약의 영어 약어(ROM)·괄호 더 줄일지 판단.
- 🔜 **보류 (백엔드 필요)** — 로그인 OAuth(현재 탭→홈), 예약·알림(그래서 홈은 회원·세션 요약), 회원 피드백·만족도(Phase 3 회원앱).
- ⏸ **Supabase 이동** — 공개배포 전 보류. KV 추상화로 저장만 교체.
- 정리거리: `App.legacy.tsx`(미사용 백업) · `src/components/BodyRegionPicker.tsx`(Phase 3 대비 보존) · 미사용 스타일(ClassComplete toggle 등). `scripts/` transform에 페이지 참조 정제 반영. 금기/부하태그 verifier(Phase 1.5).

## 핵심 도메인
- 시퀀스 = 진단(문진+움직임) → 원인 근육(기능해부) → 타깃 처방 → BASI 블록 교체
- 케어 사이클: 2~5회 반복, 문제 부위 유지 + 나머지 변주(이력 필요)
- 그날 컨디션 나쁨 → 릴렉스 모드 / 기구: 전환 ≤2~3, 블록화, 양쪽 가능 동작은 현재 기구로 흡수

## 환경/주의
- `ANTHROPIC_API_KEY`: `scripts/.env` / `app/.env`(EXPO_PUBLIC_)
- 셸: `cp`·`rm`은 `-i` alias + zsh `noclobber` → 강제는 `command cp -f` / `command rm -f`. cwd가 루트로 리셋되곤 함 — `cd app` 명시.
- node 23, app=Expo~56(RN 0.85), `scripts/`와 `app/`은 별도 node 프로젝트
- ⚠️ 웹 자동화 주의: `expo --web`에서 RN controlled `TextInput` 입력이 `onChangeText`로 안 잡힘(검증 시 localStorage 주입으로 우회). 드래그(PanResponder)도 web 제한 — 실기기는 정상.
- apparatus `inferred` 12개 동작 있음 (Phase 1.5에서 확인)
