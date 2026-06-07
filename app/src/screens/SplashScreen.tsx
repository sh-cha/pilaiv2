import React, { useEffect, useRef } from 'react'
import { View, Text, Image, Pressable, StyleSheet, Animated } from 'react-native'
import { font } from '../theme/tokens'
import { useNav } from '../nav/router'
import { waitForSession } from '../lib/auth'

// 앱 아이콘 톤과 통일 (딥 포레스트 + 크림)
const FOREST = '#2F4636'
const CREAM = '#F0EAD9'

function DotLine() {
  const vals = useRef([0, 1, 2].map(() => new Animated.Value(0.4))).current
  useEffect(() => {
    const anims = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(v, { toValue: 0.95, duration: 600, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ]),
      ),
    )
    anims.forEach((a) => a.start())
    return () => anims.forEach((a) => a.stop())
  }, [])
  return (
    <View style={st.dots}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={[st.dot, { opacity: v }]} />
      ))}
    </View>
  )
}

export function SplashScreen() {
  const nav = useNav()
  // 세션이 복원되면 로그인 건너뛰고 홈으로 (로그아웃 전까지 유지). 최소 1.4초는 스플래시 노출.
  const decide = () => waitForSession().then((uid) => nav.reset(uid ? 'home' : 'login'))
  useEffect(() => {
    let alive = true
    Promise.all([waitForSession(), new Promise((r) => setTimeout(r, 1400))]).then(([uid]) => {
      if (alive) nav.reset(uid ? 'home' : 'login')
    })
    return () => {
      alive = false
    }
  }, [])
  return (
    <Pressable style={st.splash} onPress={decide}>
      <Image source={require('../../assets/icon.png')} style={st.icon} />
      <Text style={st.logo}>Pil<Text style={{ opacity: 0.7 }}>ai</Text></Text>
      <Text style={st.tag}>맞춤 필라테스 시퀀스</Text>
      <DotLine />
    </Pressable>
  )
}

const st = StyleSheet.create({
  splash: { flex: 1, backgroundColor: FOREST, alignItems: 'center', justifyContent: 'center', gap: 14 },
  icon: { width: 96, height: 96, borderRadius: 22, marginBottom: 22 },
  logo: { fontFamily: font.extrabold, fontSize: 40, color: CREAM, letterSpacing: -1.2 },
  tag: { fontFamily: font.regular, fontSize: 15, color: 'rgba(240,234,217,0.8)' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: CREAM },
})
