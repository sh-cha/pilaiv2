import React from 'react'
import { View } from 'react-native'
import { useFonts } from 'expo-font'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { fontAssets } from './src/theme/fonts'
import { Router } from './src/nav/router'
import { screens } from './src/screens'
import { colors } from './src/theme/tokens'

export default function App() {
  const [loaded] = useFonts(fontAssets)
  if (!loaded) {
    // 폰트 로딩 중 — 스플래시 톤과 같은 세이지 배경
    return <View style={{ flex: 1, backgroundColor: colors.primary }} />
  }
  return (
    <SafeAreaProvider>
      <Router screens={screens} initial="splash" />
    </SafeAreaProvider>
  )
}
