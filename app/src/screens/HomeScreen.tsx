import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, SectionLabel, Button, Chip } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { loadMembers, type Member } from '../lib/members'
import { loadSessions, type CapturedSession } from '../lib/flywheel'
import { splitTags } from '../lib/catalog'
import { INSTRUCTOR } from '../data/demo'

export function HomeScreen() {
  const nav = useNav()
  const [members, setMembers] = useState<Member[]>([])
  const [sessions, setSessions] = useState<CapturedSession[]>([])
  const names: Record<string, string> = Object.fromEntries(members.map((m) => [m.id, m.name]))

  // 탭 복귀(수업 저장 후 등)마다 갱신
  useEffect(() => {
    loadMembers(kv).then(setMembers)
    loadSessions(kv).then(setSessions)
  }, [nav.depth])

  const recent = sessions.slice(0, 4)

  return (
    <AppShell tab="home" gear headerBorder>
      <View style={{ paddingTop: 14, paddingBottom: 4 }}>
        <Text style={st.greet}>
          안녕하세요, <Text style={{ color: colors.primary }}>{INSTRUCTOR.name}</Text> 강사님
        </Text>
        <Text style={st.summary}>
          회원 <Text style={st.num}>{members.length}</Text>명 · 저장된 수업 <Text style={st.num}>{sessions.length}</Text>회
        </Text>
      </View>

      <SectionLabel>최근 수업</SectionLabel>
      {recent.length === 0 ? (
        <Card>
          <Text style={st.empty}>아직 저장된 수업이 없어요.{'\n'}회원을 골라 첫 시퀀스를 만들어 보세요.</Text>
        </Card>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {recent.map((s, i) => {
            const nm = s.memberId ? names[s.memberId] : undefined
            const focus = splitTags(s.input.goals)
            return (
              <Pressable key={s.id} style={[st.row, i > 0 && st.rowBorder]} onPress={() => nav.go('sessionDetail', { id: s.id, name: nm })}>
                <View style={st.dateBox}>
                  <Text style={st.d}>{s.createdAt.slice(8, 10)}</Text>
                  <Text style={st.m}>{Number(s.createdAt.slice(5, 7))}월</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.rowName}>{nm ?? '비회원'}</Text>
                  <View style={st.rowMetaWrap}>
                    {focus.slice(0, 2).map((f) => (
                      <Chip key={f} label={f} variant="tint" style={st.mini} textStyle={{ fontSize: 12 }} />
                    ))}
                    <Text style={st.rowMeta}>{s.input.minutes}분{s.edited ? ` · 편집 ${s.diff.length}` : ''}</Text>
                  </View>
                </View>
                <Icon name="chev" size={13} color={colors.faint} />
              </Pressable>
            )
          })}
        </Card>
      )}

      <Button
        title="회원 선택해 시퀀스 만들기"
        icon={<Icon name="spark" size={18} color="#fff" />}
        onPress={() => nav.tab('members')}
        style={{ marginTop: 22, marginBottom: 6 }}
      />
    </AppShell>
  )
}

const st = StyleSheet.create({
  greet: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  summary: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, marginTop: 3 },
  num: { fontFamily: font.monoSemibold, color: colors.ink },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.muted, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  dateBox: { width: 44, alignItems: 'center' },
  d: { fontFamily: font.monoSemibold, fontSize: 19, color: colors.ink },
  m: { fontFamily: font.regular, fontSize: 11, color: colors.faint, marginTop: 1 },
  rowName: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  rowMetaWrap: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' },
  mini: { paddingVertical: 3, paddingHorizontal: 9 },
  rowMeta: { fontFamily: font.regular, fontSize: 13, color: colors.faint },
})
