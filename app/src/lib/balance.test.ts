import { describe, it, expect } from 'vitest'
import { regionOf, sequenceCoverage } from './balance'
import type { Sequence } from './types'

const seq = (names: string[]): Sequence => ({
  member_summary: '',
  mode: 'treatment',
  blocks: [{ block: 'b', apparatus: 'reformer', exercises: names.map((name) => ({ name })) }],
})

describe('regionOf', () => {
  it('근육명을 부위로 분류', () => {
    expect(regionOf('고관절 내전근')).toBe('하체')
    expect(regionOf('어깨 내전근')).toBe('상체')
    expect(regionOf('척추 신전근')).toBe('코어')
  })
})

describe('sequenceCoverage', () => {
  it('카탈로그 동작 → 부위별 % 집계', () => {
    // Above Knees=고관절(하체), Adduction=어깨(상체), Back Extension=척추(코어)
    const cov = sequenceCoverage(seq(['Above Knees', 'Adduction', 'Back Extension']))
    expect(cov).not.toBeNull()
    const map = Object.fromEntries(cov!.map((c) => [c.region, c.pct]))
    expect(map['하체']).toBe(33)
    expect(map['상체']).toBe(33)
    expect(map['코어']).toBe(33)
  })

  it('한 부위로 치우치면 그 부위 100%', () => {
    const cov = sequenceCoverage(seq(['Adduction']))
    const map = Object.fromEntries(cov!.map((c) => [c.region, c.pct]))
    expect(map['상체']).toBe(100)
    expect(map['하체']).toBe(0)
  })

  it('카탈로그에 없는 동작뿐이면 null', () => {
    expect(sequenceCoverage(seq(['NotARealExercise']))).toBeNull()
  })

  it('빈 시퀀스는 null', () => {
    expect(sequenceCoverage(seq([]))).toBeNull()
  })
})
