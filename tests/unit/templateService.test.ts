import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  extractTemplateReplacementKeys,
  interpolateTemplate,
  getTemplateStore,
  saveTemplateStore,
  touchTemplateLastUsedAt,
} from '../../src/templates/templateService'
import type { TemplateItem } from '../../src/types/domain'
import { getDemoTemplates } from '../../src/firebase/seedDemoData'


const baseTemplate = ({
  id = 'template-1',
  lastUsedAt = null,
}: {
  id?: string
  lastUsedAt?: string | null
}): TemplateItem => ({
  id,
  userId: 'user-demo',
  title: '학급 안내',
  type: 'NOTICE',
  body: '{학급}에 공지문을 보냅니다.',
  tags: ['안내'],
  replacementKeys: ['학급'],
  lastUsedAt,
  createdAt: '2026-05-01T08:00:00.000Z',
  updatedAt: '2026-05-01T08:00:00.000Z',
})

const fixedNow = '2026-05-04T10:00:00.000Z'

describe('interpolateTemplate', () => {
  it('replaces known placeholders with values', () => {
    expect(
      interpolateTemplate('안내: {학급} {마감일}', { 학급: '3-2', 마감일: '5월 8일' }),
    ).toBe('안내: 3-2 5월 8일')
  })

  it('keeps blank placeholder value tokens as-is', () => {
    expect(interpolateTemplate('{학급} {준비물}', { 학급: '3-2', 준비물: '' })).toBe(
      '3-2 {준비물}',
    )
  })

  it('does not replace unsupported placeholder keys', () => {
    expect(interpolateTemplate('{학급} {이름}', { 학급: '3-2', 이름: '민지' })).toBe('3-2 {이름}')
  })
})

describe('extractTemplateReplacementKeys', () => {
  it('extracts supported keys and removes duplicates in order', () => {
    expect(
      extractTemplateReplacementKeys(
        '{학급} 안내문 {담임명} 검토 후 {학급} {마감일} {준비물} {UNKNOWN}',
      ),
    ).toEqual(['학급', '담임명', '마감일', '준비물'])
  })

  it('returns empty when no supported placeholders exist', () => {
    expect(extractTemplateReplacementKeys('일반 텍스트 본문')).toEqual([])
  })
})

describe('touchTemplateLastUsedAt', () => {
  it('sets lastUsedAt and updatedAt to current iso string', () => {
    expect(touchTemplateLastUsedAt(baseTemplate({}), fixedNow)).toEqual({
      ...baseTemplate({}),
      lastUsedAt: fixedNow,
      updatedAt: fixedNow,
    })
  })

  it('keeps template values except usage timestamps', () => {
    const template = baseTemplate({ lastUsedAt: null })
    expect(touchTemplateLastUsedAt(template, fixedNow)).toMatchObject({
      id: template.id,
      title: template.title,
      lastUsedAt: fixedNow,
      updatedAt: fixedNow,
    })
  })
})

describe('template local store helpers', () => {
  const keyPrefix = 'homeroom-demo-templates-v1'

  const seedTemplate = getDemoTemplates()[0]

  const setupWindowLocalStorage = () => {
    const store: Record<string, string> = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key]
        }),
        clear: vi.fn(() => {
          Object.keys(store).forEach((key) => {
            delete store[key]
          })
        }),
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
        get length() {
          return Object.keys(store).length
        },
      },
      configurable: true,
    })
  }

  beforeEach(() => {
    setupWindowLocalStorage()
    saveTemplateStore([])
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('returns empty array when no stored templates exist', () => {
    expect(getTemplateStore()).toEqual([])
  })

  it('persists templates to localStorage and reads them back', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem')

    saveTemplateStore([seedTemplate])
    expect(setItemSpy).toHaveBeenCalledWith(
      keyPrefix,
      JSON.stringify([seedTemplate]),
    )

    const loaded = getTemplateStore()
    expect(loaded).toEqual([seedTemplate])
  })
})
