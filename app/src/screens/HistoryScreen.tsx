import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Chip, ChipRow } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { loadMembers } from '../lib/members'
import { loadSessions, type CapturedSession } from '../lib/flywheel'
import { splitTags } from '../lib/catalog'

export function HistoryScreen() {
  const nav = useNav()
  const [sessions, setSessions] = useState<CapturedSession[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSessions(kv).then(setSessions)
    loadMembers(kv).then((ms) => setNames(Object.fromEntries(ms.map((m) => [m.id, m.name]))))
  }, [nav.depth])

  return (
    <AppShell tab="history" gear headerBorder>
      <Text style={st.h1}>기록</Text>
      {sessions === null ? null : sessions.length === 0 ? (
        <Text style={st.empty}>아직 저장된 수업이 없어요.{'\n'}시퀀스를 생성·편집한 뒤 "최종본 저장"을 누르면 여기에 쌓여요.</Text>
      ) : (
        <Card>
          {sessions.map((s, idx) => {
            const name = s.memberId ? names[s.memberId] : undefined
            const focus = splitTags(s.input.goals)
            return (
              <Pressable key={s.id} style={[st.row, idx > 0 && st.rowBorder]} onPress={() => nav.go('sessionDetail', { id: s.id, name })}>
                <View style={st.date}>
                  <Text style={st.d}>{s.createdAt.slice(8, 10)}</Text>
                  <Text style={st.m}>{Number(s.createdAt.slice(5, 7))}월</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={st.titleRow}>
                    <Text style={st.name}>{name ?? '비회원'}</Text>
                    <Text style={st.min}>{s.input.minutes}분</Text>
                  </View>
                  <ChipRow style={{ marginTop: 6, gap: 6, alignItems: 'center' }}>
                    {focus.slice(0, 3).map((f) => (
                      <Chip key={f} label={f} variant="tint" style={st.mini} textStyle={{ fontSize: 12 }} />
                    ))}
                  </ChipRow>
                </View>
                <Icon name="chev" size={13} color={colors.faint} />
              </Pressable>
            )
          })}
        </Card>
      )}
    </AppShell>
  )
}

const st = StyleSheet.create({
  h1: { fontFamily: font.extrabold, fontSize: 27, color: colors.ink, letterSpacing: -0.7, marginBottom: 16, marginTop: 2 },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.muted, lineHeight: 22, paddingHorizontal: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  date: { width: 46, alignItems: 'center' },
  d: { fontFamily: font.monoSemibold, fontSize: 20, color: colors.ink },
  m: { fontFamily: font.regular, fontSize: 11, color: colors.faint, marginTop: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  min: { fontFamily: font.regular, fontSize: 13, color: colors.faint },
  mini: { paddingVertical: 3, paddingHorizontal: 9 },
})
