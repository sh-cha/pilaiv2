// 회원 레지스트리 (PRD §5: 영속 프로필). 로컬(AsyncStorage) 저장.
// 만성 제약·장기 목표는 여기 1회 등록 → 매 수업 재입력 불필요. 세션은 memberId로 연결.
import type { KV } from './storage'

export type Member = {
  id: string
  name: string
  age?: string
  sex?: string
  conditions: string // 만성 제약·병력 (예: 목디스크)
  goals: string // 장기 목표
  createdAt: string
  updatedAt: string
}

export const MEMBERS_KEY = 'pilaiv2.members.v1'

export async function loadMembers(kv: KV): Promise<Member[]> {
  const raw = await kv.getItem(MEMBERS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Member[]) : []
  } catch {
    return []
  }
}

// id 있으면 갱신(updatedAt 교체, 위치 유지), 없으면 신규를 앞에 추가.
export async function upsertMember(kv: KV, m: Member): Promise<Member[]> {
  const all = await loadMembers(kv)
  const idx = all.findIndex((x) => x.id === m.id)
  let next: Member[]
  if (idx >= 0) {
    next = all.slice()
    next[idx] = m
  } else {
    next = [m, ...all]
  }
  await kv.setItem(MEMBERS_KEY, JSON.stringify(next))
  return next
}

export async function deleteMember(kv: KV, id: string): Promise<Member[]> {
  const all = await loadMembers(kv)
  const next = all.filter((x) => x.id !== id)
  await kv.setItem(MEMBERS_KEY, JSON.stringify(next))
  return next
}
