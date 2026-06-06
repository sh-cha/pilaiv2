import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Label, Input, Chip, ChipRow, Button, StepBar } from '../components/ui'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { upsertMember } from '../lib/members'
import { PAIN_CHIPS, GOAL_CHIPS, EXP_CHIPS } from '../data/constants'

const STEPS = ['기본 정보', '통증 · 제약', '목표 · 운동 배경']

export function MemberNewScreen() {
  const nav = useNav()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [sex, setSex] = useState('여')
  const [age, setAge] = useState('')
  const [pain, setPain] = useState<string[]>([])
  const [customPain, setCustomPain] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [customGoal, setCustomGoal] = useState('')
  const [exp, setExp] = useState('6개월~2년')
  const tog = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const save = async () => {
    const now = new Date().toISOString()
    await upsertMember(kv, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      sex,
      age: age.trim() || undefined,
      conditions: [...pain, customPain].map((s) => s.trim()).filter(Boolean).join(', '),
      goals: [...goals, customGoal].map((s) => s.trim()).filter(Boolean).join(', '),
      createdAt: now,
      updatedAt: now,
    })
    nav.toast('회원이 추가되었어요')
    nav.back()
  }

  const next = () => {
    if (step === 0 && !name.trim()) {
      Alert.alert('이름 필요', '회원 이름을 입력하세요.')
      return
    }
    if (step < 2) setStep(step + 1)
    else save()
  }

  return (
    <AppShell
      title="새 회원"
      onBack={() => (step > 0 ? setStep(step - 1) : nav.back())}
      footer={<Button title={step < 2 ? '다음' : '회원 추가 완료'} onPress={next} />}
    >
      <View style={{ marginTop: 12 }}>
        <StepBar total={3} step={step} />
      </View>
      <Text style={st.title}>{STEPS[step]}</Text>
      <Text style={st.sub}>{step + 1} / 3 단계 · 선택형 위주로 빠르게</Text>

      {step === 0 && (
        <>
          <Label>이름</Label>
          <Input value={name} onChangeText={setName} placeholder="회원 이름" maxLength={40} style={{ marginBottom: 18 }} />
          <Label>성별</Label>
          <View style={st.seg2}>
            {['여', '남'].map((g) => (
              <Pressable key={g} onPress={() => setSex(g)} style={[st.seg2o, sex === g && st.seg2on]}>
                <Text style={[st.seg2t, sex === g && { color: colors.tintInk }]}>{g}</Text>
              </Pressable>
            ))}
          </View>
          <Label style={{ marginTop: 20 }}>나이</Label>
          <Input value={age} onChangeText={setAge} placeholder="34" keyboardType="number-pad" maxLength={3} />
        </>
      )}

      {step === 1 && (
        <>
          <Label>통증 · 진단 (복수 선택 + 직접 입력)</Label>
          <ChipRow style={{ marginBottom: 12 }}>
            {PAIN_CHIPS.map((c) => (
              <Chip key={c} label={c} on={pain.includes(c)} onPress={() => tog(pain, setPain, c)} />
            ))}
          </ChipRow>
          <Input value={customPain} onChangeText={setCustomPain} placeholder="직접 입력 (예: 어깨충돌증후군, 족저근막염)" maxLength={300} multiline />
        </>
      )}

      {step === 2 && (
        <>
          <Label>목표 (복수 선택 + 직접 입력)</Label>
          <ChipRow style={{ marginBottom: 12 }}>
            {GOAL_CHIPS.map((c) => (
              <Chip key={c} label={c} on={goals.includes(c)} onPress={() => tog(goals, setGoals, c)} />
            ))}
          </ChipRow>
          <Input value={customGoal} onChangeText={setCustomGoal} placeholder="직접 입력 (예: 출산 후 회복, 마라톤 대비)" maxLength={300} style={{ marginBottom: 20 }} />
          <Label>필라테스 경력</Label>
          <ChipRow>
            {EXP_CHIPS.map((e) => (
              <Chip key={e} label={e} on={exp === e} onPress={() => setExp(e)} />
            ))}
          </ChipRow>
        </>
      )}
    </AppShell>
  )
}

const st = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 22, color: colors.ink, letterSpacing: -0.4, marginTop: 16, marginBottom: 4 },
  sub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginBottom: 20 },
  seg2: { flexDirection: 'row', gap: 10 },
  seg2o: { flex: 1, alignItems: 'center', paddingVertical: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  seg2on: { borderColor: colors.primary, backgroundColor: colors.tint },
  seg2t: { fontFamily: font.bold, fontSize: 15, color: colors.muted },
})
