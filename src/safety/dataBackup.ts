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

const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

const isNullableString = (value: unknown): value is string | null => {
  return value === null || isString(value)
}

const validateLocationLinkRecord = (value: unknown): boolean => {
  return (
    isObjectRecord(value) &&
    isString(value.id) &&
    isString(value.type) &&
    isString(value.title) &&
    isString(value.value) &&
    isString(value.memo)
  )
}

const validateTaskRecord = (value: unknown): boolean => {
  return (
    isObjectRecord(value) &&
    isString(value.id) &&
    isString(value.userId) &&
    isString(value.type) &&
    isString(value.calendarCategory) &&
    isString(value.title) &&
    isNullableString(value.dueDate) &&
    isString(value.status) &&
    isString(value.memo) &&
    isString(value.sourceMemo) &&
    isString(value.submissionTarget) &&
    Array.isArray(value.locationLinks) &&
    value.locationLinks.every(validateLocationLinkRecord) &&
    isStringArray(value.linkedCollectionIds) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

const validateClassRecord = (value: unknown): boolean => {
  return (
    isObjectRecord(value) &&
    isString(value.id) &&
    typeof value.schoolYear === 'number' &&
    isString(value.schoolLevel) &&
    isString(value.grade) &&
    isString(value.className) &&
    Array.isArray(value.students)
  )
}

const validateSubmissionCollectionRecord = (value: unknown): boolean => {
  return (
    isObjectRecord(value) &&
    isString(value.id) &&
    isString(value.userId) &&
    isString(value.classId) &&
    isNullableString(value.officialDocumentTaskId) &&
    isString(value.taskId) &&
    isString(value.title) &&
    isNullableString(value.dueDate) &&
    isObjectRecord(value.rows) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

const validateCollectionRecord = (value: unknown): boolean => {
  return (
    isObjectRecord(value) &&
    isString(value.id) &&
    validateSubmissionCollectionRecord(value.collection) &&
    Array.isArray(value.students)
  )
}

const validateTemplateRecord = (value: unknown): boolean => {
  return (
    isObjectRecord(value) &&
    isString(value.id) &&
    isString(value.userId) &&
    isString(value.title) &&
    isString(value.type) &&
    isString(value.body) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    (value.lastUsedAt === null || isString(value.lastUsedAt)) &&
    isStringArray(value.tags) &&
    isStringArray(value.replacementKeys)
  )
}

const validateRecords = (groupName: string, value: unknown): string | null => {
  if (!Array.isArray(value)) {
    return `${groupName} 그룹이 배열이 아닙니다.`
  }

  const hasInvalidItem = value.some((item) => {
    if (groupName === 'tasks') {
      return !validateTaskRecord(item)
    }
    if (groupName === 'classes') {
      return !validateClassRecord(item)
    }
    if (groupName === 'collections') {
      return !validateCollectionRecord(item)
    }
    if (groupName === 'templates') {
      return !validateTemplateRecord(item)
    }
    return false
  })

  if (hasInvalidItem) {
    return `${groupName}의 각 항목에는 필수 필드가 누락되었습니다.`
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
      .map((group) => validateRecords(group, parsed[group]))
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
