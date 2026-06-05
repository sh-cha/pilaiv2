// 생성물 품질 채점 기준(rubric). LLM-as-judge가 이 기준으로 0~max 점수를 매긴다.
// 골든셋 = 이 rubric + 평가 케이스(cases.ts) + (추후) 아내가 라벨한 모범답안.
//
// ⚠️ rubric은 고정이 아니라 시스템(프롬프트·모델)이 진화하면 함께 버전업하는 살아있는 자산이다.
//    단, 채점 "자"가 흔들리면 과거 점수와의 비교가 무의미해진다 → 기준을 바꿀 때만 의도적으로
//    RUBRIC_VERSION을 올리고, 평가 결과는 항상 (rubricVersion + model + date)와 묶어 기록한다
//    (score.ts RunMeta · runs.jsonl). 추세 비교는 같은 RUBRIC_VERSION끼리만 한다.
export const RUBRIC_VERSION = '2026-06-05.1'

export type RubricItem = { key: string; label: string; max: number; guide: string }

// 회원 인사이트(insight.ts, haiku 생성)용 — 통증 반영·구체성·안전·간결
export const INSIGHT_RUBRIC: RubricItem[] = [
  { key: 'condition', label: '통증·금기 반영', max: 2, guide: '0=통증/제약 무시, 1=언급만, 2=통증을 고려한 구체적 방향 제시' },
  { key: 'specific', label: '구체성', max: 2, guide: '0=막연한 일반론, 1=다소 일반적, 2=바로 실행 가능한 제안' },
  { key: 'safe', label: '안전', max: 2, guide: '0=위험하거나 금기를 거스르는 제안, 1=모호, 2=안전함' },
  { key: 'concise', label: '간결성', max: 2, guide: '0=장황·군더더기, 1=약간 김, 2=핵심 1~2문장' },
]

// 시퀀스 본체(generateSequence)용 — 안전·기능해부 정합·기구 흐름·블록 균형·reps
export const SEQUENCE_RUBRIC: RubricItem[] = [
  { key: 'safety', label: '안전·금기', max: 2, guide: '0=금기 동작 포함(예: 목디스크에 경추 부하), 1=주의 미흡, 2=금기 회피 + caution 명시' },
  { key: 'anatomy', label: '기능해부 정합', max: 2, guide: '0=증상-처방 무관, 1=느슨한 연결, 2=원인 근육을 정확히 타깃하는 처방' },
  { key: 'flow', label: '기구 흐름', max: 2, guide: '0=전환 과다·난잡, 1=보통, 2=전환 최소·기구별 블록화' },
  { key: 'balance', label: '블록 균형', max: 2, guide: '0=편중/필수 블록 누락, 1=대체로 적절, 2=BASI 블록 순서·회원 목표 비중 적절' },
  { key: 'reps', label: 'reps 적절성', max: 2, guide: '0=비거나 부적절, 1=일부만, 2=동작별로 적절한 반복수/시간' },
]

// 재생성(adjust)용 — 후속 확장 자리(같은 harness 재사용)
export const REGEN_RUBRIC: RubricItem[] = [
  { key: 'follow', label: '지시 반영', max: 2, guide: '0=adjust 방향 무시, 1=일부 반영, 2=명확히 반영' },
  { key: 'safe', label: '안전 유지', max: 2, guide: '0=원래 금기 위반, 1=모호, 2=안전 규칙 유지' },
  { key: 'preserve', label: '과교정 아님', max: 2, guide: '0=지시 외 좋은 부분 훼손, 1=일부, 2=핵심 유지하며 변주' },
]

export const maxScore = (rubric: RubricItem[]): number => rubric.reduce((s, i) => s + i.max, 0)
