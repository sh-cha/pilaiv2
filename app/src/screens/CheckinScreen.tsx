import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Label, Chip, ChipRow, Button, Input } from '../components/ui'
import { useNav } from '../nav/router'
import { COND_CHIPS } from '../data/constants'

// 컨디션 — 시스템 이모지 대신 컬러 도트로(브랜드 일관성). [key, dotColor, label]
const COND: [string, string, string][] = [
  ['good', '#5C7A60', '좋음'],
  ['normal', '#C08A3E', '보통'],
  ['bad', '#9A4F2E', '안좋음'],
]

// 회원이 작성하는 컨디션 체크인 (강사 앱 안에 있는 건 어색 — 제안 목록에). 지금은 미리보기/데모.
export function CheckinScreen() {
  const nav = useNav()
  const [cond, setCond] = useState('good')
  const [iss, setIss] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const tog = (v: string) => setIss((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]))

  // 보낸 컨디션 → 생성 화면 "오늘 컨디션"에 프리필되도록 ctx에 저장
  const send = () => {
    const ko = COND.find((c) => c[0] === cond)?.[2] ?? '좋음'
    nav.setCtx({ checkinCond: ko })
    nav.toast('컨디션이 생성 화면에 반영돼요')
    nav.back()
  }

  return (
    <AppShell title="컨디션 체크인" footer={<Button title="컨디션 보내기" onPress={send} />}>
      <Text style={st.note}>수업 전 컨디션 기록 · 회원이 보내거나 강사가 대신 입력</Text>

      <Label>전체 컨디션</Label>
      <View style={st.seg}>
        {COND.map(([k, c, l]) => (
          <Pressable key={k} onPress={() => setCond(k)} style={[st.opt, cond === k && st.optOn]}>
            <View style={[st.dot, { backgroundColor: c }]} />
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
      <Input value={memo} onChangeText={setMemo} placeholder="오늘 목이 좀 뻣뻣해요…" maxLength={300} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
    </AppShell>
  )
}

const st = StyleSheet.create({
  note: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 12, marginBottom: 18 },
  seg: { flexDirection: 'row', gap: 10 },
  opt: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  optOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  dot: { width: 16, height: 16, borderRadius: 8, marginBottom: 8 },
  optText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
})
