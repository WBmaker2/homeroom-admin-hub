import { describe, expect, it } from 'vitest'
import { createBackupFilename, createBackupPayload, parseBackupPayload } from '../../src/safety/dataBackup'
import type { TemplateItem, TaskItem } from '../../src/types/domain'
import type { ClassRecord } from '../../src/classes/classService'
import type { CollectionWithStudents } from '../../src/collections/collectionService'

const task: TaskItem = {
  id: 'task-1',
  userId: 'user-1',
  type: 'PERSONAL_DUE',
  calendarCategory: 'PERSONAL',
  title: '테스트 과제',
  dueDate: '2026-05-05',
  status: 'RECEIVED',
  memo: '',
  sourceMemo: '',
  submissionTarget: '',
  locationLinks: [],
  linkedCollectionIds: [],
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
}

const classRecord: ClassRecord = {
  id: 'class-1',
  schoolYear: 2026,
  schoolLevel: '초등학교',
  grade: '3학년',
  className: '2반',
  students: [],
}

const collection: CollectionWithStudents = {
  id: 'collection-1',
  collection: {
    id: 'submission-1',
    userId: 'user-1',
    classId: 'class-1',
    officialDocumentTaskId: null,
    taskId: 'task-1',
    title: '5월 수합판',
    dueDate: null,
    rows: {},
    createdAt: '2026-05-01T11:00:00.000Z',
    updatedAt: '2026-05-01T11:00:00.000Z',
  },
  students: [],
}

const template: TemplateItem = {
  id: 'template-1',
  userId: 'user-1',
  title: '학급 안내',
  type: 'NOTICE',
  body: '{학급}에 안내합니다.',
  tags: ['안내'],
  replacementKeys: ['학급'],
  lastUsedAt: null,
  createdAt: '2026-05-01T12:00:00.000Z',
  updatedAt: '2026-05-01T12:00:00.000Z',
}

describe('dataBackup schema helpers', () => {
  it('builds a payload with all required groups', () => {
    const payload = createBackupPayload([task], [classRecord], [collection], [template])

    expect(payload.tasks).toEqual([task])
    expect(payload.classes).toEqual([classRecord])
    expect(payload.collections).toEqual([collection])
    expect(payload.templates).toEqual([template])
    expect(payload.exportedAt).toBeDefined()
  })

  it('accepts valid payloads in JSON parser', () => {
    const payload = createBackupPayload([task], [classRecord], [collection], [template])
    const parsed = parseBackupPayload(JSON.stringify(payload))

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.value).toEqual(payload)
    expect(parsed.value.exportedAt).toBe(payload.exportedAt)
  })

  it('rejects invalid json', () => {
    const parsed = parseBackupPayload('{invalid-json}')

    expect(parsed.ok).toBe(false)
    if (parsed.ok) {
      return
    }

    expect(parsed.error).toBe('JSON 형식이 올바르지 않습니다.')
  })

  it('rejects payloads missing required groups', () => {
    const parsed = parseBackupPayload(
      JSON.stringify({
        tasks: [],
        classes: [],
        collections: [],
      }),
    )

    expect(parsed.ok).toBe(false)
    if (parsed.ok) {
      return
    }

    expect(parsed.error).toContain('templates')
  })

  it('rejects payloads with non-array groups', () => {
    const parsed = parseBackupPayload(
      JSON.stringify({
        tasks: [],
        classes: 'oops',
        collections: [],
        templates: [],
      }),
    )

    expect(parsed.ok).toBe(false)
    if (parsed.ok) {
      return
    }

    expect(parsed.error).toContain('classes')
  })

  it('builds a date-based backup filename', () => {
    expect(createBackupFilename(new Date('2026-06-07T10:00:00Z'))).toBe(
      'homeroom-admin-hub-backup-2026-06-07.json',
    )
  })
})
