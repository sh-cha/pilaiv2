// 인증 — Supabase 설정 시 실제 세션, 아니면 로컬 데모(no-op).
// 실 로그인 = 카카오/구글/애플 OAuth(signInWithProvider). 익명(signIn)은 임시/게스트용으로 남겨둠.
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from './supabase'

let currentUserId: string | null = null
export const getUserId = (): string | null => currentUserId

// 앱 시작 시 1회 호출 — 기존 세션 복원 + 변경 구독. onChange로 라우터가 초기 화면을 정할 수 있다.
export function initAuth(onChange?: (userId: string | null) => void): void {
  if (!supabase) {
    onChange?.(null)
    return
  }
  supabase.auth.getSession().then(({ data }) => {
    currentUserId = data.session?.user.id ?? null
    onChange?.(currentUserId)
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUserId = session?.user.id ?? null
    onChange?.(currentUserId)
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
  currentUserId = after.session?.user.id ?? null
}

export async function signOut(): Promise<void> {
  currentUserId = null
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
  currentUserId = after.session?.user.id ?? null
}
