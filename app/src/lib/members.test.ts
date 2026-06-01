import { describe, it, expect } from 'vitest'
import { loadMembers, upsertMember, deleteMember, MEMBERS_KEY, type Member } from './members'
import type { KV } from './storage'

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

const mk = (id: string, name: string): Member => ({
  id,
  name,
  conditions: '목디스크',
  goals: '자세교정',
  createdAt: 't',
  updatedAt: 't',
})

describe('members 레지스트리', () => {
  it('빈 저장소 → []', async () => {
    const { kv } = fakeKV()
    expect(await loadMembers(kv)).toEqual([])
  })

  it('신규는 앞에 추가', async () => {
    const { kv } = fakeKV()
    await upsertMember(kv, mk('a', 'A'))
    const after = await upsertMember(kv, mk('b', 'B'))
    expect(after.map((m) => m.id)).toEqual(['b', 'a'])
  })

  it('같은 id는 갱신(위치 유지)', async () => {
    const { kv } = fakeKV()
    await upsertMember(kv, mk('a', 'A'))
    await upsertMember(kv, mk('b', 'B'))
    const after = await upsertMember(kv, { ...mk('a', 'A수정'), updatedAt: 't2' })
    expect(after.map((m) => m.id)).toEqual(['b', 'a']) // 위치 유지
    expect(after.find((m) => m.id === 'a')?.name).toBe('A수정')
  })

  it('삭제', async () => {
    const { kv } = fakeKV()
    await upsertMember(kv, mk('a', 'A'))
    await upsertMember(kv, mk('b', 'B'))
    const after = await deleteMember(kv, 'a')
    expect(after.map((m) => m.id)).toEqual(['b'])
  })

  it('손상된 데이터 → []', async () => {
    const { kv, store } = fakeKV()
    store[MEMBERS_KEY] = '{깨짐'
    expect(await loadMembers(kv)).toEqual([])
  })
})
