// 경량 스택+탭 라우터 — Claude Design proto-app.jsx 패턴을 RN으로 이식.
// react-navigation 없이 useState 스택 하나로 16화면을 운용한다.
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, BackHandler, Animated, Easing } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { colors, font, radius, shadow } from '../theme/tokens'
import type { MemberInput, Sequence } from '../lib/types'
import type { GenerateResult } from '../lib/generateSequence'
import type { Member } from '../lib/members'

export type Route = { name: string; params?: Record<string, any> }

// 화면 간 공유 상태(가벼운 store). 큰 객체는 params 대신 여기로.
export type Ctx = {
  memberId?: string
  member?: Member
  genInput?: MemberInput
  genResult?: GenerateResult
  finalSeq?: Sequence
  classSeq?: Sequence
  savedSessionId?: string // 저장된 세션 id — 수업 완료 시 노트·태그 덧붙이기용
}

export type Nav = {
  go: (name: string, params?: Record<string, any>) => void
  back: () => void
  tab: (name: string) => void
  reset: (name: string, params?: Record<string, any>) => void
  route: Route
  depth: number
  ctx: Ctx
  setCtx: (patch: Partial<Ctx>) => void
  toast: (msg: string) => void
}

const NavContext = createContext<Nav | null>(null)
export const useNav = (): Nav => {
  const v = useContext(NavContext)
  if (!v) throw new Error('useNav must be used within Router')
  return v
}

export const DARK_SCREENS = new Set(['splash', 'classPlay'])

export function Router({ screens, initial = 'splash' }: { screens: Record<string, React.ComponentType>; initial?: string }) {
  const [stack, setStack] = useState<Route[]>([{ name: initial }])
  const [ctx, setCtxState] = useState<Ctx>({})
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cur = stack[stack.length - 1]

  const go = useCallback((name: string, params?: Record<string, any>) => setStack((s) => [...s, { name, params }]), [])
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), [])
  const tab = useCallback((name: string) => setStack([{ name }]), [])
  const reset = useCallback((name: string, params?: Record<string, any>) => setStack([{ name, params }]), [])
  const setCtx = useCallback((patch: Partial<Ctx>) => setCtxState((c) => ({ ...c, ...patch })), [])
  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    if (toastT.current) clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToastMsg(null), 2200)
  }, [])

  // 안드로이드 하드웨어 백 → 스택 pop (루트면 기본 동작)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        back()
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [stack.length, back])

  const nav: Nav = { go, back, tab, reset, route: cur, depth: stack.length, ctx, setCtx, toast }
  const Screen = screens[cur.name]
  const dark = DARK_SCREENS.has(cur.name)

  return (
    <NavContext.Provider value={nav}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={st.root}>
        <ScreenFade routeKey={cur.name + JSON.stringify(cur.params ?? '')}>
          {Screen ? <Screen /> : <Missing name={cur.name} />}
        </ScreenFade>
        {toastMsg ? <Toast msg={toastMsg} /> : null}
      </View>
    </NavContext.Provider>
  )
}

// 화면 진입 시 살짝 위로 슬라이드 (opacity는 건드리지 않아 콘텐츠가 사라지지 않음)
function ScreenFade({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  const ty = useRef(new Animated.Value(10)).current
  useEffect(() => {
    ty.setValue(10)
    Animated.timing(ty, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [routeKey])
  return <Animated.View style={{ flex: 1, transform: [{ translateY: ty }] }}>{children}</Animated.View>
}

function Missing({ name }: { name: string }) {
  return (
    <View style={[st.root, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontFamily: font.semibold, color: colors.muted }}>missing screen: {name}</Text>
    </View>
  )
}

function Toast({ msg }: { msg: string }) {
  const ty = useRef(new Animated.Value(12)).current
  const op = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(ty, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start()
  }, [])
  return (
    <Animated.View style={[st.toast, { opacity: op, transform: [{ translateY: ty }] }]}>
      <Text style={st.toastText}>{msg}</Text>
    </Animated.View>
  )
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 96, backgroundColor: colors.ink, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 13, ...shadow.fab },
  toastText: { fontFamily: font.semibold, fontSize: 14.5, color: '#fff', textAlign: 'center' },
})
