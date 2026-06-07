// 동작 카탈로그 공유 헬퍼 — 실제 exercises.json(한글 필드 보유)을 화면들이 공유.
import catalog from '../data/exercises.json'

export type Ex = {
  id: string
  name: string
  apparatus: string[]
  block: string | null
  series?: string | null
  level: string | null
  setup: string | null
  resistance: string | null
  movement: { inhale?: string; exhale?: string } | null
  muscle_focus: string[]
  objectives: string[]
  cues: string[]
  block_ko?: string
  level_ko?: string
  setup_ko?: string
  movement_ko?: { inhale?: string; exhale?: string } | null
  muscle_focus_ko?: string[]
  objectives_ko?: string[]
  cues_ko?: string[]
  apparatus_inferred?: boolean
}

export const allEx = catalog as Ex[]
export const exByName = new Map(allEx.map((e) => [e.name, e]))

export const tx = (ko?: string | null, en?: string | null) => ko ?? en ?? '-'
export const tArr = (ko: string[] | undefined, en: string[]) => (ko && ko.length ? ko : en)

// 콤마/가운뎃점/슬래시로 구분된 자유 텍스트(통증·목표)를 칩 배열로
export const splitTags = (s?: string): string[] =>
  (s ?? '').split(/[,，·/\n]/).map((x) => x.trim()).filter(Boolean)

// level_ko("기초/초급/중급/고급")를 난이도 점(1~5)으로 근사
export function levelToDiff(level?: string | null): number {
  const m: Record<string, number> = { 기초: 1, 초급: 2, 중급: 3, 중상급: 4, 고급: 5 }
  return (level && m[level]) || 2
}
