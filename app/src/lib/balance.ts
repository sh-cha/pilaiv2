// 회원 근육군 비중 — 최근 세션의 동작을 카탈로그 근육(muscle_focus_ko)으로 부위 분류해 집계.
// 부위 키워드는 exercises.json의 37개 근육명에서 확인된 패턴.
import { exByName } from './catalog'
import type { CapturedSession } from './flywheel'
import type { Sequence } from './types'

export type Region = '코어' | '하체' | '상체'

export function regionOf(muscle: string): Region {
  if (/어깨|팔꿈치|견갑|광배|승모|흉|손목|팔/.test(muscle)) return '상체'
  if (/고관절|무릎|발목|다리|둔|햄스트링|대퇴|비복|가자미|족|발/.test(muscle)) return '하체'
  return '코어' // 척추·복부 등
}

// 최근 maxSessions개 최종본의 동작 → 대표 근육 → 부위 집계 → 비중(%). 데이터 없으면 null.
export function memberBalance(sessions: CapturedSession[], maxSessions = 5): { region: Region; pct: number }[] | null {
  const recent = sessions.slice(0, maxSessions)
  const counts: Record<Region, number> = { 코어: 0, 하체: 0, 상체: 0 }
  let total = 0
  for (const s of recent) {
    for (const b of s.final.blocks ?? []) {
      for (const ex of b.exercises ?? []) {
        const cat = exByName.get(ex.name)
        const m = cat?.muscle_focus_ko?.[0] ?? cat?.muscle_focus?.[0]
        if (!m) continue
        counts[regionOf(m)]++
        total++
      }
    }
  }
  if (total === 0) return null
  return (['코어', '하체', '상체'] as Region[]).map((region) => ({ region, pct: Math.round((counts[region] / total) * 100) }))
}

// 한 시퀀스의 근육군 커버리지 — 동작들의 대표 근육 → 부위 집계 → %. 생성 결과 위 "검증 미리보기"용.
// memberBalance와 같은 분류(regionOf)를 단일 시퀀스에 적용. 매칭 근육 없으면 null.
export function sequenceCoverage(seq: Sequence): { region: Region; pct: number }[] | null {
  const counts: Record<Region, number> = { 코어: 0, 하체: 0, 상체: 0 }
  let total = 0
  for (const b of seq.blocks ?? []) {
    for (const ex of b.exercises ?? []) {
      const cat = exByName.get(ex.name)
      const m = cat?.muscle_focus_ko?.[0] ?? cat?.muscle_focus?.[0]
      if (!m) continue
      counts[regionOf(m)]++
      total++
    }
  }
  if (total === 0) return null
  return (['코어', '하체', '상체'] as Region[]).map((region) => ({ region, pct: Math.round((counts[region] / total) * 100) }))
}

// 회원 상세용 인사이트 텍스트 — 비중(있으면)·통증을 근거로 다음 수업 방향 제안.
export function buildInsight(name: string, balance: { region: Region; pct: number }[] | null, warns: string[]): string {
  if (balance) {
    const sorted = [...balance].sort((a, b) => b.pct - a.pct)
    const top = sorted[0]
    const low = sorted[sorted.length - 1]
    return `최근 ${top.region} 비중이 ${top.pct}%로 가장 높았어요. 다음 수업은 ${low.region}를 조금 더 배치해 균형을 맞춰보는 걸 추천해요.`
  }
  if (warns.length) return `${warns.join('·')}을(를) 고려해 안전한 동작 위주로 구성하는 걸 추천해요. 수업을 저장할수록 근육군 비중 분석이 정밀해져요.`
  return `${name}님의 첫 시퀀스를 만들면 근육군 비중을 분석해 맞춤 인사이트를 드려요.`
}
