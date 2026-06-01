// 시퀀스 verifier — 결정론적 룰 체크 (ARCHITECTURE/PRD §9)
// LLM 출력이 규칙을 지켰는지 코드로 검증. 안전·일관성의 1차 방어선.
import catalog from '../data/exercises.json'
import type { Sequence } from './types'

const catalogNames = new Set((catalog as { name: string }[]).map((e) => e.name))

export type ValidationResult = { ok: boolean; errors: string[]; warnings: string[] }

// 인접 블록의 기구가 바뀐 횟수 = 회원이 실제로 기구를 옮기는 횟수
export function countApparatusTransitions(seq: Sequence): number {
  const apps = (seq.blocks ?? []).map((b) => b.apparatus)
  let t = 0
  for (let i = 1; i < apps.length; i++) {
    if (apps[i] !== apps[i - 1]) t++
  }
  return t
}

export function validateSequence(seq: Sequence): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1) 블록이 비어 있으면 안 됨
  if (!seq.blocks || seq.blocks.length === 0) errors.push('블록이 비어 있음')

  // 2) 모든 동작은 카탈로그에 존재해야 함 (환각 방지)
  for (const b of seq.blocks ?? []) {
    if (!b.exercises?.length) errors.push(`블록 "${b.block}"에 동작이 없음`)
    for (const ex of b.exercises ?? []) {
      if (!catalogNames.has(ex.name)) errors.push(`카탈로그에 없는 동작: "${ex.name}"`)
    }
  }

  // 3) 기구 전환 ≤ 3회 (인터뷰 규칙)
  const transitions = countApparatusTransitions(seq)
  if (transitions > 3) errors.push(`기구 전환 ${transitions}회 (최대 3회 초과)`)
  else if (transitions === 3) warnings.push('기구 전환 3회 (상한 근접)')

  return { ok: errors.length === 0, errors, warnings }
}
