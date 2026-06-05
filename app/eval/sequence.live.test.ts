// 라이브 시퀀스 품질 eval — 같은 케이스를 sonnet vs opus로 생성하고 같은 judge로 채점·비교.
//   RUN_EVAL=1 npm test -- eval/sequence.live.test.ts   또는   npm run eval:seq
// ⚠️ opus 생성 비용이 커서 한 번에 ~$1 안팎(케이스 3 × 모델 2 + judge 6). RUN_EVAL 가드.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { generateSequence, makeClaudeCall, MODEL, type GenerateDeps } from '../src/lib/generateSequence'
import { validateSequence } from '../src/lib/validateSequence'
import { SEQUENCE_CASES } from './cases'
import { SEQUENCE_RUBRIC, RUBRIC_VERSION } from './rubric'
import { judge, JUDGE_MODEL } from './judge'
import { aggregate, formatReport, type CaseScore, type RunMeta } from './score'
import { seqToText, estimateCost } from './seq'

const OPUS = 'claude-opus-4-8'
const MODELS = [MODEL, OPUS] // sonnet, opus
const RUNS = path.join(process.cwd(), 'eval', 'runs.jsonl')

const depsFor = (model: string): GenerateDeps => ({ callModel: makeClaudeCall(model), validate: validateSequence, maxRepairs: 2 })

describe.runIf(process.env.RUN_EVAL)(`EVAL 시퀀스 sonnet↔opus (rubric ${RUBRIC_VERSION})`, () => {
  it('모델별 생성→채점→비용 비교', async () => {
    const byModel: Record<string, { cases: CaseScore[]; cost: number; valFail: number }> = {}

    for (const model of MODELS) {
      const cases: CaseScore[] = []
      let cost = 0
      let valFail = 0
      for (const c of SEQUENCE_CASES) {
        const r = await generateSequence(c.input, depsFor(model))
        cost += estimateCost(model, r.usage)
        if (!r.validation.ok) valFail++
        const ctx = `통증·제약: ${c.input.conditions} / 목표: ${c.input.goals} / 기구: ${c.input.apparatus.join(', ')} / ${c.input.minutes}분`
        const j = await judge(ctx, seqToText(r.sequence), SEQUENCE_RUBRIC)
        cases.push({ caseId: c.id, scores: j.scores, notes: j.notes })
        console.log(`\n[${model} · ${c.id}] attempts=${r.attempts} ok=${r.validation.ok} ~$${estimateCost(model, r.usage).toFixed(3)}\n  ${JSON.stringify(j.scores)} — ${j.notes}`)
      }
      byModel[model] = { cases, cost, valFail }
    }

    console.log('\n========== 모델 비교 ==========')
    for (const model of MODELS) {
      const { cases, cost, valFail } = byModel[model]
      const agg = aggregate(SEQUENCE_RUBRIC, cases)
      const meta: RunMeta = { rubricId: 'sequence', rubricVersion: RUBRIC_VERSION, model, judgeModel: JUDGE_MODEL, at: new Date().toISOString() }
      console.log('\n' + formatReport(SEQUENCE_RUBRIC, cases, agg, meta))
      console.log(`  검증실패 ${valFail}/${cases.length} · 추정비용 ~$${cost.toFixed(3)} (${SEQUENCE_CASES.length}케이스)`)
      fs.appendFileSync(RUNS, JSON.stringify({ ...meta, pct: agg.pct, estCost: Number(cost.toFixed(4)), perItem: agg.perItem }) + '\n')
    }

    const son = aggregate(SEQUENCE_RUBRIC, byModel[MODEL].cases)
    const opus = aggregate(SEQUENCE_RUBRIC, byModel[OPUS].cases)
    console.log(`\nΔ opus - sonnet: ${opus.pct - son.pct}%p  (sonnet ${son.pct}% / opus ${opus.pct}%)`)
    console.log(`비용배수 opus/sonnet ≈ ${(byModel[OPUS].cost / Math.max(byModel[MODEL].cost, 1e-9)).toFixed(1)}x`)

    expect(son.pct).toBeGreaterThan(40) // sonnet 회귀 가드
  }, 1_200_000) // opus가 느려 케이스×모델이 길다. 20분.
})
