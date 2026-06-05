// 회원 AI 인사이트 — 입력(프로필·세션) 시그니처가 바뀔 때만 Claude(haiku)로 재생성, 같으면 캐시.
// 실패(키 없음·네트워크) 시 규칙 기반(buildInsight)으로 fallback.
import type { Member } from './members'
import type { CapturedSession } from './flywheel'
import type { KV } from './storage'
import { memberBalance, buildInsight } from './balance'
import { splitTags } from './catalog'

declare const process: { env: Record<string, string | undefined> }
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? ''
const MODEL = 'claude-haiku-4-5-20251001' // 짧은 인사이트 → haiku로 빠르고 저렴
const INSIGHTS_KEY = 'pilaiv2.insights.v1'

type InsightCache = Record<string, { sig: string; text: string; at: string }>

// 인사이트에 영향 주는 입력만 추려 시그니처. 같으면 재생성하지 않는다.
export function insightSignature(member: Member, sessions: CapturedSession[]): string {
  return [member.conditions, member.goals, sessions.length, sessions[0]?.id ?? ''].join('|')
}

async function loadCache(kv: KV): Promise<InsightCache> {
  const raw = await kv.getItem(INSIGHTS_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as InsightCache
  } catch {
    return {}
  }
}

const SYSTEM = `당신은 필라테스 강사를 돕는 어시스턴트입니다. 회원 정보와 최근 수업 이력을 보고 다음 수업 방향을 1~2문장으로 제안합니다. 통증·금기를 최우선으로 고려하고, 과장 없이 구체적으로, 부드러운 존댓말로 씁니다. 군더더기 인사말 없이 제안만 적습니다.`

function buildPrompt(member: Member, sessions: CapturedSession[], balance: ReturnType<typeof memberBalance>): string {
  const recent =
    sessions
      .slice(0, 3)
      .map((s) => {
        const names = s.final.blocks.flatMap((b) => b.exercises.map((e) => e.name)).slice(0, 6).join(', ')
        return `${s.createdAt.slice(0, 10)}: ${names}`
      })
      .join('\n') || '없음'
  const bal = balance ? balance.map((b) => `${b.region} ${b.pct}%`).join(' / ') : '데이터 없음'
  return `회원: ${member.name} (${member.sex ?? '-'}, ${member.age ?? '-'})
통증·제약: ${member.conditions || '없음'}
목표: ${member.goals || '없음'}
최근 근육군 비중: ${bal}
최근 수업 동작:
${recent}

이 회원의 다음 수업 방향을 1~2문장으로 제안해 주세요.`
}

async function callClaude(prompt: string): Promise<string> {
  if (!API_KEY) throw new Error('no api key')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 256, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = await res.json()
  const block = (data.content ?? []).find((b: { type: string }) => b.type === 'text') as { text?: string } | undefined
  return (block?.text ?? '').trim()
}

export type InsightResult = { text: string; source: 'cache' | 'ai' | 'rule' }

// 캐시 sig가 현재 입력과 같으면 캐시 반환(호출 0). 다르면 Claude 생성→저장. 실패 시 규칙.
export async function getInsight(kv: KV, member: Member, sessions: CapturedSession[]): Promise<InsightResult> {
  const sig = insightSignature(member, sessions)
  const cache = await loadCache(kv)
  const hit = cache[member.id]
  if (hit && hit.sig === sig) return { text: hit.text, source: 'cache' }

  const balance = memberBalance(sessions)
  try {
    const text = await callClaude(buildPrompt(member, sessions, balance))
    if (text) {
      cache[member.id] = { sig, text, at: new Date().toISOString() }
      await kv.setItem(INSIGHTS_KEY, JSON.stringify(cache))
      return { text, source: 'ai' }
    }
  } catch {
    // 키 없음·네트워크 실패 → 규칙 기반으로
  }
  return { text: buildInsight(member.name, balance, splitTags(member.conditions)), source: 'rule' }
}
