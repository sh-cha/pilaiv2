import React, { useState } from 'react'
import { Text, StyleSheet, Platform } from 'react-native'
import { colors, font } from '../theme/tokens'
import { AppShell } from '../components/AppShell'
import { Card, Button, Chip, ChipRow, Input, Label } from '../components/ui'
import { useNav } from '../nav/router'
import { kv } from '../lib/kv'
import { supabase } from '../lib/supabase'
import { getUserId } from '../lib/auth'
import { submitReport, type Report, type ReportKind } from '../lib/report'
import { APP_VERSION } from '../data/constants'

const KINDS: ReportKind[] = ['버그', '제안', '기타']

// 클라우드 전송자 — 로그인 상태에서만. report.ts는 순수 모듈이라 여기서 주입한다.
const cloudSender = () => {
  const sb = supabase
  if (!sb || !getUserId()) return null
  return async (r: Report) => {
    const { error } = await sb.from('bug_reports').insert({ kind: r.kind, message: r.message, context: r.context })
    if (error) throw error
  }
}

export function ReportScreen() {
  const nav = useNav()
  const [kind, setKind] = useState<ReportKind>('버그')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (busy) return
    setBusy(true)
    try {
      const sentTo = await submitReport(
        kv,
        {
          kind,
          message: message.trim(),
          context: { appVersion: APP_VERSION, platform: Platform.OS, osVersion: String(Platform.Version ?? ''), screen: nav.route.params?.from },
          createdAt: new Date().toISOString(),
        },
        cloudSender(),
      )
      nav.toast(sentTo === 'cloud' ? '신고가 접수됐어요. 감사합니다!' : '기기에 저장했어요 (로그인하면 서버로 보낼 수 있어요)')
      nav.back()
    } catch (e) {
      nav.toast(e instanceof Error ? `전송 실패: ${e.message}` : '전송에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell
      title="버그 신고 · 의견"
      footer={<Button title={busy ? '보내는 중…' : '보내기'} disabled={!message.trim() || busy} onPress={send} />}
    >
      <Card style={{ marginTop: 10 }}>
        <Label>어떤 내용인가요?</Label>
        <ChipRow>
          {KINDS.map((k) => (
            <Chip key={k} label={k} on={kind === k} onPress={() => setKind(k)} />
          ))}
        </ChipRow>

        <Label style={{ marginTop: 18 }}>자세히 알려주세요</Label>
        <Input
          value={message}
          onChangeText={setMessage}
          placeholder={'어떤 화면에서 무엇이 잘못됐는지 적어주세요.\n재현 방법이 있으면 함께 적어주시면 큰 도움이 돼요.'}
          maxLength={1000}
          multiline
          style={{ minHeight: 140, textAlignVertical: 'top' }}
        />
        <Text style={st.hint}>앱 버전·기기 정보가 함께 전송돼요. 회원 데이터는 포함되지 않아요.</Text>
      </Card>
    </AppShell>
  )
}

const st = StyleSheet.create({
  hint: { fontFamily: font.regular, fontSize: 12.5, color: colors.faint, lineHeight: 18, marginTop: 10 },
})
