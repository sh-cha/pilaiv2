// 데이터 플라이휠 (PRD §8): AI 생성본 ↔ 선생님 최종본 diff를 캡처·영속.
// "완벽한 출력"은 불가능해도 "완벽한 캡처 장치"는 1일차부터 가능 → MVP부터 반드시 저장.
// 가장 값진 신호 = 편집 diff (틀린 지점 + 정답을 동시에).
import { validateSequence } from './validateSequence'
import type { MemberInput, Sequence, SeqExercise } from './types'
import type { Usage } from './generateSequence'
import type { KV } from './storage'

// 편집 신호 diff. 동작 추가/삭제(add/remove) + 운동량 수정(reps) + 순서 변경(reorder).
// reps·reorder는 "선생님이 AI 처방을 어떻게 미세조정하는가"라는 학습 신호 [#13].
export type DiffOp =
  | { type: 'remove'; block: string; name: string }
  | { type: 'add'; block: string; name: string }
  | { type: 'reps'; block: string; name: string; from?: string; to?: string }
  | { type: 'reorder'; block: string }

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

function blockExercises(seq: Sequence): Map<string, SeqExercise[]> {
  const m = new Map<string, SeqExercise[]>()
  for (const b of seq.blocks ?? []) {
    const cur = m.get(b.block) ?? []
    m.set(b.block, [...cur, ...(b.exercises ?? [])])
  }
  return m
}

// 생성본 → 최종본 diff. 블록별로:
//  1) 동작 추가/삭제: 이름 멀티셋 delta
//  2) reps 수정: 양쪽 공통 동작의 reps를 등장순으로 비교
//  3) 순서 변경: add/remove가 없는(멀티셋 동일) 블록에서 이름 순서가 바뀌면 reorder 1건
//     (add/remove가 있으면 순서 변화가 그에 섞여 모호 → 중복 신호 방지로 reorder는 생략)
export function computeDiff(generated: Sequence, final: Sequence): DiffOp[] {
  const gen = blockExercises(generated)
  const fin = blockExercises(final)
  const blocks = new Set<string>([...gen.keys(), ...fin.keys()])
  const ops: DiffOp[] = []

  for (const block of blocks) {
    const gEx = gen.get(block) ?? []
    const fEx = fin.get(block) ?? []
    const gNames = gEx.map((e) => e.name)
    const fNames = fEx.map((e) => e.name)
    const g = multiset(gNames)
    const f = multiset(fNames)
    const names = new Set<string>([...g.keys(), ...f.keys()])

    // 1) 동작 추가/삭제
    let structural = false
    for (const name of names) {
      const delta = (f.get(name) ?? 0) - (g.get(name) ?? 0)
      if (delta < 0) {
        for (let i = 0; i < -delta; i++) ops.push({ type: 'remove', block, name })
        structural = true
      } else if (delta > 0) {
        for (let i = 0; i < delta; i++) ops.push({ type: 'add', block, name })
        structural = true
      }
    }

    // 2) reps 수정 (공통 동작만, 등장순 매칭)
    for (const name of names) {
      const gr = gEx.filter((e) => e.name === name).map((e) => e.reps)
      const fr = fEx.filter((e) => e.name === name).map((e) => e.reps)
      const n = Math.min(gr.length, fr.length)
      for (let i = 0; i < n; i++) {
        if ((gr[i] ?? '') !== (fr[i] ?? '')) ops.push({ type: 'reps', block, name, from: gr[i], to: fr[i] })
      }
    }

    // 3) 순서 변경
    if (!structural && gNames.length === fNames.length && gNames.some((n, i) => n !== fNames[i])) {
      ops.push({ type: 'reorder', block })
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
    // 강사 노트(수업 후 관찰)는 다음 처방의 핵심 신호 — 이력에 함께 주입한다 [#7]
    // 인젝션 완화: 구분자 토큰 제거 + 길이 제한(향후 회원 피드백이 노트로 들어올 수 있음)
    const note = s.note?.trim() ? ` · 강사 노트: ${s.note.trim().replace(/[<>]/g, ' ').replace(/\s+/g, ' ').slice(0, 300)}` : ''
    return `${i + 1}. ${s.createdAt.slice(0, 10)} · ${names.join(', ')}${note}`
  })
  return `최근 수업 이력 (최신순, 변주·노트 참고):\n${lines.join('\n')}`
}
