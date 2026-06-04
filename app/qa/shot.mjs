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
await tab('카탈로그', '/tmp/pilai-catalog.png')
await tab('기록', '/tmp/pilai-history.png')

try {
  await page.click('text="생성"', { timeout: 6000 })
  await page.waitForTimeout(800)
  await page.click('text="+ 새 회원"', { timeout: 6000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/pilai-memberform.png' })
  console.log('shot: memberform')
} catch (e) { console.log('FAIL memberform', e.message.slice(0, 120)) }

await browser.close()
console.log('DONE — /tmp/pilai-*.png')
