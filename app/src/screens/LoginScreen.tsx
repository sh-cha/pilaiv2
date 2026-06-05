import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, font } from '../theme/tokens'
import { useNav } from '../nav/router'

// 실제 OAuth 백엔드는 아직 없음 — 버튼 탭 시 홈으로 진입(데모). 추후 카카오/구글/애플 SDK 연결.
export function LoginScreen() {
  const nav = useNav()
  const insets = useSafeAreaInsets()
  const enter = () => nav.reset('home')
  return (
    <View style={[st.login, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={st.top}>
        <Text style={st.logo}>Pil<Text style={{ opacity: 0.6 }}>ai</Text></Text>
        <Text style={st.sub}>강사 로그인</Text>
      </View>
      <View style={st.btns}>
        <Pressable style={[st.sbtn, st.kakao]} onPress={enter}><Text style={[st.sbtnText, { color: '#191600' }]}>카카오로 시작하기</Text></Pressable>
        <Pressable style={[st.sbtn, st.google]} onPress={enter}><Text style={[st.sbtnText, { color: '#1f1f1f' }]}>Google로 계속하기</Text></Pressable>
        <Pressable style={[st.sbtn, st.apple]} onPress={enter}><Text style={[st.sbtnText, { color: '#fff' }]}>Apple로 계속하기</Text></Pressable>
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
