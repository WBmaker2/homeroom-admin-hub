import { describe, expect, it } from 'vitest'
import {
  deleteClassPlan,
  deleteCollectionPlan,
  deleteOfficialDocumentKeepCollectionsPlan,
  deleteOfficialDocumentWithCollectionsPlan,
  applyCollectionDeletionPlan,
  type ClassForDeletion,
  collectionStatusLabel,
  completionRate,
  createStudentFromInput,
  filterCollectionRows,
  createSubmissionCollectionWithTask,
  updateCollectionRow,
  isCollectionCreationBlocked,
  summarizeCollection,
} from '../../src/collections/collectionService'
import { type CollectionStatus, type SubmissionCollection } from '../../src/types/domain'
import {
  linkCollectionToTaskList,
  reassignCollectionOfficialTask,
  resolveOfficialDocumentDrafts,
  unlinkCollectionFromTaskList,
} from '../../src/tasks/taskService'

const collectionWithStatuses = (statuses: CollectionStatus[]): SubmissionCollection => ({
  id: 'collection-1',
  userId: 'user-1',
  classId: 'class-1',
  officialDocumentTaskId: null,
  taskId: 'task-1',
  title: '제출물 수합',
  dueDate: '2026-05-04',
  rows: Object.fromEntries(
    statuses.map((status, index) => [
      `student-${index}`,
      {
        studentId: `student-${index}`,
        status,
        submittedAt: status === 'SUBMITTED' ? '2026-05-01T10:00:00.000Z' : null,
        memo: '',
      },
    ]),
  ),
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
})

const createCollection = ({
  id,
  classId,
  taskId,
  officialDocumentTaskId = null,
}: {
  id: string
  classId: string
  taskId: string
  officialDocumentTaskId?: string | null
}): SubmissionCollection => ({
  id,
  classId,
  officialDocumentTaskId,
  taskId,
  userId: 'user-1',
  title: `${id} 제목`,
  dueDate: null,
  rows: {},
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
})

const createOfficialDocument = (id: string, linkedCollectionIds: string[] = []) => ({
  id,
  userId: 'user-1',
  type: 'OFFICIAL_DOCUMENT' as const,
  calendarCategory: 'SCHOOL' as const,
  title: `${id} 공문`,
  dueDate: null,
  status: 'RECEIVED' as const,
  memo: '',
  sourceMemo: '',
  submissionTarget: '',
  locationLinks: [],
  linkedCollectionIds,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
})

describe('completionRate', () => {
  it('returns ratio of submitted rows excluding NOT_APPLICABLE', () => {
    expect(completionRate(collectionWithStatuses(['SUBMITTED', 'MISSING']))).toBe(0.5)
    expect(completionRate(collectionWithStatuses(['SUBMITTED', 'NOT_APPLICABLE']))).toBe(1)
    expect(completionRate(collectionWithStatuses(['NOT_APPLICABLE']))).toBe(1)
  })
})

describe('collection helper coverage', () => {
  it('blocks creation when roster is empty', () => {
    expect(isCollectionCreationBlocked([])).toBe(
      '제출물 수합판을 만들기 전에 학급 명부를 먼저 추가해 주세요.',
    )
    expect(isCollectionCreationBlocked(undefined)).toBe(
      '제출물 수합판을 만들기 전에 학급 명부를 먼저 추가해 주세요.',
    )
    expect(isCollectionCreationBlocked([{ studentNumber: 1, name: '김가온', displayName: '김가온' }])).toBeNull()
  })

  it('summarizes status counts and completion rate', () => {
    const summary = summarizeCollection(collectionWithStatuses(['SUBMITTED', 'SUBMITTED', 'MISSING', 'NOT_APPLICABLE', 'NEEDS_REVISION']))

    expect(summary.totalCount).toBe(5)
    expect(summary.missingCount).toBe(1)
    expect(summary.needsRevisionCount).toBe(1)
    expect(summary.notApplicableCount).toBe(1)
    expect(summary.completionRate).toBe(0.5)
  })

  it('filters rows by requested state', () => {
    const rows = collectionWithStatuses(['SUBMITTED', 'SUBMITTED', 'MISSING', 'NEEDS_REVISION']).rows
    const values = Object.values(rows)
    const missingOnly = filterCollectionRows(values, 'MISSING_ONLY')
    const needsRevisionOnly = filterCollectionRows(values, 'NEEDS_REVISION_ONLY')

    expect(missingOnly).toHaveLength(1)
    expect(needsRevisionOnly).toHaveLength(1)
    expect(missingOnly[0]).toMatchObject({ status: 'MISSING' })
    expect(needsRevisionOnly[0]).toMatchObject({ status: 'NEEDS_REVISION' })
  })

  it('creates collection and matching CLASS_SUBMISSION task', () => {
    const students = [
      createStudentFromInput(1, '김가온', '가온'),
      createStudentFromInput(2, '이별'),
    ]
    const result = createSubmissionCollectionWithTask({
      classId: 'class-1',
      title: '5월 수합판',
      dueDate: '2026-05-04',
      students,
    })

    expect(result.task).toMatchObject({
      type: 'CLASS_SUBMISSION',
      calendarCategory: 'CLASS',
      status: 'RECEIVED',
    })
    expect(result.task.id).toBe(result.collection.taskId)
    expect(result.collection.rows[students[0].id]).toMatchObject({
      status: 'MISSING',
    })
  })

  it('sets submittedAt when a missing row becomes submitted', () => {
    const collection = collectionWithStatuses(['MISSING'])
    const next = updateCollectionRow(collection, 'student-0', { status: 'SUBMITTED' })

    expect(next.rows['student-0'].submittedAt).toBeTruthy()
    expect(next.rows['student-0'].submittedAt).not.toBeNull()
  })

  it('preserves submittedAt when submitted remains submitted', () => {
    const collection = collectionWithStatuses(['SUBMITTED'])
    const next = updateCollectionRow(collection, 'student-0', { status: 'SUBMITTED' })

    expect(next.rows['student-0'].submittedAt).toBe('2026-05-01T10:00:00.000Z')
  })

  it('clears submittedAt for non-submitted status but keeps memo', () => {
    const collection = collectionWithStatuses(['SUBMITTED'])
    const next = updateCollectionRow(collection, 'student-0', {
      status: 'NEEDS_REVISION',
      memo: '보완이 필요합니다',
    })

    expect(next.rows['student-0'].status).toBe('NEEDS_REVISION')
    expect(next.rows['student-0'].submittedAt).toBeNull()
    expect(next.rows['student-0'].memo).toBe('보완이 필요합니다')
  })

  it('links one collection into an official document task and unlinks safely', () => {
    const officialTasks = resolveOfficialDocumentDrafts()
    const officialTaskId = officialTasks[0].id
    const linked = linkCollectionToTaskList(officialTasks, officialTaskId, 'collection-1')
    const linkedTask = linked.find((task) => task.id === officialTaskId)

    expect(linkedTask?.linkedCollectionIds).toContain('collection-1')

    const unlinked = unlinkCollectionFromTaskList(linked, officialTaskId, 'collection-1')
    const unlinkedTask = unlinked.find((task) => task.id === officialTaskId)
    expect(unlinkedTask?.linkedCollectionIds).toHaveLength(0)
  })

  it('keeps one linked collection id per task even if link is called repeatedly', () => {
    const officialTasks = resolveOfficialDocumentDrafts()
    const officialTaskId = officialTasks[0].id
    const firstLink = linkCollectionToTaskList(officialTasks, officialTaskId, 'collection-dup')
    const repeatedLink = linkCollectionToTaskList(firstLink, officialTaskId, 'collection-dup')
    const linkedTask = repeatedLink.find((task) => task.id === officialTaskId)

    expect(linkedTask?.linkedCollectionIds).toHaveLength(1)
    expect(linkedTask?.linkedCollectionIds.filter((id) => id === 'collection-dup')).toHaveLength(1)
  })

  it('reassigns a collection link from one official document to another and unlinks from none', () => {
    const base = resolveOfficialDocumentDrafts()
    const sourceTaskId = base[0].id
    const targetTaskId = base[1].id
    const withSource = reassignCollectionOfficialTask({
      tasks: base,
      collectionId: 'collection-999',
      currentOfficialTaskId: null,
      nextOfficialTaskId: sourceTaskId,
    })
    const withTarget = reassignCollectionOfficialTask({
      tasks: withSource,
      collectionId: 'collection-999',
      currentOfficialTaskId: sourceTaskId,
      nextOfficialTaskId: targetTaskId,
    })

    const sourceTask = withTarget.find((task) => task.id === sourceTaskId)
    const targetTask = withTarget.find((task) => task.id === targetTaskId)
    expect(sourceTask?.linkedCollectionIds).not.toContain('collection-999')
    expect(targetTask?.linkedCollectionIds).toContain('collection-999')

    const unlinked = reassignCollectionOfficialTask({
      tasks: withTarget,
      collectionId: 'collection-999',
      currentOfficialTaskId: targetTaskId,
      nextOfficialTaskId: null,
    })
    const unlinkedTarget = unlinked.find((task) => task.id === targetTaskId)
    expect(unlinkedTarget?.linkedCollectionIds).not.toContain('collection-999')
  })

  it('links the created collection id to official document task', () => {
    const students = [createStudentFromInput(1, '김예진', '예진')]
    const collectionResult = createSubmissionCollectionWithTask({
      classId: 'class-1',
      title: '5월 수합판',
      dueDate: null,
      students,
      officialDocumentTaskId: 'task-demo-official',
    })
    const officialTasks = resolveOfficialDocumentDrafts()
    const linked = linkCollectionToTaskList(
      officialTasks,
      collectionResult.collection.officialDocumentTaskId ?? 'task-demo-official',
      collectionResult.collection.id,
    )
    const linkedTask = linked.find((task) => task.id === 'task-demo-official')
    const task = collectionResult.task

    expect(linkedTask).toBeDefined()
    expect(linkedTask?.linkedCollectionIds).toContain(collectionResult.collection.id)
    expect(linkedTask?.linkedCollectionIds).not.toContain(task.id)
    expect(collectionResult.collection.id).not.toBe(task.id)
  })

  it('labels all collection statuses', () => {
    expect(collectionStatusLabel.SUBMITTED).toBe('제출')
    expect(collectionStatusLabel.NOT_APPLICABLE).toBe('해당 없음')
  })

  it('creates collection deletion plan with linked official task updates and task ids', () => {
    const collection = createCollection({
      id: 'collection-delete',
      classId: 'class-1',
      taskId: 'task-collection-delete',
      officialDocumentTaskId: 'task-official-linked',
    })
    const plan = deleteCollectionPlan(collection)

    expect(plan).toEqual({
      collectionIdsToDelete: ['collection-delete'],
      taskIdsToDelete: ['task-collection-delete'],
      officialCollectionLinkRemovals: [
        {
          taskId: 'task-official-linked',
          collectionId: 'collection-delete',
        },
      ],
      collectionOfficialTaskIdUpdates: [
        {
          collectionId: 'collection-delete',
          officialDocumentTaskId: null,
        },
      ],
    })
  })

  it('keeps collections when deleting official document and detaches official links from each collection', () => {
    const officialTask = createOfficialDocument('task-official-main', ['collection-linked-by-task', 'collection-linked-by-collection'])
    const collections = [
      createCollection({
        id: 'collection-linked-by-task',
        classId: 'class-1',
        taskId: 'task-submission-1',
        officialDocumentTaskId: 'task-official-main',
      }),
      createCollection({
        id: 'collection-linked-by-collection',
        classId: 'class-2',
        taskId: 'task-submission-2',
      }),
    ]
    const plan = deleteOfficialDocumentKeepCollectionsPlan(officialTask, collections)

    expect(plan).toEqual({
      collectionIdsToDelete: [],
      taskIdsToDelete: ['task-official-main'],
      officialCollectionLinkRemovals: [
        {
          taskId: 'task-official-main',
          collectionId: 'collection-linked-by-task',
        },
        {
          taskId: 'task-official-main',
          collectionId: 'collection-linked-by-collection',
        },
      ],
      collectionOfficialTaskIdUpdates: [
        {
          collectionId: 'collection-linked-by-task',
          officialDocumentTaskId: null,
        },
      ],
    })
  })

  it('does not clear officialDocumentTaskId for stale task-side links when keeping official document', () => {
    const officialTask = createOfficialDocument('task-official-main', ['collection-stale-legacy', 'collection-owned'])
    const collections = [
      createCollection({
        id: 'collection-stale-legacy',
        classId: 'class-legacy',
        taskId: 'task-submission-legacy',
        officialDocumentTaskId: 'task-official-other',
      }),
      createCollection({
        id: 'collection-owned',
        classId: 'class-1',
        taskId: 'task-submission-owned',
        officialDocumentTaskId: 'task-official-main',
      }),
    ]
    const plan = deleteOfficialDocumentKeepCollectionsPlan(officialTask, collections)

    expect(plan).toEqual({
      collectionIdsToDelete: [],
      taskIdsToDelete: ['task-official-main'],
      officialCollectionLinkRemovals: [
        {
          taskId: 'task-official-main',
          collectionId: 'collection-stale-legacy',
        },
        {
          taskId: 'task-official-main',
          collectionId: 'collection-owned',
        },
      ],
      collectionOfficialTaskIdUpdates: [
        {
          collectionId: 'collection-owned',
          officialDocumentTaskId: null,
        },
      ],
    })
  })

  it('removes detached collection links from other official documents after KEEP-mode apply', () => {
    const officialTask = createOfficialDocument('task-official-main', [
      'collection-owned-main',
      'collection-owned-other',
    ])
    const collections = [
      createCollection({
        id: 'collection-owned-main',
        classId: 'class-1',
        taskId: 'task-submission-main',
        officialDocumentTaskId: 'task-official-main',
      }),
      createCollection({
        id: 'collection-owned-other',
        classId: 'class-2',
        taskId: 'task-submission-other',
        officialDocumentTaskId: 'task-official-other',
      }),
    ]
    const officialTasks = [
      officialTask,
      createOfficialDocument('task-official-other', ['collection-owned-main', 'collection-some-other']),
    ]

    const plan = deleteOfficialDocumentKeepCollectionsPlan(
      officialTask,
      collections,
      officialTasks,
    )
    const result = applyCollectionDeletionPlan({
      collections: collections.map((collection) => ({ collection, students: [] })),
      tasks: officialTasks,
      plan,
    })

    expect(plan.officialCollectionLinkRemovals).toEqual([
      {
        taskId: 'task-official-main',
        collectionId: 'collection-owned-main',
      },
      {
        taskId: 'task-official-main',
        collectionId: 'collection-owned-other',
      },
      {
        taskId: 'task-official-other',
        collectionId: 'collection-owned-main',
      },
    ])
    expect(plan.collectionOfficialTaskIdUpdates).toEqual([
      {
        collectionId: 'collection-owned-main',
        officialDocumentTaskId: null,
      },
    ])
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks).toEqual([
      expect.objectContaining({
        id: 'task-official-other',
        linkedCollectionIds: ['collection-some-other'],
      }),
    ])
  })

  it('deletes official document with linked collections and linked collection tasks', () => {
    const officialTask = createOfficialDocument('task-official-main', ['collection-linked-by-task', 'collection-missing-task'])
    const collections = [
      createCollection({
        id: 'collection-linked-by-task',
        classId: 'class-1',
        taskId: 'task-submission-1',
        officialDocumentTaskId: 'task-official-main',
      }),
      createCollection({
        id: 'collection-inactive',
        classId: 'class-2',
        taskId: 'task-submission-inactive',
      }),
    ]
    const plan = deleteOfficialDocumentWithCollectionsPlan(officialTask, collections)

    expect(plan).toEqual({
      collectionIdsToDelete: ['collection-linked-by-task'],
      taskIdsToDelete: ['task-official-main', 'task-submission-1'],
      officialCollectionLinkRemovals: [
        {
          taskId: 'task-official-main',
          collectionId: 'collection-linked-by-task',
        },
        {
          taskId: 'task-official-main',
          collectionId: 'collection-missing-task',
        },
      ],
      collectionOfficialTaskIdUpdates: [],
    })
  })

  it('does not delete stale task-linked collections when deleting an official document with collections', () => {
    const officialTask = createOfficialDocument('task-official-main', ['collection-stale-other-owner', 'collection-owned-main'])
    const collections = [
      createCollection({
        id: 'collection-stale-other-owner',
        classId: 'class-legacy',
        taskId: 'task-submission-legacy',
        officialDocumentTaskId: 'task-official-other',
      }),
      createCollection({
        id: 'collection-owned-main',
        classId: 'class-1',
        taskId: 'task-submission-owned-main',
        officialDocumentTaskId: 'task-official-main',
      }),
    ]
    const plan = deleteOfficialDocumentWithCollectionsPlan(officialTask, collections)

    expect(plan).toEqual({
      collectionIdsToDelete: ['collection-owned-main'],
      taskIdsToDelete: ['task-official-main', 'task-submission-owned-main'],
      officialCollectionLinkRemovals: [
        {
          taskId: 'task-official-main',
          collectionId: 'collection-stale-other-owner',
        },
        {
          taskId: 'task-official-main',
          collectionId: 'collection-owned-main',
        },
      ],
      collectionOfficialTaskIdUpdates: [],
    })
  })

  it('deleteCollectionPlan removes a stale linked collection from all official documents when applied', () => {
    const collection = createCollection({
      id: 'collection-shared',
      classId: 'class-1',
      taskId: 'task-submission-shared',
      officialDocumentTaskId: 'task-official-1',
    })
    const officialTasks = [
      createOfficialDocument('task-official-1', ['collection-shared', 'collection-other-1']),
      createOfficialDocument('task-official-2', ['collection-shared', 'collection-other-2']),
    ]

    const plan = deleteCollectionPlan(collection, officialTasks)

    expect(plan.officialCollectionLinkRemovals).toEqual([
      {
        taskId: 'task-official-1',
        collectionId: 'collection-shared',
      },
      {
        taskId: 'task-official-2',
        collectionId: 'collection-shared',
      },
    ])

    const result = applyCollectionDeletionPlan({
      collections: [{ collection, students: [] }],
      plan,
      tasks: officialTasks,
    })

    expect(result.tasks).toEqual([
      expect.objectContaining({
        id: 'task-official-1',
        linkedCollectionIds: ['collection-other-1'],
      }),
      expect.objectContaining({
        id: 'task-official-2',
        linkedCollectionIds: ['collection-other-2'],
      }),
    ])
  })

  it('deleteClassPlan removes stale linked collection ids from all official documents when applied', () => {
    const classForDeletion: ClassForDeletion = {
      id: 'class-delete-target',
      students: [{ studentNumber: 1, name: '김가온', displayName: '가온' }],
    }
    const collectionsToDelete = [
      createCollection({
        id: 'collection-shared-by-class',
        classId: 'class-delete-target',
        taskId: 'task-class-submission',
        officialDocumentTaskId: 'task-official-1',
      }),
    ]
    const officialTasks = [
      createOfficialDocument('task-official-1', ['collection-shared-by-class']),
      createOfficialDocument('task-official-2', ['collection-shared-by-class', 'collection-other']),
    ]

    const plan = deleteClassPlan(classForDeletion, collectionsToDelete, officialTasks)

    expect(plan.officialCollectionLinkRemovals).toEqual([
      {
        taskId: 'task-official-1',
        collectionId: 'collection-shared-by-class',
      },
      {
        taskId: 'task-official-2',
        collectionId: 'collection-shared-by-class',
      },
    ])
    const records = collectionsToDelete.map((collection) => ({ collection, students: [] }))
    const result = applyCollectionDeletionPlan({
      collections: records,
      plan,
      tasks: officialTasks,
    })

    expect(result.tasks).toEqual([
      expect.objectContaining({
        id: 'task-official-1',
        linkedCollectionIds: [],
      }),
      expect.objectContaining({
        id: 'task-official-2',
        linkedCollectionIds: ['collection-other'],
      }),
    ])
  })

  it('creates class deletion plan including linked collection/task IDs and student IDs', () => {
    const classForDeletion: ClassForDeletion = {
      id: 'class-delete-target',
      students: [
        { studentNumber: 1, name: '김가온', displayName: '가온' },
        { studentNumber: 2, name: '이별', displayName: '이별' },
      ],
    }

    const plan = deleteClassPlan(classForDeletion, [
      createCollection({
        id: 'collection-class-delete',
        classId: 'class-delete-target',
        taskId: 'task-class-submission',
        officialDocumentTaskId: 'task-official-main',
      }),
      createCollection({
        id: 'collection-other-class',
        classId: 'class-other',
        taskId: 'task-other-submission',
      }),
      createCollection({
        id: 'collection-no-official',
        classId: 'class-delete-target',
        taskId: 'task-class-submission-2',
      }),
    ])

    expect(plan.collectionIdsToDelete).toEqual(['collection-class-delete', 'collection-no-official'])
    expect(plan.taskIdsToDelete).toEqual(['task-class-submission', 'task-class-submission-2'])
    expect(plan.officialCollectionLinkRemovals).toEqual([
      {
        taskId: 'task-official-main',
        collectionId: 'collection-class-delete',
      },
    ])
    expect(plan.classIdsToDelete).toEqual(['class-delete-target'])
    expect(plan.studentIdsToDelete).toEqual(['1-김가온', '2-이별'])
    expect(plan.collectionOfficialTaskIdUpdates).toHaveLength(0)
  })
})
