// 시퀀스 eval 보조 — judge용 직렬화 + 모델 비용 추정 (순수 함수).
import type { Sequence } from '../src/lib/types'
import type { Usage } from '../src/lib/generateSequence'

// 시퀀스를 judge가 읽을 텍스트로 직렬화 (진단 + 블록별 동작·reps·caution·reason)
export function seqToText(seq: Sequence): string {
  const blocks = (seq.blocks ?? [])
    .map((b) => {
      const exs = (b.exercises ?? [])
        .map((e) => `  - ${e.name}${e.reps ? ` [${e.reps}]` : ''}${e.caution ? ` ⚠${e.caution}` : ''}${e.reason ? ` (${e.reason})` : ''}`)
        .join('\n')
      return `### ${b.block} — ${b.apparatus}\n${exs}`
    })
    .join('\n')
  const points = seq.summary_points?.length ? `\n핵심: ${seq.summary_points.join(' / ')}` : ''
  return `진단: ${seq.member_summary}${points}\n모드: ${seq.mode}\n\n${blocks}`
}

// 추정 단가 (USD / 1M tokens). ⚠️ 정확한 청구가 아니라 상대 비교용 추정치 — 실제는 콘솔 확인.
export const PRICING: Record<string, { in: number; out: number }> = {
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-opus-4-8': { in: 15, out: 75 },
}

// usage(토큰) → 추정 비용. 캐시: write 1.25x, read 0.1x 근사.
export function estimateCost(model: string, u: Usage): number {
  const p = PRICING[model] ?? { in: 3, out: 15 }
  const inTok = u.input_tokens + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1
  return (inTok * p.in + u.output_tokens * p.out) / 1e6
}
