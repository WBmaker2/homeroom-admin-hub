import { type ConsoleMessage, type Page, expect, test } from '@playwright/test'

const ALLOWED_ERROR_MARKERS: string[] = []

function isAllowedClientError(message: string) {
  return ALLOWED_ERROR_MARKERS.some((marker) => message.includes(marker))
}

async function expectNoFileInputs(page: Page) {
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
}

async function withCleanConsoleAndPageErrors(page: Page, callback: () => Promise<void>) {
  const consoleErrors: string[] = []
  const pageErrors: Error[] = []

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() !== 'error') {
      return
    }

    const text = message.text()
    if (!isAllowedClientError(text)) {
      consoleErrors.push(text)
    }
  }

  const onPageError = (error: Error) => {
    if (!isAllowedClientError(error.message)) {
      pageErrors.push(error)
    }
  }

  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  try {
    await callback()
  } finally {
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
  }

  expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join('\n')}`).toHaveLength(0)
  expect(pageErrors, `Unexpected page errors: ${pageErrors.map((error) => error.message).join('\n')}`).toHaveLength(0)
}

function isDemoRouteUrl(url: string): boolean {
  return /\/app\//.test(url)
}

async function expectNoAuthRedirectInDemoMode(page: Page, path: string, headingName: string) {
  await page.goto(path)
  if (isDemoRouteUrl(page.url())) {
    await expect(page.getByRole('heading', { name: headingName, exact: true })).toBeVisible()
    return
  }

  await expect(page).toHaveURL(/\/login(?:[/?#]|$)/)
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
}

test('landing and public routes do not include file upload inputs', async ({ page }) => {
  await withCleanConsoleAndPageErrors(page, async () => {
    await page.goto('/')
    await expect(page).toHaveTitle('담임 행정 허브')
    await expect(page.getByRole('heading', { name: '오늘 처리할 담임 행정 업무가 한 화면에 정리됩니다' })).toBeVisible()
    await expectNoFileInputs(page)
  })

  await withCleanConsoleAndPageErrors(page, async () => {
    await page.goto('/login')
    await expect(page).toHaveTitle('담임 행정 허브')
    if (await page.getByRole('heading', { name: '로그인' }).isVisible()) {
      await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
    } else {
      await expect(page).toHaveURL(/\/app\//)
    }
    await expectNoFileInputs(page)
  })
})

test('app routes without auth should redirect unless demo mode keeps app access', async ({ page }) => {
  await withCleanConsoleAndPageErrors(page, async () => {
    await expectNoAuthRedirectInDemoMode(page, '/app/inbox', '오늘 업무함')
    await expectNoFileInputs(page)
  })

  await withCleanConsoleAndPageErrors(page, async () => {
    await expectNoAuthRedirectInDemoMode(page, '/app/tasks', '전체 업무')
    await expectNoFileInputs(page)
  })

  await withCleanConsoleAndPageErrors(page, async () => {
    await expectNoAuthRedirectInDemoMode(page, '/app/collections', '학급 수합판')
    await expectNoFileInputs(page)
  })

  await withCleanConsoleAndPageErrors(page, async () => {
    await expectNoAuthRedirectInDemoMode(page, '/app/classes', '학급 명부')
    await expectNoFileInputs(page)
  })

  await withCleanConsoleAndPageErrors(page, async () => {
    await expectNoAuthRedirectInDemoMode(page, '/app/calendar', '마감 캘린더')
    await expectNoFileInputs(page)
  })

  await withCleanConsoleAndPageErrors(page, async () => {
    await expectNoAuthRedirectInDemoMode(page, '/app/templates', '템플릿')
    await expectNoFileInputs(page)
  })

  await withCleanConsoleAndPageErrors(page, async () => {
    await expectNoAuthRedirectInDemoMode(page, '/app/safety', '데이터 안전')
    await expectNoFileInputs(page)
  })
})
