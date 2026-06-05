// 라이브 재생성(adjust) eval. 원본 생성 → 선생님 방향 지시로 재생성 → 채점.
//   RUN_EVAL=1 npm test -- eval/regen.live.test.ts   또는   npm run eval:regen
// 핵심: 원본 대비 변화(computeDiff)를 judge에 함께 주어 "지시가 실제로 반영됐나"를 정확히 보게 한다.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { generateSequence, MODEL } from '../src/lib/generateSequence'
import { computeDiff } from '../src/lib/flywheel'
import type { Sequence } from '../src/lib/types'
import { REGEN_CASES } from './cases'
import { REGEN_RUBRIC, RUBRIC_VERSION } from './rubric'
import { judge, JUDGE_MODEL } from './judge'
import { aggregate, formatReport, compareToPrev, type CaseScore, type RunMeta, type RunRecord } from './score'
import { seqToText, estimateCost } from './seq'

const RUNS = path.join(process.cwd(), 'eval', 'runs.jsonl')

function diffSummary(orig: Sequence, regen: Sequence): string {
  const ops = computeDiff(orig, regen)
  if (!ops.length) return '(변화 없음 — adjust 미반영 신호)'
  return ops
    .map((o) =>
      o.type === 'add'
        ? `+${o.block}:${o.name}`
        : o.type === 'remove'
          ? `-${o.block}:${o.name}`
          : o.type === 'reps'
            ? `~reps ${o.block}:${o.name} ${o.from ?? '-'}→${o.to ?? '-'}`
            : `⇅순서 ${o.block}`,
    )
    .join(', ')
}

describe.runIf(process.env.RUN_EVAL)(`EVAL 재생성 adjust (rubric ${RUBRIC_VERSION})`, () => {
  it('원본→adjust 재생성→채점', async () => {
    const cases: CaseScore[] = []
    let cost = 0
    for (const c of REGEN_CASES) {
      const orig = await generateSequence(c.input)
      const regen = await generateSequence({ ...c.input, adjust: c.adjust, baseSequence: orig.sequence })
      cost += estimateCost(MODEL, orig.usage) + estimateCost(MODEL, regen.usage)
      const diff = diffSummary(orig.sequence, regen.sequence)
      const context = `회원 통증·제약: ${c.input.conditions} / 목표: ${c.input.goals}

[원본 시퀀스]
${seqToText(orig.sequence)}

[선생님 재생성 요청] "${c.adjust}"

[원본→재생성 변경 요약] ${diff}`
      const j = await judge(context, seqToText(regen.sequence), REGEN_RUBRIC)
      cases.push({ caseId: c.id, scores: j.scores, notes: j.notes })
      console.log(`\n[${c.id}] adjust="${c.adjust}"\n  변경: ${diff}\n  ${JSON.stringify(j.scores)} — ${j.notes}`)
    }

    const agg = aggregate(REGEN_RUBRIC, cases)
    const meta: RunMeta = { rubricId: 'regen', rubricVersion: RUBRIC_VERSION, model: MODEL, judgeModel: JUDGE_MODEL, at: new Date().toISOString() }
    console.log('\n' + formatReport(REGEN_RUBRIC, cases, agg, meta))
    console.log(`  추정비용 ~$${cost.toFixed(3)}`)

    const history: RunRecord[] = fs.existsSync(RUNS)
      ? fs.readFileSync(RUNS, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : []
    const cmp = compareToPrev({ rubricId: meta.rubricId, rubricVersion: meta.rubricVersion, model: meta.model, pct: agg.pct }, history)
    if (cmp) console.log(`이전 동일 rubric 대비: ${cmp.prevPct}% → ${agg.pct}% (${cmp.delta >= 0 ? '+' : ''}${cmp.delta})`)
    else console.log('동일 rubric 버전의 이전 실행 없음(첫 기준점)')
    fs.appendFileSync(RUNS, JSON.stringify({ ...meta, pct: agg.pct, perItem: agg.perItem }) + '\n')

    expect(agg.pct).toBeGreaterThan(40)
  }, 600_000)
})
