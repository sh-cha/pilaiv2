// 공유 KV 인스턴스 — 모든 화면이 이걸 import. storage.ts 계약(getItem/setItem) 구현.
// Supabase 설정 + 로그인 세션이 있으면 클라우드(kv_store, RLS로 사용자 격리), 아니면 로컬 AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { KV } from './storage'
import { supabase } from './supabase'
import { getUserId } from './auth'

async function cloudGet(key: string): Promise<string | null> {
  const { data, error } = await supabase!.from('kv_store').select('value').eq('key', key).maybeSingle()
  if (error) throw error
  return (data?.value as string | null | undefined) ?? null
}

async function cloudSet(key: string, value: string): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('no session')
  const { error } = await supabase!
    .from('kv_store')
    .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' })
  if (error) throw error
}

const useCloud = (): boolean => !!supabase && !!getUserId()

export const kv: KV = {
  getItem: (k) => (useCloud() ? cloudGet(k) : AsyncStorage.getItem(k)),
  setItem: (k, v) => (useCloud() ? cloudSet(k, v) : AsyncStorage.setItem(k, v)),
}
