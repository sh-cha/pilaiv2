import { describe, it, expect } from 'vitest'
import { classifyError } from './errors'

describe('classifyError', () => {
  it('네트워크 실패 → offline (RN·web 메시지 모두)', () => {
    expect(classifyError(new Error('Network request failed')).kind).toBe('offline')
    expect(classifyError(new TypeError('Failed to fetch')).kind).toBe('offline')
    expect(classifyError(new Error('Load failed')).kind).toBe('offline')
  })

  it('API 키/인증 → auth', () => {
    expect(classifyError(new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY가 없습니다 (app/.env)')).kind).toBe('auth')
    expect(classifyError(new Error('no api key')).kind).toBe('auth')
    expect(classifyError(new Error('API 401: unauthorized')).kind).toBe('auth')
  })

  it('rate limit(429) → rate', () => {
    expect(classifyError(new Error('API 429: rate_limit_error')).kind).toBe('rate')
  })

  it('서버 5xx/overloaded → server', () => {
    expect(classifyError(new Error('API 500: internal server error')).kind).toBe('server')
    expect(classifyError(new Error('API 529: overloaded')).kind).toBe('server')
  })

  it('분류 불가 → unknown (Error 아닌 값도 안전)', () => {
    expect(classifyError(new Error('no tool_use in response')).kind).toBe('unknown')
    expect(classifyError('그냥 문자열').kind).toBe('unknown')
    expect(classifyError(null).kind).toBe('unknown')
  })

  it('모든 분류는 비어있지 않은 title·message를 가진다', () => {
    for (const e of [new Error('Network request failed'), new Error('API 500'), new Error('???')]) {
      const info = classifyError(e)
      expect(info.title.length).toBeGreaterThan(0)
      expect(info.message.length).toBeGreaterThan(0)
    }
  })
})
