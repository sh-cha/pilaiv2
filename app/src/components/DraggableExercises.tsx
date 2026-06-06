// 블록 내 동작 드래그 reorder — 왼쪽 핸들(⋮⋮)을 잡고 위아래로 끌어 놓으면 그 위치로 이동.
// 의존성 0 (RN PanResponder/Animated). 행 높이(rowHeight)로 드래그 거리→인덱스 환산 — 행을 고정 높이로 렌더할 것.
import React, { useRef, useState } from 'react'
import { View, Animated, PanResponder } from 'react-native'

export function DraggableExercises({
  count,
  rowHeight = 70,
  onReorder,
  renderRow,
}: {
  count: number
  rowHeight?: number
  onReorder: (from: number, to: number) => void
  renderRow: (index: number, handle: object, dragging: boolean) => React.ReactNode
}) {
  const dragY = useRef(new Animated.Value(0)).current
  const [active, setActive] = useState<number | null>(null)
  const start = useRef(0)

  const handleFor = (i: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // 부모 ScrollView가 세로 제스처를 가져가려 해도 드래그 중엔 responder를 내주지 않는다 (iOS에서 드래그 끊김 방지)
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = i
        setActive(i)
        dragY.setValue(0)
      },
      onPanResponderMove: (_, g) => dragY.setValue(g.dy),
      onPanResponderRelease: (_, g) => {
        const to = Math.max(0, Math.min(count - 1, start.current + Math.round(g.dy / rowHeight)))
        if (to !== start.current) onReorder(start.current, to)
        setActive(null)
        dragY.setValue(0)
      },
      onPanResponderTerminate: () => {
        setActive(null)
        dragY.setValue(0)
      },
    }).panHandlers

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => {
        const dragging = active === i
        return (
          <Animated.View
            key={i}
            style={
              dragging
                ? { transform: [{ translateY: dragY }], zIndex: 20, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }
                : undefined
            }
          >
            {renderRow(i, handleFor(i), dragging)}
          </Animated.View>
        )
      })}
    </View>
  )
}
