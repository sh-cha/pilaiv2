import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, SectionLabel, Divider, Button, Chip, ChipRow } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { loadSessions, type CapturedSession } from '../lib/flywheel'

export function SessionDetailScreen() {
  const nav = useNav()
  const id: string | undefined = nav.route.params?.id
  const name: string | undefined = nav.route.params?.name
  const [session, setSession] = useState<CapturedSession | null>(null)

  useEffect(() => {
    loadSessions(kv).then((all) => setSession(all.find((s) => s.id === id) ?? null))
  }, [id])

  const date = session?.createdAt ? `${Number(session.createdAt.slice(5, 7))}/${session.createdAt.slice(8, 10)}` : ''
  const count = session ? session.final.blocks.reduce((n, b) => n + b.exercises.length, 0) : 0

  return (
    <AppShell
      title={`${name ?? '수업'}${date ? ` · ${date}` : ''}`}
      footer={session ? <Button title="이 시퀀스로 수업 시작" icon={<Icon name="spark" size={18} color="#fff" />} onPress={() => { nav.setCtx({ classSeq: session.final }); nav.go('classPlay') }} /> : undefined}
    >
      {!session ? null : (
        <>
          <Card style={{ marginTop: 10 }}>
            <Text style={st.cardTitle}>완료된 수업</Text>
            <Text style={st.cardMeta}>{session.input.apparatus.join(', ')} · {session.input.minutes}분 · {count}개 동작</Text>
            {!session.finalValidation.ok ? <Text style={st.warn}>⚠ 룰 위반 항목이 있어요: {session.finalValidation.errors.join(', ')}</Text> : null}
          </Card>

          {session.note ? (
            <>
              <SectionLabel>강사 노트</SectionLabel>
              <Card><Text style={st.noteText}>{session.note}</Text></Card>
            </>
          ) : null}
          {session.nextTags && session.nextTags.length > 0 ? (
            <>
              <SectionLabel>다음 수업 태그</SectionLabel>
              <ChipRow>{session.nextTags.map((t) => <Chip key={t} label={t} variant="tint" />)}</ChipRow>
            </>
          ) : null}

          {session.diff.length > 0 && (
            <>
              <SectionLabel>편집 diff (학습 신호)</SectionLabel>
              <Card>
                {session.diff.map((d, i) => (
                  <Text key={i} style={[st.diff, { color: d.type === 'remove' ? colors.warnInk : colors.primary }]}>
                    {d.type === 'remove' ? '−' : '+'} [{d.block}] {d.name}
                  </Text>
                ))}
              </Card>
            </>
          )}

          <SectionLabel>수행한 시퀀스</SectionLabel>
          {session.final.blocks.map((b, bi) => (
            <Card key={bi} style={{ marginBottom: 12 }}>
              <View style={st.phaseHead}>
                <Text style={st.phaseTitle}>{b.block}</Text>
                <Text style={st.appTag}>{b.apparatus.toUpperCase()}</Text>
              </View>
              <Divider style={{ marginTop: 4, marginBottom: 8 }} />
              {b.exercises.map((it, ei) => (
                <View key={ei} style={st.exRow}>
                  <Text style={st.exName}>{it.name}</Text>
                  {it.reps ? <Text style={st.exReps}>{it.reps}</Text> : null}
                </View>
              ))}
            </Card>
          ))}
        </>
      )}
    </AppShell>
  )
}

const st = StyleSheet.create({
  cardTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink },
  cardMeta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  warn: { fontFamily: font.semibold, fontSize: 12.5, color: colors.warnInk, marginTop: 8 },
  noteText: { fontFamily: font.regular, fontSize: 15, lineHeight: 24, color: colors.ink },
  diff: { fontFamily: font.semibold, fontSize: 14, marginTop: 3 },
  phaseHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  phaseTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink },
  appTag: { fontFamily: font.bold, fontSize: 11.5, color: colors.primary, letterSpacing: 0.8 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, gap: 8 },
  exName: { flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  exReps: { fontFamily: font.mono, fontSize: 13, color: colors.faint },
})
