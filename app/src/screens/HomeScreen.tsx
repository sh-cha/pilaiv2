import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, SectionLabel, Button, Avatar } from '../components/ui'
import { Icon } from '../components/Icon'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { loadMembers, type Member } from '../lib/members'
import { loadSessions, sessionsForMember, type CapturedSession } from '../lib/flywheel'

type MStatus = 'done' | 'ready' | 'planned'
const STATUS_LABEL: Record<MStatus, string> = { done: '수업 완료', ready: '시퀀스 준비', planned: '준비 전' }

// 회원의 최근 세션으로 상태 도출: 노트 있음=수업 완료 / 저장만=시퀀스 준비 / 세션 없음=준비 전
function statusOf(latest?: CapturedSession): MStatus {
  if (!latest) return 'planned'
  return latest.note ? 'done' : 'ready'
}
function dateKo(iso?: string): string | null {
  if (!iso) return null
  return `${Number(iso.slice(5, 7))}/${iso.slice(8, 10)}`
}

export function HomeScreen() {
  const nav = useNav()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [sessions, setSessions] = useState<CapturedSession[]>([])

  // 탭 복귀(수업 저장 후 등)마다 갱신
  useEffect(() => {
    loadMembers(kv).then(setMembers)
    loadSessions(kv).then(setSessions)
  }, [nav.depth])

  // 회원 행 탭 → 상태별 분기 (저장된 시퀀스로 흐름이 닫히도록)
  const openMember = (m: Member, latest: CapturedSession | undefined, status: MStatus) => {
    if (status === 'done' && latest) {
      nav.setCtx({ memberId: m.id, member: m })
      nav.go('sessionDetail', { id: latest.id, name: m.name })
    } else if (status === 'ready' && latest) {
      nav.setCtx({
        memberId: m.id,
        member: m,
        genInput: latest.input,
        genResult: {
          sequence: latest.generated,
          attempts: latest.attempts,
          usage: latest.usage,
          validation: { ok: latest.finalValidation.ok, errors: latest.finalValidation.errors, warnings: [] },
        },
        finalSeq: latest.final,
        savedSessionId: latest.id,
      })
      nav.go('sequence')
    } else {
      nav.setCtx({ memberId: m.id, member: m })
      nav.go('generate')
    }
  }

  const list = members ?? []
  const empty = members !== null && list.length === 0

  return (
    <AppShell tab="home" gear headerBorder>
      <View style={{ paddingTop: 14, paddingBottom: 4 }}>
        <Text style={st.greet}>안녕하세요, 강사님</Text>
        <Text style={st.summary}>
          회원 <Text style={st.num}>{list.length}</Text>명 · 저장된 수업 <Text style={st.num}>{sessions.length}</Text>회
        </Text>
      </View>

      {empty ? (
        <Card style={{ marginTop: 10 }}>
          <Text style={st.emptyT}>아직 등록된 회원이 없어요</Text>
          <Text style={st.emptyS}>회원을 추가하면 건강 데이터를 바탕으로 맞춤 시퀀스를 만들 수 있어요.</Text>
          <Button title="첫 회원 추가하기" icon={<Icon name="plus" size={18} color="#fff" />} onPress={() => nav.go('memberNew')} style={{ marginTop: 14 }} />
        </Card>
      ) : (
        <>
          <SectionLabel>회원</SectionLabel>
          <Card style={{ paddingVertical: 4 }}>
            {list.map((m, i) => {
              const ms = sessionsForMember(sessions, m.id)
              const latest = ms[0]
              const status = statusOf(latest)
              const last = dateKo(latest?.createdAt)
              return (
                <Pressable key={m.id} style={[st.row, i > 0 && st.rowBorder]} onPress={() => openMember(m, latest, status)}>
                  <Avatar name={m.name} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.rowName}>{m.name}</Text>
                    <Text style={st.rowMeta}>
                      {ms.length > 0 ? `${ms.length}회 · 마지막 ${last}` : '첫 수업 전'}
                    </Text>
                  </View>
                  <View style={[st.badge, st[`badge_${status}`]]}>
                    {status === 'ready' ? <View style={st.badgeDot} /> : null}
                    <Text style={[st.badgeText, st[`badgeText_${status}`]]}>{STATUS_LABEL[status]}</Text>
                  </View>
                  <Icon name="chev" size={13} color={colors.faint} />
                </Pressable>
              )
            })}
          </Card>

          <Button
            title="회원 선택해 시퀀스 만들기"
            icon={<Icon name="spark" size={18} color="#fff" />}
            onPress={() => nav.tab('members')}
            style={{ marginTop: 22, marginBottom: 6 }}
          />
        </>
      )}
    </AppShell>
  )
}

const st = StyleSheet.create({
  greet: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  summary: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, marginTop: 3 },
  num: { fontFamily: font.monoSemibold, color: colors.ink },
  emptyT: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  emptyS: { fontFamily: font.regular, fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  rowName: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  rowMeta: { fontFamily: font.regular, fontSize: 13, color: colors.faint, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  badgeText: { fontFamily: font.bold, fontSize: 12 },
  badge_done: { backgroundColor: colors.surface2 },
  badgeText_done: { color: colors.muted },
  badge_ready: { backgroundColor: colors.tint },
  badgeText_ready: { color: colors.primary },
  badge_planned: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  badgeText_planned: { color: colors.faint },
})
