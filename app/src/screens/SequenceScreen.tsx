import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, BackHandler } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Button, Chip, ChipRow, Input, Rep } from '../components/ui'
import { Icon } from '../components/Icon'
import { ExerciseSheet } from '../components/ExerciseSheet'
import { AddExercisePicker } from '../components/AddExercisePicker'
import { RowActionSheet, RepsSheet } from '../components/SequenceEditSheets'
import { DraggableExercises } from '../components/DraggableExercises'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { exByName, tArr } from '../lib/catalog'
import { computeDiff, buildCapturedSession, appendSession, updateSessionFinal } from '../lib/flywheel'
import { sequenceCoverage } from '../lib/balance'
import type { Sequence } from '../lib/types'

const EDIT_ROW = 64 // 편집 행 고정 높이 — DraggableExercises의 드래그 거리→인덱스 환산 기준

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
          <Input value={custom} onChangeText={setCustom} placeholder="직접 입력 (예: 어깨 무리 안 가게, 후면체인 위주)" maxLength={200} multiline style={{ minHeight: 60, textAlignVertical: 'top' }} />
          <Button title="이 방향으로 다시 생성" disabled={!adjust} onPress={() => onRegen(adjust)} style={{ marginTop: 16 }} />
        </View>
      </View>
    </Modal>
  )
}

// 진단 — 짧은 요약(summary_points) 기본, "자세히"로 상세 펼침.
// 상세는 제목 붙은 섹션(diagnosis_sections)으로 렌더 — 줄글 폭탄 방지. 구 세션은 member_summary 줄글 폴백.
function DiagnosisCard({ points, detail, sections }: { points?: string[]; detail: string; sections?: { title: string; body: string }[] }) {
  const [open, setOpen] = useState(false)
  const summary = points && points.length ? points.join(' ') : detail
  const hasSections = !!sections && sections.length > 0
  const hasDetail = hasSections || (!!detail && detail.trim() !== summary.trim())
  return (
    <View style={st.diagCard}>
      <Icon name="spark" size={16} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={st.diagText}>{summary}</Text>
        {hasDetail ? (
          <>
            <Pressable hitSlop={6} onPress={() => setOpen((o) => !o)}>
              <Text style={st.diagMore}>{open ? '접기' : '자세히'}</Text>
            </Pressable>
            {open ? (
              hasSections ? (
                <View style={st.diagSections}>
                  {sections!.map((s, i) => (
                    <View key={i}>
                      <Text style={st.diagSecTitle}>{s.title}</Text>
                      <Text style={st.diagSecBody}>{s.body}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={st.diagDetail}>{detail}</Text>
              )
            ) : null}
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
  const [pickerBlock, setPickerBlock] = useState<number | null>(null) // 동작 추가 대상 블록
  const [replaceAt, setReplaceAt] = useState<{ bi: number; ei: number } | null>(null) // 교체 대상
  const [action, setAction] = useState<{ bi: number; ei: number } | null>(null) // 행 액션시트
  const [repsAt, setRepsAt] = useState<{ bi: number; ei: number } | null>(null) // 횟수 시트
  const [regenOpen, setRegenOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [dragLock, setDragLock] = useState(false) // 드래그 중 배경 ScrollView 잠금

  // 뒤로가기: 편집 중엔 편집만 종료(보기 모드로), 아니면 스택 pop — 생성 직후(reset된 스택)엔 홈으로.
  const goBack = () => {
    if (editMode) setEditMode(false)
    else if (nav.depth > 1) nav.back()
    else nav.tab('home')
  }
  // 안드로이드 하드웨어 백도 동일하게 — 편집 중이면 라우터 pop보다 먼저 가로채 편집 종료
  useEffect(() => {
    if (!editMode) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setEditMode(false)
      return true
    })
    return () => sub.remove()
  }, [editMode])

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
      next.blocks[bi].exercises.push({ name, reps: '10회' })
      return next
    })
  // 동작 교체 — 이름만 바꾸고 reps는 유지(이전 동작의 reason·caution은 버림)
  const replaceExercise = (bi: number, ei: number, name: string) =>
    setSeq((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      next.blocks[bi].exercises[ei] = { name, reps: next.blocks[bi].exercises[ei].reps }
      return next
    })
  const setRep = (bi: number, ei: number, reps: string) =>
    setSeq((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      next.blocks[bi].exercises[ei] = { ...next.blocks[bi].exercises[ei], reps }
      return next
    })
  // 순서 변경 — from→to 이동
  const reorder = (bi: number, from: number, to: number) =>
    setSeq((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      const arr = next.blocks[bi].exercises
      if (to < 0 || to >= arr.length) return prev
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return next
    })

  const dirty = computeDiff(gen.sequence, seq).length > 0
  const coverage = sequenceCoverage(seq) // 근육군 커버리지 (검증 미리보기)

  // 수업 시작 — 별도 저장 버튼 없이 여기서 캡처. 첫 시작이면 세션 생성, 저장본이면 재편집분을 반영.
  const startClass = async () => {
    let sid = nav.ctx.savedSessionId
    if (!sid) {
      sid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const session = buildCapturedSession({
        id: sid,
        memberId: member?.id,
        createdAt: new Date().toISOString(),
        input: input!,
        generated: gen.sequence,
        final: seq,
        attempts: gen.attempts,
        usage: gen.usage,
      })
      await appendSession(kv, session)
    } else {
      await updateSessionFinal(kv, sid, seq) // 편집 없이도 멱등 — diff·검증 재계산
    }
    nav.setCtx({ classSeq: seq, member, savedSessionId: sid })
    nav.go('classPlay')
  }

  const setupLine = input ? `${input.apparatus.join(', ')} · ${input.minutes}분${input.goals ? ' · ' + input.goals : ''}` : ''

  // 액션시트 대상 동작 정보
  const actItem = action ? seq.blocks[action.bi]?.exercises[action.ei] : null
  const actEx = actItem ? exByName.get(actItem.name) : undefined
  const actMuscle = actItem ? tArr(actEx?.muscle_focus_ko, actEx?.muscle_focus ?? [])[0] : undefined

  // 추가/교체 공용 picker
  const pickerApparatus =
    replaceAt != null ? seq.blocks[replaceAt.bi].apparatus : pickerBlock != null ? seq.blocks[pickerBlock].apparatus : null
  const onPickEx = (name: string) => {
    if (replaceAt != null) { replaceExercise(replaceAt.bi, replaceAt.ei, name); setReplaceAt(null); nav.toast('동작을 교체했어요') }
    else if (pickerBlock != null) { add(pickerBlock, name); setPickerBlock(null) }
  }
  const onPickerClose = () => { setReplaceAt(null); setPickerBlock(null) }

  return (
    <AppShell
      title="생성된 시퀀스"
      onBack={goBack}
      scrollEnabled={!dragLock}
      headerRight={
        <Pressable hitSlop={8} onPress={() => setEditMode((e) => !e)} style={st.editBtn}>
          <Text style={st.editBtnText}>{editMode ? '완료' : '편집'}</Text>
        </Pressable>
      }
      footer={
        editMode ? (
          <Button title="편집 완료" onPress={() => setEditMode(false)} />
        ) : (
          <Button title="수업 시작" onPress={startClass} />
        )
      }
    >
      <View style={st.titleRow}>
        <View style={{ flex: 1 }}>
          <View style={st.titleLine}>
            <Text style={st.title}>{member?.name ? `${member.name}님 시퀀스` : '시퀀스'}</Text>
            {dirty ? <Chip label="편집됨" variant="tint" style={st.dirtyChip} textStyle={{ fontSize: 11 }} /> : null}
          </View>
          {setupLine ? <Text style={st.setup}>{setupLine}</Text> : null}
        </View>
      </View>

      {!editMode ? (
        <>
          <DiagnosisCard points={seq.summary_points} detail={seq.member_summary} sections={seq.diagnosis_sections} />
          {coverage ? (
            <Card style={st.coverCard}>
              <Text style={st.coverTitle}>근육군 커버리지</Text>
              {coverage.map(({ region, pct }) => (
                <View key={region} style={st.coverRow}>
                  <Text style={st.coverLabel}>{region}</Text>
                  <View style={st.coverTrack}><View style={[st.coverFill, { width: `${pct}%` }]} /></View>
                  <Text style={st.coverVal}>{pct}%</Text>
                </View>
              ))}
            </Card>
          ) : null}
          <Button variant="ghost" title="다시 생성" icon={<Icon name="spark" size={16} color={colors.primary} />} onPress={() => setRegenOpen(true)} style={st.regenBtn} />
        </>
      ) : (
        <Text style={st.editHint}>⋮ 손잡이를 끌어 순서를 바꾸고, 동작을 탭해 교체·횟수·삭제할 수 있어요.</Text>
      )}

      {seq.blocks.map((b, bi) => (
        <Card key={bi} style={{ marginBottom: 14 }}>
          <View style={st.phaseHead}>
            <Text style={st.phaseTitle}>{b.block}</Text>
            <Text style={st.appTag}>{b.apparatus.toUpperCase()}</Text>
          </View>
          {!editMode ? (
            b.exercises.map((it, ei) => {
              const ex = exByName.get(it.name)
              const muscle = tArr(ex?.muscle_focus_ko, ex?.muscle_focus ?? [])[0]
              const lastItem = ei === b.exercises.length - 1
              return (
                <View key={ei} style={st.exRow}>
                  <View style={st.timeline}>
                    <View style={st.node}><Text style={st.nodeText}>{ei + 1}</Text></View>
                    {!lastItem ? <View style={st.line} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: lastItem ? 0 : 14 }}>
                    <View style={st.exTop}>
                      <Pressable style={{ flex: 1 }} hitSlop={4} onPress={() => setSheet({ name: it.name, reps: it.reps, block: b.block })}>
                        <Text style={st.exName} numberOfLines={1}>{it.name}<Text style={{ color: colors.faint }}> ›</Text></Text>
                      </Pressable>
                      {it.reps ? <Rep>{it.reps}</Rep> : null}
                    </View>
                    {muscle ? <Chip label={muscle} variant="tint" style={st.muscleChip} textStyle={{ fontSize: 11.5 }} /> : null}
                    {it.reason ? (
                      <View style={st.reasonRow}>
                        <Icon name="spark" size={11} color={colors.primary} />
                        <Text style={st.reason}>{it.reason}</Text>
                      </View>
                    ) : null}
                    {it.caution ? <Text style={st.caution}>{it.caution}</Text> : null}
                  </View>
                </View>
              )
            })
          ) : (
            // 편집 모드 — 핸들 드래그로 순서 변경, 행 탭으로 교체·횟수·삭제 시트.
            // 행은 EDIT_ROW 고정 높이 (드래그 인덱스 환산 정확도).
            <DraggableExercises
              count={b.exercises.length}
              rowHeight={EDIT_ROW}
              onReorder={(from, to) => reorder(bi, from, to)}
              onDragActive={setDragLock}
              renderRow={(ei, handle, dragging) => {
                const it = b.exercises[ei]
                if (!it) return null
                const ex = exByName.get(it.name)
                const muscle = tArr(ex?.muscle_focus_ko, ex?.muscle_focus ?? [])[0]
                return (
                  <View style={[st.dragRow, dragging && { opacity: 0.97 }]}>
                    <View style={st.handle} {...handle}>
                      <View style={st.handleBar} />
                      <View style={st.handleBar} />
                      <View style={st.handleBar} />
                    </View>
                    <Pressable style={{ flex: 1 }} hitSlop={4} onPress={() => setAction({ bi, ei })}>
                      <Text style={st.dragName} numberOfLines={1}>{it.name}</Text>
                      {muscle ? <Text style={st.dragMeta} numberOfLines={1}>{muscle}</Text> : null}
                    </Pressable>
                    {it.reps ? <Rep>{it.reps}</Rep> : null}
                  </View>
                )
              }}
            />
          )}
          {editMode ? (
            <Pressable style={st.addBtn} onPress={() => setPickerBlock(bi)}>
              <Text style={st.addText}>+ 동작 추가</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}

      {sheet ? <ExerciseSheet name={sheet.name} reps={sheet.reps} block={sheet.block} onClose={() => setSheet(null)} /> : null}
      {action && actItem ? (
        <RowActionSheet
          name={actItem.name}
          sub={[actMuscle, actItem.reps].filter(Boolean).join(' · ')}
          onClose={() => setAction(null)}
          onDetail={() => { setSheet({ name: actItem.name, reps: actItem.reps, block: seq.blocks[action.bi].block }); setAction(null) }}
          onReplace={() => { setReplaceAt(action); setAction(null) }}
          onReps={() => { setRepsAt(action); setAction(null) }}
          onDelete={() => { del(action.bi, action.ei); setAction(null) }}
        />
      ) : null}
      {repsAt ? (
        <RepsSheet
          name={seq.blocks[repsAt.bi].exercises[repsAt.ei].name}
          current={seq.blocks[repsAt.bi].exercises[repsAt.ei].reps}
          onPick={(r) => { setRep(repsAt.bi, repsAt.ei, r); setRepsAt(null) }}
          onClose={() => setRepsAt(null)}
        />
      ) : null}
      {regenOpen ? (
        <RegenSheet
          onClose={() => setRegenOpen(false)}
          onRegen={(adjust) => {
            setRegenOpen(false)
            nav.setCtx({ genInput: { ...input!, adjust, baseSequence: seq } })
            nav.go('generating')
          }}
        />
      ) : null}
      <AddExercisePicker apparatus={pickerApparatus} onPick={onPickEx} onClose={onPickerClose} />
    </AppShell>
  )
}

const st = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, marginBottom: 14 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: font.extrabold, fontSize: 21, color: colors.ink, letterSpacing: -0.4 },
  dirtyChip: { paddingVertical: 2, paddingHorizontal: 9 },
  setup: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  editBtn: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 999, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  editBtnText: { fontFamily: font.bold, fontSize: 14, color: colors.primary },
  regenBtn: { paddingVertical: 12, marginBottom: 16 },
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
  editHint: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted, marginBottom: 14, marginHorizontal: 2, lineHeight: 20 },
  dragRow: { height: EDIT_ROW, flexDirection: 'row', alignItems: 'center', gap: 10 },
  handle: { width: 32, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 3 },
  handleBar: { width: 16, height: 2, borderRadius: 1, backgroundColor: colors.faint },
  dragName: { fontFamily: font.bold, fontSize: 15.5, color: colors.ink },
  dragMeta: { fontFamily: font.regular, fontSize: 12, color: colors.faint, marginTop: 2 },
  muscleChip: { paddingVertical: 2, paddingHorizontal: 9, marginTop: 5, alignSelf: 'flex-start' },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 5 },
  reason: { flex: 1, fontFamily: font.regular, fontSize: 12.5, color: colors.muted, lineHeight: 17 },
  caution: { fontFamily: font.semibold, fontSize: 12.5, color: colors.warnInk, marginTop: 5 },
  coverCard: { marginBottom: 12, paddingVertical: 15 },
  coverTitle: { fontFamily: font.bold, fontSize: 13, color: colors.muted, marginBottom: 10 },
  coverRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  coverLabel: { width: 34, fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  coverTrack: { flex: 1, height: 9, borderRadius: 5, backgroundColor: colors.surface2, overflow: 'hidden' },
  coverFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  coverVal: { width: 36, textAlign: 'right', fontFamily: font.monoSemibold, fontSize: 13, color: colors.ink },
  addBtn: { borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  addText: { fontFamily: font.bold, fontSize: 13.5, color: colors.primary },
  diagCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.tint, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 17, marginBottom: 12 },
  diagText: { fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: colors.tintInk },
  diagMore: { fontFamily: font.bold, fontSize: 13, color: colors.tintInk, marginTop: 8, opacity: 0.8 },
  diagDetail: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 23, color: colors.tintInk, marginTop: 8, opacity: 0.92 },
  diagSections: { marginTop: 10, gap: 13 },
  diagSecTitle: { fontFamily: font.bold, fontSize: 13.5, color: colors.tintInk, letterSpacing: -0.1 },
  diagSecBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.tintInk, marginTop: 3, opacity: 0.92 },
  regenBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,22,18,0.4)' },
  regenSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginTop: 8, marginBottom: 12 },
  regenTitle: { fontFamily: font.extrabold, fontSize: 20, color: colors.ink, letterSpacing: -0.3 },
  regenSub: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted, marginTop: 4 },
})
