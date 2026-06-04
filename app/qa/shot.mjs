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

// SHOT_GENERATE=1 일 때만: 실제 폼 입력 → 라이브 생성(유료) → 결과/편집 뷰 캡처
if (process.env.SHOT_GENERATE) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 }) // 깨끗한 상태(모달 닫기)
    await page.waitForTimeout(2500)
    await page.getByPlaceholder('목디스크, 거북목, 말린 어깨').fill('목디스크, 거북목, 말린 어깨')
    await page.getByPlaceholder('자세교정, 코어').first().fill('자세교정, 코어')
    await page.locator('text="시퀀스 생성"').last().click({ timeout: 6000 }) // 제목 말고 버튼(마지막)
    try { await page.waitForSelector('text=만들고 있어요', { timeout: 8000 }); console.log('생성 시작됨') }
    catch { console.log('⚠ 생성 시작 안 됨 (버튼 클릭 실패?)') }
    console.log('생성 중 (라이브 API)...')
    try {
      await page.waitForSelector('text="최종본 저장"', { timeout: 150000 })
      console.log('결과 도착')
    } catch {
      console.log('결과 대기 타임아웃 — 현재 화면(에러일 수 있음) 캡처')
    }
    await page.setViewportSize({ width: 390, height: 2800 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: '/tmp/pilai-result.png' })
    console.log('shot: result/state')
    // 수업 보기(클래스 모드) — 같은 생성 재사용, 읽기 좋은 크기로
    try {
      const cls = page.locator('text="수업 보기"').first()
      await cls.scrollIntoViewIfNeeded({ timeout: 5000 })
      await cls.click({ timeout: 5000 })
      await page.waitForTimeout(1200)
      await page.setViewportSize({ width: 390, height: 900 })
      await page.waitForTimeout(400)
      await page.screenshot({ path: '/tmp/pilai-class.png' })
      console.log('shot: class')
    } catch (e) { console.log('FAIL class', e.message.slice(0, 140)) }
  } catch (e) { console.log('FAIL result', e.message.slice(0, 160)) }
}

await browser.close()
console.log('DONE — /tmp/pilai-*.png')
