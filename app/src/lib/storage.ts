// 공유 저장 계약. 순수 라이브러리는 이 인터페이스만 의존(테스트는 in-memory fake,
// 앱은 AsyncStorage 어댑터). 나중에 Supabase로 가도 도메인 로직은 그대로, 이 구현만 교체.
export interface KV {
  getItem(k: string): Promise<string | null>
  setItem(k: string, v: string): Promise<void>
}
