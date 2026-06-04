# 핸드오프 — pilaiv2 (필라테스 시퀀스 생성 앱)

> context clear 후 이 문서 → DEVELOPMENT_FLOW.md → PRD.md → ARCHITECTURE.md 순으로 읽으면 그대로 이어갈 수 있음. (도메인 핵심은 아래 "핵심 도메인" 절에 요약 — 별도 SEQUENCE_DESIGN.md는 존재하지 않음)
> 갱신: 2026-06-01

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
- ▶ **Phase 2 착수 (이번 세션, 로컬)**: **회원 레지스트리 + 이력 기반 변주(케어 사이클)**. 회원 등록/선택→프로필 자동채움→최근 이력 요약을 생성에 주입→세션을 회원에 연결. **전체 오프라인 테스트 33개** + 번들 빌드 확인. **로컬 우선**(웹/Supabase는 공개배포 전까지 보류 — 사용자 결정). ⚠️ 시각 QA는 디바이스 실행 필요.

## 완료된 것
- `data/basi/catalog/exercises.json`: 232동작, 영어 + 한글(`_ko`)
- `scripts/`: extract(비전추출), transform(정제), translate(한글)
- `app/` (Expo RN+TS):
  - `src/lib/generateSequence.ts` — 오케스트레이터 **gen→verify→repair(≤2)**. **프롬프트 캐싱**(system+카탈로그를 user 선두 cache_control 블록으로, 회원정보·이력은 후행 비캐시). **이력(케어사이클) 주입**(캐시 유지). `callModel` 주입 가능(테스트), `usage`(비용) 누적 반환. ⚠️ 앱 직접 호출 → 프로덕션 전 Edge Function 이동 필수
  - `src/lib/validateSequence.ts` — verifier(카탈로그 내 동작/전환≤3/빈블록)
  - `src/lib/flywheel.ts` — **diff 캡처·영속 + 이력**: `computeDiff`(생성본↔최종본), `buildCapturedSession`(memberId 연결), `appendSession`/`loadSessions`, `sessionsForMember`/`summarizeHistory`(최근 최종본 요약)
  - `src/lib/storage.ts` — `KV` 공유 계약(앱=AsyncStorage, 테스트=in-memory). **Supabase로 가면 이 구현만 교체**
  - `src/lib/members.ts` — **회원 레지스트리**(로컬 CRUD): `loadMembers`/`upsertMember`/`deleteMember`
  - `src/lib/types.ts`
  - `App.tsx` — 탭(생성 / 카탈로그 / **기록**). **회원 선택/등록**(프로필 자동채움)→생성(**이력 반영 변주**)→**편집(삭제·추가)**→**최종본 저장**(diff+memberId 캡처). 기록=캡처 목록(회원명·diff)+JSON 내보내기
  - 테스트: `npm test`(오프라인 33개, 라이브는 스킵). 라이브(실 API·**유료**): `RUN_LIVE=1 EXPO_PUBLIC_ANTHROPIC_API_KEY=… npx vitest run src/lib/generateSequence.live.test.ts`
  - **셀프 시각 QA**: `cd app && npm run shots` → expo 웹 빌드 + headless Chrome으로 4화면 스샷 → `/tmp/pilai-*.png`. **Claude가 Read로 직접 봄 → 사용자 수동 스샷 불필요.** (웹 의존성 react-dom·react-native-web·playwright-core는 이 용도. RN-웹이라 iOS와 픽셀 동일친 않지만 레이아웃·여백·위계 검증엔 충분)
  - `app/.env` — `EXPO_PUBLIC_ANTHROPIC_API_KEY` (gitignore됨)

## 실제 생성 결과 (검증됨)
- 입력: 30대 목디스크/거북목/말린어깨, 자세교정+코어, reformer+cadillac, 50분
- 출력: 기능해부학 진단 + reformer→cadillac **1회 전환** 시퀀스 + 목디스크 주의 큐. verifier `ok: true`
- 비용(실측, Sonnet 4.6 `claude-sonnet-4-6`): 입력 캐시 가능분 **10,088토큰** — 1차 cache write, 2차 이후 cache **read 10,088** 확인 → 입력비용 90%↓(정가분 21토큰만). 생성 1개 ~$0.05 (출력 ~2.7~3.2K토큰이 비용 지배). repair 호출도 같은 카탈로그 프리픽스라 캐시 히트.

## 다음 할 것
- ✅ 프롬프트 캐싱 / repair 루프 / 편집·저장 diff 캡처 (Phase 1 보강, 로컬)
- ✅ **Phase 2 회원 이력 변주 (로컬)** — 회원 레지스트리 + 케어사이클 변주 + 세션 연결. 코드/타입/번들·테스트 그린.
- 🔜 **디바이스 시각 QA** — `expo start`로 회원 등록→생성→편집→저장→기록, 이력 변주 체감을 아내가 확인. (코드만 검증됨, 화면 미확인)
- 🔜 **변주 품질 eval** — 이력 주입이 실제로 "문제부위 유지 + 나머지 변주"를 잘 하는지 아내 판정 → §7 골든 eval로 코드화. (라이브 호출로 케어사이클 2~3회 시뮬레이션 권장)
- ⏸ **Supabase 이동** — 키 노출 방지 + 클라우드 저장/동기화. **로컬 우선 결정으로 공개배포 전까지 보류**(아직 단일 디바이스·웹 불필요). KV 추상화 덕에 저장 구현만 교체.
- 보류: 금기/부하태그 verifier(Phase 1.5), 카탈로그 검수(불필요 — 품질 충분)

## 핵심 도메인 (SEQUENCE_DESIGN.md 참고)
- 시퀀스 = 진단(문진+움직임) → 원인 근육(기능해부) → 타깃 처방 → BASI 블록 교체
- 케어 사이클: 2~5회 반복, 문제 부위 유지 + 나머지 변주(이력 필요)
- 그날 컨디션 나쁨 → 릴렉스 모드 / 기구: 전환 ≤2~3, 블록화, 양쪽 가능 동작은 현재 기구로 흡수

## 환경/주의
- `ANTHROPIC_API_KEY`: `scripts/.env` / `app/.env`(EXPO_PUBLIC_)
- 셸: `cp`는 `-i` alias + zsh `noclobber` → 덮어쓰기는 `command cp -f`
- node 23, app=Expo~56(RN 0.85), `scripts/`와 `app/`은 별도 node 프로젝트
- apparatus `inferred` 12개 동작 있음 (Phase 1.5에서 확인)
