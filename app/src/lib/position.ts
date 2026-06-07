// 동작 시작 자세 도출 — 카탈로그(exercises.json)에 전용 자세 필드가 없어 휴리스틱으로 분류한다.
// 분류 순서: ① series(예: Supine Series) ② setup 키워드(한/영) ③ 이름 키워드
//            ④ 참조 해소("Hundred Prep 자세에서 시작" → 그 동작의 자세 상속, fixpoint 반복)
// 결과는 생성 프롬프트(catalogForPrompt)의 pos 필드로 들어가 자세 흐름 규칙의 근거가 된다.
// 안전 데이터가 아닌 배열 힌트이므로 오분류 리스크는 낮다 — 미분류는 null(필드 생략).
import { allEx, type Ex } from './catalog'

export type Position = '누움' | '옆으로 누움' | '엎드림' | '앉음' | '무릎·네발' | '서기'

type PosKey = 'supine' | 'side' | 'prone' | 'sit' | 'kneel' | 'stand'
const LABEL: Record<PosKey, Position> = {
  supine: '누움',
  side: '옆으로 누움',
  prone: '엎드림',
  sit: '앉음',
  kneel: '무릎·네발',
  stand: '서기',
}

function fromSeries(e: Ex): PosKey | null {
  const s = e.series ?? ''
  if (/supine/i.test(s)) return 'supine'
  if (/side lying|lying side/i.test(s)) return 'side'
  if (/prone/i.test(s)) return 'prone'
  if (/sitting/i.test(s)) return 'sit'
  if (/kneeling/i.test(s)) return 'kneel'
  if (/standing/i.test(s)) return 'stand'
  return null
}

// setup 줄글 키워드 — 구체적인 자세(옆/엎드림/플랭크)를 먼저, 포괄어(눕다/앉다)는 뒤에.
function fromSetup(e: Ex): PosKey | null {
  const s = `${e.setup_ko ?? ''} ${e.setup ?? ''}`
  if (/옆으로 누|사이드 라잉|side.?lying|on (the |your )?side/i.test(s)) return 'side'
  if (/엎드려|엎드린|prone|face.?down/i.test(s)) return 'prone'
  if (/플랭크|plank/i.test(s)) return 'prone' // 플랭크 = 엎드려 지지 계열로 묶음
  if (/누운|누워|눕|supine|lying|lie on/i.test(s)) return 'supine'
  if (/네발|quadruped|all fours|무릎.?꿇|꿇은|꿇고|kneel/i.test(s)) return 'kneel'
  if (/앉|sitting|seated|\bsit\b/i.test(s)) return 'sit'
  if (/서서|선 자세|일어서|서거나|stand/i.test(s)) return 'stand'
  return null
}

function fromName(e: Ex): PosKey | null {
  const n = e.name
  if (/side lying/i.test(n)) return 'side'
  if (/sitting|seated/i.test(n)) return 'sit'
  if (/standing/i.test(n)) return 'stand'
  if (/kneeling/i.test(n)) return 'kneel'
  if (/prone/i.test(n)) return 'prone'
  if (/supine/i.test(n)) return 'supine'
  return null
}

// 전 카탈로그 분류 (모듈 로드 시 1회, ~232개 × 참조 해소 몇 회라 비용 무시 가능)
function classifyAll(): Map<string, PosKey> {
  const pos = new Map<string, PosKey>()
  for (const e of allEx) {
    const p = fromSeries(e) ?? fromSetup(e) ?? fromName(e)
    if (p) pos.set(e.name, p)
  }
  // 참조 해소 — setup이 다른 카탈로그 동작의 영문 이름을 언급하면 그 자세 상속.
  // 긴 이름 우선 매칭("Hundred Prep"가 "Hundred"보다 먼저). 연쇄 참조 대비 fixpoint 반복.
  const names = allEx.map((e) => e.name).sort((a, b) => b.length - a.length)
  for (let iter = 0; iter < 4; iter++) {
    let changed = 0
    for (const e of allEx) {
      if (pos.has(e.name)) continue
      const s = `${e.setup ?? ''} ${e.setup_ko ?? ''}`.toLowerCase()
      for (const n of names) {
        if (n === e.name) continue
        const p = pos.get(n)
        if (p && s.includes(n.toLowerCase())) {
          pos.set(e.name, p)
          changed++
          break
        }
      }
    }
    if (!changed) break
  }
  return pos
}

const posByName = classifyAll()

export function positionOf(name: string): Position | null {
  const k = posByName.get(name)
  return k ? LABEL[k] : null
}

// 테스트·진단용 — 분류된 동작 수
export const classifiedCount = posByName.size
