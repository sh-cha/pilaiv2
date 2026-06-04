import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import catalog from './src/data/exercises.json'
import { generateSequence, type GenerateResult } from './src/lib/generateSequence'
import { appendSession, buildCapturedSession, computeDiff, loadSessions, sessionsForMember, summarizeHistory, type CapturedSession } from './src/lib/flywheel'
import { deleteMember, loadMembers, upsertMember, type Member } from './src/lib/members'
import type { KV } from './src/lib/storage'
import type { MemberInput, Sequence, SeqExercise } from './src/lib/types'

const C = {
  bg: '#FAF8F4',
  card: '#FFFFFF',
  text: '#2C2C2A',
  sub: '#8A867C',
  accent: '#6B8E7F',
  accentSoft: '#E9F0EC',
  caution: '#B5654A',
  border: '#ECE8E0',
}

const APPARATUS = ['reformer', 'cadillac', 'mat', 'chair']

type Ex = {
  id: string
  name: string
  apparatus: string[]
  block: string | null
  level: string | null
  setup: string | null
  resistance: string | null
  movement: { inhale?: string; exhale?: string } | null
  muscle_focus: string[]
  objectives: string[]
  cues: string[]
  block_ko?: string
  level_ko?: string
  setup_ko?: string
  movement_ko?: { inhale?: string; exhale?: string } | null
  muscle_focus_ko?: string[]
  objectives_ko?: string[]
  cues_ko?: string[]
  apparatus_inferred?: boolean
}

const allEx = catalog as Ex[]
const exByName = new Map(allEx.map((e) => [e.name, e]))
const t = (ko: string | null | undefined, en: string | null | undefined) => ko ?? en ?? '-'
const tArr = (ko: string[] | undefined, en: string[]) => (ko && ko.length ? ko : en)

const kv: KV = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
}

const clone = (s: Sequence): Sequence => JSON.parse(JSON.stringify(s))

export default function App() {
  const [tab, setTab] = useState<'generate' | 'history'>('generate')
  const [modalEx, setModalEx] = useState<Ex | null>(null)
  const [classSeq, setClassSeq] = useState<Sequence | null>(null)
  return (
    <View style={styles.container}>
      <View style={styles.appBar}>
        <Text style={styles.wordmark}>Pilai</Text>
      </View>
      <View style={styles.flex}>
        {tab === 'generate' ? (
          <GenerateScreen onPick={setModalEx} onClass={setClassSeq} />
        ) : (
          <HistoryScreen onClass={setClassSeq} />
        )}
      </View>
      <View style={styles.tabBar}>
        <TabButton label="생성" active={tab === 'generate'} onPress={() => setTab('generate')} />
        <TabButton label="기록" active={tab === 'history'} onPress={() => setTab('history')} />
      </View>
      <ExerciseModal ex={modalEx} onClose={() => setModalEx(null)} />
      <ClassMode seq={classSeq} onClose={() => setClassSeq(null)} />
      <StatusBar style="dark" />
    </View>
  )
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tabBtn} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  )
}

function GenerateScreen({ onPick, onClass }: { onPick: (e: Ex) => void; onClass: (s: Sequence) => void }) {
  const [conditions, setConditions] = useState('')
  const [goals, setGoals] = useState('')
  const [minutes, setMinutes] = useState('50')
  const [apparatus, setApparatus] = useState<string[]>(['reformer'])
  const [today, setToday] = useState('')
  const [loading, setLoading] = useState(false)
  const [gen, setGen] = useState<GenerateResult | null>(null)
  const [usedInput, setUsedInput] = useState<MemberInput | null>(null)
  const [final, setFinal] = useState<Sequence | null>(null)
  const [pickerBlock, setPickerBlock] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [selected, setSelected] = useState<Member | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formInitial, setFormInitial] = useState<Member | null>(null)
  const [memberSessions, setMemberSessions] = useState<CapturedSession[]>([])

  useEffect(() => {
    loadMembers(kv).then(setMembers)
  }, [])

  useEffect(() => {
    if (selected) loadSessions(kv).then((all) => setMemberSessions(sessionsForMember(all, selected.id)))
    else setMemberSessions([])
  }, [selected])

  function selectMember(m: Member | null) {
    setSelected(m)
    if (m) {
      setConditions(m.conditions)
      setGoals(m.goals)
    }
  }
  function openNewMember() {
    setFormInitial(null)
    setFormOpen(true)
  }
  function openEditMember() {
    if (selected) {
      setFormInitial(selected)
      setFormOpen(true)
    }
  }
  async function onSaveMember(m: Member) {
    const next = await upsertMember(kv, m)
    setMembers(next)
    setFormOpen(false)
    selectMember(next.find((x) => x.id === m.id) ?? m)
  }
  async function onDeleteMember(id: string) {
    const next = await deleteMember(kv, id)
    setMembers(next)
    setFormOpen(false)
    if (selected?.id === id) setSelected(null)
  }

  const toggleApp = (a: string) =>
    setApparatus((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))

  async function onGenerate() {
    setLoading(true)
    setError('')
    setGen(null)
    setFinal(null)
    setSaved(false)
    let history: string | undefined
    if (selected) {
      const sessions = await loadSessions(kv)
      history = summarizeHistory(sessionsForMember(sessions, selected.id)) || undefined
    }
    const input: MemberInput = {
      name: selected?.name,
      age: selected?.age,
      conditions,
      goals,
      minutes: Number(minutes) || 50,
      apparatus,
      todayCondition: today || undefined,
      history,
    }
    try {
      const r = await generateSequence(input)
      setGen(r)
      setUsedInput(input)
      setFinal(clone(r.sequence))
      if (!r.validation.ok) setError('자동 수정(repair) 후에도 검증 실패: ' + r.validation.errors.join(' / '))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function removeExercise(bi: number, ei: number) {
    setFinal((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      next.blocks[bi].exercises.splice(ei, 1)
      return next
    })
    setSaved(false)
  }

  function addExercise(bi: number, name: string) {
    setFinal((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      next.blocks[bi].exercises.push({ name })
      return next
    })
    setSaved(false)
  }

  async function onSave() {
    if (!gen || !final || !usedInput) return
    const session = buildCapturedSession({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      memberId: selected?.id,
      createdAt: new Date().toISOString(),
      input: usedInput,
      generated: gen.sequence,
      final,
      attempts: gen.attempts,
      usage: gen.usage,
    })
    try {
      const all = await appendSession(kv, session)
      if (selected) setMemberSessions(sessionsForMember(all, selected.id))
      setSaved(true)
      Alert.alert('저장됨', session.edited ? `편집 ${session.diff.length}건을 학습 데이터로 캡처했습니다.` : '편집 없이 저장했습니다.')
    } catch (e) {
      Alert.alert('저장 실패', (e as Error).message)
    }
  }

  const editCount = gen && final ? computeDiff(gen.sequence, final).length : 0

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.screenTitle}>시퀀스 생성</Text>

      <MemberSelector
        members={members}
        selected={selected}
        onSelect={selectMember}
        onNew={openNewMember}
        onEdit={openEditMember}
      />

      {selected && memberSessions.length ? (
        <View style={styles.pastBox}>
          <Text style={styles.pastTitle}>지난 수업 · {memberSessions.length}</Text>
          {memberSessions.slice(0, 4).map((s) => (
            <Pressable key={s.id} style={styles.pastRow} onPress={() => onClass(s.final)}>
              <View style={styles.flex}>
                <Text style={styles.pastDate}>{s.createdAt.slice(0, 10)}</Text>
                <Text style={styles.metaSub}>
                  {s.input.apparatus.join(', ')} · {s.edited ? `편집 ${s.diff.length}` : '편집 없음'}
                </Text>
              </View>
              <Text style={styles.pastView}>수업 보기 ›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Field label="통증·제약">
          <TextInput
            style={styles.input}
            value={conditions}
            onChangeText={setConditions}
            placeholder="목디스크, 거북목, 말린 어깨"
            placeholderTextColor={C.sub}
            multiline
          />
        </Field>
        <Field label="목표">
          <TextInput
            style={styles.input}
            value={goals}
            onChangeText={setGoals}
            placeholder="자세교정, 코어"
            placeholderTextColor={C.sub}
          />
        </Field>
        <Field label="기구">
          <View style={styles.chips}>
            {APPARATUS.map((a) => {
              const on = apparatus.includes(a)
              return (
                <Pressable key={a} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleApp(a)}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                </Pressable>
              )
            })}
          </View>
        </Field>
        <View style={styles.fieldRow}>
          <Field label="수업 길이(분)" style={styles.flex}>
            <TextInput style={styles.input} value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
          </Field>
          <Field label="오늘 컨디션(선택)" style={styles.flex2}>
            <TextInput
              style={styles.input}
              value={today}
              onChangeText={setToday}
              placeholder="피곤함 등"
              placeholderTextColor={C.sub}
            />
          </Field>
        </View>
        <Pressable style={[styles.genBtn, loading && styles.dim]} onPress={onGenerate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.genBtnText}>시퀀스 생성</Text>}
        </Pressable>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>시퀀스를 만들고 있어요 · 진단 → 처방 → 안전 검증, 20~40초 걸립니다</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {gen && final ? (
        <EditableSequence
          gen={gen}
          seq={final}
          editCount={editCount}
          saved={saved}
          onPickDetail={onPick}
          onRemove={removeExercise}
          onAdd={(bi) => setPickerBlock(bi)}
          onSave={onSave}
          onClass={onClass}
        />
      ) : null}

      <AddExercisePicker
        apparatus={pickerBlock != null && final ? final.blocks[pickerBlock].apparatus : null}
        onPick={(name) => {
          if (pickerBlock != null) addExercise(pickerBlock, name)
          setPickerBlock(null)
        }}
        onClose={() => setPickerBlock(null)}
      />

      <MemberFormModal
        visible={formOpen}
        initial={formInitial}
        onSave={onSaveMember}
        onDelete={onDeleteMember}
        onClose={() => setFormOpen(false)}
      />
    </ScrollView>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function MemberSelector({
  members,
  selected,
  onSelect,
  onNew,
  onEdit,
}: {
  members: Member[]
  selected: Member | null
  onSelect: (m: Member | null) => void
  onNew: () => void
  onEdit: () => void
}) {
  return (
    <View style={styles.memberBar}>
      <View style={styles.memberBarHead}>
        <Text style={styles.label}>회원</Text>
        {selected ? (
          <Pressable hitSlop={10} onPress={onEdit}>
            <Text style={styles.editLink}>프로필 수정</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        <Pressable style={[styles.chip, !selected && styles.chipOn]} onPress={() => onSelect(null)}>
          <Text style={[styles.chipText, !selected && styles.chipTextOn]}>비회원</Text>
        </Pressable>
        {members.map((m) => {
          const on = selected?.id === m.id
          return (
            <Pressable key={m.id} style={[styles.chip, on && styles.chipOn]} onPress={() => onSelect(m)}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.name}</Text>
            </Pressable>
          )
        })}
        <Pressable style={styles.chipAdd} onPress={onNew}>
          <Text style={styles.chipAddText}>+ 새 회원</Text>
        </Pressable>
      </ScrollView>
      {selected ? (
        <Text style={styles.memberHint}>프로필의 만성 제약·목표를 불러왔습니다. 생성 시 최근 이력을 반영해 변주합니다.</Text>
      ) : null}
    </View>
  )
}

function MemberFormModal({
  visible,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean
  initial: Member | null
  onSave: (m: Member) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [conditions, setConditions] = useState('')
  const [goals, setGoals] = useState('')

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '')
      setAge(initial?.age ?? '')
      setSex(initial?.sex ?? '')
      setConditions(initial?.conditions ?? '')
      setGoals(initial?.goals ?? '')
    }
  }, [visible, initial])

  function save() {
    if (!name.trim()) {
      Alert.alert('이름 필요', '회원 이름을 입력하세요.')
      return
    }
    const now = new Date().toISOString()
    onSave({
      id: initial?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      age: age.trim() || undefined,
      sex: sex.trim() || undefined,
      conditions: conditions.trim(),
      goals: goals.trim(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    })
  }

  function confirmDelete() {
    if (!initial) return
    Alert.alert('회원 삭제', `${initial.name} 회원을 삭제할까요? (기록은 남습니다)`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(initial.id) },
    ])
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <View style={styles.grabber} />
          <View style={styles.pickerHead}>
            <Text style={styles.pickerTitle}>{initial ? '회원 수정' : '새 회원'}</Text>
            <Pressable hitSlop={12} onPress={onClose}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Field label="이름">
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="회원 이름" placeholderTextColor={C.sub} />
            </Field>
            <View style={styles.fieldRow}>
              <Field label="나이" style={styles.flex}>
                <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="30대" placeholderTextColor={C.sub} />
              </Field>
              <Field label="성별" style={styles.flex}>
                <TextInput style={styles.input} value={sex} onChangeText={setSex} placeholder="여/남" placeholderTextColor={C.sub} />
              </Field>
            </View>
            <Field label="만성 제약·병력">
              <TextInput
                style={styles.input}
                value={conditions}
                onChangeText={setConditions}
                placeholder="목디스크, 거북목"
                placeholderTextColor={C.sub}
                multiline
              />
            </Field>
            <Field label="장기 목표">
              <TextInput style={styles.input} value={goals} onChangeText={setGoals} placeholder="자세교정, 코어" placeholderTextColor={C.sub} />
            </Field>
            <Pressable style={styles.genBtn} onPress={save}>
              <Text style={styles.genBtnText}>{initial ? '저장' : '등록'}</Text>
            </Pressable>
            {initial ? (
              <Pressable style={styles.deleteLink} onPress={confirmDelete}>
                <Text style={styles.deleteLinkText}>회원 삭제</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function EditableSequence({
  gen,
  seq,
  editCount,
  saved,
  onPickDetail,
  onRemove,
  onAdd,
  onSave,
  onClass,
}: {
  gen: GenerateResult
  seq: Sequence
  editCount: number
  saved: boolean
  onPickDetail: (e: Ex) => void
  onRemove: (bi: number, ei: number) => void
  onAdd: (bi: number) => void
  onSave: () => void
  onClass: (s: Sequence) => void
}) {
  return (
    <View style={styles.result}>
      {seq.mode === 'relax' ? <Text style={styles.relaxTag}>릴렉스 모드</Text> : null}
      {gen.attempts > 1 ? <Text style={styles.repairNote}>자동 수정 {gen.attempts - 1}회 후 통과</Text> : null}
      <Text style={styles.summary}>{seq.member_summary}</Text>
      {seq.blocks.map((b, bi) => (
        <View key={bi} style={styles.blockCard}>
          <View style={styles.blockHead}>
            <Text style={styles.blockTitle}>{b.block}</Text>
            <Text style={styles.blockApp}>{b.apparatus}</Text>
          </View>
          {b.exercises.map((ex, ei) => {
            const cat = exByName.get(ex.name)
            return (
              <View key={ei} style={styles.exRow}>
                <Pressable style={styles.flex} onPress={() => cat && onPickDetail(cat)}>
                  <Text style={styles.exName}>
                    {ex.name}
                    {cat ? '  ›' : '  (카탈로그 외)'}
                  </Text>
                  {ex.caution ? <Text style={styles.exCaution}>주의 · {ex.caution}</Text> : null}
                </Pressable>
                {ex.reps ? <Text style={styles.repsBadge}>{ex.reps}</Text> : null}
                <Pressable hitSlop={8} style={styles.delBtn} onPress={() => onRemove(bi, ei)}>
                  <Text style={styles.delText}>✕</Text>
                </Pressable>
              </View>
            )
          })}
          <Pressable style={styles.addBtn} onPress={() => onAdd(bi)}>
            <Text style={styles.addText}>+ 동작 추가</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.saveBox}>
        <Text style={styles.editCount}>
          {editCount > 0
            ? `AI 생성본 대비 편집 ${editCount}건 — 저장 시 학습 데이터로 캡처됩니다`
            : '편집 없음 (그대로 저장 가능)'}
        </Text>
        <Pressable style={styles.classBtn} onPress={() => onClass(seq)}>
          <Text style={styles.classBtnText}>수업 보기</Text>
        </Pressable>
        <Pressable style={[styles.saveBtn, saved && styles.saveBtnDone]} onPress={onSave}>
          <Text style={styles.saveText}>{saved ? '저장됨 ✓ (다시 저장)' : '최종본 저장'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

function AddExercisePicker({
  apparatus,
  onPick,
  onClose,
}: {
  apparatus: string | null
  onPick: (name: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    if (!apparatus) return []
    const ql = q.trim().toLowerCase()
    return allEx
      .filter((e) => e.apparatus.includes(apparatus))
      .filter((e) => !ql || e.name.toLowerCase().includes(ql))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [apparatus, q])

  return (
    <Modal visible={apparatus != null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <View style={styles.grabber} />
          <View style={styles.pickerHead}>
            <Text style={styles.pickerTitle}>동작 추가 · {apparatus}</Text>
            <Pressable hitSlop={12} onPress={onClose}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            value={q}
            onChangeText={setQ}
            placeholder="동작 이름 검색"
            placeholderTextColor={C.sub}
            autoCorrect={false}
          />
          <FlatList
            data={list}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            style={styles.pickerList}
            renderItem={({ item }) => (
              <Pressable style={styles.pickerRow} onPress={() => onPick(item.name)}>
                <Text style={styles.exName}>{item.name}</Text>
                <Text style={styles.metaSub}>{t(item.block_ko, item.block)} · {t(item.level_ko, item.level)}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  )
}

function SequenceView({ seq }: { seq: Sequence }) {
  return (
    <View>
      {seq.blocks.map((b, i) => (
        <View key={i} style={styles.histBlock}>
          <Text style={styles.histBlockTitle}>
            {b.block} · {b.apparatus}
          </Text>
          {b.exercises.map((ex, j) => (
            <Text key={j} style={styles.histEx}>
              · {ex.name}
              {ex.reps ? ` — ${ex.reps}` : ''}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function HistoryScreen({ onClass }: { onClass: (s: Sequence) => void }) {
  const [sessions, setSessions] = useState<CapturedSession[] | null>(null)
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSessions(kv).then(setSessions)
    loadMembers(kv).then((ms) => setMemberNames(Object.fromEntries(ms.map((m) => [m.id, m.name]))))
  }, [])

  async function onExport() {
    if (!sessions?.length) return
    try {
      await Share.share({ message: JSON.stringify(sessions, null, 2) })
    } catch {
      // 사용자가 취소한 경우 등 — 무시
    }
  }

  if (sessions === null) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={C.accent} />
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <View style={styles.histHead}>
        <Text style={styles.screenTitle}>기록{sessions.length ? ` · ${sessions.length}` : ''}</Text>
        {sessions.length ? (
          <Pressable onPress={onExport}>
            <Text style={styles.exportBtn}>내보내기</Text>
          </Pressable>
        ) : null}
      </View>
      {sessions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
          <Text style={styles.emptyBody}>시퀀스를 생성·편집한 뒤 "최종본 저장"을 누르면{'\n'}여기에 학습 데이터로 쌓입니다.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          renderItem={({ item }) => (
            <HistoryRow s={item} memberName={item.memberId ? memberNames[item.memberId] : undefined} onClass={onClass} />
          )}
        />
      )}
    </View>
  )
}

function HistoryRow({ s, memberName, onClass }: { s: CapturedSession; memberName?: string; onClass: (seq: Sequence) => void }) {
  const [open, setOpen] = useState(false)
  const date = s.createdAt.slice(0, 16).replace('T', ' ')
  return (
    <Pressable style={styles.histRow} onPress={() => setOpen((o) => !o)}>
      <View style={styles.histRowHead}>
        <Text style={styles.histCond} numberOfLines={open ? undefined : 1}>
          {memberName ? `${memberName} · ` : ''}
          {s.input.conditions || '(제약 없음)'}
        </Text>
        <Text style={[styles.histBadge, s.edited ? styles.histBadgeEdit : styles.histBadgeSame]}>
          {s.edited ? `편집 ${s.diff.length}` : '편집 없음'}
        </Text>
      </View>
      <Text style={styles.metaSub}>
        {date} · {s.input.apparatus.join(', ')} · {s.input.minutes}분
        {s.finalValidation.ok ? '' : ' · ⚠︎ 룰위반'}
      </Text>

      {open ? (
        <View style={styles.histDetail}>
          <Pressable style={styles.classBtn} onPress={() => onClass(s.final)}>
            <Text style={styles.classBtnText}>수업 보기</Text>
          </Pressable>
          {s.diff.length ? (
            <>
              <Text style={styles.secLabel}>편집 diff (학습 신호)</Text>
              {s.diff.map((d, i) => (
                <Text key={i} style={[styles.histDiff, d.type === 'remove' ? styles.diffRemove : styles.diffAdd]}>
                  {d.type === 'remove' ? '−' : '+'} [{d.block}] {d.name}
                </Text>
              ))}
            </>
          ) : null}
          <Text style={styles.secLabel}>최종본</Text>
          <SequenceView seq={s.final} />
        </View>
      ) : null}
    </Pressable>
  )
}

function ClassExercise({ ex }: { ex: SeqExercise }) {
  const [open, setOpen] = useState(false)
  const cat = exByName.get(ex.name)
  const cues = cat ? tArr(cat.cues_ko, cat.cues) : []
  return (
    <Pressable style={styles.classCard} onPress={() => cues.length && setOpen((o) => !o)}>
      <View style={styles.classCardHead}>
        <Text style={styles.classExName}>{ex.name}</Text>
        {ex.reps ? <Text style={styles.repsBadge}>{ex.reps}</Text> : null}
      </View>
      {ex.caution ? <Text style={styles.classCaution}>⚠ {ex.caution}</Text> : null}
      {open && cues.length ? (
        <View style={styles.classCues}>
          {cues.map((c, i) => (
            <Text key={i} style={styles.classCue}>
              · {c}
            </Text>
          ))}
        </View>
      ) : null}
      {cues.length ? <Text style={styles.cueToggle}>{open ? '큐 접기 ▲' : '큐 보기 ▼'}</Text> : null}
    </Pressable>
  )
}

function ClassMode({ seq, onClose }: { seq: Sequence | null; onClose: () => void }) {
  return (
    <Modal visible={!!seq} animationType="slide" onRequestClose={onClose}>
      <View style={styles.classWrap}>
        <View style={styles.classHead}>
          <Text style={styles.classTitle}>수업 진행</Text>
          <Pressable hitSlop={12} onPress={onClose}>
            <Text style={styles.modalCloseText}>닫기</Text>
          </Pressable>
        </View>
        {seq ? (
          <ScrollView contentContainerStyle={styles.classBody}>
            {seq.blocks.map((b, bi) => (
              <View key={bi} style={styles.classBlock}>
                <Text style={styles.classBlockTitle}>
                  {b.block} · {b.apparatus}
                </Text>
                {b.exercises.map((ex, ei) => (
                  <ClassExercise key={ei} ex={ex} />
                ))}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  )
}

function ExerciseModal({ ex, onClose }: { ex: Ex | null; onClose: () => void }) {
  const mv = ex ? ex.movement_ko ?? ex.movement : null
  return (
    <Modal visible={!!ex} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <View style={styles.grabber} />
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>닫기</Text>
          </Pressable>
          {ex ? (
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.title}>{ex.name}</Text>
              <Text style={styles.metaSub}>
                {ex.apparatus.join(', ')} · {t(ex.block_ko, ex.block)} · {t(ex.level_ko, ex.level)}
              </Text>
              <Sec label="타깃 근육" items={tArr(ex.muscle_focus_ko, ex.muscle_focus)} />
              <Sec label="큐" items={tArr(ex.cues_ko, ex.cues)} />
              <Sec label="목표" items={tArr(ex.objectives_ko, ex.objectives)} />
              {t(ex.setup_ko, ex.setup) !== '-' ? (
                <>
                  <Text style={styles.secLabel}>셋업</Text>
                  <Text style={styles.body}>{t(ex.setup_ko, ex.setup)}</Text>
                </>
              ) : null}
              {mv ? (
                <>
                  <Text style={styles.secLabel}>호흡</Text>
                  <Text style={styles.body}>
                    들숨 · {mv.inhale ?? '-'}
                    {'\n'}날숨 · {mv.exhale ?? '-'}
                  </Text>
                </>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

function CatalogScreen({ onPick }: { onPick: (e: Ex) => void }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return allEx
      .filter((e) => {
        if (!ql) return true
        const hay = `${e.name} ${e.muscle_focus_ko?.join(' ') ?? ''} ${e.block_ko ?? ''} ${e.apparatus.join(' ')}`.toLowerCase()
        return hay.includes(ql)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [q])
  return (
    <View style={styles.flex}>
      <Text style={[styles.screenTitle, { paddingHorizontal: 16, paddingTop: 4 }]}>동작 카탈로그 · {list.length}</Text>
      <TextInput
        style={[styles.search, { marginHorizontal: 16, marginTop: 0, marginBottom: 10 }]}
        value={q}
        onChangeText={setQ}
        placeholder="이름·근육·블록·기구 검색"
        placeholderTextColor={C.sub}
        autoCorrect={false}
      />
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.noResults}>검색 결과가 없어요</Text>}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        renderItem={({ item }) => (
          <Pressable style={styles.catRow} onPress={() => onPick(item)}>
            <Text style={styles.exName}>{item.name}</Text>
            <Text style={styles.metaSub}>
              {item.apparatus.join(', ')}
              {item.apparatus_inferred ? ' ·추론' : ''} · {t(item.block_ko, item.block)} · {t(item.level_ko, item.level)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  )
}

function Sec({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null
  return (
    <View>
      <Text style={styles.secLabel}>{label}</Text>
      {items.map((it, i) => (
        <Text key={i} style={styles.body}>
          · {it}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingTop: 54 },
  flex: { flex: 1 },
  flex2: { flex: 1.4 },
  appBar: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  wordmark: { fontSize: 22, fontWeight: '800', color: C.accent, letterSpacing: 0.3 },
  wordmarkSub: { fontSize: 12, color: C.sub, fontWeight: '600' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 48 },
  screenTitle: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 16, letterSpacing: -0.5 },
  tabBar: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 13, color: C.sub, fontWeight: '600' },
  tabTextActive: { color: C.accent },
  formCard: { backgroundColor: C.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border },
  field: { marginBottom: 14 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.sub,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.sub, fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: '#fff' },
  chipAdd: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.accent, borderStyle: 'dashed', backgroundColor: C.card },
  chipAddText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  memberBar: { marginBottom: 14 },
  memberBarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  editLink: { color: C.accent, fontWeight: '700', fontSize: 12 },
  memberHint: { fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 17 },
  deleteLink: { alignItems: 'center', paddingVertical: 14 },
  deleteLinkText: { color: C.caution, fontWeight: '700', fontSize: 14 },
  genBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  genBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dim: { opacity: 0.6 },
  error: { color: C.caution, marginTop: 16, fontSize: 14 },
  loadingText: { marginTop: 16, color: C.sub, fontSize: 13, lineHeight: 19 },
  result: { marginTop: 24 },
  relaxTag: {
    alignSelf: 'flex-start',
    backgroundColor: C.accent,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    overflow: 'hidden',
  },
  repairNote: { fontSize: 12, color: C.sub, marginBottom: 8, fontWeight: '600' },
  summary: { fontSize: 15, lineHeight: 23, color: C.text, marginBottom: 18, backgroundColor: C.accentSoft, padding: 14, borderRadius: 12 },
  blockCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  blockHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  blockTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  blockApp: { fontSize: 12, fontWeight: '700', color: C.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.border },
  exName: { fontSize: 15, fontWeight: '600', color: C.text },
  exReps: { fontSize: 13, color: C.accent, fontWeight: '700', marginTop: 2 },
  exReason: { fontSize: 13, color: C.sub, marginTop: 2 },
  exCaution: { fontSize: 13, color: C.caution, marginTop: 3, fontWeight: '600' },
  delBtn: { paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  delText: { fontSize: 16, color: C.sub, fontWeight: '700' },
  addBtn: { marginTop: 10, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.accent, borderStyle: 'dashed', alignItems: 'center' },
  addText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  saveBox: { marginTop: 8 },
  editCount: { fontSize: 13, color: C.sub, marginBottom: 8, lineHeight: 19 },
  saveBtn: { backgroundColor: C.text, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnDone: { backgroundColor: C.accent },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  catRow: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  metaSub: { fontSize: 13, color: C.sub, marginTop: 3 },
  pastBox: { marginBottom: 14, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
  pastTitle: { fontSize: 12, fontWeight: '700', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  pastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  pastDate: { fontSize: 14, fontWeight: '700', color: C.text },
  pastView: { fontSize: 13, color: C.accent, fontWeight: '700' },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 8, marginBottom: 2 },
  modalClose: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 10 },
  modalCloseText: { fontSize: 15, color: C.accent, fontWeight: '700' },
  modalBody: { paddingHorizontal: 22, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 6 },
  pickerTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  search: {
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
  },
  pickerList: { paddingHorizontal: 20 },
  pickerRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  histHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  exportBtn: { color: C.accent, fontWeight: '700', fontSize: 14, marginBottom: 16 },
  histEmpty: { paddingHorizontal: 16, color: C.sub, fontSize: 14, lineHeight: 22 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 21 },
  noResults: { textAlign: 'center', color: C.sub, fontSize: 14, paddingVertical: 40 },
  histRow: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  histRowHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  histCond: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  histBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  histBadgeEdit: { backgroundColor: C.accent, color: '#fff' },
  histBadgeSame: { backgroundColor: C.border, color: C.sub },
  histDetail: { marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  histDiff: { fontSize: 14, marginTop: 3, fontWeight: '600' },
  diffRemove: { color: C.caution },
  diffAdd: { color: C.accent },
  histBlock: { marginTop: 6 },
  histBlockTitle: { fontSize: 13, fontWeight: '700', color: C.sub, marginTop: 6 },
  histEx: { fontSize: 14, color: C.text, marginTop: 2 },
  secLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
    marginTop: 18,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: { fontSize: 15, lineHeight: 23, color: C.text },
  classBtn: { borderWidth: 1, borderColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  classBtnText: { color: C.accent, fontWeight: '700', fontSize: 16 },
  classWrap: { flex: 1, backgroundColor: C.bg, paddingTop: 54 },
  classHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  classTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  classBody: { padding: 20, paddingBottom: 60 },
  classSummary: { fontSize: 15, lineHeight: 23, color: C.text, backgroundColor: C.accentSoft, padding: 14, borderRadius: 12, marginBottom: 20 },
  classBlock: { marginBottom: 24 },
  classBlockTitle: { fontSize: 13, fontWeight: '800', color: C.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  classEx: { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: C.border, paddingLeft: 12 },
  classExHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  classExName: { fontSize: 19, fontWeight: '700', color: C.text, flex: 1 },
  classReps: { fontSize: 16, fontWeight: '800', color: C.accent },
  classCaution: { fontSize: 14, color: C.caution, fontWeight: '600', marginTop: 4 },
  classCue: { fontSize: 15, color: C.sub, lineHeight: 22, marginTop: 4 },
  classCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  classCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  classCues: { marginTop: 10 },
  cueToggle: { marginTop: 8, fontSize: 12, color: C.accent, fontWeight: '700' },
  repsBadge: { backgroundColor: C.accentSoft, color: C.accent, fontWeight: '800', fontSize: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden', marginLeft: 8 },
})
