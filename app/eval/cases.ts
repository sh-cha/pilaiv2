// 평가 케이스 — rubric으로 채점할 대표 입력 표본. 골든셋의 "문제지".
// 아내 판정이 쌓이면 각 케이스에 모범답안(golden) 라벨을 붙여간다.
import type { Member } from '../src/lib/members'
import type { CapturedSession } from '../src/lib/flywheel'
import type { MemberInput } from '../src/lib/types'

export type InsightCase = { id: string; desc: string; member: Member; sessions: CapturedSession[] }

const mk = (over: Pick<Member, 'name' | 'conditions' | 'goals'> & Partial<Member>): Member => ({
  id: `eval-${over.name}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

// 첫 인사이트(이력 없음) 케이스. 통증·금기 반영을 주로 본다. (이력 변주 평가는 후속)
export const INSIGHT_CASES: InsightCase[] = [
  {
    id: 'neck',
    desc: '목디스크/거북목 — 경추 부하 회피가 핵심',
    member: mk({ name: '목디스크', age: '32', sex: '여', conditions: '목디스크, 거북목, 말린 어깨', goals: '자세교정, 코어' }),
    sessions: [],
  },
  {
    id: 'pregnancy',
    desc: '임신 — 앙와위·복부 강한 굴곡 금기',
    member: mk({ name: '임신', age: '34', sex: '여', conditions: '임신 20주', goals: '안전한 컨디션 유지, 골반 안정' }),
    sessions: [],
  },
  {
    id: 'scoliosis',
    desc: '측만증 — 비대칭 고려',
    member: mk({ name: '측만증', age: '28', sex: '여', conditions: '척추측만증', goals: '체형 교정, 근력' }),
    sessions: [],
  },
]

// 시퀀스 생성(generateSequence) 평가 케이스 — 모델 비교(sonnet↔opus)에 같은 입력을 쓴다.
export type SequenceCase = { id: string; desc: string; input: MemberInput }

export const SEQUENCE_CASES: SequenceCase[] = [
  {
    id: 'neck',
    desc: '목디스크/거북목 — 경추 부하 회피 + 흉추 신전',
    input: { conditions: '목디스크, 거북목, 말린 어깨', goals: '자세교정, 코어', apparatus: ['reformer', 'cadillac'], minutes: 50 },
  },
  {
    id: 'pregnancy',
    desc: '임신 20주 — 앙와위·복부 강굴곡 금기',
    input: { conditions: '임신 20주', goals: '골반 안정, 컨디션 유지', apparatus: ['reformer', 'mat'], minutes: 50 },
  },
  {
    id: 'lowback',
    desc: '허리디스크 — 굴곡 부하 주의, 코어 안정',
    input: { conditions: '허리디스크', goals: '코어 강화, 통증 완화', apparatus: ['reformer'], minutes: 50 },
  },
]

