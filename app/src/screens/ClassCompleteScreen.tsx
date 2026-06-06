import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { SectionLabel, Button, Input } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { updateSession } from '../lib/flywheel'

export function ClassCompleteScreen() {
  const nav = useNav()
  const member = nav.ctx.member
  const count = nav.ctx.classSeq ? nav.ctx.classSeq.blocks.reduce((n, b) => n + b.exercises.length, 0) : 0
  const [note, setNote] = useState('')

  return (
    <AppShell
      title="수업 완료"
      footer={
        <Button
          title="수업 종료"
          onPress={async () => {
            const sid = nav.ctx.savedSessionId
            if (sid) {
              // 노트가 없어도 완료 시각은 기록 — 기록 탭의 수업 전/완료 구분 기준
              await updateSession(kv, sid, { completedAt: new Date().toISOString(), ...(note.trim() ? { note: note.trim() } : {}) })
            }
            nav.toast('수업을 마쳤어요')
            nav.tab('home')
          }}
        />
      }
    >
      <View style={st.hero}>
        <View style={st.check}><Icon name="check" size={30} color={colors.primary} /></View>
        <Text style={st.title}>{member?.name ?? ''}님 수업 완료</Text>
        <Text style={st.meta}>오늘 수업 · {count}개 동작</Text>
      </View>

      <SectionLabel>강사 노트</SectionLabel>
      <Input value={note} onChangeText={setNote} placeholder="오늘 어깨 가동범위 좋아짐, 다음엔 후면체인 강화…" maxLength={500} multiline style={{ minHeight: 92, textAlignVertical: 'top' }} />
    </AppShell>
  )
}

const st = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 24, paddingBottom: 10 },
  check: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: font.extrabold, fontSize: 22, color: colors.ink },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 4 },
  fbTitle: { fontFamily: font.bold, fontSize: 15.5, color: colors.ink },
  fbSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.faint, marginTop: 2 },
  toggle: { width: 50, height: 30, borderRadius: 15, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', position: 'absolute', top: 3 },
})
