// 평가 점수 집계 + rubric 버전 인지 추세 비교 (순수 함수 → 단위테스트).
import type { RubricItem } from './rubric'

export type CaseScore = { caseId: string; scores: Record<string, number>; notes?: string }

// 한 번의 평가 실행 메타 — 점수를 "무엇으로" 쟀는지. 추세 비교는 같은 (rubricId, rubricVersion)끼리만.
export type RunMeta = {
  rubricId: string
  rubricVersion: string
  model: string // 채점 대상을 생성한 모델 (예: haiku)
  judgeModel: string // 채점한 judge 모델
  at: string // ISO date
}

export type Aggregate = {
  n: number
  perItem: Record<string, { avg: number; max: number }>
  totalAvg: number // 케이스 평균 총점
  totalMax: number
  pct: number // 0~100
}

export function aggregate(rubric: RubricItem[], cases: CaseScore[]): Aggregate {
  const n = cases.length
  const totalMax = rubric.reduce((s, i) => s + i.max, 0)
  const perItem: Record<string, { avg: number; max: number }> = {}
  for (const item of rubric) {
    const sum = cases.reduce((a, c) => a + (c.scores[item.key] ?? 0), 0)
    perItem[item.key] = { avg: n ? sum / n : 0, max: item.max }
  }
  const totalSum = cases.reduce((a, c) => a + rubric.reduce((s, i) => s + (c.scores[i.key] ?? 0), 0), 0)
  const totalAvg = n ? totalSum / n : 0
  const pct = totalMax ? Math.round((totalAvg / totalMax) * 100) : 0
  return { n, perItem, totalAvg, totalMax, pct }
}

// 이력 비교용 최소 레코드 (runs.jsonl 한 줄). 같은 (rubricId, rubricVersion, model)끼리만 비교한다.
// rubric이 바뀌거나(version) 모델이 다르면 사과-사과 비교가 아니므로 제외.
export type RunRecord = { rubricId: string; rubricVersion: string; model: string; pct: number }

export function compareToPrev(current: RunRecord, history: RunRecord[]): { prevPct: number; delta: number } | null {
  const same = history.filter(
    (h) => h.rubricId === current.rubricId && h.rubricVersion === current.rubricVersion && h.model === current.model,
  )
  const prev = same[same.length - 1]
  if (!prev) return null
  return { prevPct: prev.pct, delta: current.pct - prev.pct }
}

export function formatReport(rubric: RubricItem[], cases: CaseScore[], agg: Aggregate, meta: RunMeta): string {
  const head = `eval [${meta.rubricId}] rubric=${meta.rubricVersion} model=${meta.model} judge=${meta.judgeModel} n=${agg.n}`
  const items = rubric.map((i) => {
    const p = agg.perItem[i.key]
    return `  - ${i.label.padEnd(12)} ${p.avg.toFixed(2)} / ${p.max}`
  })
  const total = `  총점 ${agg.totalAvg.toFixed(1)} / ${agg.totalMax}  (${agg.pct}%)`
  return [head, ...items, total].join('\n')
}
