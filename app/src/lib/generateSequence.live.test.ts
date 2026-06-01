// 라이브 통합 테스트: 실제 Anthropic API 호출. RUN_LIVE=1 + 키가 있을 때만 실행.
// 일반 `npm test`에서는 describe.runIf가 falsy → 스킵 (네트워크/비용 없음).
import { describe, it, expect } from 'vitest'
import { generateSequence } from './generateSequence'
import type { MemberInput } from './types'

const input: MemberInput = {
  age: '30대',
  conditions: '목디스크, 거북목, 말린 어깨',
  goals: '자세교정, 코어',
  apparatus: ['reformer', 'cadillac'],
  minutes: 50,
}

describe.runIf(process.env.RUN_LIVE)('LIVE: 프롬프트 캐싱 + end-to-end 생성', () => {
  it('1차=cache write, 2차=cache read, 둘 다 검증 통과', async () => {
    const r1 = await generateSequence(input)
    console.log('CALL1', JSON.stringify({ usage: r1.usage, attempts: r1.attempts, ok: r1.validation.ok }))
    const r2 = await generateSequence(input)
    console.log('CALL2', JSON.stringify({ usage: r2.usage, attempts: r2.attempts, ok: r2.validation.ok }))
    console.log('SEQ', JSON.stringify(r2.sequence, null, 2))

    expect(r1.validation.ok).toBe(true)
    expect(r2.validation.ok).toBe(true)
    expect(r1.usage.cache_creation_input_tokens ?? 0).toBeGreaterThan(0) // 1차: 캐시 생성
    expect(r2.usage.cache_read_input_tokens ?? 0).toBeGreaterThan(0) // 2차: 캐시 히트
  }, 150000)
})
