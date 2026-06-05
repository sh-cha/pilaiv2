// 공유 UI 프리미티브 — Claude Design pilai.css(.dir-a) 컴포넌트를 RN으로 이식.
import React from 'react'
import { View, Text, Pressable, TextInput, StyleSheet, ViewStyle, TextStyle, StyleProp, TextInputProps } from 'react-native'
import { colors, radius, font, shadow } from '../theme/tokens'

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>
}

type BtnVariant = 'primary' | 'ghost' | 'dark'
export function Button({ title, onPress, variant = 'primary', icon, disabled, style }: {
  title: string; onPress?: () => void; variant?: BtnVariant; icon?: React.ReactNode; disabled?: boolean; style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.btn, variant === 'dark' && s.btnDark, variant === 'ghost' && s.btnGhost, disabled && { opacity: 0.5 }, pressed && { opacity: 0.85 }, style]}>
      {icon}
      <Text style={[s.btnText, variant === 'ghost' && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  )
}

type ChipVariant = 'default' | 'dash' | 'tint'
export function Chip({ label, on, variant = 'default', onPress, style, textStyle }: {
  label: React.ReactNode; on?: boolean; variant?: ChipVariant; onPress?: () => void; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[s.chip, on && s.chipOn, variant === 'dash' && s.chipDash, variant === 'tint' && s.chipTint, style]}>
      <Text style={[s.chipText, on && { color: colors.primaryInk }, variant === 'dash' && { color: colors.primary }, variant === 'tint' && { color: colors.tintInk }, textStyle]}>{label}</Text>
    </Pressable>
  )
}

export function ChipRow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.chiprow, style]}>{children}</View>
}

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.label, style]}>{children}</Text>
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.sec, style]}>{children}</Text>
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.faint} {...props} style={[s.input, props.style]} />
}

// 실제 입력이 아닌 placeholder만 보이는 가짜 필드(검색·직접입력 등 프로토타입 자리)
export function FieldGhost({ text, onPress, style }: { text: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[s.input, { justifyContent: 'center' }, style]}>
      <Text style={{ fontFamily: font.regular, fontSize: 16, color: colors.faint }}>{text}</Text>
    </Pressable>
  )
}

export function Insight({ children, icon, style }: { children: React.ReactNode; icon?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.insight, style]}>
      {icon}
      <Text style={s.insightText}>{children}</Text>
    </View>
  )
}

export function Avatar({ name, large, style }: { name: string; large?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.av, large && s.avLg, style]}>
      <Text style={{ fontFamily: font.extrabold, fontSize: large ? 24 : 18, color: colors.tintInk }}>{name.slice(0, 1)}</Text>
    </View>
  )
}

export function Rep({ children, style, textStyle }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return <View style={[s.rep, style]}><Text style={[s.repText, textStyle]}>{children}</Text></View>
}

export function WarnTag({ children }: { children: React.ReactNode }) {
  return <View style={s.warn}><Text style={s.warnText}>{children}</Text></View>
}

export function CondBadge({ children }: { children: React.ReactNode }) {
  return <View style={s.cond}><Text style={s.condText}>{children}</Text></View>
}

export function Stars({ n, size = 15 }: { n: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, letterSpacing: 2 }}>
      <Text style={{ color: colors.accent }}>{'★'.repeat(n)}</Text>
      <Text style={{ color: colors.line }}>{'★'.repeat(Math.max(0, 5 - n))}</Text>
    </Text>
  )
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[s.hr, style]} />
}

export function StepBar({ total, step }: { total: number; step: number }) {
  return (
    <View style={s.stepbar}>
      {Array.from({ length: total }).map((_, i) => <View key={i} style={[s.stepi, i <= step && { backgroundColor: colors.primary }]} />)}
    </View>
  )
}

export function DiffDots({ level, total = 5 }: { level: number; total?: number }) {
  return (
    <View style={s.diffRow}>
      {Array.from({ length: total }).map((_, i) => <View key={i} style={[s.diffi, i < level && { backgroundColor: colors.primary }]} />)}
    </View>
  )
}

export function TabSeg<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.tseg}>
      {tabs.map(([key, label]) => {
        const on = key === value
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={[s.tsegT, on && s.tsegTOn]}>
            <Text style={[s.tsegText, on && { color: colors.ink }]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 18, ...shadow.card },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.btn, paddingVertical: 16, backgroundColor: colors.primary },
  btnDark: { backgroundColor: colors.ink },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  btnText: { fontFamily: font.bold, fontSize: 16.5, color: colors.primaryInk, letterSpacing: -0.1 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: radius.chip, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDash: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed' },
  chipTint: { backgroundColor: colors.tint, borderColor: 'transparent' },
  chipText: { fontFamily: font.semibold, fontSize: 14.5, color: colors.muted },
  chiprow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, marginBottom: 8 },
  sec: { fontFamily: font.bold, fontSize: 13, color: colors.muted, marginTop: 20, marginBottom: 10, marginHorizontal: 2 },
  input: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.field, paddingVertical: 13, paddingHorizontal: 15, fontSize: 16, color: colors.ink, fontFamily: font.regular },
  insight: { backgroundColor: colors.tint, borderRadius: radius.card, paddingVertical: 16, paddingHorizontal: 17, flexDirection: 'row', gap: 10 },
  insightText: { fontFamily: font.regular, fontSize: 15, lineHeight: 24, color: colors.tintInk, flex: 1 },
  av: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  avLg: { width: 64, height: 64, borderRadius: 32 },
  rep: { backgroundColor: colors.tint, borderRadius: radius.chip, paddingVertical: 5, paddingHorizontal: 11, alignSelf: 'flex-start' },
  repText: { fontFamily: font.bold, fontSize: 13.5, color: colors.tintInk },
  warn: { backgroundColor: colors.warnBg, borderRadius: radius.chip, paddingVertical: 4, paddingHorizontal: 9, alignSelf: 'flex-start' },
  warnText: { fontFamily: font.bold, fontSize: 12, color: colors.warnInk },
  cond: { backgroundColor: colors.tint, borderRadius: radius.chip, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  condText: { fontFamily: font.bold, fontSize: 12, color: colors.tintInk },
  hr: { height: 1, backgroundColor: colors.line, marginVertical: 10 },
  stepbar: { flexDirection: 'row', gap: 6 },
  stepi: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  diffRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  diffi: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line },
  tseg: { flexDirection: 'row', gap: 5, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.field, padding: 4 },
  tsegT: { flex: 1, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6, borderRadius: 10 },
  tsegTOn: { backgroundColor: colors.surface, ...shadow.sm },
  tsegText: { fontFamily: font.bold, fontSize: 14, color: colors.muted },
})
