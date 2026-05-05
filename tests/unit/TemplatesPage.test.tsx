import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesPage } from '../../src/templates/TemplatesPage'
import * as templateService from '../../src/templates/templateService'
import * as userRecordsModule from '../../src/firebase/useUserRecords'
import { getDemoTemplates } from '../../src/firebase/seedDemoData'
import type { TemplateItem } from '../../src/types/domain'

const seedTemplate = getDemoTemplates()[0]

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

const customTemplate = {
  id: 'template-custom',
  userId: 'user-1',
  title: '사용자 템플릿',
  type: 'OTHER' as const,
  body: '{학급} 안내',
  tags: ['커스텀'],
  replacementKeys: ['학급'],
  lastUsedAt: null,
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-05-01T09:00:00.000Z',
}

const getFirstTemplateButton = () => {
  const templateList = screen.getByRole('list', { name: '템플릿 목록' })
  return within(templateList).getByRole('button', { name: /학급 제출물 안내/ })
}

const mockTemplateRecords = (
  records: TemplateItem[] = [seedTemplate],
  setRecords: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(records),
) =>
  vi.spyOn(userRecordsModule, 'useUserRecords').mockReturnValue({
    error: '',
    loading: false,
    records,
    setRecords,
    userId: 'user-1',
    usingFirestore: false,
  })

describe('TemplatesPage clipboard interactions', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.spyOn(templateService, 'getTemplateStore').mockReturnValue([seedTemplate])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    cleanup()
  })

  it('shows alert when clipboard API is unavailable and does not throw', async () => {
    mockTemplateRecords()
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
    mockTemplateRecords()
    vi.spyOn(templateService, 'isClipboardWriteAvailable').mockReturnValue(true)
    const writeText = vi
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
    expect(alert).toHaveTextContent(
      '클립보드 복사 또는 템플릿 저장에 실패했습니다. 다시 시도해 주세요.',
    )
    expect(firstTemplateButton.textContent ?? '').toContain(initialLastUsed)
    expect(writeText).toHaveBeenCalledTimes(1)
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

  it('initializes selected template from local store when no intentCreate', async () => {
    mockTemplateRecords([customTemplate])
    vi.spyOn(templateService, 'getTemplateStore').mockReturnValue([customTemplate])

    renderTemplatesPage()

    expect(await screen.findByDisplayValue('사용자 템플릿')).toBeInTheDocument()
  })

  it('shows alert when template save persistence fails', async () => {
    const setTemplates = vi.fn().mockRejectedValue(new Error('save failed'))
    mockTemplateRecords([seedTemplate], setTemplates)
    const user = userEvent.setup()

    renderTemplatesPage()

    const titleInput = screen.getByLabelText('제목')
    await user.clear(titleInput)
    await user.type(titleInput, '저장 실패 테스트')

    await user.click(screen.getByRole('button', { name: '저장' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('템플릿 저장에 실패했습니다.')
    expect(setTemplates).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('제목')).toHaveValue('저장 실패 테스트')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows alert when copy persistence fails after clipboard write succeeds', async () => {
    const fixedNow = new Date('2026-05-05T10:00:00.000Z')
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedNow.toISOString())

    const setTemplates = vi.fn().mockRejectedValue(new Error('save failed'))
    mockTemplateRecords([seedTemplate], setTemplates)
    const writeText = vi
      .spyOn(templateService, 'writeTextToClipboard')
      .mockResolvedValue(undefined)
    vi.spyOn(templateService, 'isClipboardWriteAvailable').mockReturnValue(true)
    const user = userEvent.setup()

    renderTemplatesPage()

    const copyButton = screen.getByRole('button', { name: '미리보기 복사' })
    await user.click(copyButton)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('클립보드 복사 또는 템플릿 저장에 실패했습니다.')
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(setTemplates).toHaveBeenCalledTimes(1)
    const initialLastUsed = formatLastUsedDate('2026-05-02T08:30:00.000Z')
    const firstTemplateButton = getFirstTemplateButton()
    expect(firstTemplateButton.textContent ?? '').toContain(initialLastUsed)
  })

  it('disables save and copy while persistence is busy', async () => {
    const setTemplates = vi
      .fn()
      .mockImplementation(
        () => new Promise(() => {
          // never resolve until test assertion finishes
        }),
      )
    mockTemplateRecords([seedTemplate], setTemplates)
    vi.spyOn(templateService, 'isClipboardWriteAvailable').mockReturnValue(true)
    vi.spyOn(templateService, 'writeTextToClipboard').mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderTemplatesPage()

    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '미리보기 복사' })).toBeDisabled()
  })

  it('disables template selection while persistence is busy', async () => {
    const secondTemplate: TemplateItem = {
      ...seedTemplate,
      id: 'template-second',
      title: '두 번째 템플릿',
    }
    const setTemplates = vi
      .fn()
      .mockImplementation(
        () => new Promise(() => {
          // keep busy state active for assertion
        }),
      )
    mockTemplateRecords([seedTemplate, secondTemplate], setTemplates)
    const user = userEvent.setup()

    renderTemplatesPage()

    await user.click(screen.getByRole('button', { name: '저장' }))
    const templateList = screen.getByRole('list', { name: '템플릿 목록' })
    expect(within(templateList).getByRole('button', { name: /학급 제출물 안내/ })).toBeDisabled()
    expect(within(templateList).getByRole('button', { name: /두 번째 템플릿/ })).toBeDisabled()
  })
})
