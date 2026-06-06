import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Avatar, WarnTag, ChipRow, Input } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { loadMembers, type Member } from '../lib/members'
import { loadSessions, sessionsForMember, type CapturedSession } from '../lib/flywheel'
import { splitTags } from '../lib/catalog'
import { EmptyMembers } from './EmptyScreen'

export function MembersScreen() {
  const nav = useNav()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [sessions, setSessions] = useState<CapturedSession[]>([])
  const [query, setQuery] = useState('')

  const refresh = useCallback(() => {
    loadMembers(kv).then(setMembers)
    loadSessions(kv).then(setSessions)
  }, [])
  // 스택 깊이가 1(이 탭으로 복귀)일 때마다 갱신 — 새 회원 추가 후 반영
  useEffect(() => {
    refresh()
  }, [refresh, nav.depth])

  const open = (m: Member) => {
    nav.setCtx({ memberId: m.id, member: m })
    nav.go('memberDetail', { id: m.id })
  }

  if (members && members.length === 0) return <EmptyMembers />

  // 이름·통증·목표로 검색 (대소문자 무시)
  const q = query.trim().toLowerCase()
  const filtered = (members ?? []).filter(
    (m) => !q || m.name.toLowerCase().includes(q) || (m.conditions ?? '').toLowerCase().includes(q) || (m.goals ?? '').toLowerCase().includes(q),
  )

  return (
    <AppShell tab="members" gear headerBorder>
      <Text style={st.h1}>회원</Text>
      <Input value={query} onChangeText={setQuery} placeholder="회원 검색…" autoCorrect={false} style={{ marginBottom: 16 }} />
      {members && filtered.length === 0 ? <Text style={st.noResult}>'{query}'에 맞는 회원이 없어요</Text> : null}
      {filtered.map((m) => {
        const ms = sessionsForMember(sessions, m.id)
        const warns = splitTags(m.conditions)
        return (
          <Card key={m.id} style={{ marginBottom: 12 }}>
            <Pressable onPress={() => open(m)}>
              <View style={st.top}>
                <Avatar name={m.name} />
                <View style={{ flex: 1 }}>
                  <Text style={st.name}>{m.name}</Text>
                  <Text style={st.meta}>
                    <Text style={st.mono}>{ms.length}</Text>회
                    {ms[0] ? <> · 마지막 <Text style={st.mono}>{ms[0].createdAt.slice(5, 10)}</Text></> : ' · 첫 수업 전'}
                  </Text>
                </View>
                <Icon name="chev" size={13} color={colors.faint} />
              </View>
              {warns.length > 0 && (
                <ChipRow style={{ marginTop: 10 }}>
                  {warns.map((w) => (
                    <WarnTag key={w}>{w}</WarnTag>
                  ))}
                </ChipRow>
              )}
            </Pressable>
          </Card>
        )
      })}
      <Pressable style={st.add} onPress={() => nav.go('memberNew')}>
        <Text style={st.addText}>+ 새 회원</Text>
      </Pressable>
    </AppShell>
  )
}

const st = StyleSheet.create({
  h1: { fontFamily: font.extrabold, fontSize: 27, color: colors.ink, letterSpacing: -0.7, marginBottom: 16, marginTop: 2 },
  noResult: { fontFamily: font.regular, fontSize: 14, color: colors.muted, paddingVertical: 24, textAlign: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: font.extrabold, fontSize: 18, color: colors.ink },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  mono: { fontFamily: font.monoMedium, color: colors.ink },
  add: { borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 2 },
  addText: { fontFamily: font.bold, fontSize: 14.5, color: colors.primary },
})
