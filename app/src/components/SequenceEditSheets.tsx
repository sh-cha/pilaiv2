// 시퀀스 편집 시트 — 행을 탭하면 뜨는 단일 액션시트(교체·횟수·삭제)와 횟수 시트.
// 순서 변경은 시트가 아니라 행의 핸들 드래그(DraggableExercises)로 — 시트엔 위치 이동 항목을 두지 않는다.
import React from 'react'
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native'
import { colors, font, radius } from '../theme/tokens'
import { Icon, IconName } from './Icon'

function Sheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.grab} />
          <View style={st.head}>
            <View style={{ flex: 1 }}>
              <Text style={st.title} numberOfLines={1}>{title}</Text>
              {sub ? <Text style={st.sub} numberOfLines={1}>{sub}</Text> : null}
            </View>
            <Pressable hitSlop={10} onPress={onClose}><Text style={st.close}>닫기</Text></Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  )
}

function ActRow({ icon, label, danger, disabled, onPress }: { icon: IconName; label: string; danger?: boolean; disabled?: boolean; onPress: () => void }) {
  const tint = disabled ? colors.faint : danger ? colors.accent : colors.ink
  return (
    <Pressable style={[st.act, disabled && { opacity: 0.4 }]} disabled={disabled} onPress={onPress}>
      <Icon name={icon} size={19} color={danger ? colors.accent : colors.muted} />
      <Text style={[st.actText, { color: tint }]}>{label}</Text>
    </Pressable>
  )
}

// 한 동작 행의 액션시트
export function RowActionSheet({ name, sub, onDetail, onReplace, onReps, onDelete, onClose }: {
  name: string; sub?: string
  onDetail: () => void; onReplace: () => void; onReps: () => void; onDelete: () => void; onClose: () => void
}) {
  return (
    <Sheet title={name} sub={sub} onClose={onClose}>
      <ActRow icon="chev" label="동작 상세 보기" onPress={onDetail} />
      <ActRow icon="swap" label="다른 동작으로 교체" onPress={onReplace} />
      <ActRow icon="reps" label="횟수 · 세트 수정" onPress={onReps} />
      <ActRow icon="trash" label="동작 삭제" danger onPress={onDelete} />
    </Sheet>
  )
}

const REPS_OPTS = ['8회', '10회', '12회', '15회', '양쪽 교대 10회', '양쪽 각 6회', '30초 홀드', '45초 홀드']

// 횟수·세트 빠른 선택
export function RepsSheet({ name, current, onPick, onClose }: { name: string; current?: string; onPick: (r: string) => void; onClose: () => void }) {
  return (
    <Sheet title="횟수 · 세트" sub={name} onClose={onClose}>
      <View style={st.chiprow}>
        {REPS_OPTS.map((o) => {
          const on = current === o
          return (
            <Pressable key={o} onPress={() => onPick(o)} style={[st.chip, on && st.chipOn]}>
              <Text style={[st.chipText, on && { color: colors.primaryInk }]}>{o}</Text>
            </Pressable>
          )
        })}
      </View>
    </Sheet>
  )
}

const st = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,22,18,0.4)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginTop: 8, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 6 },
  title: { fontFamily: font.extrabold, fontSize: 19, color: colors.ink, letterSpacing: -0.3 },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  close: { fontFamily: font.bold, fontSize: 15, color: colors.primary, paddingTop: 2 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  actText: { fontFamily: font.semibold, fontSize: 15.5 },
  chiprow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: radius.chip, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.semibold, fontSize: 14.5, color: colors.muted },
})
