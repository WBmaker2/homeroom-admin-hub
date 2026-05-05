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

const hasArrayGroup = (data: Record<string, unknown>, key: keyof DataSafetyPayload): boolean => {
  return key in data && Array.isArray(data[key])
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

    const missing = ['tasks', 'classes', 'collections', 'templates'].filter((key) => {
      return !hasArrayGroup(parsed, key as keyof DataSafetyPayload)
    })

    if (missing.length > 0) {
      return {
        ok: false,
        error: `다음 그룹이 비어있거나 배열이 아닙니다: ${missing.join(', ')}`,
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
