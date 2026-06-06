// 인증 — Supabase 설정 시 실제 세션, 아니면 로컬 데모(no-op).
// 현재 로그인 진입은 익명 세션(signInAnonymously)으로 RLS용 실제 uid를 확보한다.
// 카카오/구글/애플 OAuth 배선은 expo-web-browser + 딥링크 리다이렉트가 필요 — docs/SUPABASE.md 참고.
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

// OAuth(카카오/구글/애플) — 미배선. 활성화 절차는 docs/SUPABASE.md.
export async function signInWithProvider(provider: 'google' | 'apple' | 'kakao'): Promise<void> {
  throw new Error(`OAuth(${provider}) 미배선 — docs/SUPABASE.md의 'OAuth 연결' 절 참고`)
}
