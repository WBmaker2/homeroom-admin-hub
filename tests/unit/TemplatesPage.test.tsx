import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesPage } from '../../src/templates/TemplatesPage'
import * as templateService from '../../src/templates/templateService'

const formatLastUsedDate = (value: string): string =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))

const renderTemplatesPage = () => render(
  <MemoryRouter>
    <TemplatesPage />
  </MemoryRouter>,
)

const getFirstTemplateButton = () => {
  const templateList = screen.getByRole('list', { name: '템플릿 목록' })
  return within(templateList).getByRole('button', { name: /학급 제출물 안내/ })
}

describe('TemplatesPage clipboard interactions', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    cleanup()
  })

  it('shows alert when clipboard API is unavailable and does not throw', async () => {
    vi.spyOn(templateService, 'isClipboardWriteAvailable').mockReturnValue(false)
    const user = userEvent.setup()

    renderTemplatesPage()

    const copyButton = screen.getByRole('button', { name: '미리보기 복사' })
    await user.click(copyButton)

    expect(screen.getByRole('alert')).toHaveTextContent(
      '현재 환경에서는 클립보드 복사를 사용할 수 없습니다.',
    )
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows alert if clipboard writeText rejects and keeps unsaved edits without changing last used date', async () => {
    vi.spyOn(templateService, 'isClipboardWriteAvailable').mockReturnValue(true)
    const writeTextToClipboard = vi
      .spyOn(templateService, 'writeTextToClipboard')
      .mockRejectedValue(new Error('clipboard denied'))
    const user = userEvent.setup()

    renderTemplatesPage()

    const titleInput = screen.getByLabelText('제목')
    await user.clear(titleInput)
    await user.type(titleInput, '임시 제목 편집')

    const firstTemplateButton = getFirstTemplateButton()
    const initialLastUsed = formatLastUsedDate('2026-05-02T08:30:00.000Z')
    expect(firstTemplateButton.textContent ?? '').toContain(initialLastUsed)

    const copyButton = screen.getByRole('button', { name: '미리보기 복사' })
    await user.click(copyButton)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('클립보드 복사 중 문제가 발생했습니다.')
    expect(firstTemplateButton.textContent ?? '').toContain(initialLastUsed)
    expect(writeTextToClipboard).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('제목')).toHaveValue('임시 제목 편집')
  })

  it('copies preview text, updates lastUsedAt, and preserves unsaved draft edits on success', async () => {
    const fixedNow = new Date('2026-05-04T12:00:00.000Z')
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedNow.toISOString())

    const previewText = '복사 테스트 안내문'
    const writeText = vi
      .spyOn(templateService, 'writeTextToClipboard')
      .mockResolvedValue(undefined)
    vi.spyOn(templateService, 'isClipboardWriteAvailable').mockReturnValue(true)
    const user = userEvent.setup()

    renderTemplatesPage()

    const titleInput = screen.getByLabelText('제목')
    await user.clear(titleInput)
    await user.type(titleInput, '임시 제목 변경')

    const bodyInput = screen.getByLabelText('본문')
    await user.clear(bodyInput)
    await user.type(bodyInput, previewText)

    const firstTemplateButton = getFirstTemplateButton()
    const beforeLastUsed = formatLastUsedDate('2026-05-02T08:30:00.000Z')
    expect(firstTemplateButton.textContent ?? '').toContain(beforeLastUsed)

    const copyButton = screen.getByRole('button', { name: '미리보기 복사' })
    await user.click(copyButton)

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('문구를 클립보드에 복사했습니다.')
    expect(writeText).toHaveBeenCalledWith(previewText)

    const updatedLastUsed = formatLastUsedDate(fixedNow.toISOString())
    expect(firstTemplateButton.textContent ?? '').toContain(updatedLastUsed)
    expect(firstTemplateButton.textContent ?? '').not.toContain(beforeLastUsed)
    expect(screen.getByLabelText('제목')).toHaveValue('임시 제목 변경')
    expect(bodyInput).toHaveValue(previewText)
  })
})
