// 라이브 인사이트 품질 eval. RUN_EVAL=1 + API 키가 있을 때만 실행(유료).
//   RUN_EVAL=1 npm test -- eval/eval.live.test.ts   또는   npm run eval
// 각 케이스: getInsight(빈 KV → 항상 AI 생성) → judge 채점 → 집계 → 리포트 → runs.jsonl 이력.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { getInsight } from '../src/lib/insight'
import type { KV } from '../src/lib/storage'
import { INSIGHT_CASES } from './cases'
import { INSIGHT_RUBRIC, RUBRIC_VERSION } from './rubric'
import { judge, JUDGE_MODEL } from './judge'
import { aggregate, compareToPrev, formatReport, type CaseScore, type RunMeta, type RunRecord } from './score'

// 빈 KV: 인사이트 캐시가 항상 miss → 매 케이스 실제 AI 생성(생성 자체를 평가)
const emptyKV = (): KV => {
  const m: Record<string, string> = {}
  return { getItem: async (k) => m[k] ?? null, setItem: async (k, v) => void (m[k] = v) }
}

const RUNS = path.join(process.cwd(), 'eval', 'runs.jsonl')

describe.runIf(process.env.RUN_EVAL)(`EVAL 인사이트 품질 (rubric ${RUBRIC_VERSION})`, () => {
  it('케이스별 생성→채점→집계, 이력 대비 추세', async () => {
    const cases: CaseScore[] = []
    for (const c of INSIGHT_CASES) {
      const ins = await getInsight(emptyKV(), c.member, c.sessions)
      const context = `통증·제약: ${c.member.conditions} / 목표: ${c.member.goals}`
      const j = await judge(context, ins.text, INSIGHT_RUBRIC)
      cases.push({ caseId: c.id, scores: j.scores, notes: j.notes })
      console.log(`\n[${c.id}] (${ins.source}) ${ins.text}\n  점수 ${JSON.stringify(j.scores)} — ${j.notes}`)
    }

    const agg = aggregate(INSIGHT_RUBRIC, cases)
    const meta: RunMeta = { rubricId: 'insight', rubricVersion: RUBRIC_VERSION, model: 'haiku', judgeModel: JUDGE_MODEL, at: new Date().toISOString() }
    console.log('\n' + formatReport(INSIGHT_RUBRIC, cases, agg, meta))

    // 같은 rubric 버전의 직전 실행 대비 추세
    const history: RunRecord[] = fs.existsSync(RUNS)
      ? fs.readFileSync(RUNS, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : []
    const cur: RunRecord = { rubricId: meta.rubricId, rubricVersion: meta.rubricVersion, model: meta.model, pct: agg.pct }
    const cmp = compareToPrev(cur, history)
    if (cmp) console.log(`이전 동일 rubric 대비: ${cmp.prevPct}% → ${agg.pct}% (${cmp.delta >= 0 ? '+' : ''}${cmp.delta})`)
    else console.log('동일 rubric 버전의 이전 실행 없음(첫 기준점)')

    // 이력 append (가벼운 메타만)
    fs.appendFileSync(RUNS, JSON.stringify({ ...meta, pct: agg.pct, perItem: agg.perItem }) + '\n')

    expect(agg.pct).toBeGreaterThan(40) // 느슨한 회귀 가드 — 무너지면 신호
  }, 200000)
})
