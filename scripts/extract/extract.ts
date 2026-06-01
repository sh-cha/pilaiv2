import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const client = new Anthropic()
const MODEL = 'claude-sonnet-4-6' // 비전 + 구조화 추출용 티어
const CONCURRENCY = 8

const ROOT = join(import.meta.dirname, '..', '..')
const PAGES_DIR = join(ROOT, 'data', 'basi', 'extracted_pages')
const RAW_DIR = join(ROOT, 'data', 'basi', 'raw')

// 전체 추출 대상 (chair_400dpi_backup 제외 — 중복 백업)
const PROGRAMS = ['foundation', 'mat', 'graduate', 'chair']

const SYSTEM = `You extract structured exercise data from scanned BASI Pilates manual pages.

Each exercise-detail page follows a fixed 7-section template:
EXERCISE (code + name + series) / BLOCK / LEVEL / DESCRIPTION (Set Up + Resistance) /
MOVEMENT (Inhale/Exhale breathing) / MUSCLE FOCUS / OBJECTIVES / CUES.

Rules:
- Extract ONLY the printed (typed) text, VERBATIM. Do not paraphrase, summarize, or translate.
- IGNORE handwritten notes (Korean pen marks) for content, but set handwritten_present=true if ANY handwriting appears on the page.
- page_type:
  - "exercise_detail": a single-exercise template page (has the sections above)
  - "handwritten_note": page is mostly handwriting with no printed exercise
  - "other": table of contents, cover, section divider, summary table
- For exercise_detail, fill the printed.* fields from the printed sections. OMIT any field not present on the page; use [] for empty lists.
- apparatus: read from the page (reformer / cadillac / mat / chair / ...).
- Call emit_page exactly once.`

const TOOL = {
  name: 'emit_page',
  description: 'Emit the structured extraction for exactly one manual page.',
  input_schema: {
    type: 'object' as const,
    properties: {
      page_type: { type: 'string', enum: ['exercise_detail', 'handwritten_note', 'other'] },
      handwritten_present: { type: 'boolean' },
      printed: {
        type: 'object',
        description: 'Present only for exercise_detail pages. Omit fields not shown on the page.',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          apparatus: { type: 'string' },
          series: { type: 'string' },
          block: { type: 'string' },
          level: { type: 'string' },
          setup: { type: 'string' },
          resistance: { type: 'string' },
          reps: { type: 'string' },
          spring_setting: { type: 'string' },
          movement: {
            type: 'object',
            properties: { inhale: { type: 'string' }, exhale: { type: 'string' } },
          },
          muscle_focus: { type: 'array', items: { type: 'string' } },
          objectives: { type: 'array', items: { type: 'string' } },
          cues: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    required: ['page_type', 'handwritten_present'],
  },
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i === tries - 1) throw e
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
  throw new Error('unreachable')
}

async function extractPage(program: string, pageFile: string) {
  const media = pageFile.endsWith('.jpg') ? ('image/jpeg' as const) : ('image/png' as const)
  const b64 = readFileSync(join(PAGES_DIR, program, pageFile)).toString('base64')
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...TOOL, cache_control: { type: 'ephemeral' } }] as any,
    tool_choice: { type: 'tool', name: 'emit_page' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: media, data: b64 } },
          { type: 'text', text: `Program: ${program}\nPage file: ${pageFile}` },
        ],
      },
    ],
  })
  const block = res.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use in response')
  return { data: block.input as any, usage: res.usage }
}

const outPath = (program: string, page: string) =>
  join(RAW_DIR, `${program}_${page.replace(/\.(png|jpg)$/, '')}.json`)

function listPages(program: string): Array<[string, string]> {
  return readdirSync(join(PAGES_DIR, program))
    .filter((f) => f.endsWith('.png') || f.endsWith('.jpg'))
    .sort()
    .map((f) => [program, f] as [string, string])
}

async function runPool(
  items: Array<[string, string]>,
  concurrency: number,
  worker: (item: [string, string]) => Promise<void>,
) {
  let idx = 0
  const runners = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      await worker(items[idx++])
    }
  })
  await Promise.all(runners)
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true })
  const all = PROGRAMS.flatMap(listPages)
  const todo = all.filter(([p, pg]) => !existsSync(outPath(p, pg)))
  console.log(`total ${all.length} pages | ${all.length - todo.length} already done | ${todo.length} to extract`)

  let inTok = 0,
    outTok = 0,
    done = 0,
    errors = 0
  const counts: Record<string, number> = {}

  await runPool(todo, CONCURRENCY, async ([program, page]) => {
    try {
      const { data, usage } = await withRetry(() => extractPage(program, page))
      writeFileSync(outPath(program, page), JSON.stringify({ source_page: `${program}:${page}`, ...data }, null, 2))
      inTok += usage.input_tokens
      outTok += usage.output_tokens
      counts[data.page_type] = (counts[data.page_type] ?? 0) + 1
      done++
      if (done % 25 === 0) console.log(`  ${done}/${todo.length} ...`)
    } catch (e) {
      errors++
      console.error('✗', `${program}/${page}`, (e as Error).message)
    }
  })

  const cost = (inTok / 1e6) * 3 + (outTok / 1e6) * 15
  console.log(`\ndone ${done} | errors ${errors}`)
  console.log(`page_types:`, counts)
  console.log(`tokens in=${inTok} out=${outTok} | ~$${cost.toFixed(2)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
