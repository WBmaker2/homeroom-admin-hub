import type { TemplateItem, TaskItem } from '../types/domain'
import type { ClassRecord } from '../classes/classService'
import type { CollectionWithStudents } from '../collections/collectionService'

export type DataSafetyPayload = {
  tasks: TaskItem[]
  classes: ClassRecord[]
  collections: CollectionWithStudents[]
  templates: TemplateItem[]
  exportedAt?: string
}

type ParseResult =
  | {
      ok: true
      value: DataSafetyPayload
    }
  | {
      ok: false
      error: string
    }

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const hasValidId = (value: unknown): value is { id: string } => {
  return isObjectRecord(value) && typeof value.id === 'string' && value.id.trim().length > 0
}

const validateRecords = (groupName: string, value: unknown, label: string): string | null => {
  if (!Array.isArray(value)) {
    return `${groupName} 그룹이 배열이 아닙니다.`
  }

  const hasInvalidItem = value.some((item) => !hasValidId(item))

  if (hasInvalidItem) {
    return `${groupName}의 각 항목에 id 문자열이 필요합니다.`
  }

  if (label === 'templates') {
    const hasInvalidTemplate = value.some(
      (item) => !Array.isArray((item as { tags?: unknown }).tags) || !Array.isArray((item as { replacementKeys?: unknown }).replacementKeys),
    )

    if (hasInvalidTemplate) {
      return '템플릿 항목은 tags 및 replacementKeys를 배열로 포함해야 합니다.'
    }
  }

  return null
}

export const createBackupPayload = (
  tasks: TaskItem[],
  classes: ClassRecord[],
  collections: CollectionWithStudents[],
  templates: TemplateItem[],
): DataSafetyPayload => ({
  tasks,
  classes,
  collections,
  templates,
  exportedAt: new Date().toISOString(),
})

export const serializeBackupPayload = (payload: DataSafetyPayload): string => {
  return JSON.stringify(payload, null, 2)
}

export const parseBackupPayload = (value: string): ParseResult => {
  try {
    const parsed = JSON.parse(value)

    if (!isObjectRecord(parsed)) {
      return { ok: false, error: '백업 데이터는 객체 형식이어야 합니다.' }
    }

    const groups: Array<'tasks' | 'classes' | 'collections' | 'templates'> = [
      'tasks',
      'classes',
      'collections',
      'templates',
    ]

    const errors = groups
      .map((group) => validateRecords(group, parsed[group], group))
      .filter((error): error is string => Boolean(error))

    if (errors.length > 0) {
      return {
        ok: false,
        error: errors.join(' '),
      }
    }

    return {
      ok: true,
      value: {
        tasks: parsed.tasks as TaskItem[],
        classes: parsed.classes as ClassRecord[],
        collections: parsed.collections as CollectionWithStudents[],
        templates: parsed.templates as TemplateItem[],
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
      },
    }
  } catch {
    return { ok: false, error: 'JSON 형식이 올바르지 않습니다.' }
  }
}

export const createBackupFilename = (now = new Date()): string => {
  const date = now.toISOString().slice(0, 10)
  return `homeroom-admin-hub-backup-${date}.json`
}
