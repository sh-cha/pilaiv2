export type MemberInput = {
  name?: string // 회원 이름 (Phase 2)
  age?: string
  conditions: string // 통증·제약 (예: 목디스크, 거북목, 말린 어깨)
  goals: string // 목표 (예: 자세교정, 코어)
  apparatus: string[] // 사용 기구 (reformer, cadillac, mat, chair ...)
  minutes: number // 수업 길이
  todayCondition?: string // 그날 컨디션 (릴렉스 모드 분기)
  history?: string // 최근 이력 요약 (Phase 2 변주). flywheel.summarizeHistory 결과.
  adjust?: string // 재생성 시 방향 지시 (예: "더 쉽게, 하체 강화")
  baseSequence?: Sequence // 재생성 시 직전 생성본 — 이걸 기반으로 adjust만 반영(과교정 방지)
}

export type SeqExercise = { name: string; reps?: string; reason?: string; caution?: string }
export type SeqBlock = { block: string; apparatus: string; exercises: SeqExercise[] }
export type Sequence = {
  member_summary: string // 상세 진단 (전체 설명)
  summary_points?: string[] // 핵심 요약 불릿 2~3개 (강사 한눈 파악용). 구 세션은 없을 수 있어 optional
  mode: 'treatment' | 'relax'
  blocks: SeqBlock[]
}
