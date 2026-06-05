// 네트워크·API 에러를 사용자(강사) 친화 메시지로 분류. 생성/인사이트 실패 UX 공통.
// 사전 온라인 감지(NetInfo 등) 대신 "시도 후 실패를 분류" — 의존성 0이고,
// onLine=true여도 실제로는 끊긴 경우까지 잡는다(가장 정확).
export type ErrKind = 'offline' | 'auth' | 'rate' | 'server' | 'unknown'
export type ErrInfo = { kind: ErrKind; title: string; message: string }

// fetch 실패 메시지: RN='Network request failed', web='Failed to fetch'/'Load failed'(Safari)
export function classifyError(e: unknown): ErrInfo {
  const msg = e instanceof Error ? e.message : String(e)
  const low = msg.toLowerCase()

  if (
    low.includes('network request failed') ||
    low.includes('failed to fetch') ||
    low.includes('networkerror') ||
    low.includes('load failed')
  ) {
    return {
      kind: 'offline',
      title: '인터넷에 연결되어 있지 않아요',
      message: '시퀀스 생성은 네트워크 연결이 필요해요. 연결을 확인하고 다시 시도해 주세요. 저장된 수업은 오프라인에서도 볼 수 있어요.',
    }
  }
  if (low.includes('api key') || low.includes('api_key') || low.includes('401')) {
    return {
      kind: 'auth',
      title: '인증에 문제가 있어요',
      message: 'API 키 설정을 확인해 주세요. (개발 설정이 필요해요)',
    }
  }
  if (low.includes('429') || low.includes('rate')) {
    return {
      kind: 'rate',
      title: '요청이 잠시 몰렸어요',
      message: '몇 초 기다렸다가 다시 시도해 주세요.',
    }
  }
  if (/\b5\d\d\b/.test(msg) || low.includes('overloaded')) {
    return {
      kind: 'server',
      title: '생성 서버가 잠시 불안정해요',
      message: '잠시 후 다시 시도해 주세요.',
    }
  }
  return {
    kind: 'unknown',
    title: '생성 중 문제가 생겼어요',
    message: '다시 시도해도 계속되면 입력을 조금 바꿔 보거나 잠시 후 시도해 주세요.',
  }
}
