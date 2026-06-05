// 동작 추가 모달 — 블록 기구에 맞는 카탈로그 동작 검색·선택. (App.legacy AddExercisePicker 패턴)
import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, Modal, TextInput, FlatList, StyleSheet } from 'react-native'
import { colors, font, radius } from '../theme/tokens'
import { allEx, tx } from '../lib/catalog'

export function AddExercisePicker({ apparatus, onPick, onClose }: { apparatus: string | null; onPick: (name: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    if (!apparatus) return []
    const ql = q.trim().toLowerCase()
    return allEx
      .filter((e) => e.apparatus.includes(apparatus))
      .filter((e) => !ql || e.name.toLowerCase().includes(ql) || (e.muscle_focus_ko?.join(' ') ?? '').includes(q.trim()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [apparatus, q])

  return (
    <Modal visible={apparatus != null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.grab} />
          <View style={st.head}>
            <Text style={st.title}>동작 추가 · {apparatus}</Text>
            <Pressable hitSlop={10} onPress={onClose}><Text style={st.close}>닫기</Text></Pressable>
          </View>
          <TextInput style={st.search} value={q} onChangeText={setQ} placeholder="동작 이름·근육 검색" placeholderTextColor={colors.faint} autoCorrect={false} />
          <FlatList
            data={list}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            ListEmptyComponent={<Text style={st.empty}>검색 결과가 없어요</Text>}
            renderItem={({ item }) => (
              <Pressable style={st.row} onPress={() => onPick(item.name)}>
                <Text style={st.exName}>{item.name}</Text>
                <Text style={st.meta}>{tx(item.block_ko, item.block)} · {tx(item.level_ko, item.level)}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  )
}

const st = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,22,18,0.4)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: 20, height: '80%' },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginTop: 8, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 6 },
  title: { fontFamily: font.extrabold, fontSize: 18, color: colors.ink },
  close: { fontFamily: font.bold, fontSize: 15, color: colors.primary },
  search: { marginHorizontal: 20, marginVertical: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink, fontFamily: font.regular },
  row: { paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  exName: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3 },
  empty: { textAlign: 'center', fontFamily: font.regular, fontSize: 14, color: colors.muted, paddingVertical: 40 },
})
