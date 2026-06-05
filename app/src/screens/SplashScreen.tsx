import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { colors, font } from '../theme/tokens'
import { useNav } from '../nav/router'

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
  useEffect(() => {
    const t = setTimeout(() => nav.reset('login'), 1700)
    return () => clearTimeout(t)
  }, [])
  return (
    <Pressable style={st.splash} onPress={() => nav.reset('login')}>
      <Text style={st.logo}>Pil<Text style={{ opacity: 0.7 }}>ai</Text></Text>
      <Text style={st.tag}>AI 필라테스 시퀀스</Text>
      <DotLine />
    </Pressable>
  )
}

const st = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 14 },
  logo: { fontFamily: font.extrabold, fontSize: 54, color: '#fff', letterSpacing: -1.6 },
  tag: { fontFamily: font.regular, fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 18 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
})
