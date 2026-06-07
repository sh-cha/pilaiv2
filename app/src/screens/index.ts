// 화면 레지스트리 — 라우터가 이 맵에서 현재 화면을 찾는다.
import React from 'react'
import { SplashScreen } from './SplashScreen'
import { LoginScreen } from './LoginScreen'
import { HomeScreen } from './HomeScreen'
import { MembersScreen } from './MembersScreen'
import { MemberDetailScreen } from './MemberDetailScreen'
import { MemberNewScreen } from './MemberNewScreen'
import { GenerateScreen } from './GenerateScreen'
import { GeneratingScreen } from './GeneratingScreen'
import { SequenceScreen } from './SequenceScreen'
import { ClassPlayScreen } from './ClassPlayScreen'
import { ClassCompleteScreen } from './ClassCompleteScreen'
import { HistoryScreen } from './HistoryScreen'
import { SessionDetailScreen } from './SessionDetailScreen'
import { CheckinScreen } from './CheckinScreen'
import { SettingsScreen } from './SettingsScreen'
import { ReportScreen } from './ReportScreen'
import { EmptyScreen } from './EmptyScreen'

export const screens: Record<string, React.ComponentType> = {
  splash: SplashScreen,
  login: LoginScreen,
  home: HomeScreen,
  members: MembersScreen,
  memberDetail: MemberDetailScreen,
  memberNew: MemberNewScreen,
  generate: GenerateScreen,
  generating: GeneratingScreen,
  sequence: SequenceScreen,
  classPlay: ClassPlayScreen,
  classComplete: ClassCompleteScreen,
  history: HistoryScreen,
  sessionDetail: SessionDetailScreen,
  checkin: CheckinScreen,
  settings: SettingsScreen,
  report: ReportScreen,
  empty: EmptyScreen,
}
