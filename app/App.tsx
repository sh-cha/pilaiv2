import React, { useEffect } from 'react'
import { View } from 'react-native'
import { useFonts } from 'expo-font'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { fontAssets } from './src/theme/fonts'
import { Router } from './src/nav/router'
import { screens } from './src/screens'
import { initAuth } from './src/lib/auth'

export default function App() {
  const [loaded] = useFonts(fontAssets)
  // Supabase 세션 복원 + 구독(미설정이면 no-op). kv.ts가 세션 유무로 클라우드/로컬 분기.
  useEffect(() => {
    initAuth()
  }, [])
  if (!loaded) {
    // 폰트 로딩 중 — 스플래시(딥 포레스트) 톤과 동일
    return <View style={{ flex: 1, backgroundColor: '#2F4636' }} />
  }
  return (
    <SafeAreaProvider>
      <Router screens={screens} initial="splash" />
    </SafeAreaProvider>
  )
}
