# ARCHITECTURE — `pilaiv2`

> 상태: **v0.7 초안**. `docs/PRD.md` 기반 기술설계. ❓ = 확정 필요.

## 1. 스택 (1안)

```
┌──────────────────────────────┐
│  iOS 앱 (React Native + Expo) │  TypeScript
└───────────────┬──────────────┘
                │ Supabase client SDK
┌───────────────▼──────────────┐
│          Supabase            │
│  Postgres (Member / Session) │
│  + Auth + Storage + Realtime │
└───────────────┬──────────────┘
                │ invoke
┌───────────────▼──────────────┐
│   Edge Function (Deno / TS)  │  LLM 오케스트레이션
│   generator→verifier→repair  │
└───────────────┬──────────────┘
                │ HTTPS
┌───────────────▼──────────────┐
│     Anthropic Claude API     │  생성=Sonnet, critic=Haiku
│     + 프롬프트 캐싱          │
└──────────────────────────────┘
```

| 레이어 | 선택 | 이유 |
|--------|------|------|
| 앱 | React Native + Expo (TS) | iOS 시작, Android 거의 공짜 확장. EAS로 빌드·배포·TestFlight 관리. |
| BaaS | Supabase | 관계형(Member/Session) 적합. Auth·Storage·Realtime 통합. 인프라 최소. |
| LLM 오케스트레이션 | Supabase Edge Function (Deno/TS) | DB 가까움, TS 통일, 인프라 안 늘림. |
| LLM | Anthropic Claude | 생성=Sonnet, critic=Haiku 티어링. 프롬프트 캐싱. |

**한 언어(TS)로 통일** — 앱부터 오케스트레이션까지. Claude가 짜기 좋고 사용자도 JS 익숙.

## 2. LLM 오케스트레이션 (핵심)

- **MVP: Edge Function 동기 실행 + 앱 로딩 UX** ("시퀀스 만드는 중...").
- 파이프라인: `generator → verifier(룰 + critic) → [실패] repair(≤N) → 통과`.
- 시간·비용 관리: **룰 검증 먼저(공짜)** → LLM critic 최소 → repair 상한.
- 무거워지면 **비동기(Supabase Realtime로 완료 push)**로 전환.

## 3. 비용·지연 레버 (PRD §6)

- 모델 티어링 (생성 Sonnet / critic Haiku).
- 프롬프트 캐싱 (시스템 프롬프트·동작 카탈로그).
- 룰 우선 검증 (LLM 호출 최소화).
- repair 상한.
- **비용·지연도 eval metric으로 추적** (PRD §7).

## 4. 비용 구조

- **Apple Developer $99/년** — iOS 배포 고정비 (불가피).
- Supabase / Expo — MVP 무료 티어, 확장 시 각 ~$25/mo.
- Anthropic API — 변동비. §3 레버로 관리.

## 5. 데이터 모델 (개념)

### 동작 카탈로그 — 안전의 앵커

`Exercise` (큐레이션 카탈로그)
- `id` / 표준명 / 별칭[]
- 기구(enum) / 타깃 근육[] / 난이도
- **금기 태그[]** — 예: `cervical_flexion`, `spinal_flexion`, `wrist_weight_bearing`
- 셋업·큐 / 상태(`verified` | `candidate`)

> LLM은 카탈로그에서 **선택·배열**(자유 생성 X). 밖이 필요하면 `candidate`로 큐잉 → 아내 승인 → 편입(플라이휠). **시드:** LLM이 표준 레퍼토리 초안 생성 → 아내 검수.
>
> **저장:** Supabase Postgres(런타임 조회) + **git 시드 = source of truth**(버전관리). 카탈로그 변경(아내 검수)도 코드처럼 이력·롤백. 흐름: `git 시드 → DB 복제`, `candidate`는 DB에 쌓다가 승인 시 시드로 역류.
>
> **출처:** BASI 교재 참고 — **사실 속성**(이름·기구·근육·금기)은 차용 OK, **표현**(큐·설명)은 자체 작성(저작권).

### 금기 룰 — 결정론 안전 체크 (PRD §9)

`ContraindicationRule`: 회원 조건(예: 목 디스크) → 금지 태그[]

> verifier: `시퀀스 동작의 금기태그 ∩ 회원 금지태그 ≠ ∅` → **hard block.**

### 회원 / 수업 (PRD §5)

- `Member`: 프로필(영속). 만성 제약 → 금지 태그 매핑.
- `Session`: `member_id`, 그날 컨디션→금지태그, 기구/목표/길이, `generated_sequence`=[{exercise_id, 반복, 시간}], `final_sequence`(편집 후), verifier 결과.

### RAG 경계

풀 벡터 RAG 아님. **구조화 카탈로그 + 속성 필터링**(기구·근육·금기로 후보 추림 → 프롬프트 주입). 수백 개 규모면 충분. 커지면 벡터 검색 도입.

## 6. 카탈로그 구축 파이프라인

콘텐츠 소스 = **BASI 원본 페이지 ~400장** (`data/basi/extracted_pages/`). 기존 `basi_extracted.json`은 인덱스(블록·시리즈)만 → 분류 교차검증용. 3계층:

1. **Raw (bronze)** — **추출 하네스 스크립트**(페이지 → Claude 비전 → JSON, 배치)로 추출. **인쇄 텍스트만**; 손글씨는 `present` 플래그 + 이미지 참조만(텍스트화는 나중 Phase). 페이지 ≠ 동작 1:1(노트 페이지 혼재) → `basi_extracted` 동작→페이지 매핑을 길잡이로. → `data/basi/raw/`
2. **정제 (silver)** — raw → `Exercise` 스키마. 동작 단위 정규화, 표기 변형 통합(canonical id), 블록·시리즈 연결.
3. **보강 (gold)** — 부하 태그(금기) 도출 + 빠진 근육/큐 보완 → **아내 검수** → 카탈로그 시드.

> **Raw 보존 이유:** 비전 추출은 비싸다(1회만). 스키마가 바뀌어도 raw에서 재가공 → 재추출 불필요.
> **비용:** 파일럿(footwork ~10p) 검증 후 전체 추출.

**Raw 추출 스키마** — 동작 상세 페이지는 BASI 표준 **7섹션 템플릿** (EXERCISE / BLOCK / LEVEL / DESCRIPTION / MOVEMENT / MUSCLE FOCUS / OBJECTIVES / CUES). 파일럿(footwork 4장)으로 확정:

```json
{ "source_page": "...", "page_type": "exercise_detail",
  "printed": { "code","name","apparatus","series","block","level",
               "setup","resistance","reps?","spring_setting?",
               "movement": {"inhale","exhale"},
               "muscle_focus":[], "objectives":[], "cues":[] },
  "handwritten": { "present": true, "image_ref": "..." } }
```

> `reps`/`spring_setting`은 상세 페이지에 없을 수 있음 → 정제 단계에서 동일 동작의 여러 페이지(상세 + 요약표) 머지로 보완.

## 7. Phase 1 구현 계획 (앱)

데이터 파이프라인 완료(raw→silver, **232동작** `data/basi/catalog/exercises.json`). 금기/부하태그는 **Phase 1.5로 보류** — MVP는 "선생님 보조 도구"(생성 + 검수 + 편집)이고, 안전 verifier는 그 위에 얹는다.

순서:
1. ✅ **Expo 앱 골격** (RN + TS) + 카탈로그 보기 화면 (232동작)
2. 🔜 **Supabase 연결** — 카탈로그 적재 + 편집(= 아내 검수) 영속화. (차단: Supabase 프로젝트 생성 필요)
3. ✅ **시퀀스 생성** — 회원 입력 → Claude(카탈로그) → 표시. **현재 앱에서 직접 호출**(dev), gen→verify→**repair(≤2)** + **프롬프트 캐싱** 포함. Edge Function 이동은 #2와 함께.
4. ✅ **시퀀스 편집·저장** — diff 캡처 (PRD §8 플라이휠 시드). **로컬(AsyncStorage)** 영속 + 기록 탭/내보내기. 클라우드 동기화는 #2 이후.

> **구현 현황:** 1·3·4는 앱에 안착(오프라인 테스트 23개 + iOS 번들 빌드 확인). 캐싱·repair·diff 로직은 §2 Edge Function으로 이전 시 거의 그대로 재사용(TS→Deno).

> 검수 = 카탈로그 편집 화면(앱 내, 스프레드시트 대신). apparatus `inferred` 12개 + 부하 태그는 검수/Phase 1.5에서 함께.

## ❓ 확정 필요

- ✅ raw 추출(407p) + 정제 완료 → **232동작 카탈로그**(근육·큐·apparatus 100%, ~$5).
- ✅ LLM 오케스트레이션 = Edge Function 동기. 동작 카탈로그 = DB 데이터(§5).
- ✅ 검수 = 앱 내 편집 화면. 금기/부하태그 = Phase 1.5 보류.
- 🔜 **Phase 1 앱 구현**(§7): Expo → 카탈로그 화면 → Supabase → 시퀀스 생성.
- Supabase 프로젝트 생성 필요 (URL + anon key).
- 시퀀스 생성 프롬프트 / Edge Function 설계 (§7-3 진입 시).
