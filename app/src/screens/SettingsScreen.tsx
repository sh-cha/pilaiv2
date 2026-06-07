import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Avatar, SectionLabel } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { getProfile, signOut } from '../lib/auth'
import { loadSettings, saveSettings } from '../lib/settings'
import { APP_VERSION } from '../data/constants'

export function SettingsScreen() {
  const nav = useNav()
  // 실 로그인 프로필 (OAuth). 로컬 데모(Supabase 미설정)면 호칭 폴백.
  const profile = getProfile()
  const name = profile?.name ?? '강사님'
  const login = profile?.loginLabel ?? '로컬 데모 모드'

  const [notif, setNotif] = useState(true)
  useEffect(() => {
    loadSettings(kv).then((s) => setNotif(s.notifications))
  }, [])
  const toggleNotif = (v: boolean) => {
    setNotif(v) // 낙관적 갱신 — 저장 실패해도 다음 로드에서 복원
    saveSettings(kv, { notifications: v }).catch(() => {})
  }

  return (
    <AppShell title="설정">
      <Card style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={name} large />
        <View style={{ flex: 1 }}>
          <Text style={st.name}>{name}</Text>
          <Text style={st.login}>{login}</Text>
        </View>
      </Card>

      <SectionLabel>앱</SectionLabel>
      <Card style={{ padding: 0 }}>
        <View style={st.row}>
          <Text style={st.k}>알림</Text>
          <Switch
            value={notif}
            onValueChange={toggleNotif}
            trackColor={{ true: colors.primary, false: colors.line }}
            thumbColor="#fff"
          />
        </View>
        <Pressable style={[st.row, st.rowBorder]} onPress={() => nav.go('report', { from: 'settings' })}>
          <Text style={st.k}>버그 신고 · 의견 보내기</Text>
          <Icon name="chev" size={13} color={colors.faint} />
        </Pressable>
        <Pressable style={[st.row, st.rowBorder]} onPress={() => nav.go('empty')}>
          <Text style={st.k}>화면 미리보기 · 빈 상태</Text>
          <Icon name="chev" size={13} color={colors.faint} />
        </Pressable>
        <Pressable style={[st.row, st.rowBorder]} onPress={async () => { await signOut(); nav.reset('login') }}>
          <Text style={[st.k, { color: colors.accent }]}>로그아웃</Text>
        </Pressable>
      </Card>

      <Text style={st.version}>Pilai · {APP_VERSION}</Text>
    </AppShell>
  )
}

const st = StyleSheet.create({
  name: { fontFamily: font.extrabold, fontSize: 19, color: colors.ink },
  login: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  k: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  version: { fontFamily: font.regular, fontSize: 13, color: colors.faint, textAlign: 'center', marginTop: 20 },
})
