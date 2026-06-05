import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Button, Chip, ChipRow, Input, Rep } from '../components/ui'
import { Icon } from '../components/Icon'
import { ExerciseSheet } from '../components/ExerciseSheet'
import { AddExercisePicker } from '../components/AddExercisePicker'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { exByName, tArr } from '../lib/catalog'
import { computeDiff, buildCapturedSession, appendSession } from '../lib/flywheel'
import type { Sequence } from '../lib/types'

const clone = (s: Sequence): Sequence => JSON.parse(JSON.stringify(s))

// 재생성 방향 시트 — 빠른 옵션 + 자유 입력을 모아 adjust 문자열로
const REGEN_QUICK = ['더 쉽게', '더 강하게', '하체 강화', '상체 강화', '코어 집중', '스트레칭 위주', '시간 줄이기']
function RegenSheet({ onClose, onRegen }: { onClose: () => void; onRegen: (adjust: string) => void }) {
  const [sel, setSel] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const tog = (v: string) => setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))
  const adjust = [...sel, custom].map((x) => x.trim()).filter(Boolean).join(', ')
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.regenBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={st.regenSheet}>
          <View style={st.grab} />
          <Text style={st.regenTitle}>어떻게 다시 만들까요?</Text>
          <Text style={st.regenSub}>방향을 고르거나 직접 적어주세요</Text>
          <ChipRow style={{ marginTop: 16, marginBottom: 14 }}>
            {REGEN_QUICK.map((c) => <Chip key={c} label={c} on={sel.includes(c)} onPress={() => tog(c)} />)}
          </ChipRow>
          <Input value={custom} onChangeText={setCustom} placeholder="직접 입력 (예: 어깨 무리 안 가게, 후면체인 위주)" multiline style={{ minHeight: 60, textAlignVertical: 'top' }} />
          <Button title="이 방향으로 다시 생성" disabled={!adjust} onPress={() => onRegen(adjust)} style={{ marginTop: 16 }} />
        </View>
      </View>
    </Modal>
  )
}

// 진단 — 핵심 불릿이 기본, "자세히"로 상세(member_summary) 펼침. 구 세션(불릿 없음)은 상세만.
function DiagnosisCard({ points, detail }: { points?: string[]; detail: string }) {
  const [open, setOpen] = useState(false)
  const hasPoints = !!points && points.length > 0
  return (
    <View style={st.diagCard}>
      <Icon name="spark" size={16} color={colors.primary} />
      <View style={{ flex: 1 }}>
        {hasPoints ? (
          <View style={{ gap: 7 }}>
            {points!.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 7 }}>
                <Text style={st.diagDot}>·</Text>
                <Text style={st.diagPoint}>{p}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={st.diagPoint}>{detail}</Text>
        )}
        {hasPoints && detail ? (
          <>
            <Pressable hitSlop={6} onPress={() => setOpen((o) => !o)}>
              <Text style={st.diagMore}>{open ? '접기' : '자세히'}</Text>
            </Pressable>
            {open ? <Text style={st.diagDetail}>{detail}</Text> : null}
          </>
        ) : null}
      </View>
    </View>
  )
}

export function SequenceScreen() {
  const nav = useNav()
  const gen = nav.ctx.genResult
  const input = nav.ctx.genInput
  const member = nav.ctx.member
  const [seq, setSeq] = useState<Sequence | null>(() => {
    const base = nav.ctx.finalSeq ?? gen?.sequence
    return base ? clone(base) : null
  })
  const [sheet, setSheet] = useState<{ name: string; reps?: string; block: string } | null>(null)
  const [pickerBlock, setPickerBlock] = useState<number | null>(null)
  const [regenOpen, setRegenOpen] = useState(false)

  if (!seq || !gen) {
    return (
      <AppShell title="생성된 시퀀스">
        <Text style={{ fontFamily: font.regular, color: colors.muted, padding: 4 }}>시퀀스가 없습니다. 다시 생성해 주세요.</Text>
      </AppShell>
    )
  }

  const del = (bi: number, ei: number) =>
    setSeq((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      next.blocks[bi].exercises.splice(ei, 1)
      return next
    })
  const add = (bi: number, name: string) =>
    setSeq((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      next.blocks[bi].exercises.push({ name })
      return next
    })

  const editCount = computeDiff(gen.sequence, seq).length

  const save = async (then: 'home' | 'class') => {
    const session = buildCapturedSession({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      memberId: member?.id,
      createdAt: new Date().toISOString(),
      input: input!,
      generated: gen.sequence,
      final: seq,
      attempts: gen.attempts,
      usage: gen.usage,
    })
    await appendSession(kv, session)
    if (then === 'class') {
      nav.setCtx({ classSeq: seq, member, savedSessionId: session.id })
      nav.reset('classPlay')
    } else {
      nav.toast(session.edited ? `편집 ${session.diff.length}건을 학습 데이터로 캡처했어요` : '시퀀스를 저장했어요')
      nav.tab('home')
    }
  }

  const setupLine = input ? `${input.apparatus.join(', ')} · ${input.minutes}분${input.goals ? ' · ' + input.goals : ''}` : ''

  return (
    <AppShell
      title="생성된 시퀀스"
      footer={
        <>
          <Button variant="dark" title="수업 시작" onPress={() => save('class')} />
          <Pressable onPress={() => save('home')} style={st.saveOnly}>
            <Text style={st.saveOnlyText}>저장만 하고 나중에</Text>
          </Pressable>
        </>
      }
    >
      <View style={st.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{member?.name ? `${member.name}님 시퀀스` : '시퀀스'}</Text>
          {setupLine ? <Text style={st.setup}>{setupLine}</Text> : null}
        </View>
        <Chip label="재생성" onPress={() => setRegenOpen(true)} />
      </View>

      {gen.attempts > 1 ? <Text style={st.repair}>자동 수정 {gen.attempts - 1}회 후 통과</Text> : null}

      <DiagnosisCard points={seq.summary_points} detail={seq.member_summary} />

      {seq.blocks.map((b, bi) => (
        <Card key={bi} style={{ marginBottom: 14 }}>
          <View style={st.phaseHead}>
            <Text style={st.phaseTitle}>{b.block}</Text>
            <Text style={st.appTag}>{b.apparatus.toUpperCase()}</Text>
          </View>
          {b.exercises.map((it, ei) => {
            const ex = exByName.get(it.name)
            const muscles = tArr(ex?.muscle_focus_ko, ex?.muscle_focus ?? [])
            const muscle = muscles[0]
            const lastItem = ei === b.exercises.length - 1
            return (
              <View key={ei} style={st.exRow}>
                <View style={st.timeline}>
                  <View style={st.node}><Text style={st.nodeText}>{ei + 1}</Text></View>
                  {!lastItem ? <View style={st.line} /> : null}
                </View>
                <Pressable style={{ flex: 1, paddingBottom: lastItem ? 0 : 14 }} onPress={() => setSheet({ name: it.name, reps: it.reps, block: b.block })}>
                  <View style={st.exTop}>
                    <Text style={st.exName}>{it.name}<Text style={{ color: colors.faint }}> ›</Text></Text>
                    <View style={st.exRight}>
                      {it.reps ? <Rep>{it.reps}</Rep> : null}
                      <Pressable hitSlop={8} onPress={() => del(bi, ei)}><Icon name="x" size={15} color={colors.faint} /></Pressable>
                    </View>
                  </View>
                  {muscle ? <Chip label={muscle} variant="tint" style={st.muscleChip} textStyle={{ fontSize: 11.5 }} /> : null}
                  {it.caution ? <Text style={st.caution}>⚠ {it.caution}</Text> : null}
                </Pressable>
              </View>
            )
          })}
          <Pressable style={st.addBtn} onPress={() => setPickerBlock(bi)}>
            <Text style={st.addText}>+ 동작 추가</Text>
          </Pressable>
        </Card>
      ))}

      {editCount > 0 ? <Text style={st.editNote}>생성본 대비 편집 {editCount}건 · 저장 시 학습 데이터로 캡처돼요</Text> : null}

      {sheet ? <ExerciseSheet name={sheet.name} reps={sheet.reps} block={sheet.block} onClose={() => setSheet(null)} /> : null}
      {regenOpen ? (
        <RegenSheet
          onClose={() => setRegenOpen(false)}
          onRegen={(adjust) => {
            setRegenOpen(false)
            nav.setCtx({ genInput: { ...input!, adjust } })
            nav.go('generating')
          }}
        />
      ) : null}
      <AddExercisePicker
        apparatus={pickerBlock != null ? seq.blocks[pickerBlock].apparatus : null}
        onPick={(name) => { if (pickerBlock != null) add(pickerBlock, name); setPickerBlock(null) }}
        onClose={() => setPickerBlock(null)}
      />
    </AppShell>
  )
}

const st = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, marginBottom: 14 },
  title: { fontFamily: font.extrabold, fontSize: 21, color: colors.ink, letterSpacing: -0.4 },
  setup: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  repair: { fontFamily: font.semibold, fontSize: 12, color: colors.muted, marginBottom: 8 },
  phaseHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  phaseTitle: { fontFamily: font.extrabold, fontSize: 19, color: colors.ink, letterSpacing: -0.4 },
  appTag: { fontFamily: font.bold, fontSize: 11.5, color: colors.primary, letterSpacing: 0.8 },
  exRow: { flexDirection: 'row', gap: 13 },
  timeline: { alignItems: 'center' },
  node: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  nodeText: { fontFamily: font.bold, fontSize: 13, color: colors.tintInk },
  line: { width: 2, flex: 1, backgroundColor: colors.line, marginTop: 4 },
  exTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  exName: { flex: 1, fontFamily: font.bold, fontSize: 15.5, color: colors.ink, paddingTop: 2 },
  exRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muscleChip: { paddingVertical: 2, paddingHorizontal: 9, marginTop: 5, alignSelf: 'flex-start' },
  caution: { fontFamily: font.semibold, fontSize: 12.5, color: colors.warnInk, marginTop: 5 },
  addBtn: { borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  addText: { fontFamily: font.bold, fontSize: 13.5, color: colors.primary },
  editNote: { fontFamily: font.regular, fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 2, marginBottom: 8 },
  saveOnly: { alignItems: 'center', paddingVertical: 4 },
  saveOnlyText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  diagCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.tint, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 17, marginBottom: 16 },
  diagDot: { fontFamily: font.regular, fontSize: 15, color: colors.tintInk, lineHeight: 22 },
  diagPoint: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.tintInk },
  diagMore: { fontFamily: font.bold, fontSize: 13, color: colors.tintInk, marginTop: 10, opacity: 0.8 },
  diagDetail: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 23, color: colors.tintInk, marginTop: 8, opacity: 0.92 },
  regenBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,22,18,0.4)' },
  regenSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginTop: 8, marginBottom: 12 },
  regenTitle: { fontFamily: font.extrabold, fontSize: 20, color: colors.ink, letterSpacing: -0.3 },
  regenSub: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted, marginTop: 4 },
})
