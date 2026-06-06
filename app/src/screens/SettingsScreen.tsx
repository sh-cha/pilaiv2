import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Avatar, SectionLabel } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { INSTRUCTOR } from '../data/demo'
import { signOut } from '../lib/auth'

export function SettingsScreen() {
  const nav = useNav()
  return (
    <AppShell title="설정">
      <Card style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={INSTRUCTOR.name} large />
        <View style={{ flex: 1 }}>
          <Text style={st.name}>{INSTRUCTOR.name}</Text>
          <Text style={st.login}>{INSTRUCTOR.login}</Text>
        </View>
      </Card>

      <SectionLabel>앱</SectionLabel>
      <Card style={{ padding: 0 }}>
        <View style={st.row}>
          <Text style={st.k}>알림</Text>
          <Text style={st.v}>켜짐</Text>
          <Icon name="chev" size={13} color={colors.faint} />
        </View>
        <Pressable style={[st.row, st.rowBorder]} onPress={() => nav.go('empty')}>
          <Text style={st.k}>화면 미리보기 · 빈 상태</Text>
          <Icon name="chev" size={13} color={colors.faint} />
        </Pressable>
        <Pressable style={[st.row, st.rowBorder]} onPress={async () => { await signOut(); nav.reset('login') }}>
          <Text style={[st.k, { color: colors.accent }]}>로그아웃</Text>
        </Pressable>
      </Card>

      <Text style={st.version}>Pilai · v0.1 베타</Text>
    </AppShell>
  )
}

const st = StyleSheet.create({
  name: { fontFamily: font.extrabold, fontSize: 19, color: colors.ink },
  login: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  k: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  v: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  version: { fontFamily: font.regular, fontSize: 13, color: colors.faint, textAlign: 'center', marginTop: 20 },
})
