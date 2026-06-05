// A·Studio 디자인 토큰 — Claude Design 핸드오프(pilai.css .dir-a) 1:1 이식. 라이트 모드만.
import { TextStyle, ViewStyle } from 'react-native'

export const colors = {
  bg: '#F1EDE3',
  surface: '#FFFFFF',
  surface2: '#F7F4EC',
  ink: '#2B2C28',
  muted: '#6E6F66',
  faint: '#A7A89E',
  line: '#E7E2D5',
  primary: '#5C7A60',
  primaryStrong: '#4B6650',
  primaryInk: '#FFFFFF',
  tint: '#E7EEE5',
  tintInk: '#3F5740',
  accent: '#B0764F',
  warnBg: '#F4E4D8',
  warnInk: '#9A4F2E',
} as const

export const radius = { card: 20, chip: 999, field: 14, btn: 16, sheet: 24 } as const

export const space = { pad: 18, gap: 14, screenX: 16 } as const

// RN은 커스텀 폰트에서 fontWeight 자동 매핑이 안 되므로 weight별 fontFamily를 직접 지정한다.
export const font = {
  regular: 'Pretendard-Regular', // 400
  medium: 'Pretendard-Medium', // 500
  semibold: 'Pretendard-SemiBold', // 600
  bold: 'Pretendard-Bold', // 700
  extrabold: 'Pretendard-ExtraBold', // 800
  mono: 'SplineSansMono-Regular', // 숫자/타이머
  monoMedium: 'SplineSansMono-Medium',
  monoSemibold: 'SplineSansMono-SemiBold',
} as const

// pilai.css의 2겹 그림자(0 1px 2px + 0 10px 28px)를 RN 단일 그림자로 근사.
export const shadow: Record<'card' | 'sm' | 'fab', ViewStyle> = {
  card: { shadowColor: '#28281E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 3 },
  sm: { shadowColor: '#28281E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  fab: { shadowColor: '#3C503C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
}

// 자주 쓰는 텍스트 스타일 헬퍼 (letter-spacing은 RN에서 px 단위).
export const type = {
  h1: { fontFamily: font.extrabold, fontSize: 27, color: colors.ink, letterSpacing: -0.7 } as TextStyle,
  title: { fontFamily: font.extrabold, fontSize: 21, color: colors.ink, letterSpacing: -0.4 } as TextStyle,
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.ink } as TextStyle,
  body: { fontFamily: font.regular, fontSize: 15, color: colors.ink } as TextStyle,
  cap: { fontFamily: font.regular, fontSize: 13, color: colors.muted } as TextStyle,
  capFaint: { fontFamily: font.regular, fontSize: 13, color: colors.faint } as TextStyle,
}
