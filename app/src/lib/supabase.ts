// Supabase 클라이언트 — 환경변수(EXPO_PUBLIC_SUPABASE_*)가 있으면 생성, 없으면 null(로컬 모드).
// storage.ts 의도: "Supabase로 가도 도메인 로직 그대로, 이 구현(kv)만 교체." → kv.ts가 이 클라이언트로 분기.
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

declare const process: { env: Record<string, string | undefined> }
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

// 미설정이면 null — 앱은 그대로 로컬(AsyncStorage)로 동작한다.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage, // RN 세션 영속 (getItem/setItem/removeItem 계약 충족)
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce', // 모바일 OAuth 딥링크 — code → exchangeCodeForSession
      },
    })
  : null
