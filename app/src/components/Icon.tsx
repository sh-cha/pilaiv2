// 라인 아이콘 — Claude Design PIco 세트를 react-native-svg로 이식.
import React from 'react'
import Svg, { Path, Circle } from 'react-native-svg'
import { colors } from '../theme/tokens'

export type IconName =
  | 'home' | 'people' | 'spark' | 'list' | 'gear' | 'back' | 'chev'
  | 'x' | 'plus' | 'check' | 'bell' | 'msg'

type Props = { name: IconName; size?: number; color?: string }

export function Icon({ name, size = 22, color = colors.ink }: Props) {
  const box = { fill: 'none' as const }
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Path d="M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      )
    case 'people':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Circle cx={9} cy={8} r={3.2} stroke={color} strokeWidth={1.8} />
          <Path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M16 6.2A3 3 0 0118 11M17 14.4c2.3.5 4 2.4 4 4.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      )
    case 'spark':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill={color} />
        </Svg>
      )
    case 'list':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Path d="M8 7h12M8 12h12M8 17h12M3.5 7h.01M3.5 12h.01M3.5 17h.01" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
        </Svg>
      )
    case 'gear':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" stroke={color} strokeWidth={1.6} />
          <Path d="M19.4 13a7.8 7.8 0 000-2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 00-1.7-1l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.5L4.6 11a7.8 7.8 0 000 2l-2 1.5 2 3.5 2.4-1c.5.4 1.1.7 1.7 1l.4 2.5h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.5z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
        </Svg>
      )
    case 'back':
      return (
        <Svg width={size * 0.6} height={size} viewBox="0 0 12 20" {...box}>
          <Path d="M10 2L2 10l8 8" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'chev':
      return (
        <Svg width={size * 0.57} height={size} viewBox="0 0 8 14" {...box}>
          <Path d="M1 1l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'x':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      )
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      )
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Path d="M4 12l5 5L20 6" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
          <Path d="M10 20a2 2 0 004 0" stroke={color} strokeWidth={1.7} />
        </Svg>
      )
    case 'msg':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" {...box}>
          <Path d="M4 5h16v11H8l-4 3V5z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        </Svg>
      )
  }
}
