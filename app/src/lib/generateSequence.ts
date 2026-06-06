// 시퀀스 생성 오케스트레이션: generator → verifier → [실패] repair(≤N) (ARCHITECTURE §2)
// ⚠️ 개발 프로토타입: 앱에서 Claude API를 직접 호출 (키가 번들에 노출됨).
//    프로덕션 전 반드시 Supabase Edge Function으로 이동할 것.
import catalog from '../data/exercises.json'
import type { MemberInput, Sequence } from './types'
import { validateSequence, type ValidationResult } from './validateSequence'

declare const process: { env: Record<string, string | undefined> }

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? ''
export const MODEL = 'claude-sonnet-4-6' // 기본 생성 모델. eval에서 opus와 비교 시 makeClaudeCall로 교체.
const MAX_REPAIRS = 2

type Ex = {
  name: string
  apparatus: string[]
  block: string | null
  block_ko?: string
  level_ko?: string
  muscle_focus_ko?: string[]
}

const SYSTEM = `당신은 BASI 필라테스 시퀀스 생성 전문가입니다. 회원 조건과 동작 카탈로그를 받아 그 회원에게 맞는 시퀀스를 짭니다.

## 생성 로직 (진단 → 처방)
1. 회원 증상/목표 → 기능해부학적으로 원인 근육을 추론한다.
2. 원인 근육 → 타깃 동작 선정. 문제 부위 블록에서는 기본 동작 대신 타깃 동작을 넣는다.
3. BASI 블록 순서로 배열: 웜업 → 풋워크 → 복부(코어) → 척추분절 → 고관절/다리 → 측면굴곡 → 팔 → 등신전 → 스트레칭/쿨다운 (회원 목표에 맞는 블록 비중을 높인다).

## 기구 흐름 규칙 (중요)
- 기구 전환은 최대 2~3회. 적을수록 좋고 단일 기구도 OK.
- 한 기구에서 할 동작을 블록으로 모은다. 동작마다 기구를 오가지 않는다.
- 같은 동작이 여러 기구에서 가능하면, 지금 있는 블록의 기구로 배정해 전환을 만들지 않는다.

## 안전
- 회원 통증·제약(예: 목디스크 → 경추 굴곡/역위 부하)에 위험한 동작은 caution에 주의·수정법을 쓰거나, 더 안전한 동작으로 대체한다.
- caution은 짧고 명확하게 쓰고, 구두점은 쉼표로 통일한다(대시 − ·괄호를 섞어 복잡하게 쓰지 말 것).

## 컨디션 분기
- todayCondition이 나쁨/피곤/통증 등이면 mode="relax": 문제 해결 대신 스트레칭·전체 이완 위주로 전체를 대체한다. 그 외에는 mode="treatment".

## 케어 사이클 (이력이 있을 때)
- "최근 수업 이력"이 주어지면: 문제 부위를 다루는 핵심 타깃 동작은 유지하되, 나머지는 지난 회차와 다르게 변주한다 (같은 동작 반복 최소화, 점진적 진행 또는 대체 동작).
- 2~5회에 걸쳐 문제를 개선하는 흐름을 의식한다. 이력이 없으면 평소대로 생성한다.

## 출력
- 반드시 emit_sequence 도구를 1회 호출한다.
- **blocks(시퀀스 본체)를 반드시 채운다 — 절대 비우지 않는다.** 진단이 복잡한 회원(임신·다중 통증 등)이라도 blocks 생성이 최우선이며, 안전이 걱정되면 더 보수적인 동작으로 채우되 시퀀스는 항상 만든다.
- summary_points는 강사에게 **오늘 이 시퀀스를 왜 이렇게 짰는지** 친근한 존댓말 2문장으로 알려준다: (1) 이력·목표에 따른 오늘의 변주 의도, (2) 통증·금기에 따른 제외·주의. 예: "최근 3회 코어 집중이 많아 오늘은 하체·후면체인 비중을 높였어요. 목디스크를 고려해 척추 굴곡·경추 부하 동작은 뺐습니다." 이력(최근 수업)이 있으면 그 변화를 짚고, 없으면 목표 중심으로. 길게 늘이지 말 것.
- member_summary는 그보다 **자세한 진단 설명**(증상 → 원인 근육 → 처방 방향)을 쓴다 — 강사가 '자세히'로 펼쳐 읽는다. 한국어로 풀어서, 영어 동작·근육명 나열이나 대시(-)·괄호 남발 없이 매끄럽게. 단 과하게 길게 늘이지 말 것(blocks가 본체).
- 카탈로그에 실제로 있는 동작 이름만 사용한다 (지어내지 않는다).
- 각 동작에 reps(반복수 또는 시간)를 반드시 채운다 — 선생님이 수업 중 그대로 보고 진행한다.
- 각 동작에 reason을 **반드시** 짧은 한 구절로 채운다 — 이 회원에게 왜 이 동작인지(증상·목표·이력과 연결). 명사구로 간결하게, 동작 이름 반복 없이. 예: "후면체인 보강", "거북목 완화 흉추 신전", "지난주 코어 과다로 변주", "고관절 가동성 회복". 일반론("전신 강화") 말고 이 회원 맥락으로.`

const SEQUENCE_TOOL = {
  name: 'emit_sequence',
  description: '생성된 시퀀스를 emit한다.',
  input_schema: {
    type: 'object',
    properties: {
      member_summary: {
        type: 'string',
        description: '상세 진단 (증상 → 원인 근육 → 처방 방향). 강사가 "자세히"로 펼쳐 읽는 전체 설명.',
      },
      summary_points: {
        type: 'array',
        items: { type: 'string' },
        description: '위 진단의 핵심을 강사가 한눈에 보는 2~3개 불릿. 각 한 문장, 간결하게. 예: "목디스크 고려해 경추 부하 동작 제외", "흉추 신전·견갑 안정화 우선".',
      },
      mode: { type: 'string', enum: ['treatment', 'relax'] },
      blocks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            block: { type: 'string', description: '블록명 (웜업/풋워크/복부/...)' },
            apparatus: { type: 'string', description: '이 블록에서 쓰는 기구' },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: '카탈로그의 동작 이름' },
                  reps: { type: 'string', description: '반복수 또는 시간. 예: "8~10회", "양쪽 각 6회", "30초 홀드". 반드시 채운다.' },
                  reason: { type: 'string', description: '이 회원에게 왜 이 동작을 넣었는지 짧은 명사구. 증상·목표·이력과 연결. 예: "후면체인 보강", "거북목 완화 흉추 신전", "지난주 코어 과다로 변주". 반드시 채운다.' },
                  caution: { type: 'string', description: '주의/수정 (없으면 생략)' },
                },
                required: ['name'],
              },
            },
          },
          required: ['block', 'apparatus', 'exercises'],
        },
      },
    },
    required: ['member_summary', 'summary_points', 'mode', 'blocks'],
  },
}

// ── 프롬프트 빌더 (순수 함수) ────────────────────────────────────────────
function catalogForPrompt(apparatus: string[]) {
  return (catalog as Ex[])
    .filter((e) => e.apparatus.some((a) => apparatus.includes(a)))
    .map((e) => ({
      name: e.name,
      apparatus: e.apparatus,
      block: e.block_ko ?? e.block,
      level: e.level_ko,
      muscles: e.muscle_focus_ko,
    }))
}

// 캐시 블록: 카탈로그를 user message 선두에 두고 cache_control 부여.
// → system + tools + 이 블록까지가 캐시 프리픽스. 같은 기구 조합으로 재생성/repair 시 0.1x로 재사용.
function catalogBlock(apparatus: string[]) {
  return {
    type: 'text' as const,
    text: `## 동작 카탈로그 (이 안에서만 선택)\n${JSON.stringify(catalogForPrompt(apparatus))}`,
    cache_control: { type: 'ephemeral' as const },
  }
}

// 원본 시퀀스를 프롬프트용으로 간결 직렬화 (재생성 시 "기반"으로 제공 → 과교정 방지)
function seqToPromptText(seq: Sequence): string {
  return (seq.blocks ?? [])
    .map((b) => `[${b.block} · ${b.apparatus}] ${(b.exercises ?? []).map((e) => e.name + (e.reps ? `(${e.reps})` : '')).join(', ')}`)
    .join('\n')
}

// 비캐시 후행 블록: 회원 정보 + 이력 (매 요청 가변).
function memberBlock(input: MemberInput) {
  const history = input.history ? `\n\n${input.history}` : ''
  const adjust = input.adjust
    ? input.baseSequence
      ? `\n\n## 재조정 요청 (직전 생성본 기반 편집)\n아래가 직전 생성본입니다. 이것을 **기반**으로, 선생님이 요청한 방향만 반영해 수정하세요.\n\n[직전 생성본]\n${seqToPromptText(input.baseSequence)}\n\n선생님 요청: "${input.adjust}"\n- 요청한 방향만 반영하고 나머지는 원본을 최대한 유지하세요. **전면 재작성 금지.**\n- 특히 통증·금기 대응 동작과 회원 목표의 핵심 처방은, 요청과 직접 충돌하지 않는 한 **유지**하세요.\n- 안전·금기·기구 흐름 규칙은 그대로 지키세요.`
      : `\n\n## 재조정 요청\n직전 생성본을 본 선생님이 이렇게 바꿔달라고 했습니다: "${input.adjust}"\n이 요청을 우선 반영하되, 안전·금기·기구 흐름 규칙은 그대로 지키세요.`
    : ''
  return {
    type: 'text' as const,
    text: `## 회원
이름: ${input.name ?? '-'}
나이/성별: ${input.age ?? '-'}
통증·제약: ${input.conditions}
목표: ${input.goals}
사용 기구: ${input.apparatus.join(', ')}
수업 길이: ${input.minutes}분
그날 컨디션: ${input.todayCondition ?? '보통'}${history}${adjust}`,
  }
}

// ── 모델 호출 (주입 가능) ────────────────────────────────────────────────
export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

type Message = { role: 'user' | 'assistant'; content: unknown }
export type ModelCall = (messages: Message[]) => Promise<{ sequence: Sequence; toolUseId: string; usage: Usage }>

// 모델을 받아 ModelCall을 만든다(기본 sonnet). eval에서 opus 등 다른 모델을 주입해 비교한다.
export function makeClaudeCall(model: string = MODEL): ModelCall {
  return async (messages) => {
    if (!API_KEY) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY가 없습니다 (app/.env)')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000, // 진단이 긴 회원(임신 등)에서 blocks 전에 잘리지 않도록 여유
        system: SYSTEM,
        tools: [SEQUENCE_TOOL],
        tool_choice: { type: 'tool', name: 'emit_sequence' },
        messages,
      }),
    })
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const tool = data.content?.find((b: { type: string }) => b.type === 'tool_use')
    if (!tool) throw new Error('no tool_use in response')
    return { sequence: tool.input as Sequence, toolUseId: tool.id as string, usage: data.usage as Usage }
  }
}

// ── 오케스트레이터: gen → verify → [실패] repair(≤MAX_REPAIRS) ─────────────
export type GenerateResult = {
  sequence: Sequence
  validation: ValidationResult
  attempts: number
  usage: Usage // 시도 전체 누적 (비용 추적, PRD §7)
}

export type GenerateDeps = {
  callModel: ModelCall
  validate: (seq: Sequence) => ValidationResult
  maxRepairs: number
}

const defaultDeps: GenerateDeps = { callModel: makeClaudeCall(), validate: validateSequence, maxRepairs: MAX_REPAIRS }

function emptyUsage(): Usage {
  return { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
}
function addUsage(a: Usage, b: Usage): Usage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
  }
}

export async function generateSequence(input: MemberInput, deps: GenerateDeps = defaultDeps): Promise<GenerateResult> {
  const messages: Message[] = [{ role: 'user', content: [catalogBlock(input.apparatus), memberBlock(input)] }]
  let total = emptyUsage()
  let last: { sequence: Sequence; validation: ValidationResult } | null = null

  for (let attempt = 1; attempt <= deps.maxRepairs + 1; attempt++) {
    const { sequence, toolUseId, usage } = await deps.callModel(messages)
    total = addUsage(total, usage)
    const validation = deps.validate(sequence)
    last = { sequence, validation }

    if (validation.ok || attempt === deps.maxRepairs + 1) {
      return { sequence, validation, attempts: attempt, usage: total }
    }

    // repair 턴: 모델이 낸 tool_use를 에코하고, 검증 에러를 tool_result로 피드백해 재호출
    messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: toolUseId, name: 'emit_sequence', input: sequence }] })
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: `검증 실패: ${validation.errors.join('; ')}\n위 문제를 모두 고쳐서 emit_sequence를 다시 호출하세요. 동작 이름은 카탈로그에 있는 것만 사용하고, 기구 전환은 3회 이하로 유지하세요.`,
        },
      ],
    })
  }

  // 도달 불가 (루프가 항상 반환) — 타입 만족용
  return { sequence: last!.sequence, validation: last!.validation, attempts: deps.maxRepairs + 1, usage: total }
}
