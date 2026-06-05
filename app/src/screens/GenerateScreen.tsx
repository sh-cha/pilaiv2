import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Chip, ChipRow, Label, Input, Button, WarnTag, Segmented, Divider } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { loadMembers, type Member } from '../lib/members'
import { splitTags } from '../lib/catalog'
import { PAIN_CHIPS, GOAL_CHIPS, APPARATUS, INTENSITY, DURATION } from '../data/constants'
import type { MemberInput } from '../lib/types'

const APP_KO: Record<string, string> = { reformer: '리포머', cadillac: '캐딜락', mat: '매트', chair: '체어', barrel: '배럴' }

export function GenerateScreen() {
  const nav = useNav()
  const [members, setMembers] = useState<Member[]>([])
  const mid = nav.ctx.memberId
  const member = members.find((m) => m.id === mid) ?? nav.ctx.member

  // 회원 프로필에서 자동 prefill (칩 + 커스텀 분리)
  const [pain, setPain] = useState<string[]>([])
  const [customPain, setCustomPain] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [customGoal, setCustomGoal] = useState('')
  const [editCtx, setEditCtx] = useState(false)
  // 오늘 세션
  const [cond, setCond] = useState('좋음')
  const [showOpt, setShowOpt] = useState(false)
  const [apps, setApps] = useState<string[]>(['reformer'])
  const [inten, setInten] = useState('보통')
  const [dur, setDur] = useState('50')

  useEffect(() => {
    loadMembers(kv).then(setMembers)
  }, [])
  useEffect(() => {
    const m = members.find((x) => x.id === mid) ?? nav.ctx.member
    if (!m) return
    const conds = splitTags(m.conditions)
    setPain(conds.filter((c) => PAIN_CHIPS.includes(c)))
    setCustomPain(conds.filter((c) => !PAIN_CHIPS.includes(c)).join(', '))
    const gs = splitTags(m.goals)
    setGoals(gs.filter((g) => GOAL_CHIPS.includes(g)))
    setCustomGoal(gs.filter((g) => !GOAL_CHIPS.includes(g)).join(', '))
    setEditCtx(false)
  }, [mid, members])

  const tog = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const allPain = [...pain, ...splitTags(customPain)]
  const allGoals = [...goals, ...splitTags(customGoal)]
  const optSummary = `${apps.map((a) => APP_KO[a] ?? a).join('·')} · ${dur}분 · ${inten}`

  const onGenerate = () => {
    const conditions = [...pain, customPain].map((s) => s.trim()).filter(Boolean).join(', ')
    const input: MemberInput = {
      name: member?.name,
      age: member?.age,
      conditions,
      goals: [...goals, customGoal].map((s) => s.trim()).filter(Boolean).join(', '),
      minutes: Number(dur) || 50,
      apparatus: apps,
      todayCondition: cond !== '좋음' ? cond : undefined,
    }
    nav.setCtx({ genInput: input, memberId: mid, member })
    nav.go('generating')
  }

  return (
    <AppShell
      title={member ? `${member.name}님 시퀀스` : '시퀀스 생성'}
      footer={<Button title="시퀀스 생성" icon={<Icon name="spark" size={18} color="#fff" />} disabled={apps.length === 0} onPress={onGenerate} />}
    >
      {/* 회원 컨텍스트 — 프로필 자동 반영, 필요할 때만 조정 */}
      <Card style={{ marginTop: 8 }}>
        <View style={st.ctxhead}>
          <View>
            <Text style={st.ctxA}>회원 컨텍스트</Text>
            <Text style={st.ctxB}>{member?.name ?? '회원'}님 프로필 자동 반영</Text>
          </View>
          <Pressable hitSlop={8} onPress={() => setEditCtx((v) => !v)}>
            <Text style={st.edit}>{editCtx ? '완료' : '조정'}</Text>
          </Pressable>
        </View>

        {!editCtx ? (
          <View style={{ gap: 11 }}>
            <View>
              <Text style={st.capFaint}>통증 · 제약</Text>
              <ChipRow>
                {allPain.length ? allPain.map((c) => <WarnTag key={c}>⚠ {c}</WarnTag>) : <Text style={st.cap}>특이사항 없음</Text>}
              </ChipRow>
            </View>
            <View>
              <Text style={st.capFaint}>목표</Text>
              <ChipRow>
                {allGoals.length ? allGoals.map((c) => <Chip key={c} label={c} variant="tint" />) : <Text style={st.cap}>미설정</Text>}
              </ChipRow>
            </View>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <View>
              <Label>통증 · 제약</Label>
              <ChipRow style={{ marginBottom: 10 }}>
                {PAIN_CHIPS.map((c) => <Chip key={c} label={c} on={pain.includes(c)} onPress={() => tog(pain, setPain, c)} />)}
              </ChipRow>
              <Input value={customPain} onChangeText={setCustomPain} placeholder="직접 입력…" multiline />
            </View>
            <View>
              <Label>목표</Label>
              <ChipRow style={{ marginBottom: 10 }}>
                {GOAL_CHIPS.map((c) => <Chip key={c} label={c} on={goals.includes(c)} onPress={() => tog(goals, setGoals, c)} />)}
              </ChipRow>
              <Input value={customGoal} onChangeText={setCustomGoal} placeholder="직접 입력…" />
            </View>
          </View>
        )}
      </Card>

      {/* 오늘 세션 — 매번 바뀌는 컨디션만 전면, 옵션은 접기 */}
      <Card style={{ marginTop: 14 }}>
        <Label>오늘 컨디션</Label>
        <Segmented options={['좋음', '보통', '안좋음']} value={cond} onChange={setCond} />

        <Divider style={{ marginTop: 16, marginBottom: 10 }} />

        <Pressable style={st.disc} onPress={() => setShowOpt((v) => !v)}>
          <Text style={st.dl}>수업 옵션</Text>
          <View style={st.dr}>
            {!showOpt ? <Text style={st.optSum}>{optSummary}</Text> : null}
            <View style={{ transform: [{ rotate: showOpt ? '90deg' : '0deg' }] }}>
              <Icon name="chev" size={13} color={colors.faint} />
            </View>
          </View>
        </Pressable>

        {showOpt ? (
          <View style={{ gap: 16, marginTop: 14 }}>
            <View>
              <Label>수업 길이</Label>
              <Segmented options={DURATION.map((d) => ({ key: d, label: `${d}분` }))} value={dur} onChange={setDur} />
            </View>
            <View>
              <Label>강도</Label>
              <Segmented options={INTENSITY} value={inten} onChange={setInten} />
            </View>
            <View>
              <Label>기구</Label>
              <ChipRow>
                {APPARATUS.map((c) => <Chip key={c} label={c} on={apps.includes(c)} onPress={() => tog(apps, setApps, c)} />)}
              </ChipRow>
            </View>
          </View>
        ) : null}
      </Card>
    </AppShell>
  )
}

const st = StyleSheet.create({
  ctxhead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  ctxA: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  ctxB: { fontFamily: font.regular, fontSize: 12, color: colors.faint, marginTop: 2 },
  edit: { fontFamily: font.bold, fontSize: 13.5, color: colors.primary },
  capFaint: { fontFamily: font.regular, fontSize: 13, color: colors.faint, marginBottom: 6 },
  cap: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  disc: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 2 },
  dl: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink },
  dr: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  optSum: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
})
