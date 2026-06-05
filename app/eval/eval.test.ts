import { describe, it, expect } from 'vitest'
import { aggregate, compareToPrev, type CaseScore } from './score'
import { judge, type JudgeCall } from './judge'
import { INSIGHT_RUBRIC } from './rubric'
import { seqToText, estimateCost } from './seq'
import type { Sequence } from '../src/lib/types'

describe('aggregate', () => {
  const cases: CaseScore[] = [
    { caseId: 'a', scores: { condition: 2, specific: 1, safe: 2, concise: 2 } }, // 7
    { caseId: 'b', scores: { condition: 1, specific: 1, safe: 2, concise: 1 } }, // 5
  ]
  it('항목 평균·총점·pct를 계산', () => {
    const agg = aggregate(INSIGHT_RUBRIC, cases)
    expect(agg.n).toBe(2)
    expect(agg.totalMax).toBe(8)
    expect(agg.perItem.condition.avg).toBe(1.5)
    expect(agg.totalAvg).toBe(6) // (7+5)/2
    expect(agg.pct).toBe(75) // 6/8
  })
  it('누락 점수는 0으로 취급', () => {
    const agg = aggregate(INSIGHT_RUBRIC, [{ caseId: 'x', scores: { condition: 2 } }])
    expect(agg.perItem.safe.avg).toBe(0)
  })
  it('빈 케이스도 안전(0%)', () => {
    expect(aggregate(INSIGHT_RUBRIC, []).pct).toBe(0)
  })
})

describe('compareToPrev — rubric 버전·모델 인지', () => {
  it('같은 rubricId+version+model의 직전과만 비교', () => {
    const history = [
      { rubricId: 'insight', rubricVersion: 'v1', model: 'haiku', pct: 60 },
      { rubricId: 'insight', rubricVersion: 'v1', model: 'haiku', pct: 72 },
    ]
    const cmp = compareToPrev({ rubricId: 'insight', rubricVersion: 'v1', model: 'haiku', pct: 75 }, history)
    expect(cmp).toEqual({ prevPct: 72, delta: 3 })
  })
  it('rubric 버전이 다르면 비교하지 않음(null)', () => {
    const history = [{ rubricId: 'insight', rubricVersion: 'v1', model: 'haiku', pct: 90 }]
    expect(compareToPrev({ rubricId: 'insight', rubricVersion: 'v2', model: 'haiku', pct: 50 }, history)).toBeNull()
  })
  it('모델이 다르면 비교하지 않음 (sonnet vs opus 안 섞임)', () => {
    const history = [{ rubricId: 'sequence', rubricVersion: 'v1', model: 'claude-sonnet-4-6', pct: 80 }]
    expect(compareToPrev({ rubricId: 'sequence', rubricVersion: 'v1', model: 'claude-opus-4-8', pct: 60 }, history)).toBeNull()
  })
  it('이력 없으면 null', () => {
    expect(compareToPrev({ rubricId: 'insight', rubricVersion: 'v1', model: 'haiku', pct: 50 }, [])).toBeNull()
  })
})

describe('judge 정규화 (mock call)', () => {
  it('점수를 0~max로 clamp, 누락은 0, 반올림', async () => {
    const mock: JudgeCall = async () => ({ scores: { condition: 5, specific: 1.6, safe: -1 }, notes: 'n' })
    const r = await judge('ctx', 'out', INSIGHT_RUBRIC, mock)
    expect(r.scores.condition).toBe(2) // 5 → max 2
    expect(r.scores.specific).toBe(2) // 1.6 → round 2 (max 2)
    expect(r.scores.safe).toBe(0) // -1 → 0
    expect(r.scores.concise).toBe(0) // 누락 → 0
    expect(r.notes).toBe('n')
  })
})

describe('seqToText (시퀀스 직렬화)', () => {
  const seq: Sequence = {
    member_summary: '목디스크 진단',
    summary_points: ['경추 부하 제외'],
    mode: 'treatment',
    blocks: [{ block: '웜업', apparatus: 'reformer', exercises: [{ name: 'Pelvic Curl', reps: '10회', caution: '경추 중립' }] }],
  }
  it('진단·핵심·블록·동작·reps·caution을 포함', () => {
    const t = seqToText(seq)
    expect(t).toContain('목디스크 진단')
    expect(t).toContain('경추 부하 제외')
    expect(t).toContain('웜업')
    expect(t).toContain('Pelvic Curl')
    expect(t).toContain('10회')
    expect(t).toContain('경추 중립')
  })
})

describe('estimateCost (모델 비용 추정)', () => {
  it('단가 × 토큰 (sonnet vs opus)', () => {
    const u = { input_tokens: 1000, output_tokens: 1000 }
    expect(estimateCost('claude-sonnet-4-6', u)).toBeCloseTo(0.018, 4) // (1000*3 + 1000*15)/1e6
    expect(estimateCost('claude-opus-4-8', u)).toBeCloseTo(0.09, 4) // (1000*15 + 1000*75)/1e6
  })
  it('캐시 read는 0.1x로 반영', () => {
    const u = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 10000 }
    expect(estimateCost('claude-sonnet-4-6', u)).toBeCloseTo(0.003, 5) // 10000*0.1*3/1e6
  })
})
