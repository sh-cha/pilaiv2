// LLM-as-judge: 생성물을 rubric으로 0~max 채점. callJudge 주입 가능(테스트는 mock).
// ⚠️ 라이브 호출은 유료. eval.live.test.ts에서 RUN_EVAL 가드로만 실제 호출한다.
import type { RubricItem } from './rubric'

declare const process: { env: Record<string, string | undefined> }
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? ''
export const JUDGE_MODEL = 'claude-sonnet-4-6' // 채점은 생성(haiku)보다 강한 모델로

const SYSTEM = `당신은 필라테스 도메인 평가자입니다. 주어진 채점 기준(rubric)에 따라 생성물을 항목별로 0점부터 만점까지 일관되고 엄격하게 채점합니다. 후하게 주지 말고, 기준 문구에 근거해 판단하세요.`

export type JudgeRaw = { scores: Record<string, number>; notes: string }
export type JudgeCall = (system: string, prompt: string, rubric: RubricItem[]) => Promise<JudgeRaw>

export function buildJudgePrompt(rubric: RubricItem[], context: string, output: string): string {
  const items = rubric.map((i) => `- ${i.key} (${i.label}, 0~${i.max}): ${i.guide}`).join('\n')
  return `## 채점 기준 (rubric)
${items}

## 평가 대상 컨텍스트
${context}

## 생성물
${output}

각 항목을 기준에 맞춰 0~해당 max의 정수로 채점하고 emit_scores를 호출하세요. notes에 한 줄 근거를 적으세요.`
}

function scoreTool(rubric: RubricItem[]) {
  const properties: Record<string, unknown> = {}
  for (const i of rubric) properties[i.key] = { type: 'integer', minimum: 0, maximum: i.max, description: `${i.label}: ${i.guide}` }
  properties.notes = { type: 'string', description: '채점 근거 한 줄' }
  return {
    name: 'emit_scores',
    description: 'rubric 항목별 점수를 emit한다.',
    input_schema: { type: 'object', properties, required: rubric.map((i) => i.key) },
  }
}

const callJudgeClaude: JudgeCall = async (system, prompt, rubric) => {
  if (!API_KEY) throw new Error('no api key')
  const tool = scoreTool(rubric)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      max_tokens: 1024,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'emit_scores' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = await res.json()
  const t = (data.content ?? []).find((b: { type: string }) => b.type === 'tool_use')
  if (!t) throw new Error('no tool_use in judge response')
  const input = t.input as Record<string, unknown>
  const scores: Record<string, number> = {}
  for (const i of rubric) scores[i.key] = Number(input[i.key] ?? 0)
  return { scores, notes: String(input.notes ?? '') }
}

// 채점 + 정규화(0~max로 clamp, 정수, 누락은 0). call 주입으로 테스트에서 mock.
export async function judge(
  context: string,
  output: string,
  rubric: RubricItem[],
  call: JudgeCall = callJudgeClaude,
): Promise<JudgeRaw> {
  const raw = await call(SYSTEM, buildJudgePrompt(rubric, context, output), rubric)
  const scores: Record<string, number> = {}
  for (const i of rubric) scores[i.key] = Math.max(0, Math.min(i.max, Math.round(raw.scores[i.key] ?? 0)))
  return { scores, notes: raw.notes ?? '' }
}
