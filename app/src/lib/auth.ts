// 인증 — Supabase 설정 시 실제 세션, 아니면 로컬 데모(no-op).
// 실 로그인 = 카카오/구글/애플 OAuth(signInWithProvider). 익명(signIn)은 임시/게스트용으로 남겨둠.
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

let currentUser: User | null = null
export const getUserId = (): string | null => currentUser?.id ?? null

// 표시용 프로필 — 이름은 OAuth user_metadata에서(제공자마다 키가 달라 후보 순회), 로그인 수단은 app_metadata.provider.
export type Profile = { name: string | null; loginLabel: string }

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오 로그인',
  google: 'Google 로그인',
  apple: 'Apple 로그인',
  email: '이메일 로그인',
  anonymous: '게스트',
}

export function getProfile(): Profile | null {
  if (!currentUser) return null
  const m = (currentUser.user_metadata ?? {}) as Record<string, unknown>
  const email = currentUser.email ?? (typeof m.email === 'string' ? m.email : undefined)
  const name =
    [m.full_name, m.name, m.user_name, m.preferred_username, email?.split('@')[0]].find(
      (v): v is string => typeof v === 'string' && v.trim() !== '',
    )?.trim() ?? null
  const provider = currentUser.app_metadata?.provider
  const loginLabel = (provider && PROVIDER_LABEL[provider]) ?? email ?? '로그인됨'
  return { name, loginLabel }
}

// 세션 복원 (1회, lazy) — 먼저 부르는 쪽이 시작한다.
// React effect는 자식(스플래시)이 부모(App의 initAuth)보다 먼저 돌므로 호출 순서에 기대지 않는다.
let restored: Promise<string | null> | null = null

function restoreSession(): Promise<string | null> {
  if (restored) return restored
  if (!supabase) {
    restored = Promise.resolve(null)
    return restored
  }
  restored = supabase.auth.getSession().then(({ data }) => {
    currentUser = data.session?.user ?? null
    return getUserId()
  })
  return restored
}

// 세션 복원 완료를 기다린다 — 스플래시가 로그인/홈 분기에 사용 (로그아웃 전까지 세션 유지).
export const waitForSession = (): Promise<string | null> => restoreSession()

// 앱 시작 시 1회 호출 — 기존 세션 복원 + 변경 구독. onChange로 라우터가 초기 화면을 정할 수 있다.
export function initAuth(onChange?: (userId: string | null) => void): void {
  restoreSession().then((uid) => onChange?.(uid))
  if (!supabase) return
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null
    restored = Promise.resolve(getUserId()) // 로그인/로그아웃 반영 — 이후 waitForSession이 stale 값을 주지 않게
    onChange?.(getUserId())
  })
}

// 로그인 — Supabase가 있으면 익명 세션 확보(없을 때만), 없으면 no-op(로컬 데모).
export async function signIn(): Promise<void> {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw error
  }
  const { data: after } = await supabase.auth.getSession()
  currentUser = after.session?.user ?? null
}

export async function signOut(): Promise<void> {
  currentUser = null
  if (supabase) await supabase.auth.signOut()
}

// OAuth(카카오/구글/애플) — Supabase signInWithOAuth + expo-web-browser(PKCE).
// 흐름: 제공자 로그인 브라우저 → pilai://auth-callback?code=... 복귀 → code 교환 → 세션.
// 제공자별 활성화(대시보드+콘솔) 절차는 docs/SUPABASE.md "OAuth 연결".
export async function signInWithProvider(provider: 'google' | 'apple' | 'kakao'): Promise<void> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요 (.env)')
  const redirectTo = Linking.createURL('auth-callback') // Expo Go: exp://…, 빌드: pilai://auth-callback
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data?.url) throw new Error('OAuth URL을 받지 못했어요')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type !== 'success') throw new Error('로그인이 취소됐어요')

  const { queryParams } = Linking.parse(result.url)
  const desc = queryParams?.error_description
  if (desc) throw new Error(String(desc))
  const code = queryParams?.code
  if (!code || typeof code !== 'string') throw new Error('인증 코드를 받지 못했어요')

  const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exErr) throw exErr
  const { data: after } = await supabase.auth.getSession()
  currentUser = after.session?.user ?? null
}
