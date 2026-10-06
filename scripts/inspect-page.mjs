// Low-level page inspection: launches the real saved Chrome profile,
// loads WhatsApp Web WITHOUT whatsapp-web.js, and reports what the page
// actually does (QR prompt? reload loop? crash? loaded app?).
// Usage: node scripts/inspect-page.mjs
// IMPORTANT: quit the TUI first — two Chromes cannot share one profile.
import os from 'os'
import path from 'path'
import puppeteer from 'puppeteer'

const root =
	process.env.WHATSAPP_CLI_DIR || path.join(os.homedir(), '.whatsapp-cli')
const profile = path.join(root, 'auth', 'session')
const shotPath =
	process.argv[2] || path.join('D:\\tmp\\opencode', 'wa-page.png')

const browser = await puppeteer.launch({
	headless: true,
	userDataDir: profile,
	args: [
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
		'--disable-blink-features=AutomationControlled',
	],
})
try {
	const page = await browser.newPage()
	const consoleErrors = []
	page.on('console', msg => {
		if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200))
	})
	page.on('requestfailed', req => {
		consoleErrors.push(
			`REQFAIL ${req.url().slice(0, 120)} :: ${req.failure()?.errorText}`,
		)
	})
	const seenUrls = new Set()
	page.on('framenavigated', frame => {
		if (frame === page.mainFrame()) {
			seenUrls.add(frame.url())
			console.log(`NAV -> ${frame.url()}`)
		}
	})

	console.log('Loading https://web.whatsapp.com ...')
	await page.goto('https://web.whatsapp.com', {
		waitUntil: 'domcontentloaded',
		timeout: 60000,
	})
	await new Promise(r => setTimeout(r, 25000))

	const url = page.url()
	const title = await page.title().catch(() => '<no title>')
	console.log(`FINAL url=${url}`)
	console.log(`FINAL title=${title}`)
	console.log(`navigations seen: ${seenUrls.size}`)

	const state = await page
		.evaluate(() => ({
			hasDebug: typeof window.Debug !== 'undefined',
			debugVersion: window.Debug?.VERSION,
			hasRequire: typeof window.require !== 'undefined',
			qrPresent: !!document.querySelector('canvas[aria-label^="Scan"]'),
			bodyText: document.body?.innerText?.slice(0, 300).replace(/\s+/g, ' '),
		}))
		.catch(e => ({evaluateFailed: String(e).slice(0, 200)}))
	console.log('PAGE STATE:', JSON.stringify(state, null, 2))

	console.log('CONSOLE/NET ERRORS (first 10):')
	for (const e of consoleErrors.slice(0, 10)) console.log(`  ! ${e}`)

	await page.screenshot({path: shotPath, fullPage: false})
	console.log(`screenshot: ${shotPath}`)
} finally {
	await browser.close().catch(() => {})
}
process.exit(0)
