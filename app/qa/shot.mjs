// 셀프 스크린샷: 시스템 Chrome(headless)으로 앱(웹 빌드)을 모바일 폭으로 캡처.
// screenshots.sh가 expo web 빌드 + 로컬 서버를 띄운 뒤 이 스크립트를 실행한다.
// 결과: /tmp/pilai-<screen>.png — Claude가 Read로 직접 본다(사용자 스샷 불필요).
import { chromium } from 'playwright-core'

const PORT = process.env.PORT || 8799
const url = `http://localhost:${PORT}`

let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
} catch (e) {
  console.log('channel chrome 실패, executablePath 폴백:', e.message)
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
}
const ctx = await browser.newContext({ viewport: { width: 390, height: 1500 }, deviceScaleFactor: 2 })
// QA 회원 주입(localStorage) — RN web TextInput 입력 우회. 생성폼이 프로필에서 prefill된다.
const QA_MEMBER = { id: 'qa-1', name: '김민지', age: '32', sex: '여', conditions: '목디스크, 거북목, 말린 어깨', goals: '자세교정, 코어', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }
await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v) } catch {} }, ['pilaiv2.members.v1', JSON.stringify([QA_MEMBER])])
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERROR:', m.text().slice(0, 200)) })
page.on('pageerror', (e) => console.log('PAGE THROW:', String(e).slice(0, 200)))

await page.goto(url, { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(3500)
await page.screenshot({ path: '/tmp/pilai-generate.png' })
console.log('shot: generate')

async function tab(label, file) {
  try {
    await page.click(`text="${label}"`, { timeout: 6000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: file })
    console.log('shot:', label)
  } catch (e) { console.log('FAIL', label, e.message.slice(0, 120)) }
}
await tab('기록', '/tmp/pilai-history.png')

try {
  await page.click('text="생성"', { timeout: 6000 })
  await page.waitForTimeout(800)
  await page.click('text="+ 새 회원"', { timeout: 6000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/pilai-memberform.png' })
  console.log('shot: memberform')
} catch (e) { console.log('FAIL memberform', e.message.slice(0, 120)) }

// SHOT_GENERATE=1 일 때만: 로그인→회원→생성 플로우로 라이브 생성(유료) → 결과/편집 뷰 캡처
if (process.env.SHOT_GENERATE) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 }) // 깨끗한 상태(모달 닫기), 회원은 주입됨
    await page.waitForTimeout(2500)
    await page.click('text="카카오로 시작하기"', { timeout: 8000 })       // 로그인 → 홈
    await page.waitForTimeout(1000)
    await page.click('text="회원 선택해 시퀀스 만들기"', { timeout: 8000 }) // 홈 → 회원 목록
    await page.waitForTimeout(1000)
    await page.click('text="김민지"', { timeout: 8000 })                   // 회원 선택 → 상세
    await page.waitForTimeout(1000)
    await page.click('text="김민지님 시퀀스 생성"', { timeout: 8000 })      // 상세 → 생성폼(prefill)
    await page.waitForTimeout(1000)
    await page.getByText('시퀀스 생성', { exact: true }).last().click({ timeout: 8000 }) // 생성폼 footer 버튼
    try { await page.waitForSelector('text=시퀀스를 구성하고 있어요', { timeout: 8000 }); console.log('생성 시작됨') }
    catch { console.log('⚠ 생성 시작 안 됨 (버튼 클릭 실패?)') }
    console.log('생성 중 (라이브 API)...')
    try {
      await page.waitForSelector('text="저장만 하고 나중에"', { timeout: 150000 }) // SequenceScreen 도착
      console.log('결과 도착')
    } catch {
      console.log('결과 대기 타임아웃 — 현재 화면(에러일 수 있음) 캡처')
    }
    await page.setViewportSize({ width: 390, height: 3400 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: '/tmp/pilai-result.png' })
    console.log('shot: result/state')
    // reps 인라인 편집 — reps 영역(+회수 또는 배지) 클릭 시 입력칸이 뜨는지 캡처
    try {
      await page.setViewportSize({ width: 390, height: 1500 })
      await page.waitForTimeout(500)
      const repsBtn = page.locator('text="+ 회수"').first()
      if (await repsBtn.count()) {
        await repsBtn.click({ timeout: 4000 })
        await page.waitForTimeout(600)
        await page.screenshot({ path: '/tmp/pilai-repsedit.png' })
        console.log('shot: repsedit')
      } else { console.log('repsedit: "+ 회수" 없음(모든 동작에 reps 있음) — 스킵') }
    } catch (e) { console.log('FAIL repsedit', e.message.slice(0, 140)) }
  } catch (e) { console.log('FAIL result', e.message.slice(0, 160)) }
}

await browser.close()
console.log('DONE — /tmp/pilai-*.png')
