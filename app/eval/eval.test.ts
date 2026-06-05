import { describe, it, expect } from 'vitest'
import { aggregate, compareToPrev, type CaseScore } from './score'
import { judge, type JudgeCall } from './judge'
import { INSIGHT_RUBRIC } from './rubric'

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

describe('compareToPrev — rubric 버전 인지', () => {
  it('같은 rubricId+version의 직전과만 비교', () => {
    const history = [
      { rubricId: 'insight', rubricVersion: 'v1', pct: 60 },
      { rubricId: 'insight', rubricVersion: 'v1', pct: 72 },
    ]
    const cmp = compareToPrev({ rubricId: 'insight', rubricVersion: 'v1', pct: 75 }, history)
    expect(cmp).toEqual({ prevPct: 72, delta: 3 })
  })
  it('rubric 버전이 다르면 비교하지 않음(null)', () => {
    const history = [{ rubricId: 'insight', rubricVersion: 'v1', pct: 90 }]
    expect(compareToPrev({ rubricId: 'insight', rubricVersion: 'v2', pct: 50 }, history)).toBeNull()
  })
  it('이력 없으면 null', () => {
    expect(compareToPrev({ rubricId: 'insight', rubricVersion: 'v1', pct: 50 }, [])).toBeNull()
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
