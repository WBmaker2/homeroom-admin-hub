import type { TemplateItem } from '../types/domain'
import { getDemoTemplates, isDemoAuthMode } from '../firebase/seedDemoData'

export const TEMPLATE_REPLACEMENT_KEYS = [
  '학급',
  '마감일',
  '제출물명',
  '준비물',
  '담임명',
] as const

type SupportedTemplateReplacementKey = (typeof TEMPLATE_REPLACEMENT_KEYS)[number]

const TEMPLATE_STORE_KEY = 'homeroom-demo-templates-v1'

const canUseBrowserStorage = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined' &&
    typeof window.localStorage.getItem === 'function' &&
    typeof window.localStorage.setItem === 'function'
  )
}

const normalizeTemplateStore = (templates: TemplateItem[]): TemplateItem[] =>
  templates
    .filter((template): template is TemplateItem => Boolean(template?.id))
    .map((template) => ({
      ...template,
      tags: [...template.tags],
      replacementKeys: [...template.replacementKeys],
    }))

const parseStoredTemplates = (): TemplateItem[] | null => {
  if (!canUseBrowserStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return null
    }

    return normalizeTemplateStore(parsed)
  } catch {
    return null
  }
}

let templateStore: TemplateItem[] | null = null

export const isClipboardWriteAvailable = () => {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.clipboard) &&
    typeof navigator.clipboard.writeText === 'function'
  )
}

export const getTemplateStore = (): TemplateItem[] => {
  if (templateStore !== null) {
    return normalizeTemplateStore(templateStore)
  }

  const stored = parseStoredTemplates()
  if (stored !== null) {
    templateStore = stored
    return normalizeTemplateStore(templateStore)
  }

  if (isDemoAuthMode()) {
    templateStore = getDemoTemplates()
    return normalizeTemplateStore(templateStore)
  }

  templateStore = []
  return []
}

export const saveTemplateStore = (templates: TemplateItem[]): TemplateItem[] => {
  const normalized = normalizeTemplateStore(templates)
  templateStore = normalized

  if (canUseBrowserStorage()) {
    window.localStorage.setItem(TEMPLATE_STORE_KEY, JSON.stringify(normalized))
  }

  return normalizeTemplateStore(normalized)
}

export const writeTextToClipboard = async (text: string): Promise<void> => {
  if (!isClipboardWriteAvailable()) {
    throw new Error('Clipboard API is unavailable')
  }

  await navigator.clipboard.writeText(text)
}

export const TEMPLATE_TYPE_LABEL: Record<TemplateItem['type'], string> = {
  NOTICE: '안내문',
  COUNSELING_FORM: '상담 기록 양식',
  REPORT_PHRASE: '보고 문구',
  SUBMISSION_REMINDER: '제출 독촉 문구',
  OTHER: '기타',
}

const templateReplacementRegex = /\{([^{}]+)\}/g
const supportedTemplateReplacementSet = new Set<string>(TEMPLATE_REPLACEMENT_KEYS)

const normalizeTemplateKey = (key: string): string => key.trim()

const isSupportedTemplateReplacementKey = (key: string): key is SupportedTemplateReplacementKey => {
  return supportedTemplateReplacementSet.has(key)
}

export const extractTemplateReplacementKeys = (template: string): string[] => {
  const keys: SupportedTemplateReplacementKey[] = []
  const seen = new Set<string>()

  for (const match of template.matchAll(templateReplacementRegex)) {
    const candidate = normalizeTemplateKey(match[1] ?? '')
    if (isSupportedTemplateReplacementKey(candidate) && !seen.has(candidate)) {
      seen.add(candidate)
      keys.push(candidate)
    }
  }

  return keys
}

export const interpolateTemplate = (template: string, values: Record<string, string>): string => {
  return template.replace(templateReplacementRegex, (_match, key: string) => {
    const normalizedKey = normalizeTemplateKey(key)

    if (!isSupportedTemplateReplacementKey(normalizedKey)) {
      return `{${normalizedKey}}`
    }

    const replacement = values[normalizedKey]

    if (replacement === undefined || replacement === '') {
      return `{${normalizedKey}}`
    }

    return replacement
  })
}

export const touchTemplateLastUsedAt = (
  template: TemplateItem,
  now: string = new Date().toISOString(),
): TemplateItem => {
  return {
    ...template,
    lastUsedAt: now,
    updatedAt: now,
  }
}
