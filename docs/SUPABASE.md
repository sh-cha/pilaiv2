# Supabase 백엔드 — 셋업 & 설계

> 상태: **라이브 연결·검증 완료(2026-06-06)**. 실프로젝트에 연결해 REST 왕복(쓰기 201/읽기 200/삭제 204, RLS 격리)과 앱 배선(로그인→익명세션→`kv_store` 읽기)을 확인함. 미설정이면 앱은 그대로 로컬(AsyncStorage)로 동작 — 코드 분기 없음.

> ⚠️ **캐시 함정(실제로 겪음)**: `.env`에 키를 넣은 *뒤* 처음 빌드/실행할 때는 **반드시 캐시를 비울 것** — `npx expo start -c` (또는 export는 `--clear`). Metro가 키 넣기 *전*의 빈 env로 트랜스파일한 `supabase.ts`를 캐시해두면, 키를 넣어도 클라우드 모드가 안 켜진다("Supabase 호출 0건"). 캐시 비우면 즉시 붙음.

## 설계 — 왜 KV 스왑인가
`docs/ARCHITECTURE.md`·`src/lib/storage.ts`의 의도 그대로다: 도메인 로직(`members.ts`/`flywheel.ts`/모든 화면)은 **KV 계약(getItem/setItem)만** 의존한다. 그래서 Supabase 전환 = **`kv.ts` 구현만 교체**, 화면·도메인 코드 변경 0.

- 1차 저장 모델 = **사용자별 JSON blob** (`kv_store` 테이블, key = `pilaiv2.members.v1` 등). 회원/세션 배열을 통째로 1행에 저장.
- 격리 = **RLS**(`user_id = auth.uid()`). 한 강사의 데이터는 그 강사만 read/write.
- 장점: 즉시 동작, 화면 코드 무변경, 오프라인(미설정) 폴백 유지. 단점: 변경 시 배열 통째 rewrite(강사 1인·회원 수십 명 규모엔 무해), 관계형 쿼리 불가 → 리포팅/집계가 필요해지면 아래 "다음 단계"에서 정규화.

## 켜는 법 (5분)
1. **프로젝트 생성** — [supabase.com](https://supabase.com) → New project (region: Seoul/Tokyo 권장).
2. **키 복사** — Project Settings → API → `Project URL`, `anon public` 키.
3. **`app/.env`에 추가** (이미 있는 `.env`에 두 줄 추가, `.env.example` 참고):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. **스키마 적용** — Supabase 대시보드 → SQL Editor → `supabase/migrations/` 의 SQL을 번호 순서대로(0001 → 0002 …) 붙여넣고 Run. (또는 supabase CLI: `supabase db push`.)
5. **익명 로그인 켜기** — Authentication → Providers → **Anonymous** 활성화. (현재 로그인 버튼은 익명 세션으로 RLS용 uid를 확보한다. 실제 카카오/구글/애플은 아래 "OAuth 연결".)
6. **앱 재시작** — `npx expo start -c`(env 캐시 초기화). 로그인 → 회원 추가 → 대시보드 `kv_store`에 `pilaiv2.members.v1` 행이 생기면 연결 성공.

> `.env`는 절대 커밋 금지(루트 `.gitignore`로 제외). anon 키는 공개키지만 URL/키 노출 최소화.

## 동작 방식 (코드 지도)
- `src/lib/supabase.ts` — env 있으면 `createClient`(세션은 AsyncStorage 영속), 없으면 `supabase = null`.
- `src/lib/auth.ts` — `initAuth`(App 시작 시 세션 복원/구독), `signIn`(익명), `signOut`, `getUserId`(kv가 클라우드/로컬 판단에 사용).
- `src/lib/kv.ts` — `supabase && getUserId()` 면 `kv_store` 읽기/upsert, 아니면 AsyncStorage. **여기만 백엔드를 안다.**
- `App.tsx` → `initAuth()`, `LoginScreen` → `signIn()`, `SettingsScreen` → `signOut()`.
- `supabase/migrations/0001_init.sql` — `profiles`(강사 1:1), `kv_store`(blob) + RLS + 신규유저 트리거.
- `supabase/migrations/0002_bug_reports.sql` — `bug_reports`(설정 → "버그 신고 · 의견 보내기"가 insert, RLS insert-only). 조회는 대시보드 Table Editor에서. 미설정/미로그인 기기는 로컬 kv(`pilaiv2.reports.v1`)에 쌓인다(`src/lib/report.ts`).

## 다음 단계 (백엔드 로드맵)
1. **실제 OAuth (카카오/구글/애플)** — ✅ **코드 배선 완료**(`auth.ts signInWithProvider` + 로그인 버튼 + `expo-web-browser`/`expo-linking` PKCE, `scheme: pilai`). 제공자만 설정하면 켜짐 → 아래 **"OAuth 연결"** 절차. 그러면 기기 간 동기화가 된다(익명은 기기별).
2. **관계형 정규화** — 집계/검색/리포팅이 필요해지면 `members`·`sessions` 테이블로 이행하고 `kv.ts` 대신 `repo` 레이어로 교체. blob → 행 마이그레이션 스크립트 필요.
3. **Anthropic 키 서버로** — 현재 생성은 앱에서 직접 호출(키 번들 노출). Supabase **Edge Function**으로 옮겨 키를 숨기고 사용량/비용 게이팅. (`generateSequence.ts`의 fetch 대상만 교체.)
4. **예약·알림 / 회원 피드백** — 보류였던 백엔드 기능. 일정 테이블 + (선택)푸시, 회원앱(Phase 3) 연동.

## 한계 (현재)
- 익명 인증 = **기기별 사용자**. 같은 강사가 다른 기기로 로그인하면 다른 데이터(실 OAuth 붙이면 해결).
- blob 저장 = 동시 편집/대용량엔 부적합(강사 1인 규모엔 무해).
- 로컬→클라우드 자동 마이그레이션 없음. 켜기 전 로컬 데이터는 수동 이전 필요(또는 클라우드에서 새로 시작).

## OAuth 연결 (카카오/구글/애플)
코드는 완료(`auth.ts signInWithProvider` + 로그인 버튼). 제공자별로 ① 콘솔 앱 등록 ② Supabase 대시보드 Enable ③ 리다이렉트 URL만 맞추면 켜진다. **첫 OAuth 로그인이 곧 회원가입**(트리거가 `profiles` 자동 생성 — 별도 가입 화면 없음).

### 공통 — 리다이렉트 URL
- Supabase → **Authentication → URL Configuration → Redirect URLs** 에 `pilai://auth-callback` 추가 (Expo Go 테스트는 `expo start` 로그에 뜨는 `exp://…/--/auth-callback`도).
- 제공자 콘솔에 넣는 콜백은 **항상** `https://olmwynehfhndnbwkfoal.supabase.co/auth/v1/callback` (Supabase가 받아서 앱으로 되돌림).

### 카카오 (주력 — 다음 차례)
1. [developers.kakao.com](https://developers.kakao.com) → 애플리케이션 추가 → **REST API 키** 복사.
2. 카카오 로그인 **활성화 ON** → Redirect URI에 위 Supabase 콜백 추가. 동의항목(닉네임/이메일 등) ON.
3. Supabase → Authentication → Providers → **Kakao** → REST API 키 = Client ID(필요시 Client Secret) 입력 → **Enable**.

### 구글 — ✅ 설정 완료·실기기 로그인 검증됨 (2026-06-06)
1. [console.cloud.google.com](https://console.cloud.google.com) → OAuth 동의 화면 → 사용자 인증 정보 → **OAuth 클라이언트 ID(웹)**.
2. 승인된 리디렉션 URI에 위 Supabase 콜백 추가.
3. Client ID/Secret → Supabase → Providers → **Google** → 입력 → Enable.

### 애플 (iOS 배포 시 / 유료 계정)
Apple Developer($99/yr) → Service ID + Key → Supabase → Apple. iOS 앱스토어에 다른 소셜 로그인 넣으면 Apple도 의무 — 나중에.

### 테스트
`expo start -c` → 시뮬레이터/기기 → 버튼 탭 → 브라우저 로그인 → 앱 복귀(세션 생성). ⚠️ 커스텀 scheme(`pilai://`)은 **dev build(`expo run:ios`)**가 Expo Go보다 안정적. 안 되면: ① Redirect URLs allowlist ② 제공자 Enable ③ scheme 확인.
