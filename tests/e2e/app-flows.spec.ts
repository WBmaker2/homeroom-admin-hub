import { type Page, expect, test } from '@playwright/test'

const EXPECTED_STATUS_TEXT = '공문 원본 파일, 학생 사진, 실제 상담 기록, 생활지도 사건 기록은 저장하지 마세요.'

async function expectNoFileInputs(page: Page) {
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
}

function todayDateInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

test('공문 업무 흐름', async ({ page }) => {
  await page.goto('/app/inbox')
  await expect(page.getByRole('heading', { name: '오늘 업무함' })).toBeVisible()
  await expectNoFileInputs(page)

  const officialCard = page
    .locator('article')
    .filter({ hasText: '5월 공문 제출 확인' })
  await officialCard.getByRole('link', { name: '상세 보기' }).click()

  await page.waitForURL('**/app/tasks/**')
  await expect(page.getByRole('heading', { name: '5월 공문 제출 확인' })).toBeVisible()
  await expectNoFileInputs(page)

  const statusSelect = page.getByLabel('상태')
  await statusSelect.selectOption('완료')
  await expect(page.locator('.official-document-statusline p')).toContainText('완료로 변경했습니다.')

  await page.getByRole('link', { name: '오늘 업무함으로 이동' }).click()
  await expect(page).toHaveURL(/\/app\/inbox$/)
  await expect(page.locator('article', { hasText: '5월 공문 제출 확인' })).toHaveCount(0)
})

test('제출물 수합 흐름', async ({ page }) => {
  await page.goto('/app/collections')
  await expect(page.getByRole('heading', { name: '학급 수합판' })).toBeVisible()
  await expectNoFileInputs(page)

  await page
    .getByRole('row', { name: /5월 제출물 수합판/ })
    .getByRole('link', { name: '상세 보기' })
    .click()

  await expect(page.getByRole('heading', { name: '5월 제출물 수합판' })).toBeVisible()
  await expectNoFileInputs(page)

  const firstStudentStatus = page.getByLabel('가온(1) 제출 상태 선택')
  await firstStudentStatus.selectOption({ label: '제출' })
  await expect(firstStudentStatus).toHaveValue('SUBMITTED')
})

test('공문과 수합판 연결 흐름', async ({ page }) => {
  await page.goto('/app/collections')
  await expect(page.getByRole('heading', { name: '학급 수합판' })).toBeVisible()

  await page
    .getByRole('row', { name: /5월 제출물 수합판/ })
    .getByRole('link', { name: '상세 보기' })
    .click()

  await expect(page.getByRole('heading', { name: '5월 제출물 수합판' })).toBeVisible()

  const linkedOfficial = page.getByLabel('연결 공문')
  const optionCount = await linkedOfficial.locator('option').count()

  if (optionCount > 1) {
    const lastOption = await linkedOfficial.locator('option').last().textContent()
    if (lastOption) {
      await linkedOfficial.selectOption({ label: lastOption })
    }
  }

  await expect(page.getByText(/연결 과제:/)).toBeVisible()
  await expectNoFileInputs(page)
})

test('템플릿 재사용 흐름', async ({ page }) => {
  await page.goto('/app/templates')
  await expect(page.getByRole('heading', { level: 1, name: '템플릿' })).toBeVisible()
  await page.getByRole('button', { name: /학급 제출물 안내/ }).click()

  await page.getByPlaceholder('학급 입력').fill('3학년 2반')
  await page.getByPlaceholder('제출물명 입력').fill('수학 과제')
  await page.getByPlaceholder('마감일 입력').fill('6월 1일')

  await expect(page.getByText('3학년 2반')).toBeVisible()
  await expect(page.getByText('수학 과제')).toBeVisible()
  await expect(page.getByText('6월 1일')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeEnabled()
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('status')).toHaveText('템플릿을 저장했습니다.')
  await expectNoFileInputs(page)
})

test('학급 명부 수동 입력 흐름', async ({ page }) => {
  await page.goto('/app/classes')
  await expect(page.getByRole('heading', { name: '학급 명부' })).toBeVisible()

  await page.getByRole('textbox', { name: '학년', exact: true }).fill('6학년')
  await page.getByRole('textbox', { name: '반 이름' }).fill('E2E 테스트반')
  await page.getByRole('button', { name: '반 생성' }).click()
  await expect(page.getByText(/반이 .*되었습니다/)).toBeVisible()

  await page.getByRole('textbox', { name: '번호' }).fill('31')
  await page.getByRole('textbox', { name: '이름', exact: true }).fill('E2E학생')
  await page.getByRole('button', { name: '학생 추가' }).click()

  await expect(page.getByText('E2E학생 학생이 등록되었습니다.')).toBeVisible()
  await expect(page.getByRole('row', { name: /31 E2E학생 E2E학생/ })).toBeVisible()
  await expectNoFileInputs(page)
})

test('개인 마감 생성 후 캘린더에서 상세 편집 흐름', async ({ page }) => {
  await page.goto('/app/tasks?intent=create&type=PERSONAL_DUE')
  await expect(page.getByRole('heading', { name: '개인 마감 추가' })).toBeVisible()

  await page.getByLabel('제목').fill('E2E 개인 마감')
  await page.getByLabel('마감일').fill(todayDateInputValue())
  await page.getByLabel('메모').fill('캘린더 연결 확인')
  await page.getByRole('button', { name: '개인 마감 추가 저장' }).click()
  await expect(page.getByRole('heading', { name: 'E2E 개인 마감' })).toBeVisible()

  await page.goto('/app/calendar')
  await page.getByRole('link', { name: /E2E 개인 마감/ }).click()
  await expect(page).toHaveURL(/\/app\/tasks\?taskId=/)
  await expect(page.getByRole('heading', { name: '개인 마감 상세' })).toBeVisible()

  await page.getByLabel('메모').fill('캘린더에서 상세 수정')
  await expect(page.getByText('업무 상세가 저장되었습니다.')).toBeVisible()
  await expectNoFileInputs(page)
})

test('파일 저장 제외 흐름', async ({ page }) => {
  const routes = [
    '/app/inbox',
    '/app/tasks',
    '/app/collections',
    '/app/classes',
    '/app/calendar',
    '/app/templates',
    '/app/safety',
  ]

  for (const route of routes) {
    await page.goto(route)
    await expectNoFileInputs(page)
  }

  await expect(page.getByText(EXPECTED_STATUS_TEXT)).toBeVisible()
})
