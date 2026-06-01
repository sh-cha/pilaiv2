import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const RAW_DIR = join(ROOT, 'data', 'basi', 'raw')
const OUT_DIR = join(ROOT, 'data', 'basi', 'catalog')

// apparatus 표기 정규화
const APPARATUS_MAP: Record<string, string> = {
  reformer: 'reformer',
  cadillac: 'cadillac',
  mat: 'mat',
  chair: 'chair',
  'wunda chair': 'chair',
  'ladder barrel': 'ladder_barrel',
  barrel: 'ladder_barrel',
  'spine corrector': 'spine_corrector',
  'foudation reformer': 'reformer',
  'foundation reformer': 'reformer',
}

const normApparatus = (a?: string): string | null => {
  if (!a) return null
  const key = a.trim().toLowerCase()
  return APPARATUS_MAP[key] ?? key.replace(/\s+/g, '_')
}

const slug = (name: string): string =>
  name
    .replace(/\n/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const normBlock = (b?: string): string | null =>
  b ? b.trim().replace(/\s*\/\s*/g, ' / ') : null

const cleanName = (n: string): string => n.replace(/\n/g, ' ').trim()

const pickLonger = (a: string | null, b?: string): string | null =>
  !b ? a : !a ? b : b.length > a.length ? b : a

const pickLongerArr = (a: string[], b?: string[]): string[] =>
  !b || b.length === 0 ? a : !a || a.length === 0 ? b : b.length > a.length ? b : a

type Raw = { source_page: string; page_type: string; printed?: any }

function loadRaw(): Raw[] {
  return readdirSync(RAW_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const r = JSON.parse(readFileSync(join(RAW_DIR, f), 'utf8'))
      if (typeof r.printed === 'string') {
        try {
          r.printed = JSON.parse(r.printed)
        } catch {
          /* keep as-is; will be filtered */
        }
      }
      return r
    })
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const raws = loadRaw()
  const details = raws.filter(
    (r) => r.page_type === 'exercise_detail' && r.printed && typeof r.printed === 'object',
  )

  const byId: Record<string, any> = {}
  for (const r of details) {
    const p = r.printed
    if (!p.name) continue
    const baseName = cleanName(p.name).replace(/\s+(continued|con't|cont'd)$/i, '').trim()
    const id = slug(baseName)
    if (!id) continue
    if (!byId[id]) {
      byId[id] = {
        id,
        name: baseName,
        aliases: new Set<string>(),
        apparatus: new Set<string>(),
        block: null,
        series: null,
        level: null,
        setup: null,
        resistance: null,
        reps: null,
        spring_setting: null,
        movement: null,
        muscle_focus: [],
        objectives: [],
        cues: [],
        source_pages: [],
      }
    }
    const e = byId[id]
    e.source_pages.push(r.source_page)
    e.aliases.add(cleanName(p.name))
    const ap = normApparatus(p.apparatus)
    if (ap) e.apparatus.add(ap)
    e.block ??= normBlock(p.block)
    e.series ??= p.series ?? null
    e.level ??= p.level ?? null
    e.setup = pickLonger(e.setup, p.setup)
    e.resistance ??= p.resistance ?? null
    e.reps ??= p.reps ?? null
    e.spring_setting ??= p.spring_setting ?? null
    e.movement ??= p.movement ?? null
    e.muscle_focus = pickLongerArr(e.muscle_focus, p.muscle_focus)
    e.objectives = pickLongerArr(e.objectives, p.objectives)
    e.cues = pickLongerArr(e.cues, p.cues)
  }

  const catalog = Object.values(byId)
    .map((e: any) => ({
      ...e,
      aliases: [...e.aliases].filter((a: string) => a !== e.name),
      apparatus: [...e.apparatus],
    }))
    .sort((a: any, b: any) => a.id.localeCompare(b.id))

  // apparatus 누락 추론 (program 맥락) — 검수용 inferred 플래그
  const PROG_DEFAULT: Record<string, string> = { mat: 'mat', chair: 'chair', foundation: 'reformer', graduate: 'reformer' }
  for (const e of catalog as any[]) {
    if (e.apparatus.length === 0) {
      const prog = (e.source_pages[0] || '').split(':')[0]
      if (PROG_DEFAULT[prog]) {
        e.apparatus = [PROG_DEFAULT[prog]]
        e.apparatus_inferred = true
      }
    }
  }

  writeFileSync(join(OUT_DIR, 'exercises.json'), JSON.stringify(catalog, null, 2))

  const missingAp = catalog.filter((e: any) => e.apparatus.length === 0).length
  const missingMuscle = catalog.filter((e: any) => e.muscle_focus.length === 0).length
  const missingCues = catalog.filter((e: any) => e.cues.length === 0).length
  console.log(`raw exercise_detail pages: ${details.length}`)
  console.log(`→ unique exercises:        ${catalog.length}`)
  console.log(`missing apparatus: ${missingAp} | muscle_focus: ${missingMuscle} | cues: ${missingCues}`)
  console.log(`written: data/basi/catalog/exercises.json`)
}

main()
