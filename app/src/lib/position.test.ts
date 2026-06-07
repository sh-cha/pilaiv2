import { describe, it, expect } from 'vitest'
import { positionOf, classifiedCount } from './position'
import { allEx } from './catalog'

describe('positionOf (시작 자세 휴리스틱)', () => {
  it('카탈로그 거의 전부를 분류 (참조 해소 포함, ≥95%)', () => {
    expect(classifiedCount / allEx.length).toBeGreaterThanOrEqual(0.95)
  })

  // 대표 동작 스팟체크 — BASI 표준 자세와 일치해야 함
  it.each([
    ['Pelvic Curl', '누움'],
    ['Hundred', '누움'], // "Hundred Prep 자세에서 시작" 참조 해소
    ['Shoulder Bridge', '누움'],
    ['Side Kick', '옆으로 누움'],
    ['Push Up', '엎드림'], // 플랭크 계열
    ['Teaser', '앉음'],
    ['Mermaid', '앉음'],
    ['Leg Pull Back', '앉음'], // "백 서포트 자세" 참조 해소
    ['Rest Position', '무릎·네발'],
    ['Cat Stretch', '무릎·네발'],
    ['Elephant', '서기'], // "업 스트레치 1 자세" 참조 해소
    ['Scooter', '서기'],
  ] as const)('%s → %s', (name, pos) => {
    expect(positionOf(name)).toBe(pos)
  })

  it('카탈로그에 없는 이름 → null', () => {
    expect(positionOf('없는동작ZZZ')).toBeNull()
  })
})
