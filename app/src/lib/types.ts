export type MemberInput = {
  name?: string // 회원 이름 (Phase 2)
  age?: string
  conditions: string // 통증·제약 (예: 목디스크, 거북목, 말린 어깨)
  goals: string // 목표 (예: 자세교정, 코어)
  apparatus: string[] // 사용 기구 (reformer, cadillac, mat, chair ...)
  minutes: number // 수업 길이
  todayCondition?: string // 그날 컨디션 (릴렉스 모드 분기)
  history?: string // 최근 이력 요약 (Phase 2 변주). flywheel.summarizeHistory 결과.
}

export type SeqExercise = { name: string; reps?: string; reason?: string; caution?: string }
export type SeqBlock = { block: string; apparatus: string; exercises: SeqExercise[] }
export type Sequence = {
  member_summary: string
  mode: 'treatment' | 'relax'
  blocks: SeqBlock[]
}
