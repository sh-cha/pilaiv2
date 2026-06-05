// 동작 상세 바텀시트 — 실제 카탈로그(exercises.json)를 바인딩. 요약/큐잉/셋업 탭.
import React, { useState } from 'react'
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native'
import { colors, font, radius } from '../theme/tokens'
import { Label, ChipRow, Chip, DiffDots } from './ui'
import { exByName, tArr, tx, levelToDiff } from '../lib/catalog'

type Props = { name: string; reps?: string; block?: string; onClose: () => void }

export function ExerciseSheet({ name, reps, block, onClose }: Props) {
  const ex = exByName.get(name)
  const [tab, setTab] = useState<'summary' | 'cue' | 'setup'>('summary')
  const diff = levelToDiff(ex?.level_ko ?? ex?.level)
  const muscles = ex ? tArr(ex.muscle_focus_ko, ex.muscle_focus) : []
  const cues = ex ? tArr(ex.cues_ko, ex.cues) : []
  const goals = ex ? tArr(ex.objectives_ko, ex.objectives) : []
  const mv = ex?.movement_ko ?? ex?.movement
  const setup = tx(ex?.setup_ko, ex?.setup)
  const cat = tx(ex?.block_ko, ex?.block)
  const facts: [string, string][] = [
    ['기구', ex ? ex.apparatus.join(', ') : '—'],
    ['카테고리', cat],
    ['난이도', tx(ex?.level_ko, ex?.level)],
    ['반복', reps ?? '—'],
  ]

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.grab} />
          <View style={st.head}>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{name}</Text>
              <Text style={st.cat}>{ex ? ex.apparatus.join(', ') : 'reformer'} · {cat}</Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose}><Text style={st.close}>닫기</Text></Pressable>
          </View>
          <View style={st.diffRow}>
            <Text style={st.diffLabel}>난이도</Text>
            <DiffDots level={diff} />
          </View>

          <View style={st.tseg}>
            {([['summary', '요약'], ['cue', '큐잉'], ['setup', '셋업·호흡']] as const).map(([k, l]) => (
              <Pressable key={k} onPress={() => setTab(k)} style={[st.tsegT, tab === k && st.tsegOn]}>
                <Text style={[st.tsegText, tab === k && { color: colors.ink }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
            {tab === 'summary' && (
              <>
                <View style={st.facts}>
                  {facts.map(([k, v], i) => (
                    <View key={i} style={[st.fact, i > 0 && st.factBorder]}>
                      <Text style={st.factK}>{k}</Text>
                      <Text style={st.factV}>{v}</Text>
                    </View>
                  ))}
                </View>
                {muscles.length > 0 && (
                  <>
                    <Label>타깃 근육</Label>
                    <ChipRow style={{ marginBottom: 18 }}>
                      {muscles.map((m) => (
                        <Chip key={m} label={m} variant="tint" />
                      ))}
                    </ChipRow>
                  </>
                )}
                {mv && (mv.inhale || mv.exhale) ? (
                  <>
                    <Label>호흡</Label>
                    <View style={st.breath2}>
                      <View style={st.bcard}>
                        <Text style={st.bk}>들숨</Text>
                        <Text style={st.bv}>{mv.inhale ?? '-'}</Text>
                      </View>
                      <View style={st.bcard}>
                        <Text style={st.bk}>날숨</Text>
                        <Text style={st.bv}>{mv.exhale ?? '-'}</Text>
                      </View>
                    </View>
                  </>
                ) : null}
              </>
            )}
            {tab === 'cue' && (
              <>
                <Label>큐 포인트</Label>
                {cues.length > 0 ? (
                  <View style={{ gap: 12, marginTop: 4 }}>
                    {cues.map((c, i) => (
                      <View key={i} style={st.cueItem}>
                        <View style={st.cn}><Text style={st.cnText}>{i + 1}</Text></View>
                        <Text style={st.ct}>{c}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={st.muted}>큐 정보가 아직 등록되지 않았어요.</Text>
                )}
              </>
            )}
            {tab === 'setup' && (
              <>
                <Label>셋업</Label>
                <View style={st.setupCard}>
                  <Text style={st.setupText}>{setup !== '-' ? setup : '셋업 정보가 아직 등록되지 않았어요.'}</Text>
                </View>
                {goals.length > 0 && (
                  <>
                    <Label style={{ marginTop: 18 }}>목표</Label>
                    <View style={{ gap: 9 }}>
                      {goals.map((g, i) => (
                        <View key={i} style={st.goalRow}>
                          <View style={st.goalDot} />
                          <Text style={st.goalText}>{g}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const st = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,22,18,0.4)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 20, paddingBottom: 20, height: '78%' },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginTop: 8, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontFamily: font.extrabold, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  cat: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  close: { fontFamily: font.bold, fontSize: 15, color: colors.primary, paddingTop: 4 },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  diffLabel: { fontFamily: font.bold, fontSize: 13, color: colors.muted },
  tseg: { flexDirection: 'row', gap: 5, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.field, padding: 4, marginTop: 16 },
  tsegT: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  tsegOn: { backgroundColor: colors.surface },
  tsegText: { fontFamily: font.bold, fontSize: 14, color: colors.muted },
  facts: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.field, overflow: 'hidden', marginBottom: 18 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, backgroundColor: colors.surface },
  factBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  factK: { fontFamily: font.semibold, fontSize: 13.5, color: colors.muted },
  factV: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  breath2: { flexDirection: 'row', gap: 10 },
  bcard: { flex: 1, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.field, padding: 13 },
  bk: { fontFamily: font.extrabold, fontSize: 13, color: colors.primary, marginBottom: 5 },
  bv: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  cueItem: { flexDirection: 'row', gap: 11 },
  cn: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  cnText: { fontFamily: font.bold, fontSize: 13, color: colors.tintInk },
  ct: { flex: 1, fontFamily: font.regular, fontSize: 15.5, lineHeight: 24, color: colors.ink, paddingTop: 1 },
  muted: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 4 },
  p: { fontFamily: font.regular, fontSize: 15.5, lineHeight: 26, color: colors.ink },
  li: { fontFamily: font.regular, fontSize: 15.5, lineHeight: 24, color: colors.ink },
  setupCard: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.field, padding: 15, marginTop: 4 },
  setupText: { fontFamily: font.regular, fontSize: 15, lineHeight: 25, color: colors.ink },
  goalRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  goalDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
  goalText: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: colors.ink },
})
