import { describe, it, expect } from 'vitest'
import { computeDiff, buildCapturedSession, loadSessions, appendSession, updateSession, updateSessionFinal, deleteSession, sessionStatus, sessionsForMember, summarizeHistory, SESSIONS_KEY, type KV } from './flywheel'
import type { MemberInput, Sequence } from './types'
import type { Usage } from './generateSequence'

const input: MemberInput = { conditions: '목', goals: '코어', apparatus: ['reformer'], minutes: 50 }
const usage: Usage = { input_tokens: 1, output_tokens: 1 }

const seq = (exNames: string[]): Sequence => ({
  member_summary: 's',
  mode: 'treatment',
  blocks: [{ block: '웜업', apparatus: 'reformer', exercises: exNames.map((name) => ({ name })) }],
})

// reps까지 지정하는 시퀀스 (편집 깊이 [#13] 테스트용)
const seqR = (exs: { name: string; reps?: string }[]): Sequence => ({
  member_summary: 's',
  mode: 'treatment',
  blocks: [{ block: '웜업', apparatus: 'reformer', exercises: exs }],
})

function fakeKV() {
  const store: Record<string, string> = {}
  const kv: KV = {
    async getItem(k) {
      return store[k] ?? null
    },
    async setItem(k, v) {
      store[k] = v
    },
  }
  return { kv, store }
}

describe('computeDiff', () => {
  it('편집 없으면 빈 diff', () => {
    expect(computeDiff(seq(['Pelvic Curl', 'Parallel Heels']), seq(['Pelvic Curl', 'Parallel Heels']))).toEqual([])
  })

  it('동작 삭제 → remove op', () => {
    const d = computeDiff(seq(['Pelvic Curl', 'Parallel Heels']), seq(['Pelvic Curl']))
    expect(d).toEqual([{ type: 'remove', block: '웜업', name: 'Parallel Heels' }])
  })

  it('동작 추가 → add op', () => {
    const d = computeDiff(seq(['Pelvic Curl']), seq(['Pelvic Curl', 'Parallel Toes']))
    expect(d).toEqual([{ type: 'add', block: '웜업', name: 'Parallel Toes' }])
  })

  it('스왑 → remove + add', () => {
    const d = computeDiff(seq(['Pelvic Curl', 'Parallel Heels']), seq(['Pelvic Curl', 'Parallel Toes']))
    expect(d.length).toBe(2)
    expect(d).toContainEqual({ type: 'remove', block: '웜업', name: 'Parallel Heels' })
    expect(d).toContainEqual({ type: 'add', block: '웜업', name: 'Parallel Toes' })
  })

  it('중복 동작 멀티셋 처리', () => {
    const d = computeDiff(seq(['Pelvic Curl', 'Pelvic Curl']), seq(['Pelvic Curl']))
    expect(d).toEqual([{ type: 'remove', block: '웜업', name: 'Pelvic Curl' }])
  })

  // ── 편집 깊이 [#13]: reps 수정 · 순서 변경 ──
  it('reps 변경 → reps op (from/to)', () => {
    const d = computeDiff(seqR([{ name: 'Pelvic Curl', reps: '10회' }]), seqR([{ name: 'Pelvic Curl', reps: '8회' }]))
    expect(d).toEqual([{ type: 'reps', block: '웜업', name: 'Pelvic Curl', from: '10회', to: '8회' }])
  })

  it('reps 신규 입력(없음→값) → reps op', () => {
    const d = computeDiff(seqR([{ name: 'Pelvic Curl' }]), seqR([{ name: 'Pelvic Curl', reps: '12회' }]))
    expect(d).toEqual([{ type: 'reps', block: '웜업', name: 'Pelvic Curl', to: '12회' }])
  })

  it('reps 동일하면 diff 없음', () => {
    expect(computeDiff(seqR([{ name: 'A', reps: '10회' }]), seqR([{ name: 'A', reps: '10회' }]))).toEqual([])
  })

  it('순서만 바뀌면(멀티셋 동일) → reorder op 1건', () => {
    const d = computeDiff(seq(['A', 'B', 'C']), seq(['C', 'A', 'B']))
    expect(d).toEqual([{ type: 'reorder', block: '웜업' }])
  })

  it('add/remove가 있으면 reorder는 내지 않음(중복 신호 방지)', () => {
    const d = computeDiff(seq(['A', 'B']), seq(['B', 'C']))
    expect(d.some((o) => o.type === 'reorder')).toBe(false)
    expect(d).toContainEqual({ type: 'remove', block: '웜업', name: 'A' })
    expect(d).toContainEqual({ type: 'add', block: '웜업', name: 'C' })
  })

  it('reps 변경 + 순서 변경 동시 캡처', () => {
    const d = computeDiff(
      seqR([{ name: 'A', reps: '10회' }, { name: 'B' }]),
      seqR([{ name: 'B' }, { name: 'A', reps: '8회' }]),
    )
    expect(d).toContainEqual({ type: 'reps', block: '웜업', name: 'A', from: '10회', to: '8회' })
    expect(d).toContainEqual({ type: 'reorder', block: '웜업' })
  })
})

describe('buildCapturedSession', () => {
  it('편집 있으면 edited=true, diff 포함', () => {
    const s = buildCapturedSession({
      id: 'x',
      createdAt: '2026-06-01T00:00:00Z',
      input,
      generated: seq(['Pelvic Curl', 'Parallel Heels']),
      final: seq(['Pelvic Curl']),
      attempts: 1,
      usage,
    })
    expect(s.edited).toBe(true)
    expect(s.diff.length).toBe(1)
    expect(s.finalValidation.ok).toBe(true)
  })

  it('편집 없으면 edited=false', () => {
    const same = seq(['Pelvic Curl'])
    const s = buildCapturedSession({ id: 'x', createdAt: 't', input, generated: same, final: same, attempts: 1, usage })
    expect(s.edited).toBe(false)
    expect(s.diff).toEqual([])
  })

  it('최종본이 룰 위반(카탈로그 외 동작)이어도 캡처하되 finalValidation.ok=false', () => {
    const s = buildCapturedSession({
      id: 'x',
      createdAt: 't',
      input,
      generated: seq(['Pelvic Curl']),
      final: seq(['존재하지않는동작ZZZ']),
      attempts: 1,
      usage,
    })
    expect(s.finalValidation.ok).toBe(false)
    expect(s.edited).toBe(true)
  })
})

describe('영속 (appendSession/loadSessions)', () => {
  it('빈 저장소 → []', async () => {
    const { kv } = fakeKV()
    expect(await loadSessions(kv)).toEqual([])
  })

  it('append 후 load 라운드트립, 최신이 앞', async () => {
    const { kv } = fakeKV()
    const mk = (id: string) =>
      buildCapturedSession({ id, createdAt: 't', input, generated: seq(['Pelvic Curl']), final: seq(['Pelvic Curl']), attempts: 1, usage })
    await appendSession(kv, mk('a'))
    const after = await appendSession(kv, mk('b'))
    expect(after.map((s) => s.id)).toEqual(['b', 'a']) // 최신 앞
    expect((await loadSessions(kv)).map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('손상된 데이터 → [] (앱 안 죽음)', async () => {
    const { kv, store } = fakeKV()
    store[SESSIONS_KEY] = '{깨진 json'
    expect(await loadSessions(kv)).toEqual([])
  })

  it('deleteSession: 해당 id만 삭제, 나머지 보존', async () => {
    const { kv } = fakeKV()
    const mk = (id: string) =>
      buildCapturedSession({ id, createdAt: 't', input, generated: seq(['Pelvic Curl']), final: seq(['Pelvic Curl']), attempts: 1, usage })
    await appendSession(kv, mk('a'))
    await appendSession(kv, mk('b'))
    const after = await deleteSession(kv, 'a')
    expect(after.map((s) => s.id)).toEqual(['b'])
    expect((await loadSessions(kv)).map((s) => s.id)).toEqual(['b'])
    // 없는 id 삭제는 no-op
    expect((await deleteSession(kv, 'zzz')).map((s) => s.id)).toEqual(['b'])
  })

  it('updateSessionFinal: final 교체 + diff·검증 재계산 (수업 시작 전 재편집)', async () => {
    const { kv } = fakeKV()
    const s = buildCapturedSession({
      id: 'a',
      createdAt: 't',
      input,
      generated: seq(['Pelvic Curl', 'Parallel Heels']),
      final: seq(['Pelvic Curl', 'Parallel Heels']),
      attempts: 1,
      usage,
    })
    await appendSession(kv, s)
    const after = await updateSessionFinal(kv, 'a', seq(['Pelvic Curl']))
    expect(after[0].final.blocks[0].exercises.map((e) => e.name)).toEqual(['Pelvic Curl'])
    expect(after[0].edited).toBe(true)
    expect(after[0].diff).toEqual([{ type: 'remove', block: '웜업', name: 'Parallel Heels' }])
    expect(after[0].generated.blocks[0].exercises.length).toBe(2) // 원본은 보존
  })
})

describe('세션 상태 (수업 전/완료)', () => {
  const mk = (id: string) =>
    buildCapturedSession({ id, createdAt: 't', input, generated: seq(['Pelvic Curl']), final: seq(['Pelvic Curl']), attempts: 1, usage })

  it('저장만 된 세션 = ready (기록에 완료로 뜨지 않음)', () => {
    expect(sessionStatus(mk('a'))).toBe('ready')
  })

  it('completedAt 찍히면 done — 노트 없어도', () => {
    expect(sessionStatus({ ...mk('a'), completedAt: '2026-06-06T10:00:00Z' })).toBe('done')
  })

  it('구 세션 호환: note만 있어도 done', () => {
    expect(sessionStatus({ ...mk('a'), note: '좋았음' })).toBe('done')
  })

  it('updateSession으로 completedAt 패치 → done', async () => {
    const { kv } = fakeKV()
    await appendSession(kv, mk('a'))
    const after = await updateSession(kv, 'a', { completedAt: '2026-06-06T10:00:00Z' })
    expect(sessionStatus(after[0])).toBe('done')
  })
})

describe('이력 (Phase 2 변주)', () => {
  const sess = (id: string, memberId: string, names: string[], createdAt: string) =>
    buildCapturedSession({ id, memberId, createdAt, input, generated: seq(names), final: seq(names), attempts: 1, usage })

  it('buildCapturedSession이 memberId를 보존', () => {
    const s = sess('x', 'm1', ['Pelvic Curl'], '2026-06-01T00:00:00Z')
    expect(s.memberId).toBe('m1')
  })

  it('sessionsForMember: memberId로 필터', () => {
    const all = [sess('1', 'm1', ['Pelvic Curl'], 't'), sess('2', 'm2', ['Parallel Heels'], 't'), sess('3', 'm1', ['Parallel Toes'], 't')]
    expect(sessionsForMember(all, 'm1').map((s) => s.id)).toEqual(['1', '3'])
  })

  it('summarizeHistory: 이력 없으면 빈 문자열', () => {
    expect(summarizeHistory([])).toBe('')
  })

  it('summarizeHistory: 최근 max개의 최종본 동작을 요약', () => {
    const all = [
      sess('1', 'm1', ['Pelvic Curl', 'Parallel Heels'], '2026-06-01T00:00:00Z'),
      sess('2', 'm1', ['Parallel Toes'], '2026-05-28T00:00:00Z'),
      sess('3', 'm1', ['Monkey'], '2026-05-20T00:00:00Z'),
      sess('4', 'm1', ['Tower Prep'], '2026-05-10T00:00:00Z'),
    ]
    const out = summarizeHistory(all, 3)
    expect(out).toContain('Pelvic Curl, Parallel Heels')
    expect(out).toContain('2026-06-01')
    expect(out).toContain('Monkey') // 3번째까지 포함
    expect(out).not.toContain('Tower Prep') // 4번째는 제외(max=3)
  })

  it('summarizeHistory: 강사 노트를 이력에 포함 [#7]', () => {
    const all = [
      { ...sess('1', 'm1', ['Pelvic Curl'], '2026-06-01T00:00:00Z'), note: '어깨 가동범위 좋아짐, 다음엔 후면체인 강화' },
      sess('2', 'm1', ['Parallel Toes'], '2026-05-28T00:00:00Z'),
    ]
    const out = summarizeHistory(all, 3)
    expect(out).toContain('강사 노트: 어깨 가동범위 좋아짐, 다음엔 후면체인 강화')
  })
})
