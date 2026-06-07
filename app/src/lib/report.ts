// 버그·의견 리포트 — 설정 → 신고 화면에서 호출.
// 클라우드(bug_reports insert)가 가능하면 그쪽으로, 아니면 로컬 kv에 쌓아 유실을 막는다.
// ⚠️ 이 모듈은 순수(react-native·supabase import 금지) — 클라우드 전송자는 화면이 주입한다.
//    (flywheel/storage와 같은 이유: vitest에서 RN 번들 없이 테스트 가능해야 함)
import type { KV } from './storage'

export const REPORTS_KEY = 'pilaiv2.reports.v1'

export type ReportKind = '버그' | '제안' | '기타'

export type ReportContext = {
  appVersion: string
  platform: string // ios / android / web
  osVersion: string
  screen?: string // 신고 직전 화면 (라우트 이름)
}

export type Report = {
  kind: ReportKind
  message: string
  context: ReportContext
  createdAt: string // ISO
}

// 클라우드 전송자 — 성공 시 resolve, 실패 시 throw. null이면 로컬 폴백.
export type CloudSender = (r: Report) => Promise<void>

// 보낸 곳을 반환 — 화면이 토스트 문구를 구분한다.
export async function submitReport(kv: KV, r: Report, cloud?: CloudSender | null): Promise<'cloud' | 'local'> {
  if (cloud) {
    await cloud(r)
    return 'cloud'
  }
  // 로컬 폴백 — 최신이 앞 (sessions와 동일 컨벤션)
  const raw = await kv.getItem(REPORTS_KEY)
  let all: Report[] = []
  try {
    const parsed = raw ? JSON.parse(raw) : []
    all = Array.isArray(parsed) ? parsed : []
  } catch {
    all = []
  }
  await kv.setItem(REPORTS_KEY, JSON.stringify([r, ...all]))
  return 'local'
}
