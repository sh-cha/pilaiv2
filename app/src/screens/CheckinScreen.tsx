import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Label, Chip, ChipRow, Button, Input } from '../components/ui'
import { useNav } from '../nav/router'
import { COND_CHIPS } from '../data/constants'

const COND: [string, string, string][] = [
  ['good', '🙂', '좋음'],
  ['normal', '😐', '보통'],
  ['bad', '😣', '안좋음'],
]

// 회원이 작성하는 컨디션 체크인 (강사 앱 안에 있는 건 어색 — 제안 목록에). 지금은 미리보기/데모.
export function CheckinScreen() {
  const nav = useNav()
  const [cond, setCond] = useState('good')
  const [iss, setIss] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const tog = (v: string) => setIss((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]))

  return (
    <AppShell title="컨디션 체크인" footer={<Button title="컨디션 보내기" onPress={() => { nav.toast('컨디션이 전달되었어요'); nav.back() }} />}>
      <Text style={st.note}>수업 전 컨디션 기록 · 회원이 보내거나 강사가 대신 입력</Text>

      <Label>전체 컨디션</Label>
      <View style={st.seg}>
        {COND.map(([k, e, l]) => (
          <Pressable key={k} onPress={() => setCond(k)} style={[st.opt, cond === k && st.optOn]}>
            <Text style={st.emo}>{e}</Text>
            <Text style={[st.optText, cond === k && { color: colors.tintInk }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <Label style={{ marginTop: 20 }}>특이사항</Label>
      <ChipRow style={{ marginBottom: 20 }}>
        {COND_CHIPS.map((c) => (
          <Chip key={c} label={c} on={iss.includes(c)} onPress={() => tog(c)} />
        ))}
      </ChipRow>

      <Label style={{ marginTop: 20 }}>메모</Label>
      <Input value={memo} onChangeText={setMemo} placeholder="오늘 목이 좀 뻣뻣해요…" multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
    </AppShell>
  )
}

const st = StyleSheet.create({
  note: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 12, marginBottom: 18 },
  seg: { flexDirection: 'row', gap: 10 },
  opt: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  optOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  emo: { fontSize: 26, marginBottom: 6 },
  optText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
})
