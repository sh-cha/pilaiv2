import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui'
import { useNav } from '../nav/router'

function EmptyInner() {
  const nav = useNav()
  return (
    <View style={st.wrap}>
      <View style={st.ill}>
        <Text style={st.illText}>회원 0</Text>
      </View>
      <Text style={st.title}>아직 등록된 회원이 없어요</Text>
      <Text style={st.body}>회원을 추가하면 통증·목표를 바탕으로{'\n'}맞춤 시퀀스를 만들 수 있어요.</Text>
      <Button title="회원 추가하기" onPress={() => nav.go('memberNew')} style={{ paddingHorizontal: 26, marginTop: 8 }} />
    </View>
  )
}

export function EmptyMembers() {
  return (
    <AppShell tab="members" gear headerBorder scroll={false}>
      <EmptyInner />
    </AppShell>
  )
}

export function EmptyScreen() {
  return (
    <AppShell title="빈 상태 미리보기" scroll={false}>
      <EmptyInner />
    </AppShell>
  )
}

const st = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 60, gap: 14 },
  ill: { width: 120, height: 120, borderRadius: 24, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  illText: { fontFamily: font.mono, fontSize: 12, color: colors.faint },
  title: { fontFamily: font.extrabold, fontSize: 18, color: colors.ink },
  body: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 22 },
})
