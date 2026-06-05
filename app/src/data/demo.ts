// 데모 데이터 — 예약/알림 백엔드가 아직 없는 영역(홈의 오늘 일정·할 일).
// 실데이터 소스가 생기면 교체. 회원·세션·시퀀스는 실제 lib(members/flywheel)을 쓴다.
export type ScheduleItem = { time: string; member: string; dur: number; app: string; status: 'done' | 'checkin' | 'planned' }
export type TodoItem = { type: 'feedback' | 'checkin'; text: string; sub: string; member: string }

export const DEMO_TODAY: ScheduleItem[] = [
  { time: '09:00', member: '김서연', dur: 50, app: '리포머', status: 'done' },
  { time: '11:00', member: '이지훈', dur: 60, app: '리포머·체어', status: 'checkin' },
  { time: '19:00', member: '박민정', dur: 50, app: '리포머', status: 'planned' },
]

export const DEMO_TODOS: TodoItem[] = [
  { type: 'feedback', text: '정하윤님 수업 후 피드백이 도착했어요', sub: '5/28 · 만족도 ★★★', member: '정하윤' },
  { type: 'checkin', text: '이지훈님 컨디션 체크인 대기 중', sub: '11:00 수업 · 2시간 전 알림', member: '이지훈' },
]

// 강사 본인 정보 — 로그인(OAuth) 백엔드가 없어 데모. 설정에서 보여주고 홈에서 인사.
export const INSTRUCTOR = { name: '한지은', login: '카카오 로그인' }

export const SCHEDULE_LABEL: Record<ScheduleItem['status'], string> = {
  done: '체크인 완료',
  checkin: '체크인 대기',
  planned: '예정',
}
