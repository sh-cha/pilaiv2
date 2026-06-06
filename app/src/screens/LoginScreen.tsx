import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, font } from '../theme/tokens'
import { useNav } from '../nav/router'
import { signInWithProvider } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'

type Provider = 'kakao' | 'google' | 'apple'

// 실 OAuth(카카오/구글/애플) — Supabase 설정 시 제공자 로그인, 미설정이면 로컬 데모로 진입.
// 제공자 활성화(대시보드+콘솔) 절차는 docs/SUPABASE.md "OAuth 연결".
export function LoginScreen() {
  const nav = useNav()
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState<Provider | null>(null)

  const login = async (provider: Provider) => {
    if (!isSupabaseConfigured) {
      nav.reset('home') // 로컬 데모 모드(키 없음)
      return
    }
    if (busy) return
    setBusy(provider)
    try {
      await signInWithProvider(provider)
      nav.reset('home')
    } catch (e) {
      nav.toast(e instanceof Error ? e.message : '로그인에 실패했어요')
    } finally {
      setBusy(null)
    }
  }

  const label = (p: Provider, base: string) => (busy === p ? '로그인 중…' : base)

  return (
    <View style={[st.login, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={st.top}>
        <Text style={st.logo}>Pil<Text style={{ opacity: 0.6 }}>ai</Text></Text>
        <Text style={st.sub}>강사 로그인</Text>
      </View>
      <View style={st.btns}>
        <Pressable style={[st.sbtn, st.kakao, !!busy && { opacity: 0.6 }]} disabled={!!busy} onPress={() => login('kakao')}>
          <Text style={[st.sbtnText, { color: '#191600' }]}>{label('kakao', '카카오로 시작하기')}</Text>
        </Pressable>
        <Pressable style={[st.sbtn, st.google, !!busy && { opacity: 0.6 }]} disabled={!!busy} onPress={() => login('google')}>
          <Text style={[st.sbtnText, { color: '#1f1f1f' }]}>{label('google', 'Google로 계속하기')}</Text>
        </Pressable>
        <Pressable style={[st.sbtn, st.apple, !!busy && { opacity: 0.6 }]} disabled={!!busy} onPress={() => login('apple')}>
          <Text style={[st.sbtnText, { color: '#fff' }]}>{label('apple', 'Apple로 계속하기')}</Text>
        </Pressable>
        <Text style={st.legal}>로그인 시 서비스 이용약관과{'\n'}개인정보 처리방침에 동의하게 됩니다.</Text>
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  login: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  logo: { fontFamily: font.extrabold, fontSize: 46, color: colors.primary, letterSpacing: -1.4 },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  btns: { gap: 10 },
  sbtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 14 },
  sbtnText: { fontFamily: font.bold, fontSize: 16 },
  kakao: { backgroundColor: '#FEE500' },
  google: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2DED3' },
  apple: { backgroundColor: '#111' },
  legal: { fontFamily: font.regular, textAlign: 'center', fontSize: 12, color: colors.faint, marginTop: 24, lineHeight: 18 },
})
