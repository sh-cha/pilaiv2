import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Avatar, WarnTag, ChipRow, Chip, Label, Divider, SectionLabel, Insight, Button, Stars } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { loadMembers, type Member } from '../lib/members'
import { loadSessions, sessionsForMember, type CapturedSession } from '../lib/flywheel'
import { splitTags } from '../lib/catalog'
import { memberBalance, buildInsight } from '../lib/balance'

export function MemberDetailScreen() {
  const nav = useNav()
  const id: string | undefined = nav.route.params?.id ?? nav.ctx.memberId
  const [member, setMember] = useState<Member | null>(nav.ctx.member ?? null)
  const [sessions, setSessions] = useState<CapturedSession[]>([])

  useEffect(() => {
    if (!member && id) loadMembers(kv).then((ms) => setMember(ms.find((x) => x.id === id) ?? null))
    if (id) loadSessions(kv).then((all) => setSessions(sessionsForMember(all, id)))
  }, [id])

  if (!member) return <AppShell title="회원" children={<View />} />

  const warns = splitTags(member.conditions)
  const goals = splitTags(member.goals)
  const sub = [member.sex, member.age && `${member.age}세`].filter(Boolean).join(' · ')
  const balance = memberBalance(sessions)
  const insight = buildInsight(member.name, balance, warns)

  return (
    <AppShell
      title={member.name}
      footer={
        <Button
          title={`${member.name}님 시퀀스 생성`}
          icon={<Icon name="spark" size={18} color="#fff" />}
          onPress={() => {
            nav.setCtx({ memberId: member.id, member })
            nav.go('generate')
          }}
        />
      }
    >
      <Card style={{ marginTop: 10 }}>
        <View style={st.top}>
          <Avatar name={member.name} large />
          <View style={{ flex: 1 }}>
            <Text style={st.name}>{member.name}</Text>
            {sub ? <Text style={st.sub}>{sub}</Text> : null}
          </View>
        </View>
        {warns.length > 0 && (
          <ChipRow style={{ marginTop: 12 }}>
            {warns.map((w) => (
              <WarnTag key={w}>⚠ {w}</WarnTag>
            ))}
          </ChipRow>
        )}
        {goals.length > 0 && (
          <>
            <Divider />
            <Label>목표</Label>
            <ChipRow>
              {goals.map((g) => (
                <Chip key={g} label={g} variant="tint" />
              ))}
            </ChipRow>
          </>
        )}
      </Card>

      <SectionLabel>AI 인사이트</SectionLabel>
      <Insight icon={<Icon name="spark" size={16} color={colors.primary} />}>{insight}</Insight>

      {balance ? (
        <Card style={{ marginTop: 14 }}>
          <Label>최근 근육군 비중 (최근 5회)</Label>
          {balance.map(({ region, pct }) => (
            <View key={region} style={st.balRow}>
              <Text style={st.balLabel}>{region}</Text>
              <View style={st.track}>
                <View style={[st.fill, { width: `${pct}%` }]} />
              </View>
              <Text style={st.balVal}>{pct}%</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <SectionLabel>수업 히스토리</SectionLabel>
      {sessions.length === 0 ? (
        <Text style={st.emptyHist}>아직 저장된 수업이 없어요. 첫 시퀀스를 만들어 보세요.</Text>
      ) : (
        <Card>
          {sessions.map((s, i) => {
            const focus = splitTags(s.input.goals)
            return (
              <Pressable key={s.id} style={[st.hrow, i > 0 && st.hrowBorder]} onPress={() => nav.go('sessionDetail', { id: s.id, name: member.name })}>
                <View style={st.hdate}>
                  <Text style={st.hd}>{s.createdAt.slice(8, 10)}</Text>
                  <Text style={st.hm}>{Number(s.createdAt.slice(5, 7))}월</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <ChipRow style={{ gap: 6 }}>
                    {focus.slice(0, 3).map((f) => (
                      <Chip key={f} label={f} variant="tint" style={st.miniChip} textStyle={{ fontSize: 12 }} />
                    ))}
                  </ChipRow>
                  <Text style={st.hmeta}>{s.input.minutes}분 · {s.edited ? `편집 ${s.diff.length}` : '편집 없음'}</Text>
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
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: font.extrabold, fontSize: 20, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  balLabel: { width: 46, fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  track: { flex: 1, height: 9, borderRadius: 5, backgroundColor: colors.surface2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  balVal: { width: 36, textAlign: 'right', fontFamily: font.monoSemibold, fontSize: 13, color: colors.ink },
  emptyHist: { fontFamily: font.regular, fontSize: 14, color: colors.muted, paddingHorizontal: 2, lineHeight: 21 },
  hrow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  hrowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  hdate: { width: 46, alignItems: 'center' },
  hd: { fontFamily: font.monoSemibold, fontSize: 20, color: colors.ink },
  hm: { fontFamily: font.regular, fontSize: 11, color: colors.faint, marginTop: 1 },
  miniChip: { paddingVertical: 3, paddingHorizontal: 9 },
  hmeta: { fontFamily: font.regular, fontSize: 13, color: colors.faint, marginTop: 5 },
})
