import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native'
import { colors, font } from '../theme/tokens'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { generateSequence } from '../lib/generateSequence'
import { loadSessions, sessionsForMember, summarizeHistory } from '../lib/flywheel'
import { classifyError, type ErrInfo } from '../lib/errors'

const STEPS = ['회원 컨텍스트 수집', '금기사항 기반 동작 필터링', '시퀀스 최적화', '안전 규칙 검증']

function Spinner() {
  const rot = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.loop(Animated.timing(rot, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }))
    a.start()
    return () => a.stop()
  }, [])
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  return <Animated.View style={[st.ring, { transform: [{ rotate: spin }] }]} />
}

export function GeneratingScreen() {
  const nav = useNav()
  const [step, setStep] = useState(0)
  const [err, setErr] = useState<ErrInfo | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const hasInput = !!nav.ctx.genInput

  // retryKey가 바뀌면(재시도) 처음부터 다시 실행
  useEffect(() => {
    let alive = true
    setStep(0)
    setErr(null)
    const timers = [700, 1500, 2400].map((ms, i) => setTimeout(() => alive && setStep((s) => Math.max(s, i + 1)), ms))
    ;(async () => {
      const input = nav.ctx.genInput
      if (!input) {
        setErr({ kind: 'unknown', title: '생성 정보가 없어요', message: '생성 폼으로 돌아가 다시 시작해 주세요.' })
        return
      }
      try {
        const all = await loadSessions(kv)
        const hist = nav.ctx.memberId ? summarizeHistory(sessionsForMember(all, nav.ctx.memberId)) : ''
        const fullInput = { ...input, history: hist || undefined }
        const result = await generateSequence(fullInput)
        if (!alive) return
        setStep(4)
        // savedSessionId 클리어 — 생성(재생성 포함) 결과는 항상 새 미저장 시퀀스.
        // 이전 화면에서 저장본을 열었던 ctx가 남아 있으면 그 세션을 덮어쓰게 되므로 반드시 끊는다.
        nav.setCtx({ genResult: result, genInput: fullInput, finalSeq: result.sequence, savedSessionId: undefined })
        setTimeout(() => alive && nav.reset('sequence'), 450)
      } catch (e) {
        if (alive) setErr(classifyError(e))
      }
    })()
    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [retryKey])

  if (err) {
    return (
      <View style={st.gen}>
        <View style={[st.ring, { borderTopColor: colors.warnInk, borderColor: colors.warnBg }]} />
        <Text style={st.title}>{err.title}</Text>
        <Text style={st.errText}>{err.message}</Text>
        {hasInput ? (
          <Pressable style={st.retry} onPress={() => setRetryKey((k) => k + 1)}>
            <Text style={st.retryText}>다시 시도</Text>
          </Pressable>
        ) : null}
        <Pressable hitSlop={8} style={st.back} onPress={() => nav.back()}>
          <Text style={st.backText}>생성 폼으로 돌아가기</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={st.gen}>
      <Spinner />
      <Text style={st.title}>시퀀스를 구성하고 있어요</Text>
      <Text style={st.cap}>약 20~40초 걸려요</Text>
      <View style={st.steps}>
        {STEPS.map((t, i) => {
          const done = i < step
          const cur = i === step
          return (
            <View key={i} style={st.step}>
              <View style={[st.dot, (done || cur) && { borderColor: colors.primary }, done && { backgroundColor: colors.primary }]}>
                {done ? <Icon name="check" size={12} color="#fff" /> : null}
              </View>
              <Text style={[st.stepText, (done || cur) && { color: colors.ink, fontFamily: font.semibold }]}>{t}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  gen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 6 },
  ring: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: colors.tint, borderTopColor: colors.primary, marginBottom: 18 },
  title: { fontFamily: font.extrabold, fontSize: 20, color: colors.ink },
  cap: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 4 },
  errText: { fontFamily: font.regular, fontSize: 13, color: colors.warnInk, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  retry: { marginTop: 18, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22 },
  retryText: { fontFamily: font.bold, fontSize: 15, color: colors.primary },
  back: { marginTop: 14, paddingVertical: 6 },
  backText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  steps: { marginTop: 24, width: '100%', maxWidth: 300, gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: font.regular, fontSize: 14.5, color: colors.faint },
})
