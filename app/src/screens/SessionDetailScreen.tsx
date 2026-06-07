import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, SectionLabel, Divider, Button } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { loadSessions, deleteSession, sessionStatus, type CapturedSession } from '../lib/flywheel'
import { loadMembers, type Member } from '../lib/members'
import { ExerciseSheet } from '../components/ExerciseSheet'

export function SessionDetailScreen() {
  const nav = useNav()
  const id: string | undefined = nav.route.params?.id
  const name: string | undefined = nav.route.params?.name
  const [session, setSession] = useState<CapturedSession | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [sheet, setSheet] = useState<{ name: string; reps?: string } | null>(null)

  useEffect(() => {
    loadSessions(kv).then((all) => {
      const s = all.find((x) => x.id === id) ?? null
      setSession(s)
      if (s?.memberId) loadMembers(kv).then((ms) => setMember(ms.find((m) => m.id === s.memberId) ?? null))
    })
  }, [id])

  const date = session?.createdAt ? `${Number(session.createdAt.slice(5, 7))}/${session.createdAt.slice(8, 10)}` : ''
  const count = session ? session.final.blocks.reduce((n, b) => n + b.exercises.length, 0) : 0
  const done = !!session && sessionStatus(session) === 'done'

  // 시퀀스(수업 기록) 삭제 — 되돌릴 수 없어 확인 후 진행
  const confirmDelete = () => {
    if (!session) return
    Alert.alert('시퀀스 삭제', '이 시퀀스와 수업 기록이 삭제돼요. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(kv, session.id)
          nav.toast('시퀀스를 삭제했어요')
          nav.back()
        },
      },
    ])
  }

  return (
    <AppShell
      title={`${name ?? '수업'}${date ? ` · ${date}` : ''}`}
      headerRight={
        session ? (
          <Pressable hitSlop={10} onPress={confirmDelete}>
            <Icon name="trash" size={19} color={colors.accent} />
          </Pressable>
        ) : undefined
      }
      footer={
        session && !done ? ( // 완료된 수업은 열람 전용 — 진행/완료 버튼 숨김
          <>
            <Button
              title="실시간으로 진행하기"
              icon={<Icon name="spark" size={18} color="#fff" />}
              onPress={() => { nav.setCtx({ classSeq: session.final, savedSessionId: session.id, member: member ?? undefined }); nav.go('classPlay') }}
            />
            <Pressable onPress={() => { nav.setCtx({ classSeq: session.final, savedSessionId: session.id, member: member ?? undefined }); nav.go('classComplete') }} style={st.doneOnly}>
              <Text style={st.doneOnlyText}>실시간 없이 완료 처리</Text>
            </Pressable>
          </>
        ) : undefined
      }
    >
      {!session ? null : (
        <>
          <Card style={{ marginTop: 10 }}>
            <Text style={st.cardTitle}>{done ? '완료된 수업' : '수업 전 · 시퀀스 준비됨'}</Text>
            <Text style={st.cardMeta}>{session.input.apparatus.join(', ')} · {session.input.minutes}분 · {count}개 동작</Text>
            {!session.finalValidation.ok ? (
              <View style={st.warnRow}>
                <View style={st.warnDot} />
                <Text style={st.warn}>룰 위반 항목이 있어요: {session.finalValidation.errors.join(', ')}</Text>
              </View>
            ) : null}
          </Card>

          {session.note ? (
            <>
              <SectionLabel>강사 노트</SectionLabel>
              <Card><Text style={st.noteText}>{session.note}</Text></Card>
            </>
          ) : null}
          <SectionLabel>{done ? '수행한 시퀀스' : '준비된 시퀀스'}</SectionLabel>
          {session.final.blocks.map((b, bi) => (
            <Card key={bi} style={{ marginBottom: 12 }}>
              <View style={st.phaseHead}>
                <Text style={st.phaseTitle}>{b.block}</Text>
                <Text style={st.appTag}>{b.apparatus.toUpperCase()}</Text>
              </View>
              <Divider style={{ marginTop: 4, marginBottom: 8 }} />
              {b.exercises.map((it, ei) => (
                <Pressable key={ei} style={st.exRow} onPress={() => setSheet({ name: it.name, reps: it.reps })}>
                  <Text style={st.exName} numberOfLines={1}>{it.name}</Text>
                  {it.reps ? <Text style={st.exReps}>{it.reps}</Text> : null}
                </Pressable>
              ))}
            </Card>
          ))}
        </>
      )}
      {sheet ? <ExerciseSheet name={sheet.name} reps={sheet.reps} onClose={() => setSheet(null)} /> : null}
    </AppShell>
  )
}

const st = StyleSheet.create({
  cardTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink },
  cardMeta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 8 },
  warnDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warnInk, marginTop: 4 },
  warn: { flex: 1, fontFamily: font.semibold, fontSize: 12.5, color: colors.warnInk },
  noteText: { fontFamily: font.regular, fontSize: 15, lineHeight: 24, color: colors.ink },
  diff: { fontFamily: font.semibold, fontSize: 14, marginTop: 3 },
  phaseHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  phaseTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink },
  appTag: { fontFamily: font.bold, fontSize: 11.5, color: colors.primary, letterSpacing: 0.8 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, gap: 8 },
  exName: { flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  exReps: { fontFamily: font.mono, fontSize: 13, color: colors.faint, flexShrink: 0 },
  doneOnly: { alignItems: 'center', paddingVertical: 4 },
  doneOnlyText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
})
