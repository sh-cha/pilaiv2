// QA: 앱이 실제로 Supabase와 통신하는지 — 로그인 시 익명인증 + kv_store 읽기 요청 포착.
// (회원추가는 RN web TextInput 입력이 자동화로 안 잡혀 생략 — 쓰기 왕복은 REST로 별도 검증함.)
import { chromium } from 'playwright-core'
const PORT = process.env.PORT || 8790
const url = `http://localhost:${PORT}`

const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
  chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true }))
const ctx = await browser.newContext({ viewport: { width: 390, height: 1500 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

const hits = []
page.on('request', (r) => {
  const u = r.url()
  if (u.includes('supabase.co')) hits.push(`${r.method()} ${u.replace(/https:\/\/[^/]+/, '').replace(/\?.*/, '')}`)
})
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERROR:', m.text().slice(0, 160)) })

await page.goto(url, { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(4000)           // splash → login
await page.locator('text="카카오로 시작하기"').first().click({ timeout: 8000 }).catch((e) => console.log('login click fail', e.message.slice(0, 60)))
await page.waitForTimeout(4000)            // signIn(익명) + home 로드(members/sessions 읽기)
await page.screenshot({ path: '/tmp/pilai-sb-home.png' })

const uniq = [...new Set(hits)]
console.log('── Supabase 호출 ──')
uniq.forEach((h) => console.log('  ', h))
const auth = uniq.some((h) => h.includes('/auth/'))
const kv = uniq.some((h) => h.includes('/rest/v1/kv_store'))
console.log(`\n익명인증 호출: ${auth ? '✅' : '❌'}  /  kv_store 읽기 호출: ${kv ? '✅' : '❌'}`)
await browser.close()
