import { describe, expect, it } from 'vitest'
import { buildInboxSections } from '../../src/inbox/inboxService'
import type {
  CollectionStatus,
  SubmissionCollection,
  TaskItem,
} from '../../src/types/domain'

const baseTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: 'task-1',
  userId: 'user-1',
  type: 'OFFICIAL_DOCUMENT',
  calendarCategory: 'SCHOOL',
  title: '기본업무',
  dueDate: '2026-05-04',
  status: 'RECEIVED',
  memo: '',
  sourceMemo: '',
  submissionTarget: '',
  locationLinks: [],
  linkedCollectionIds: [],
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  ...overrides,
})

const baseCollection = ({
  id,
  rows,
  taskId = 'task-1',
}: {
  id: string
  taskId?: string
  rows: CollectionStatus[]
}): SubmissionCollection => ({
  id,
  userId: 'user-1',
  classId: 'class-1',
  officialDocumentTaskId: null,
  taskId,
  title: '기본 제출물',
  dueDate: '2026-05-04',
  rows: Object.fromEntries(
    rows.map((status, index) => [
      `student-${index + 1}`,
      {
        studentId: `student-${index + 1}`,
        status,
        submittedAt: null,
        memo: '',
      },
    ]),
  ),
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
})

describe('buildInboxSections', () => {
  it('places unfinished overdue tasks in overdue only', () => {
    const tasks: TaskItem[] = [
      baseTask({
        id: 'overdue-1',
        dueDate: '2026-05-03',
        status: 'IN_PROGRESS',
      }),
    ]

    const collections = [
      baseCollection({
        id: 'c-1',
        taskId: 'overdue-1',
        rows: ['MISSING', 'SUBMITTED'],
      }),
    ]

    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks,
      collections,
    })

    expect(sections.overdue.map((item) => item.id)).toEqual(['overdue-1'])
    expect(sections.today).toHaveLength(0)
    expect(sections.incompleteCollections).toHaveLength(0)
    expect(sections.upcoming).toHaveLength(0)
  })

  it('keeps today task with incomplete collection out of incompleteCollections', () => {
    const tasks: TaskItem[] = [
      baseTask({
        id: 'today-with-collection',
        dueDate: '2026-05-04',
      }),
    ]

    const collections = [
      baseCollection({
        id: 'c-2',
        taskId: 'today-with-collection',
        rows: ['SUBMITTED', 'MISSING'],
      }),
    ]

    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks,
      collections,
    })

    expect(sections.today.map((item) => item.id)).toEqual(['today-with-collection'])
    expect(sections.today[0].collectionCompletionRate).toBe(0.5)
    expect(sections.incompleteCollections).toHaveLength(0)
  })

  it('does not include upcoming tasks due beyond 7 days', () => {
    const tasks: TaskItem[] = [
      baseTask({
        id: 'far-future-upcoming',
        dueDate: '2026-05-12',
      }),
    ]

    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks,
      collections: [],
    })

    expect(sections.upcoming).toHaveLength(0)
  })

  it('does not include incomplete collection tasks due beyond 7 days', () => {
    const tasks: TaskItem[] = [
      baseTask({
        id: 'far-future-incomplete',
        dueDate: '2026-05-12',
      }),
    ]

    const collections = [
      baseCollection({
        id: 'c-3',
        taskId: 'far-future-incomplete',
        rows: ['MISSING', 'SUBMITTED'],
      }),
    ]

    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks,
      collections,
    })

    expect(sections.incompleteCollections).toHaveLength(0)
    expect(sections.upcoming).toHaveLength(0)
    expect(sections.overdue).toHaveLength(0)
    expect(sections.today).toHaveLength(0)
  })

  it('includes boundary day exactly at 7-day window in upcoming', () => {
    const tasks: TaskItem[] = [
      baseTask({
        id: 'boundary-upcoming',
        dueDate: '2026-05-11',
      }),
    ]

    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks,
      collections: [],
    })

    expect(sections.upcoming.map((item) => item.id)).toEqual(['boundary-upcoming'])
  })

  it('excludes invalid due dates from urgent grouping', () => {
    const tasks: TaskItem[] = [
      baseTask({
        id: 'invalid-date-task',
        dueDate: '2026-02-31',
      }),
    ]

    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks,
      collections: [],
    })

    expect(sections).toEqual({
      overdue: [],
      today: [],
      incompleteCollections: [],
      upcoming: [],
    })
  })

  it('returns empty sections when today is invalid', () => {
    const sections = buildInboxSections({
      today: '2026-02-31',
      tasks: [
        baseTask({
          id: 'valid-task',
          dueDate: '2026-05-04',
        }),
      ],
      collections: [],
    })

    expect(sections).toEqual({
      overdue: [],
      today: [],
      incompleteCollections: [],
      upcoming: [],
    })
  })

  it('sorts today section by dueDate then updatedAt descending', () => {
    const tasks: TaskItem[] = [
      baseTask({
        id: 'updated-early',
        dueDate: '2026-05-04',
        updatedAt: '2026-05-01T11:00:00.000Z',
      }),
      baseTask({
        id: 'updated-late',
        dueDate: '2026-05-04',
        updatedAt: '2026-05-01T13:00:00.000Z',
      }),
      baseTask({
        id: 'later-date',
        dueDate: '2026-05-05',
        updatedAt: '2026-05-01T09:00:00.000Z',
      }),
    ]

    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks,
      collections: [],
    })

    expect(sections.today.map((item) => item.id)).toEqual([
      'updated-late',
      'updated-early',
    ])
    expect(sections.upcoming.map((item) => item.id)).toEqual(['later-date'])
  })
})
