import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const client = new Anthropic()
const MODEL = 'claude-sonnet-4-6'
const CONCURRENCY = 8
const CATALOG = join(import.meta.dirname, '..', '..', 'data', 'basi', 'catalog', 'exercises.json')

const SYSTEM = `당신은 필라테스/해부학 전문 번역가입니다. 영어 동작 데이터를 한국 필라테스 선생님이 현장에서 쓰는 자연스러운 한국어로 번역하세요.
- 근육명: 정확한 해부학 한국어 용어 (Hip extensors → 고관절 신전근, Spinal flexors → 척추 굴곡근, Knee extensors → 무릎 신전근).
- cues / objectives / setup: 선생님이 회원을 지도할 때 쓰는 자연스러운 표현.
- movement: 호흡(들숨/날숨)과 동작.
- 동작명(name)은 번역하지 않습니다 (영어 원어 유지).
- 누락 없이 emit_translation을 정확히 1회 호출.`

const TOOL = {
  name: 'emit_translation',
  description: '동작 데이터의 한국어 번역을 emit.',
  input_schema: {
    type: 'object' as const,
    properties: {
      block_ko: { type: 'string' },
      level_ko: { type: 'string' },
      resistance_ko: { type: 'string' },
      setup_ko: { type: 'string' },
      movement_ko: { type: 'object', properties: { inhale: { type: 'string' }, exhale: { type: 'string' } } },
      muscle_focus_ko: { type: 'array', items: { type: 'string' } },
      objectives_ko: { type: 'array', items: { type: 'string' } },
      cues_ko: { type: 'array', items: { type: 'string' } },
    },
  },
}

async function translate(ex: any) {
  const input = {
    block: ex.block,
    level: ex.level,
    resistance: ex.resistance,
    setup: ex.setup,
    movement: ex.movement,
    muscle_focus: ex.muscle_focus,
    objectives: ex.objectives,
    cues: ex.cues,
  }
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...TOOL, cache_control: { type: 'ephemeral' } }] as any,
    tool_choice: { type: 'tool', name: 'emit_translation' },
    messages: [
      { role: 'user', content: `동작명: ${ex.name}\n\n번역할 데이터:\n${JSON.stringify(input, null, 2)}` },
    ],
  })
  const block = res.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use')
  return { data: block.input as any, usage: res.usage }
}

async function runPool(items: any[], n: number, worker: (x: any) => Promise<void>) {
  let i = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) await worker(items[i++])
    }),
  )
}

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'))
  let inTok = 0,
    outTok = 0,
    done = 0,
    errors = 0
  await runPool(catalog, CONCURRENCY, async (ex) => {
    if (ex.muscle_focus_ko) {
      done++
      return // 이미 번역됨 → 스킵 (재실행 안전)
    }
    try {
      const { data, usage } = await translate(ex)
      Object.assign(ex, data)
      inTok += usage.input_tokens
      outTok += usage.output_tokens
      done++
      if (done % 25 === 0) console.log(`  ${done}/${catalog.length} ...`)
    } catch (e) {
      errors++
      console.error('✗', ex.name, (e as Error).message)
    }
  })
  writeFileSync(CATALOG, JSON.stringify(catalog, null, 2))
  const cost = (inTok / 1e6) * 3 + (outTok / 1e6) * 15
  console.log(`\ndone ${done} | errors ${errors} | tokens in=${inTok} out=${outTok} | ~$${cost.toFixed(2)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
