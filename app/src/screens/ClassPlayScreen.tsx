import React, { useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { font } from '../theme/tokens'
import { useNav } from '../nav/router'
import type { Sequence, SeqExercise } from '../lib/types'

function flatten(seq: Sequence): (SeqExercise & { block: string })[] {
  const out: (SeqExercise & { block: string })[] = []
  seq.blocks.forEach((b) => b.exercises.forEach((e) => out.push({ ...e, block: b.block })))
  return out
}

export function ClassPlayScreen() {
  const nav = useNav()
  const insets = useSafeAreaInsets()
  const seq = nav.ctx.classSeq
  const list = seq ? flatten(seq) : []
  const [i, setI] = useState(0)
  const [sec, setSec] = useState(0)
  const [paused, setPaused] = useState(false)

  // 수업 시작부터 누적되는 '총 경과' 타이머 (일시정지 중엔 멈춤)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [paused])

  if (!list.length) {
    return (
      <View style={[st.play, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: font.semibold, color: '#fff' }}>시퀀스가 없습니다</Text>
      </View>
    )
  }

  const cur = list[i]
  const nxt = list[i + 1]
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  const pct = Math.round(((i + 1) / list.length) * 100)

  return (
    <View style={st.play}>
      <View style={[st.pbar, { marginTop: insets.top }]}>
        <View style={[st.pbarFill, { width: `${pct}%` }]} />
      </View>
      <View style={st.ptop}>
        <Text style={st.ph}>{cur.block} · {i + 1}/{list.length}</Text>
        <Pressable hitSlop={8} onPress={() => nav.back()}><Text style={st.x}>나가기</Text></Pressable>
      </View>

      <View style={st.pmid}>
        <Text style={st.idx}>EXERCISE {String(i + 1).padStart(2, '0')}</Text>
        <Text style={st.name}>{cur.name}</Text>
        {cur.reps ? <Text style={st.reps}>{cur.reps}</Text> : null}
        <View style={st.illus}><Text style={st.illusText}>동작 시연</Text></View>
        <Pressable onPress={() => setPaused((p) => !p)} hitSlop={12} style={{ alignItems: 'center' }}>
          <Text style={st.tlabel}>총 경과</Text>
          <Text style={st.timer}>{mm}:{ss}</Text>
          <Text style={st.timerHint}>{paused ? '▶  탭하여 재개' : '⏸  탭하여 일시정지'}</Text>
        </Pressable>
      </View>

      <View style={[st.pnext, { paddingBottom: insets.bottom + 20 }]}>
        {nxt ? (
          <View style={st.nextcard}>
            <View style={{ flex: 1 }}>
              <Text style={st.nextLab}>다음 동작</Text>
              <Text style={st.nextName}>{nxt.name}</Text>
            </View>
            {nxt.reps ? <View style={st.nextRep}><Text style={st.nextRepText}>{nxt.reps}</Text></View> : null}
          </View>
        ) : (
          <View style={st.nextcard}><Text style={st.lastText}>마지막 동작이에요</Text></View>
        )}
        <View style={st.pctrl}>
          <Pressable style={[st.pbtn, i === 0 && { opacity: 0.4 }]} disabled={i === 0} onPress={() => setI(Math.max(0, i - 1))}>
            <Text style={st.pbtnText}>이전</Text>
          </Pressable>
          {nxt ? (
            <Pressable style={[st.pbtn, st.pbtnMain]} onPress={() => setI(i + 1)}>
              <Text style={[st.pbtnText, st.pbtnMainText]}>다음 동작</Text>
            </Pressable>
          ) : (
            <Pressable style={[st.pbtn, st.pbtnMain]} onPress={() => nav.reset('classComplete')}>
              <Text style={[st.pbtnText, st.pbtnMainText]}>수업 마치기</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}

const INK = '#2B2C28'
const st = StyleSheet.create({
  play: { flex: 1, backgroundColor: INK },
  pbar: { height: 4, backgroundColor: 'rgba(255,255,255,0.18)' },
  pbarFill: { height: '100%', backgroundColor: '#fff' },
  ptop: { paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ph: { fontFamily: font.bold, fontSize: 13, letterSpacing: 0.6, color: 'rgba(255,255,255,0.6)' },
  x: { fontFamily: font.semibold, fontSize: 15, color: 'rgba(255,255,255,0.7)' },
  pmid: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, gap: 8 },
  idx: { fontFamily: font.mono, fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2 },
  name: { fontFamily: font.extrabold, fontSize: 32, color: '#fff', letterSpacing: -0.6, textAlign: 'center', lineHeight: 38 },
  reps: { fontFamily: font.regular, fontSize: 17, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  illus: { width: 200, height: 130, borderRadius: 14, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  illusText: { fontFamily: font.mono, fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  tlabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 1, color: 'rgba(255,255,255,0.5)', marginTop: 18, textTransform: 'uppercase' },
  timer: { fontFamily: font.mono, fontSize: 46, color: '#fff', letterSpacing: 1, marginTop: 4, textAlign: 'center' },
  timerHint: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 4 },
  pnext: { paddingHorizontal: 20, paddingTop: 16 },
  nextcard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  nextLab: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.6, color: 'rgba(255,255,255,0.55)' },
  nextName: { fontFamily: font.bold, fontSize: 15, color: '#fff', marginTop: 2 },
  nextRep: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  nextRepText: { fontFamily: font.bold, fontSize: 13.5, color: '#fff' },
  lastText: { fontFamily: font.bold, fontSize: 15, color: '#fff', flex: 1 },
  pctrl: { flexDirection: 'row', gap: 12 },
  pbtn: { flex: 1, paddingVertical: 16, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center' },
  pbtnText: { fontFamily: font.bold, fontSize: 16, color: '#fff' },
  pbtnMain: { flex: 2, backgroundColor: '#fff' },
  pbtnMainText: { color: INK },
})
