// 데이터 플라이휠 (PRD §8): AI 생성본 ↔ 선생님 최종본 diff를 캡처·영속.
// "완벽한 출력"은 불가능해도 "완벽한 캡처 장치"는 1일차부터 가능 → MVP부터 반드시 저장.
// 가장 값진 신호 = 편집 diff (틀린 지점 + 정답을 동시에).
import { validateSequence } from './validateSequence'
import type { MemberInput, Sequence } from './types'
import type { Usage } from './generateSequence'
import type { KV } from './storage'

// 블록 단위 동작 추가/삭제 diff. (move = remove+add로 표현, reorder/텍스트편집은 후순위)
export type DiffOp =
  | { type: 'remove'; block: string; name: string }
  | { type: 'add'; block: string; name: string }

export type CapturedSession = {
  id: string
  memberId?: string // 회원 연결 (Phase 2). 과거 데이터 호환 위해 optional.
  createdAt: string // ISO
  input: MemberInput
  generated: Sequence // AI 생성본 (원본 보존)
  final: Sequence // 선생님 편집 최종본
  diff: DiffOp[] // generated → final
  edited: boolean // diff.length > 0
  finalValidation: { ok: boolean; errors: string[] } // 최종본이 룰을 만족하는지 (전문가가 어긴 룰 = 룰 재검토 신호)
  attempts: number // 생성에 든 repair 횟수+1
  usage: Usage // 비용 (PRD §7)
  note?: string // 수업 후 강사 노트 (수업 완료 시 추가)
  nextTags?: string[] // 다음 수업 태그
}

function multiset(names: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const n of names) m.set(n, (m.get(n) ?? 0) + 1)
  return m
}

function blockNames(seq: Sequence): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const b of seq.blocks ?? []) {
    const cur = m.get(b.block) ?? []
    m.set(b.block, [...cur, ...(b.exercises ?? []).map((e) => e.name)])
  }
  return m
}

// 생성본 → 최종본: 블록별로 빠진 동작(remove) / 추가된 동작(add)을 멀티셋 비교로 산출.
export function computeDiff(generated: Sequence, final: Sequence): DiffOp[] {
  const gen = blockNames(generated)
  const fin = blockNames(final)
  const blocks = new Set<string>([...gen.keys(), ...fin.keys()])
  const ops: DiffOp[] = []

  for (const block of blocks) {
    const g = multiset(gen.get(block) ?? [])
    const f = multiset(fin.get(block) ?? [])
    const names = new Set<string>([...g.keys(), ...f.keys()])
    for (const name of names) {
      const delta = (f.get(name) ?? 0) - (g.get(name) ?? 0)
      if (delta < 0) for (let i = 0; i < -delta; i++) ops.push({ type: 'remove', block, name })
      else if (delta > 0) for (let i = 0; i < delta; i++) ops.push({ type: 'add', block, name })
    }
  }
  return ops
}

export function buildCapturedSession(args: {
  id: string
  memberId?: string
  createdAt: string
  input: MemberInput
  generated: Sequence
  final: Sequence
  attempts: number
  usage: Usage
}): CapturedSession {
  const diff = computeDiff(args.generated, args.final)
  const v = validateSequence(args.final)
  return {
    ...args,
    diff,
    edited: diff.length > 0,
    finalValidation: { ok: v.ok, errors: v.errors },
  }
}

// ── 영속 (KV는 storage.ts의 공유 계약. App=AsyncStorage, 테스트=in-memory fake) ──
export type { KV } from './storage'

export const SESSIONS_KEY = 'pilaiv2.sessions.v1'

export async function loadSessions(kv: KV): Promise<CapturedSession[]> {
  const raw = await kv.getItem(SESSIONS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CapturedSession[]) : []
  } catch {
    return [] // 손상된 데이터로 앱이 죽지 않게
  }
}

// 최신이 앞 (unshift). 캡처는 append-only.
export async function appendSession(kv: KV, s: CapturedSession): Promise<CapturedSession[]> {
  const all = await loadSessions(kv)
  const next = [s, ...all]
  await kv.setItem(SESSIONS_KEY, JSON.stringify(next))
  return next
}

// 저장된 세션에 수업 후 정보(노트·다음 태그)를 덧붙인다.
export async function updateSession(kv: KV, id: string, patch: Partial<Pick<CapturedSession, 'note' | 'nextTags'>>): Promise<CapturedSession[]> {
  const all = await loadSessions(kv)
  const next = all.map((s) => (s.id === id ? { ...s, ...patch } : s))
  await kv.setItem(SESSIONS_KEY, JSON.stringify(next))
  return next
}

// ── 이력 (Phase 2: 케어 사이클 변주) ──────────────────────────────────────
export function sessionsForMember(sessions: CapturedSession[], memberId: string): CapturedSession[] {
  return sessions.filter((s) => s.memberId === memberId)
}

// 최근 N개 세션의 '최종본' 동작 목록을 요약 → 생성 프롬프트에 주입(변주 참고).
// sessions는 최신순 저장 전제. 최종본(선생님이 실제 택한 것) = 그 회원이 한 운동의 진실.
export function summarizeHistory(sessions: CapturedSession[], max = 3): string {
  const recent = sessions.slice(0, max)
  if (!recent.length) return ''
  const lines = recent.map((s, i) => {
    const names = (s.final.blocks ?? []).flatMap((b) => (b.exercises ?? []).map((e) => e.name))
    return `${i + 1}. ${s.createdAt.slice(0, 10)} · ${names.join(', ')}`
  })
  return `최근 수업 이력 (최신순, 변주 참고):\n${lines.join('\n')}`
}
