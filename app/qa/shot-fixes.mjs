// QA: 신뢰 클러스터(#1 동작별 근거 + #2-① 커버리지) 시각 검증. 무료(라이브 API 없음).
// 카탈로그 동작명 + reason을 가진 'ready' 세션 주입 → 홈 "시퀀스 준비" → 재오픈 시퀀스에서 커버리지·근거 확인.
import { chromium } from 'playwright-core'
const PORT = process.env.PORT || 8790
const url = `http://localhost:${PORT}`

const MEMBER = { id: 'qa-1', name: '김민지', age: '32', sex: '여', conditions: '목디스크, 거북목', goals: '자세교정, 코어', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }
// Above Knees=하체, Adduction=상체, Back Extension=코어 (regionOf 검증된 카탈로그명)
const SEQ = {
  member_summary: '거북목·목디스크를 고려해 경추 부하를 피하고 흉추 신전·코어 안정화 중심으로 구성했어요.',
  summary_points: ['최근 코어 집중이 많아 하체·후면체인 비중을 높였어요.', '목디스크 고려해 경추 부하 동작은 제외했어요.'],
  diagnosis_sections: [
    { title: '증상과 원인', body: '거북목·목디스크로 상부 승모근이 과활성되고 깊은 목 굴곡근이 약해진 상태예요. 흉추 가동성이 떨어져 어깨에 부하가 쏠립니다.' },
    { title: '오늘 처방 방향', body: '흉추 신전과 견갑 안정화를 우선해 상부 승모근 의존을 낮춥니다. 코어 안정화로 골반·요추 정렬을 잡아줘요.' },
    { title: '주의·금기', body: '경추에 부하가 가는 굴곡·역위 동작은 제외했어요. 머리 무게가 목에 실리지 않게 큐잉해 주세요.' },
  ],
  mode: 'treatment',
  blocks: [
    { block: '풋워크', apparatus: 'reformer', exercises: [
      { name: 'Above Knees', reps: '10회', reason: '고관절 가동성 회복' },
      { name: 'Adduction', reps: '12회', reason: '내전근 활성화로 골반 안정' },
    ] },
    { block: '척추 신전', apparatus: 'reformer', exercises: [
      { name: 'Back Extension', reps: '8회', reason: '거북목 완화 흉추 신전' },
    ] },
  ],
}
const SESSION = { id: 'qa-s1', memberId: 'qa-1', createdAt: '2026-06-03T00:00:00.000Z', input: { conditions: '목디스크, 거북목', goals: '자세교정, 코어', apparatus: ['reformer'], minutes: 50 }, generated: SEQ, final: SEQ, diff: [], edited: false, finalValidation: { ok: true, errors: [] }, attempts: 1, usage: {} }

let browser
try { browser = await chromium.launch({ channel: 'chrome', headless: true }) }
catch { browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true }) }
const ctx = await browser.newContext({ viewport: { width: 390, height: 1700 }, deviceScaleFactor: 2 })
await ctx.addInitScript(([m, s]) => { try { localStorage.setItem('pilaiv2.members.v1', m); localStorage.setItem('pilaiv2.sessions.v1', s) } catch {} }, [JSON.stringify([MEMBER]), JSON.stringify([SESSION])])
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGE THROW:', String(e).slice(0, 200)))

async function shot(n) { await page.screenshot({ path: `/tmp/pilai-qa-${n}.png` }); console.log('shot:', n) }
async function click(sel, ms = 1300) { try { await page.locator(sel).first().click({ timeout: 7000 }); await page.waitForTimeout(ms); return true } catch (e) { console.log('CLICK FAIL:', sel, e.message.slice(0, 70)); return false } }

await page.goto(url, { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(4000)
await click('text="카카오로 시작하기"')   // → home
await shot('2-home')                        // 김민지 "시퀀스 준비"
await click('text="김민지"')               // ready → 저장 시퀀스 재오픈
await shot('6-coverage-reason')             // 커버리지 막대 + 동작별 근거(스파크)
await click('text="자세히"')                // 상세 진단 펼치기
await shot('7-diagnosis-sections')          // 제목 붙은 섹션(줄글 X)
await browser.close()
console.log('DONE')
