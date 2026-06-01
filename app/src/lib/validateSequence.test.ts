import { describe, it, expect } from 'vitest'
import { validateSequence, countApparatusTransitions } from './validateSequence'
import type { Sequence } from './types'

const base: Sequence = {
  member_summary: 'test',
  mode: 'treatment',
  blocks: [
    { block: '웜업', apparatus: 'reformer', exercises: [{ name: 'Pelvic Curl' }] },
    { block: '풋워크', apparatus: 'reformer', exercises: [{ name: 'Parallel Heels' }] },
  ],
}

describe('countApparatusTransitions', () => {
  it('단일 기구 = 0회', () => {
    expect(countApparatusTransitions(base)).toBe(0)
  })

  it('reformer→cadillac→reformer = 2회', () => {
    expect(
      countApparatusTransitions({
        ...base,
        blocks: [
          { block: 'a', apparatus: 'reformer', exercises: [{ name: 'Pelvic Curl' }] },
          { block: 'b', apparatus: 'cadillac', exercises: [{ name: 'Monkey' }] },
          { block: 'c', apparatus: 'reformer', exercises: [{ name: 'Parallel Heels' }] },
        ],
      }),
    ).toBe(2)
  })
})

describe('validateSequence', () => {
  it('정상 시퀀스는 ok', () => {
    expect(validateSequence(base).ok).toBe(true)
  })

  it('카탈로그에 없는 동작은 에러', () => {
    const r = validateSequence({
      ...base,
      blocks: [{ block: 'x', apparatus: 'reformer', exercises: [{ name: '없는동작999' }] }],
    })
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('없는동작999'))).toBe(true)
  })

  it('기구 전환 4회는 에러', () => {
    const r = validateSequence({
      ...base,
      blocks: [
        { block: '1', apparatus: 'reformer', exercises: [{ name: 'Pelvic Curl' }] },
        { block: '2', apparatus: 'cadillac', exercises: [{ name: 'Monkey' }] },
        { block: '3', apparatus: 'reformer', exercises: [{ name: 'Parallel Heels' }] },
        { block: '4', apparatus: 'cadillac', exercises: [{ name: 'Tower Prep' }] },
        { block: '5', apparatus: 'reformer', exercises: [{ name: 'Parallel Toes' }] },
      ],
    })
    expect(r.ok).toBe(false)
  })

  it('빈 블록은 에러', () => {
    expect(validateSequence({ ...base, blocks: [] }).ok).toBe(false)
  })
})
