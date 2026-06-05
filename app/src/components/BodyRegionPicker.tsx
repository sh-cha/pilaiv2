// 근육통 부위 선택기 — pilai-ui.jsx의 가벼운 SVG 실루엣 + 앞/뒤 토글 + 부위 탭.
import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Svg, { Path, Rect, Circle, G } from 'react-native-svg'
import { colors, font, radius } from '../theme/tokens'
import { Card } from './ui'

type Spot = { id: string; x: number; y: number; label: string }
const SPOTS: Record<'front' | 'back', Spot[]> = {
  front: [
    { id: 'neck', x: 60, y: 46, label: '목' },
    { id: 'shoulderL', x: 39, y: 60, label: '어깨' },
    { id: 'shoulderR', x: 81, y: 60, label: '어깨' },
    { id: 'abdomen', x: 60, y: 108, label: '복부' },
    { id: 'kneeL', x: 50, y: 188, label: '무릎' },
    { id: 'kneeR', x: 70, y: 188, label: '무릎' },
  ],
  back: [
    { id: 'neck', x: 60, y: 46, label: '목' },
    { id: 'upback', x: 60, y: 80, label: '등' },
    { id: 'lowback', x: 60, y: 110, label: '허리' },
    { id: 'glute', x: 60, y: 138, label: '엉덩이' },
    { id: 'hamL', x: 50, y: 172, label: '햄스트링' },
  ],
}

export function BodyRegionPicker({ side: initSide = 'back', selected: initSel = [] }: { side?: 'front' | 'back'; selected?: string[] }) {
  const [side, setSide] = useState<'front' | 'back'>(initSide)
  const [sel, setSel] = useState<string[]>(initSel)
  const spots = SPOTS[side]
  const tog = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Card style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 }}>
        <View style={st.seg}>
          {(['front', 'back'] as const).map((sd) => (
            <Pressable key={sd} onPress={() => setSide(sd)} style={[st.segT, side === sd && st.segOn]}>
              <Text style={[st.segText, side === sd && { color: colors.ink }]}>{sd === 'front' ? '앞' : '뒤'}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 4 }}>
        <Svg width={120} height={196} viewBox="0 0 120 250">
          <G fill={colors.tint} stroke={colors.line} strokeWidth={1.2}>
            <Circle cx={60} cy={22} r={14} />
            <Rect x={54} y={34} width={12} height={9} rx={3} />
            <Path d="M44 44 h32 a10 10 0 0 1 10 10 l3 34 a6 6 0 0 1-11 2 l-3-22 v18 h-30 v-18 l-3 22 a6 6 0 0 1-11-2 l3-34 a10 10 0 0 1 10-10 z" />
            <Rect x={46} y={86} width={28} height={40} rx={9} />
            <Rect x={47} y={124} width={12.5} height={62} rx={6} />
            <Rect x={60.5} y={124} width={12.5} height={62} rx={6} />
            <Rect x={48} y={184} width={11} height={48} rx={5} />
            <Rect x={61} y={184} width={11} height={48} rx={5} />
          </G>
          {spots.map((sp) => {
            const on = sel.includes(sp.id)
            return (
              <G key={sp.id} onPress={() => tog(sp.id)}>
                {on ? <Circle cx={sp.x} cy={sp.y} r={13} fill="none" stroke={colors.accent} strokeWidth={1.2} opacity={0.4} /> : null}
                <Circle cx={sp.x} cy={sp.y} r={on ? 8 : 6} fill={on ? colors.accent : colors.surface} stroke={on ? colors.accent : colors.muted} strokeWidth={1.6} opacity={on ? 1 : 0.55} />
              </G>
            )
          })}
        </Svg>
      </View>
      <View style={st.labels}>
        {spots.filter((s) => sel.includes(s.id)).map((s, i) => (
          <View key={i} style={st.tag}><Text style={st.tagText}>{s.label}</Text></View>
        ))}
        {sel.length === 0 ? <Text style={st.hint}>탭하여 아픈 부위를 표시하세요</Text> : null}
      </View>
    </Card>
  )
}

const st = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 5, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.field, padding: 4, width: 120 },
  segT: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9 },
  segOn: { backgroundColor: colors.surface },
  segText: { fontFamily: font.bold, fontSize: 13, color: colors.muted },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 },
  tag: { backgroundColor: colors.warnBg, borderRadius: radius.chip, paddingVertical: 5, paddingHorizontal: 12 },
  tagText: { fontFamily: font.semibold, fontSize: 13, color: colors.warnInk },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors.faint },
})
