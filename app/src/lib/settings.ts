// 앱 설정 — kv에 영속되는 가벼운 로컬 설정(알림 등). 푸시 백엔드 연결 전까지는 토글 상태만 보관.
import type { KV } from './storage'

export const SETTINGS_KEY = 'pilaiv2.settings.v1'

export type Settings = { notifications: boolean }

export const DEFAULT_SETTINGS: Settings = { notifications: true }

export async function loadSettings(kv: KV): Promise<Settings> {
  const raw = await kv.getItem(SETTINGS_KEY)
  if (!raw) return DEFAULT_SETTINGS
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS // 손상된 데이터로 앱이 죽지 않게
  }
}

export async function saveSettings(kv: KV, patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings(kv)), ...patch }
  await kv.setItem(SETTINGS_KEY, JSON.stringify(next))
  return next
}
