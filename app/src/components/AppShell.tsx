// 앱 셸 — Header / Body(ScrollView) / Footer / TabBar. proto.css의 .ph-* 이식.
import React from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, font } from '../theme/tokens'
import { Icon, IconName } from './Icon'
import { useNav } from '../nav/router'

export function Wordmark({ size = 24, light = false }: { size?: number; light?: boolean }) {
  return (
    <Text style={{ fontFamily: font.extrabold, fontSize: size, color: light ? '#fff' : colors.primary, letterSpacing: -0.02 * size }}>
      Pil<Text>ai</Text>
    </Text>
  )
}

const TABS: [string, string, IconName][] = [
  ['home', '홈', 'home'],
  ['members', '회원', 'people'],
  ['history', '기록', 'list'],
]

type Props = {
  children: React.ReactNode
  title?: string // 있으면 뒤로가기+제목 헤더
  onBack?: () => void // 뒤로 동작 커스텀 (기본 nav.back) — 스테퍼 등에서 사용
  gear?: boolean // 로고 헤더의 설정 아이콘
  tab?: string // 있으면 하단 탭바 표시 (현재 탭 id)
  footer?: React.ReactNode
  scroll?: boolean
  headerBorder?: boolean
  bodyStyle?: StyleProp<ViewStyle>
}

export function AppShell({ children, title, onBack, gear, tab, footer, scroll = true, headerBorder, bodyStyle }: Props) {
  const insets = useSafeAreaInsets()
  const nav = useNav()
  return (
    <View style={st.app}>
      {title ? (
        <View style={[st.head, st.headBorder, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onBack ?? nav.back} style={st.iconBtn} hitSlop={8}><Icon name="back" size={17} color={colors.ink} /></Pressable>
          <Text style={st.title} numberOfLines={1}>{title}</Text>
        </View>
      ) : (
        <View style={[st.head, headerBorder && st.headBorder, { paddingTop: insets.top + 8 }]}>
          <Wordmark />
          <View style={{ flex: 1 }} />
          {gear ? <Pressable onPress={() => nav.go('settings')} style={st.iconBtn} hitSlop={8}><Icon name="gear" size={18} color={colors.muted} /></Pressable> : null}
        </View>
      )}

      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.body, bodyStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, bodyStyle]}>{children}</View>
      )}

      {footer ? <View style={[st.foot, { paddingBottom: insets.bottom + 14 }]}>{footer}</View> : null}

      {tab ? (
        <View style={[st.tabs, { paddingBottom: insets.bottom + 10 }]}>
          {TABS.map(([id, label, icon]) => {
            const on = tab === id
            return (
              <Pressable key={id} onPress={() => nav.tab(id)} style={st.tab}>
                <Icon name={icon} size={22} color={on ? colors.primary : colors.faint} />
                <Text style={[st.tabLabel, { color: on ? colors.primary : colors.faint }]}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const st = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 8, backgroundColor: colors.bg },
  headBorder: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: font.extrabold, fontSize: 19, color: colors.ink, letterSpacing: -0.4 },
  body: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  foot: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, paddingHorizontal: 16, gap: 10 },
  tabs: { flexDirection: 'row', paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontFamily: font.bold, fontSize: 11 },
})
