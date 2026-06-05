import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, SectionLabel, Chip, ChipRow, Button, Input } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { updateSession } from '../lib/flywheel'

const NEXT_TAGS = ['#하체강화', '#골반교정', '#스프링업', '#코어유지', '#후면체인']

function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[st.toggle, { backgroundColor: on ? colors.primary : colors.line }]}>
      <View style={[st.knob, { left: on ? 23 : 3 }]} />
    </Pressable>
  )
}

export function ClassCompleteScreen() {
  const nav = useNav()
  const member = nav.ctx.member
  const count = nav.ctx.classSeq ? nav.ctx.classSeq.blocks.reduce((n, b) => n + b.exercises.length, 0) : 0
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [reqFb, setReqFb] = useState(true)
  const tog = (v: string) => setTags((t) => (t.includes(v) ? t.filter((x) => x !== v) : [...t, v]))

  return (
    <AppShell
      title="수업 완료"
      footer={
        <Button
          title="수업 종료"
          onPress={async () => {
            const sid = nav.ctx.savedSessionId
            if (sid && (note.trim() || tags.length)) {
              await updateSession(kv, sid, { note: note.trim() || undefined, nextTags: tags.length ? tags : undefined })
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
      <Input value={note} onChangeText={setNote} placeholder="오늘 어깨 가동범위 좋아짐, 다음엔 후면체인 강화…" multiline style={{ minHeight: 92, textAlignVertical: 'top' }} />

      <SectionLabel>다음 수업 태그</SectionLabel>
      <ChipRow>
        {NEXT_TAGS.map((t) => (
          <Chip key={t} label={t} on={tags.includes(t)} onPress={() => tog(t)} />
        ))}
      </ChipRow>

      <Card style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={st.fbTitle}>회원에게 피드백 요청</Text>
          <Text style={st.fbSub}>수업 1시간 후 알림 발송</Text>
        </View>
        <Toggle on={reqFb} onPress={() => setReqFb(!reqFb)} />
      </Card>
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
