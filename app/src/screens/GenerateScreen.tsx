import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Chip, ChipRow, Label, Input, Button } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { loadMembers, type Member } from '../lib/members'
import { splitTags } from '../lib/catalog'
import { PAIN_CHIPS, GOAL_CHIPS, APPARATUS, INTENSITY, DURATION } from '../data/constants'
import type { MemberInput } from '../lib/types'

const COND = ['좋음', '보통', '안좋음']

export function GenerateScreen() {
  const nav = useNav()
  const [members, setMembers] = useState<Member[]>([])
  const mid = nav.ctx.memberId
  const [pain, setPain] = useState<string[]>([])
  const [customPain, setCustomPain] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [customGoal, setCustomGoal] = useState('')
  const [apps, setApps] = useState<string[]>(['reformer'])
  const [inten, setInten] = useState('보통')
  const [dur, setDur] = useState('50')
  const [cond, setCond] = useState('좋음')

  useEffect(() => {
    loadMembers(kv).then(setMembers)
  }, [])

  // 선택 회원의 통증·목표를 폼에 prefill (칩에 있는 건 칩으로, 나머지는 직접입력으로)
  useEffect(() => {
    const m = members.find((x) => x.id === mid) ?? (mid === nav.ctx.memberId ? nav.ctx.member : undefined)
    if (!m) return
    const conds = splitTags(m.conditions)
    setPain(conds.filter((c) => PAIN_CHIPS.includes(c)))
    setCustomPain(conds.filter((c) => !PAIN_CHIPS.includes(c)).join(', '))
    const gs = splitTags(m.goals)
    setGoals(gs.filter((g) => GOAL_CHIPS.includes(g)))
    setCustomGoal(gs.filter((g) => !GOAL_CHIPS.includes(g)).join(', '))
  }, [mid, members])

  const selected = members.find((m) => m.id === mid) ?? nav.ctx.member
  const tog = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const onGenerate = () => {
    const conditions = [...pain, customPain].map((s) => s.trim()).filter(Boolean).join(', ')
    const input: MemberInput = {
      name: selected?.name,
      age: selected?.age,
      conditions,
      goals: [...goals, customGoal].map((s) => s.trim()).filter(Boolean).join(', '),
      minutes: Number(dur) || 50,
      apparatus: apps,
      todayCondition: cond !== '좋음' ? cond : undefined,
    }
    nav.setCtx({ genInput: input, memberId: mid, member: selected })
    nav.go('generating')
  }

  return (
    <AppShell
      title={selected ? `${selected.name}님 시퀀스` : '시퀀스 생성'}
      footer={
        <Button title="시퀀스 생성" icon={<Icon name="spark" size={18} color="#fff" />} disabled={apps.length === 0} onPress={onGenerate} />
      }
    >
      <Card style={{ marginTop: 8 }}>
        <View style={{ marginBottom: 18 }}>
          <Label>통증 · 제약</Label>
          <ChipRow style={{ marginBottom: 10 }}>
            {PAIN_CHIPS.map((c) => (
              <Chip key={c} label={c} on={pain.includes(c)} onPress={() => tog(pain, setPain, c)} />
            ))}
          </ChipRow>
          <Input value={customPain} onChangeText={setCustomPain} placeholder="직접 입력…" />
        </View>

        <View style={{ marginBottom: 18 }}>
          <Label>목표</Label>
          <ChipRow style={{ marginBottom: 10 }}>
            {GOAL_CHIPS.map((c) => (
              <Chip key={c} label={c} on={goals.includes(c)} onPress={() => tog(goals, setGoals, c)} />
            ))}
          </ChipRow>
          <Input value={customGoal} onChangeText={setCustomGoal} placeholder="직접 입력…" />
        </View>

        <View style={{ marginBottom: 18 }}>
          <Label>기구</Label>
          <ChipRow>
            {APPARATUS.map((c) => (
              <Chip key={c} label={c} on={apps.includes(c)} onPress={() => tog(apps, setApps, c)} />
            ))}
          </ChipRow>
        </View>

        <View style={{ marginBottom: 18 }}>
          <Label>강도</Label>
          <ChipRow>
            {INTENSITY.map((c) => (
              <Chip key={c} label={c} on={inten === c} onPress={() => setInten(c)} />
            ))}
          </ChipRow>
        </View>

        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Label>수업 길이 (분)</Label>
            <ChipRow>
              {DURATION.map((c) => (
                <Chip key={c} label={<Text style={{ fontFamily: font.monoSemibold }}>{c}</Text>} on={dur === c} onPress={() => setDur(c)} />
              ))}
            </ChipRow>
          </View>
          <View style={{ flex: 1 }}>
            <Label>오늘 컨디션</Label>
            <ChipRow>
              {COND.map((c) => (
                <Chip key={c} label={c} on={cond === c} onPress={() => setCond(c)} />
              ))}
            </ChipRow>
          </View>
        </View>
      </Card>
    </AppShell>
  )
}

const _unused = StyleSheet.create({})
