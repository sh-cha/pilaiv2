# 개발 플로우 (Development Flow)

> 이 문서는 **개발 프로세스의 골격**입니다. 새로 합류하는 에이전트/사람은 이 문서를 가장 먼저 읽으세요.
> "지금 무슨 프로젝트를, 어떤 방식으로, 어디까지 했는지"를 여기서 파악할 수 있습니다.

## 프로젝트 한 줄 소개

필라테스 선생님을 위한 앱 (코드네임: `pilaiv2`).
상세 범위는 PRD 확정 중 — `docs/PRD.md` 참고 예정.

## 개발 철학: Harness Engineering

> **에이전트가 스스로 검증할 수 있는 피드백 루프를 먼저 깔고, 그 안에서 빠르게 반복한다.**

- harness(테스트·검증·CI·eval)는 맨 끝에 한 번 올리는 게 아니라, **처음부터 골격을 깔고 매 Phase마다 강화**한다.
- 사람의 수동 확인에 의존하는 단계를 줄이고, 자동 검증으로 대체할 수 있는지 항상 묻는다.

## 플로우

### Phase 0 — Planning + Harness 골격

1. **PRD** — 무엇을, 왜 (`docs/PRD.md`)
2. **기술 설계** — 아키텍처·데이터 모델·스택 (`docs/ARCHITECTURE.md`)
3. **Phase 분할** — 배포 가능한 수직 슬라이스 단위로 (`docs/PHASES.md`)
4. **Harness 골격** — 테스트·검증·CI 기초 세팅

### Phase N (반복) — 기능 개발 루프

```
구현 → harness로 self-verify → review → 수정 → 회고에서 harness 강화
```

- 각 Phase는 **독립적으로 배포 가능한 수직 슬라이스**.
- **review와 harness가 매 Phase에 내장**되어 단계마다 품질이 누적된다.

## 현재 상태

- ✅ **Phase 0 완료** — PRD + ARCHITECTURE 합의, 데이터 파이프라인 구축(BASI 407p → **232동작 카탈로그**, raw→silver).
- ✅ **Phase 1 (보강 포함)** — 앱(Expo). 생성+카탈로그+동작상세, **프롬프트 캐싱**(실측)·**repair 루프**·**플라이휠(편집·저장·diff 캡처, 로컬)**.
- ▶ **Phase 2 진행 중 (로컬)** — **회원 레지스트리 + 이력 기반 변주(케어 사이클)**. 하니스: 오프라인 vitest **33개** + 번들 빌드. 다음: 디바이스 시각 QA + 변주 품질 eval. **로컬 우선**(Supabase/웹은 공개배포 전 보류). **금기/안전 verifier는 Phase 1.5로 보류.**

## 문서 맵

| 문서 | 역할 | 상태 |
|------|------|------|
| `docs/DEVELOPMENT_FLOW.md` | 개발 프로세스 골격 (이 문서) | ✅ |
| `docs/PRD.md` | 제품 요구사항 정의 | 🟢 v0.7 |
| `docs/ARCHITECTURE.md` | 기술 설계 + 데이터 파이프라인 + Phase 1 계획 | 🟢 v0.7 |
| `data/basi/catalog/exercises.json` | 동작 카탈로그 (232, silver) | 🟢 |
| `scripts/extract`, `scripts/transform` | 추출·정제 스크립트 | 🟢 |
