// AsyncStorage를 storage.ts의 KV 계약으로 감싼 공유 인스턴스. 모든 화면이 이걸 import.
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { KV } from './storage'

export const kv: KV = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
}
