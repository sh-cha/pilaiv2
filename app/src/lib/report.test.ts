import { describe, it, expect } from 'vitest'
import { submitReport, REPORTS_KEY, type Report } from './report'
import type { KV } from './storage'

function fakeKV() {
  const store: Record<string, string> = {}
  const kv: KV = {
    async getItem(k) {
      return store[k] ?? null
    },
    async setItem(k, v) {
      store[k] = v
    },
  }
  return { kv, store }
}

const mk = (message: string): Report => ({
  kind: '버그',
  message,
  context: { appVersion: 'v0.1 베타', platform: 'ios', osVersion: '18.0', screen: 'settings' },
  createdAt: '2026-06-07T00:00:00Z',
})

describe('submitReport', () => {
  it('클라우드 전송자가 있으면 cloud로 보내고 로컬엔 안 쌓음', async () => {
    const { kv, store } = fakeKV()
    const sent: Report[] = []
    const where = await submitReport(kv, mk('드래그가 이상해요'), async (r) => {
      sent.push(r)
    })
    expect(where).toBe('cloud')
    expect(sent).toHaveLength(1)
    expect(sent[0].context.platform).toBe('ios')
    expect(store[REPORTS_KEY]).toBeUndefined()
  })

  it('클라우드 실패는 throw로 전파 (화면이 에러 토스트)', async () => {
    const { kv } = fakeKV()
    await expect(
      submitReport(kv, mk('x'), async () => {
        throw new Error('network')
      }),
    ).rejects.toThrow('network')
  })

  it('전송자가 없으면(미설정/미로그인) local로 저장하고 컨텍스트 보존', async () => {
    const { kv, store } = fakeKV()
    const where = await submitReport(kv, mk('드래그가 이상해요'), null)
    expect(where).toBe('local')
    const saved = JSON.parse(store[REPORTS_KEY])
    expect(saved).toHaveLength(1)
    expect(saved[0].message).toBe('드래그가 이상해요')
    expect(saved[0].context.screen).toBe('settings')
  })

  it('여러 건이면 최신이 앞 (sessions 컨벤션)', async () => {
    const { kv, store } = fakeKV()
    await submitReport(kv, mk('첫번째'), null)
    await submitReport(kv, mk('두번째'), null)
    const saved = JSON.parse(store[REPORTS_KEY])
    expect(saved.map((r: Report) => r.message)).toEqual(['두번째', '첫번째'])
  })

  it('저장소가 손상돼도 덮어쓰고 진행 (앱 안 죽음)', async () => {
    const { kv, store } = fakeKV()
    store[REPORTS_KEY] = '{깨진 json'
    await submitReport(kv, mk('살아남기'), null)
    expect(JSON.parse(store[REPORTS_KEY])[0].message).toBe('살아남기')
  })
})
