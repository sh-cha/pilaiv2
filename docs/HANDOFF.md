# 핸드오프 — pilaiv2 (필라테스 시퀀스 생성 앱)

> context clear 후 이 문서 → DEVELOPMENT_FLOW.md → PRD.md → ARCHITECTURE.md 순으로 읽으면 그대로 이어갈 수 있음. (도메인 핵심은 아래 "핵심 도메인" 절에 요약 — 별도 SEQUENCE_DESIGN.md는 존재하지 않음)
> 갱신: 2026-06-05

## 한 줄
필라테스 선생님용 **시퀀스 생성 앱**. LLM(Claude) 기반. 아내(현직 BASI 선생님)가 도메인 검증자.

## ⚠️ 작업 방식 (반드시 지킬 것)
- 사용자는 Claude **구독 모델**. 이 대화 안의 작업(텍스트·판단·번역·코드)은 추가 비용 0.
- **텍스트/번역/판단/코드는 대화에서 직접 하라.** API 스크립트는 대화로 불가능한 것만 — 대량 이미지 비전 추출(책 PDF 수백 장)뿐. (텍스트 번역을 API로 돌린 건 실수였음)
- 사용자는 코드 직접 안 봄 → Claude가 구현·검증 주도. 설명은 "무엇을/왜". 빠른 컨펌("ㄱㄱ"), **멈추지 말고 쭉**. TDD 선호.
- 큰 단계 전 docs 업데이트. gstack 스킬 안 씀.
- **기능 단위로 커밋** (작은 단위 = 롤백 지점, 플라이휠/핸드오프와 정합). genesis는 4커밋으로 정리됨.
- ⚠️ **키 커밋 금지.** `.env`(app·scripts, 실제 키)·node_modules·BASI 원본(PDF/스캔 ~1GB)은 루트 `.gitignore`로 제외. (이전엔 루트 gitignore가 없어 `git add -A` 시 키 노출 위험이었음 — 이번에 추가해 차단. 커밋이 0개였어서 실제 유출은 없었음.)
- ⚠️ 알려진 버그: 도구 호출이 가끔 `call` 텍스트로 새며 malformed됨 → 호출 형식 정확히 쓸 것.

## 지금 어디
- ✅ **Phase 0**: 데이터 파이프라인 (232동작 카탈로그, 한글 번역까지)
- ✅ **Phase 1 핵심**: 시퀀스 생성 **실제 동작 확인됨** (진단→처방, 기구 전환 최소, 안전 큐, verifier 통과). 앱 UI(생성/카탈로그/동작 상세 모달) + 세이지 톤 디자인.
- ✅ **Phase 1 보강 (이번 세션)**: 프롬프트 캐싱(실측) + repair 루프 + **플라이휠(편집·저장·diff 캡처, 로컬)**.
- ▶ **Phase 2 착수 (이번 세션, 로컬)**: **회원 레지스트리 + 이력 기반 변주(케어 사이클)**. 회원 등록/선택→프로필 자동채움→최근 이력 요약을 생성에 주입→세션을 회원에 연결. **전체 오프라인 테스트 33개** + 번들 빌드 확인. **로컬 우선**(웹/Supabase는 공개배포 전까지 보류 — 사용자 결정).
- ▶ **Phase 2 확장 (이번 세션 후반)**: **운동량(reps)** 생성·표시 + **수업 모드(클래스)**(큰 글씨 동작·reps배지·카탈로그 큐, 큐는 탭하면 펼침) + **UI 리디자인**(운동 카드화·점진적 공개·**2탭(생성/기록)**, 카탈로그 탭 제거) + **회원 지난 수업 표시**(선택 시 과거 세션→탭하면 수업모드). **셀프 스크린샷 QA**로 직접 검증.
- ▶ **디자인 전면 재구축 (이번 세션, 2026-06-05)**: Claude Design **"A·Studio"** 핸드오프(`Pilai Prototype.html`)를 RN으로 픽셀 재현 + 실기능 연결. **`App.tsx` 단일파일 → `src/{theme,components,nav,screens,data,lib}` 분해**(구버전 `App.legacy.tsx` 백업). **16화면** 클릭 플로우(스플래시·로그인·홈·회원·상세·생성·로딩·시퀀스·수업진행·완료·기록·세션상세·설정·체크인·새회원·빈상태), **자체 경량 라우터**(`src/nav/router.tsx`), **Pretendard+Spline Sans Mono**(expo-font), 아이콘·실루엣은 react-native-svg. **웹 E2E로 실제 LLM 생성 확인**(회원 prefill→generateSequence→타임라인). 플로우 개선: 저장↔수업 진행 분리, 수업 노트·태그 저장(`flywheel.updateSession`), 근육군 비중·AI 인사이트 실데이터화(`src/lib/balance.ts`), 홈 실데이터(일정 데모 제거), 수업 타이머 일시정지.
- ▶ **후속 보강 (2026-06-05)**: 통증·목표 **직접 입력**(칩+커스텀; 새회원·생성폼, 커스텀값이 prefill 복원돼 생성 시 누락 방지). **회원 AI 인사이트 LLM화**(`src/lib/insight.ts`): Claude **haiku** 생성, **입력 시그니처(통증+목표+세션) 기반 캐싱**(바뀔 때만 재호출, 같으면 캐시 0호출), 실패 시 규칙(`balance.buildInsight`) fallback. 강사명 데모 한지은.
- ▶ **생성 UX 정교화 + 앱 아이콘 (2026-06-05)**: ① 생성 폼 **progressive disclosure** 재설계 — 회원 컨텍스트(통증·목표) **요약+조정** 토글, **오늘 컨디션 세그먼트** 전면, 기구·길이·강도는 **"수업 옵션" 접기**. 중복 회원칩 제거(회원 상세 거쳐 진입 → 제목에 회원명). ② 시퀀스 결과 — **"수업 시작"(메인)/"저장만" 분리**, 진단 **불릿(`Sequence.summary_points`)+"자세히"**, **재생성 방향 지시**(`MemberInput.adjust`: 더쉽게/하체강화 등 빠른옵션+자유입력 → 프롬프트 "재조정 요청"으로 반영, 안전규칙 유지). ③ **앱 아이콘 "우아한 S"**(딥 포레스트+크림, Claude Design 핸드오프) → `icon.png`·favicon·adaptiveIcon, **스플래시·로딩 동일 톤 통일**. ④ UI **AI 강조 순화**("AI 인사이트"→"인사이트", "시퀀스 최적화 (AI)"→"시퀀스 최적화" 등 — 이름 Pilai에 AI 내재라 화면선 절제). 새 공유 컴포넌트 `Segmented`(세그먼트 컨트롤).
- ▶ **편집 깊이 [#13] (이번 세션, 2026-06-05)**: 시퀀스 결과 화면 편집을 삭제·추가에서 **순서 변경(▲▼)·reps 인라인 수정**까지 확장. 편집 diff(`flywheel.computeDiff`)가 이제 **reps 변경·순서 변경**도 학습 신호로 캡처(`DiffOp`에 `reps`/`reorder` 추가). `Icon`에 up/down, `SessionDetailScreen` diff 라벨 분기 추가. 미사용 백업 `App.legacy.tsx`는 새 `DiffOp` 타입과 충돌해 **tsconfig `exclude`** 처리(기본 제외 사라지므로 `node_modules`도 함께 명시). `qa/shot.mjs` `SHOT_GENERATE` 경로를 **로그인→회원(localStorage 주입)→생성** 플로우로 보강.
- ▶ **인사이트/재생성 eval 골든셋 틀 (이번 세션, 2026-06-05)**: 생성물 품질을 rubric으로 채점하는 평가 harness `app/eval/` 신설 — `rubric.ts`(채점기준 + `RUBRIC_VERSION`; 시스템(프롬프트·모델) 진화 시 **함께 버전업하는 살아있는 자산**), `judge.ts`(LLM-as-judge, sonnet, `call` 주입 가능), `score.ts`(집계 + **rubric 버전 인지 추세비교** `compareToPrev`), `cases.ts`(인사이트 케이스 3). 순수 로직 단위테스트 7개(`npm test` 포함), 라이브 채점은 `RUN_EVAL` 가드(`npm run eval`, **유료**) → `runs.jsonl`에 (rubricVersion+model+date+점수) append. **핵심 설계**: 채점 "자"가 흔들리면 비교가 무의미 → rubric은 의도적으로만 버전업하고 결과는 항상 버전과 묶어 같은 버전끼리만 비교. `runs.jsonl`은 gitignore(로컬 산출물).
- ▶ **시퀀스 eval(모델 비교) + 임신 케이스 fix (이번 세션, 2026-06-05)**: 시퀀스 품질 rubric(안전·기능해부·기구흐름·블록균형·reps) + **sonnet↔opus 비교** eval(`npm run eval:seq`). `generateSequence`를 모델 파라미터화(`makeClaudeCall(model)`·`MODEL` export), `score.compareToPrev`는 모델까지 구분(sonnet/opus 안 섞임). **비교 결과**(5/6케이스): 품질은 둘 다 96~100%(judge), opus만 1-shot 통과·~2.3배 비용 → **opus 전환보다 프롬프트 개선이 우선**. ⚠️ **eval이 sonnet 임신 케이스 검증실패를 발견** → 원인은 진단(member_summary)을 길게 쓰다 `blocks` 필드 누락(프롬프트가 "상세 진단" 유도 + max_tokens 4000). 수정: SYSTEM에 blocks 필수·member_summary 간결화, **max_tokens 4000→8000** → 임신 첫 시도 `ok=true`, blocks 10개 확인. opus 단가는 `eval/seq.ts` PRICING(추정치).
- ▶ **재생성(adjust) eval (이번 세션, 2026-06-05)**: `REGEN_RUBRIC`(지시반영·안전유지·과교정아님) + `REGEN_CASES` + `npm run eval:regen`. 원본→adjust 재생성→채점, `computeDiff`(flywheel) 변경 요약을 judge에 제공해 "지시 반영"을 정확히 봄. 첫 baseline 72%: follow 1.67·safe 1.67·**preserve 1.0(약점)**. ⚠️ **발견: 재생성이 과교정** — adjust는 따르나 원본 핵심 처방(통증 타깃 동작)을 과하게 삭제/재구성. **원인: 재생성이 원본 시퀀스를 프롬프트에 안 받음**(`memberBlock`이 "직전 생성본을 본…"이라 말만 하고 실제 원본 미주입) → 처음부터 재생성. **수정함**: `MemberInput.baseSequence`로 직전 생성본을 프롬프트에 주입 + `memberBlock`에 "원본 기반 편집·핵심 보존·전면 재작성 금지" 지시, `SequenceScreen`은 재생성 시 현재 seq 전달. **재생성 eval 72%→100%(+28)**, preserve 1.0→2.0(같은 rubric이라 사과-사과). opus 비교는 `EVAL_OPUS=1` opt-in으로 강등 — 임신·과교정 fix로 sonnet이 프롬프트만으로 충분함을 확인(프로덕션은 sonnet 유지).
- ▶ **시퀀스 화면 UX 다듬기 + 데이터 정제 (이번 세션, 2026-06-05)**: 사용자 피드백 반영 — ① "자동 수정 N회 후 통과" 문구 제거 ② 진단을 불릿→**풀어쓴 문장**(`DiagnosisCard`, member_summary만 표시·길면 더보기) ③ 생성 SYSTEM에 member_summary "한국어로 풀어서·영어/대시 자제" 지시 ④ **편집 모드 분리**(`SequenceScreen`: 평소 보기 모드는 reps 배지만, "편집" 버튼으로 ▲▼·삭제·추가 토글; 편집/재생성 버튼 분리) ⑤ `ExerciseSheet` 셋업 탭 카드 디자인(목표는 점 리스트). **데이터: `app/src/data/exercises.json`의 교재 페이지 참조 174건 제거**(setup/setup_ko/cues — "(Foundation Reformer MAWB 27페이지 참조)" 등 괄호 제거, 텍스트 레벨 정규식). ⚠️ 데이터 파이프라인(`scripts/`) 재추출 시 다시 들어올 수 있음 — transform 단계 정제 반영은 후속. 셀프 스샷(보기/편집/셋업) 검증 완료.
- ▶ **오프라인·에러 처리 (이번 세션, 2026-06-05)**: 생성 실패가 raw 기술 메시지(`API 500: …`, `Network request failed`)를 그대로 노출하던 것을 **친화 메시지 + 재시도**로 개선. `src/lib/errors.ts` `classifyError`(offline/auth/rate/server/unknown 분류 — 의존성 0, fetch 실패 메시지를 분류해 NetInfo 없이 오프라인 감지: onLine=true여도 실제 끊김까지 잡음). `GeneratingScreen`이 분류 결과로 제목·안내를 보여주고 **다시 시도**(`retryKey`로 effect 재실행)·"생성 폼으로". 인사이트(`getInsight`)는 기존 규칙 fallback 유지(오프라인이어도 규칙 인사이트 표시). 단위테스트 6개 + `SHOT_ERROR`(API 차단) 셀프 QA로 오프라인 화면 확인(비용 0).

## 완료된 것
- `data/basi/catalog/exercises.json`: 232동작, 영어 + 한글(`_ko`)
- `scripts/`: extract(비전추출), transform(정제), translate(한글)
- `app/` (Expo RN+TS):
  - `src/lib/generateSequence.ts` — 오케스트레이터 **gen→verify→repair(≤2)**. **프롬프트 캐싱**(system+카탈로그를 user 선두 cache_control 블록으로, 회원정보·이력은 후행 비캐시). **이력(케어사이클) 주입**(캐시 유지). `callModel` 주입 가능(테스트), `usage`(비용) 누적 반환. ⚠️ 앱 직접 호출 → 프로덕션 전 Edge Function 이동 필수
  - `src/lib/validateSequence.ts` — verifier(카탈로그 내 동작/전환≤3/빈블록)
  - `src/lib/flywheel.ts` — **diff 캡처·영속 + 이력**: `computeDiff`(생성본↔최종본), `buildCapturedSession`(memberId 연결), `appendSession`/`loadSessions`, `sessionsForMember`/`summarizeHistory`(최근 최종본 요약), **`updateSession`**(수업 노트·태그 덧붙이기). `CapturedSession`에 `note`·`nextTags` 추가됨
  - `src/lib/storage.ts` — `KV` 공유 계약(앱=AsyncStorage, 테스트=in-memory). **Supabase로 가면 이 구현만 교체**
  - `src/lib/members.ts` — **회원 레지스트리**(로컬 CRUD): `loadMembers`/`upsertMember`/`deleteMember`
  - `src/lib/types.ts`
  - `src/lib/balance.ts` — 세션→근육(`muscle_focus_ko`)→부위(코어/하체/상체) **근육군 비중** 집계 + 규칙 인사이트(`buildInsight`)
  - `src/lib/insight.ts` — **회원 AI 인사이트**: Claude haiku 생성 + **입력 시그니처 캐싱**(KV `pilaiv2.insights.v1`) + 규칙 fallback
  - `src/lib/catalog.ts`(카탈로그 헬퍼: `exByName`·`splitTags`·`levelToDiff`) · `src/lib/kv.ts`(AsyncStorage 공유 KV 인스턴스)
  - `App.tsx` — 탭(생성 / 카탈로그 / **기록**). **회원 선택/등록**(프로필 자동채움)→생성(**이력 반영 변주**)→**편집(삭제·추가)**→**최종본 저장**(diff+memberId 캡처). 기록=캡처 목록(회원명·diff)+JSON 내보내기
  - 테스트: `npm test`(오프라인 33개, 라이브는 스킵). 라이브(실 API·**유료**): `RUN_LIVE=1 EXPO_PUBLIC_ANTHROPIC_API_KEY=… npx vitest run src/lib/generateSequence.live.test.ts`
  - **셀프 시각 QA**: `cd app && npm run shots` → expo 웹 빌드 + headless Chrome으로 4화면 스샷 → `/tmp/pilai-*.png`. **Claude가 Read로 직접 봄 → 사용자 수동 스샷 불필요.** (웹 의존성 react-dom·react-native-web·playwright-core는 이 용도. RN-웹이라 iOS와 픽셀 동일친 않지만 레이아웃·여백·위계 검증엔 충분)
  - `app/.env` — `EXPO_PUBLIC_ANTHROPIC_API_KEY` (gitignore됨)

## 실제 생성 결과 (검증됨)
- 입력: 30대 목디스크/거북목/말린어깨, 자세교정+코어, reformer+cadillac, 50분
- 출력: 기능해부학 진단 + reformer→cadillac **1회 전환** 시퀀스 + 목디스크 주의 큐. verifier `ok: true`
- 비용(실측, Sonnet 4.6 `claude-sonnet-4-6`): 입력 캐시 가능분 **10,088토큰** — 1차 cache write, 2차 이후 cache **read 10,088** 확인 → 입력비용 90%↓(정가분 21토큰만). 생성 1개 ~$0.05 (출력 ~2.7~3.2K토큰이 비용 지배). repair 호출도 같은 카탈로그 프리픽스라 캐시 히트.

## 다음 할 것
- ✅ 캐싱 / repair / diff 캡처 / 회원 이력 변주 (로컬)
- ✅ **운동량(reps)** · **수업 모드(클래스)** · **UI 리디자인(운동 카드·2탭)** · **회원 지난 수업 표시** (이번 세션 후반)
- ✅ **편집 깊이 [#13]** — 동작 **순서 변경(▲▼ 인접 스왑)** + **reps 인라인 수정**(배지 탭→입력칸). 편집 신호 캡처 확장: `flywheel.computeDiff`가 add/remove에 더해 **reps(from→to)·reorder** op 산출(`DiffOp` 확장), `SessionDetailScreen` diff 표시에 분기 추가. 단위테스트 6개 추가(총 21), 라이브 생성 E2E 셀프 QA로 UI 확인(▲▼ disabled 경계 포함). 남음: 동작 상세 시트 내 reps 편집(현재는 인라인만), reps 입력칸 자체 스샷(생성 결과가 전부 reps 보유라 "+회수" 케이스 미발생)
- ✅ **앱 아이덴티티 [#14]** — 앱 아이콘("우아한 S", 딥 포레스트), 스플래시·로딩 통일, SafeArea(insets), **오프라인·에러 처리** 완료
- ▶ **인사이트/시퀀스/재생성 eval** — harness 3종(`npm run eval`/`eval:seq`/`eval:regen`). eval이 **임신 blocks 누락**·**재생성 과교정**을 발견·**수정**(둘 다 sonnet 프롬프트로, opus 불필요). opus 비교는 `EVAL_OPUS=1` opt-in으로 강등(프로덕션은 sonnet). 남음: 아내 실사용 골든 라벨, baseline 추세 쌓기
- 🔜 **보류 (백엔드 필요)** — 로그인 OAuth(카카오/구글/애플, 현재 탭→홈 진입), 예약·알림 시스템(홈 오늘일정 — 그래서 홈을 회원·세션 요약으로 재구성), 회원 피드백·만족도(Phase 3 회원앱)
- 🔜 **디바이스 QA + 변주 품질 eval** — 아내가 실사용 → 수업모드/reps/변주 품질 판정 → §7 골든 eval. (UI 피드백: "글 덩어리 싫다 → 카드화" 반영했고, 추가 비주얼 취향은 디바이스 보고 조정)
- ⏸ **Supabase 이동** — 로컬 우선이라 공개배포 전 보류. KV 추상화 덕에 저장 구현만 교체.
- 보류: 금기/부하태그 verifier(Phase 1.5). 정리거리: 구 UI 전체가 `App.legacy.tsx`로 백업됨(미사용, 참고용). `src/components/BodyRegionPicker.tsx`는 회원앱(Phase 3) 부위입력 대비 보존(현재 미사용).
- ⚠️ 웹 자동화 주의: `expo --web`에서 RN controlled `TextInput` 입력이 `onChangeText`로 안 잡힘(검증 시 localStorage 주입으로 우회). 실기기는 정상.

## 핵심 도메인 (SEQUENCE_DESIGN.md 참고)
- 시퀀스 = 진단(문진+움직임) → 원인 근육(기능해부) → 타깃 처방 → BASI 블록 교체
- 케어 사이클: 2~5회 반복, 문제 부위 유지 + 나머지 변주(이력 필요)
- 그날 컨디션 나쁨 → 릴렉스 모드 / 기구: 전환 ≤2~3, 블록화, 양쪽 가능 동작은 현재 기구로 흡수

## 환경/주의
- `ANTHROPIC_API_KEY`: `scripts/.env` / `app/.env`(EXPO_PUBLIC_)
- 셸: `cp`는 `-i` alias + zsh `noclobber` → 덮어쓰기는 `command cp -f`
- node 23, app=Expo~56(RN 0.85), `scripts/`와 `app/`은 별도 node 프로젝트
- apparatus `inferred` 12개 동작 있음 (Phase 1.5에서 확인)
