import type { ParsedStudent } from '../classes/rosterService'
import type { CollectionRow, CollectionStatus, SubmissionCollection, TaskItem } from '../types/domain'
import { DEMO_USER_ID, getDemoCollectionWithStudents, isDemoAuthMode } from '../firebase/seedDemoData'
import { createClassSubmissionTask } from '../tasks/taskService'

export const COLLECTION_EMPTY_ROSTER_MESSAGE =
  '제출물 수합판을 만들기 전에 학급 명부를 먼저 추가해 주세요.'

export type DemoCollectionStudent = ParsedStudent & { id: string }

export type CollectionStatusFilter = 'ALL' | 'MISSING_ONLY' | 'NEEDS_REVISION_ONLY'

export type CollectionSummary = {
  completionRate: number
  missingCount: number
  needsRevisionCount: number
  notApplicableCount: number
  totalCount: number
}

export type CollectionWithStudents = {
  id: string
  collection: SubmissionCollection
  students: DemoCollectionStudent[]
}

export type ClassForDeletion = {
  id: string
  students: ParsedStudent[]
}

export type CollectionDeletionLinkRemoval = {
  taskId: string
  collectionId: string
}

export type CollectionOfficialTaskIdUpdate = {
  collectionId: string
  officialDocumentTaskId: string | null
}

export type CollectionDeletionPlan = {
  collectionIdsToDelete: string[]
  taskIdsToDelete: string[]
  officialCollectionLinkRemovals: CollectionDeletionLinkRemoval[]
  collectionOfficialTaskIdUpdates: CollectionOfficialTaskIdUpdate[]
}

export type ClassDeletionPlan = CollectionDeletionPlan & {
  classIdsToDelete: string[]
  studentIdsToDelete: string[]
}

export const COLLECTION_DELETE_WARNING =
  '수합판과 학생별 체크 기록이 삭제됩니다. 연결된 공문에서는 수합판 연결만 제거됩니다.'

export const CLASS_DELETE_WARNING =
  '학급, 학생 명부, 연결된 수합판, 학생별 체크 기록, 수합판 업무 항목이 함께 삭제됩니다.'

export const DELETE_OFFICIAL_DOCUMENT_KEEP_COLLECTIONS_LABEL = '공문만 삭제하고 수합판은 독립 수합판으로 유지'

export const DELETE_OFFICIAL_DOCUMENT_WITH_COLLECTIONS_LABEL = '공문과 연결 수합판을 함께 삭제'

const canonicalizeStringList = (values: string[]): string[] => {
  const seen = new Set<string>()
  const next: string[] = []

  values.forEach((value) => {
    if (!value) {
      return
    }
    const nextValue = value.trim()
    if (!nextValue || seen.has(nextValue)) {
      return
    }

    seen.add(nextValue)
    next.push(nextValue)
  })

  return next
}

const getOfficialDocumentTasks = (tasks: TaskItem[]): TaskItem[] => {
  return tasks.filter((task) => task.type === 'OFFICIAL_DOCUMENT')
}

const canonicalizeLinkRemovals = (
  removals: CollectionDeletionLinkRemoval[],
): CollectionDeletionLinkRemoval[] => {
  const seen = new Set<string>()
  const next: CollectionDeletionLinkRemoval[] = []

  removals.forEach((removal) => {
    const taskId = removal.taskId.trim()
    const collectionId = removal.collectionId.trim()
    if (!taskId || !collectionId) {
      return
    }

    const key = `${taskId}::${collectionId}`
    if (seen.has(key)) {
      return
    }

    seen.add(key)
    next.push({
      taskId,
      collectionId,
    })
  })

  return next
}

const canonicalizeOfficialTaskIdUpdates = (
  updates: CollectionOfficialTaskIdUpdate[],
): CollectionOfficialTaskIdUpdate[] => {
  const seen = new Set<string>()
  const next: CollectionOfficialTaskIdUpdate[] = []

  updates.forEach((update) => {
    const collectionId = update.collectionId.trim()
    if (!collectionId) {
      return
    }

    if (seen.has(collectionId)) {
      return
    }

    seen.add(collectionId)
    next.push({
      collectionId,
      officialDocumentTaskId: update.officialDocumentTaskId,
    })
  })

  return next
}

const buildCollectionOfficialTaskIdUpdates = (collectionIds: string[]): CollectionOfficialTaskIdUpdate[] =>
  collectionIds.map((collectionId) => ({
    collectionId,
    officialDocumentTaskId: null,
  }))

const buildOfficialCollectionLinkRemovals = (
  officialDocumentId: string,
  collectionIds: string[],
): CollectionDeletionLinkRemoval[] =>
  collectionIds.map((collectionId) => ({
    taskId: officialDocumentId,
    collectionId,
  }))

const buildOfficialCollectionLinkRemovalsFromCollections = (
  collectionIds: string[],
  tasks: TaskItem[],
): CollectionDeletionLinkRemoval[] => {
  const normalizedCollectionIds = canonicalizeStringList(collectionIds)
  const officialTasks = getOfficialDocumentTasks(tasks)

  if (normalizedCollectionIds.length === 0 || officialTasks.length === 0) {
    return []
  }

  const normalizedOfficialTasks = officialTasks.map((task) => ({
    ...task,
    linkedCollectionIds: canonicalizeStringList(task.linkedCollectionIds),
  }))

  return normalizedOfficialTasks.flatMap((task) =>
    task.linkedCollectionIds
      .filter((collectionId) => normalizedCollectionIds.includes(collectionId))
      .map((collectionId) => ({
        taskId: task.id,
        collectionId,
      })),
  )
}

const buildStudentIdsForDeletion = (students: ParsedStudent[]): string[] =>
  canonicalizeStringList(students.map((student) => `${student.studentNumber}-${student.name}`))

export const deleteCollectionPlan = (
  collection: SubmissionCollection,
  tasks: TaskItem[] = [],
): CollectionDeletionPlan => {
  const officialTaskId = collection.officialDocumentTaskId
  const storedOfficialTaskRemovals = officialTaskId
    ? canonicalizeLinkRemovals([
        {
          taskId: officialTaskId,
          collectionId: collection.id,
        },
      ])
    : []
  const linkedTaskRemovals = canonicalizeLinkRemovals(
    buildOfficialCollectionLinkRemovalsFromCollections([collection.id], tasks),
  )

  return {
    collectionIdsToDelete: canonicalizeStringList([collection.id]),
    taskIdsToDelete: canonicalizeStringList([collection.taskId]),
    officialCollectionLinkRemovals: canonicalizeLinkRemovals([...storedOfficialTaskRemovals, ...linkedTaskRemovals]),
    collectionOfficialTaskIdUpdates: officialTaskId
      ? canonicalizeOfficialTaskIdUpdates([
          {
            collectionId: collection.id,
            officialDocumentTaskId: null,
          },
        ])
      : [],
  }
}

export const deleteOfficialDocumentKeepCollectionsPlan = (
  officialDocument: TaskItem,
  collections: SubmissionCollection[],
  tasks: TaskItem[] = [],
): CollectionDeletionPlan => {
  const linkedFromTask = canonicalizeStringList(officialDocument.linkedCollectionIds)
  const linkedFromCollections = canonicalizeStringList(
    collections
      .filter((collection) => collection.officialDocumentTaskId === officialDocument.id)
      .map((collection) => collection.id),
  )
  const linkedCollectionIds = canonicalizeStringList([...linkedFromTask, ...linkedFromCollections])
  const updatesFromTask = linkedCollectionIds
    .map((collectionId) => collections.find((collection) => collection.id === collectionId))
    .filter((collection): collection is SubmissionCollection => Boolean(collection))
    .filter((collection) => collection.officialDocumentTaskId === officialDocument.id)
  const detachedCollectionIds = canonicalizeStringList(updatesFromTask.map((collection) => collection.id))
  const detachedTaskRemovals = buildOfficialCollectionLinkRemovalsFromCollections(
    detachedCollectionIds,
    tasks,
  )

  return {
    collectionIdsToDelete: [],
    taskIdsToDelete: [officialDocument.id],
    officialCollectionLinkRemovals: canonicalizeLinkRemovals([
      ...buildOfficialCollectionLinkRemovals(officialDocument.id, linkedCollectionIds),
      ...detachedTaskRemovals,
    ]),
    collectionOfficialTaskIdUpdates: buildCollectionOfficialTaskIdUpdates(
      updatesFromTask.map((collection) => collection.id),
    ),
  }
}

export const deleteOfficialDocumentWithCollectionsPlan = (
  officialDocument: TaskItem,
  collections: SubmissionCollection[],
): CollectionDeletionPlan => {
  const linkedFromTask = canonicalizeStringList(officialDocument.linkedCollectionIds)
  const collectionIdsToDelete = canonicalizeStringList(
    collections
      .filter((collection) => collection.officialDocumentTaskId === officialDocument.id)
      .map((collection) => collection.id),
  )
  const collectionById = new Map<string, SubmissionCollection>(collections.map((collection) => [collection.id, collection]))
  const linkedTaskIds = collectionIdsToDelete.map((collectionId) => collectionById.get(collectionId)?.taskId ?? '')

  return {
    collectionIdsToDelete: canonicalizeStringList(collectionIdsToDelete),
    taskIdsToDelete: canonicalizeStringList([officialDocument.id, ...linkedTaskIds]),
    officialCollectionLinkRemovals: buildOfficialCollectionLinkRemovals(
      officialDocument.id,
      canonicalizeStringList([...linkedFromTask, ...collectionIdsToDelete]),
    ),
    collectionOfficialTaskIdUpdates: [],
  }
}

export const deleteClassPlan = (
  classForDeletion: ClassForDeletion,
  collections: SubmissionCollection[],
  tasks: TaskItem[] = [],
): ClassDeletionPlan => {
  const affectedCollections = collections.filter((collection) => collection.classId === classForDeletion.id)
  const collectionIdsToDelete = canonicalizeStringList(affectedCollections.map((collection) => collection.id))
  const taskIdsToDelete = canonicalizeStringList(affectedCollections.map((collection) => collection.taskId))
  const directOfficialCollectionLinkRemovals = affectedCollections
    .filter((collection) => Boolean(collection.officialDocumentTaskId))
    .map((collection) => ({
      taskId: collection.officialDocumentTaskId ?? '',
      collectionId: collection.id,
    }))
    .filter((removal): removal is CollectionDeletionLinkRemoval => Boolean(removal.taskId))
  const linkedTaskRemovals = canonicalizeLinkRemovals(
    buildOfficialCollectionLinkRemovalsFromCollections(collectionIdsToDelete, tasks),
  )

  return {
    collectionIdsToDelete,
    taskIdsToDelete,
    officialCollectionLinkRemovals: canonicalizeLinkRemovals([...directOfficialCollectionLinkRemovals, ...linkedTaskRemovals]),
    collectionOfficialTaskIdUpdates: [],
    classIdsToDelete: canonicalizeStringList([classForDeletion.id]),
    studentIdsToDelete: buildStudentIdsForDeletion(classForDeletion.students),
  }
}

type ApplyDeletionPlanInput = {
  collections: CollectionWithStudents[]
  plan: CollectionDeletionPlan | ClassDeletionPlan
  tasks: TaskItem[]
}

export const applyCollectionDeletionPlan = ({
  collections,
  plan,
  tasks,
}: ApplyDeletionPlanInput): {
  collections: CollectionWithStudents[]
  tasks: TaskItem[]
} => {
  const normalizedPlan: CollectionDeletionPlan = {
    collectionIdsToDelete: canonicalizeStringList(plan.collectionIdsToDelete),
    taskIdsToDelete: canonicalizeStringList(plan.taskIdsToDelete),
    officialCollectionLinkRemovals: canonicalizeLinkRemovals(plan.officialCollectionLinkRemovals),
    collectionOfficialTaskIdUpdates: canonicalizeOfficialTaskIdUpdates(plan.collectionOfficialTaskIdUpdates),
  }
  const detachedCollectionIds = canonicalizeStringList([
    ...normalizedPlan.collectionIdsToDelete,
    ...normalizedPlan.collectionOfficialTaskIdUpdates
      .filter((update) => update.officialDocumentTaskId === null)
      .map((update) => update.collectionId),
  ])
  const scanOfficialCollectionLinkRemovals = canonicalizeLinkRemovals(
    buildOfficialCollectionLinkRemovalsFromCollections(detachedCollectionIds, tasks),
  )
  const normalizedOfficialCollectionLinkRemovals = canonicalizeLinkRemovals([
    ...normalizedPlan.officialCollectionLinkRemovals,
    ...scanOfficialCollectionLinkRemovals,
  ])

  const planTaskIds = new Set(normalizedPlan.taskIdsToDelete)
  const nextTasks = tasks
    .filter((task) => !planTaskIds.has(task.id))
    .map((task) => {
      const removals = normalizedOfficialCollectionLinkRemovals.filter((removal) => removal.taskId === task.id)
      if (removals.length === 0) {
        return task
      }

      const collectionIdsToDetach = new Set(removals.map((removal) => removal.collectionId))
      const linkedCollectionIds = canonicalizeStringList(
        task.linkedCollectionIds.filter((collectionId) => !collectionIdsToDetach.has(collectionId)),
      )

      if (linkedCollectionIds.length === task.linkedCollectionIds.length) {
        return task
      }

      return {
        ...task,
        linkedCollectionIds,
      }
    })

  const nextCollections = collections
    .filter((record) => !normalizedPlan.collectionIdsToDelete.includes(record.collection.id))
    .map((record) => {
      const update = normalizedPlan.collectionOfficialTaskIdUpdates.find(
        (item) => item.collectionId === record.collection.id,
      )
      if (!update) {
        return record
      }

      if (record.collection.officialDocumentTaskId === update.officialDocumentTaskId) {
        return record
      }

      return {
        ...record,
        collection: {
          ...record.collection,
          officialDocumentTaskId: update.officialDocumentTaskId,
          updatedAt: new Date().toISOString(),
        },
      }
    })

  return {
    collections: nextCollections,
    tasks: nextTasks,
  }
}

const canUseBrowserStorage = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

const COLLECTION_STORE_KEY = 'homeroom-demo-collections-v1'

const cloneCollectionRow = (row: CollectionRow): CollectionRow => ({ ...row })

const cloneCollection = (collection: SubmissionCollection): SubmissionCollection => ({
  ...collection,
  rows: Object.fromEntries(
    Object.entries(collection.rows).map(([studentId, row]) => [studentId, cloneCollectionRow(row)]),
  ),
})

const cloneStudent = (student: DemoCollectionStudent): DemoCollectionStudent => ({ ...student })

const cloneCollectionWithStudents = (record: CollectionWithStudents): CollectionWithStudents => ({
  id: record.id ?? record.collection.id,
  collection: cloneCollection(record.collection),
  students: record.students.map(cloneStudent),
})

const normalizeCollectionStore = (records: CollectionWithStudents[]): CollectionWithStudents[] =>
  records.map((record) => cloneCollectionWithStudents(record))

const readCollectionStore = (): CollectionWithStudents[] => {
  if (!canUseBrowserStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(COLLECTION_STORE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    const normalized = parsed.filter(
      (entry): entry is CollectionWithStudents =>
        Boolean(entry?.collection?.id) && Boolean(entry?.collection?.rows),
    )
    return normalizeCollectionStore(normalized)
  } catch {
    return []
  }
}

let collectionStore: CollectionWithStudents[] | null = null

export type NewSubmissionCollectionInput = {
  id?: string
  classId: string
  title: string
  dueDate: string | null
  students: DemoCollectionStudent[]
  userId?: string
  officialDocumentTaskId?: string | null
  createdAt?: string
  updatedAt?: string
}

export const collectionStatusLabel: Record<CollectionStatus, string> = {
  MISSING: '미제출',
  SUBMITTED: '제출',
  NEEDS_REVISION: '보완 필요',
  NOT_APPLICABLE: '해당 없음',
}

export const statusFilterLabel: Record<CollectionStatusFilter, string> = {
  ALL: '전체',
  MISSING_ONLY: '미제출만',
  NEEDS_REVISION_ONLY: '보완 필요',
}

export const statusSequence: CollectionStatus[] = ['MISSING', 'SUBMITTED', 'NEEDS_REVISION', 'NOT_APPLICABLE']

const nowIsoString = (): string => new Date().toISOString()

const toDemoCollections = (): CollectionWithStudents[] => {
  const demoSeed = getDemoCollectionWithStudents();
  return [
    {
      id: demoSeed.collection.id,
      collection: {
        ...demoSeed.collection,
        userId: DEMO_USER_ID,
      },
      students: demoSeed.students.map((student) => ({
        ...student,
      })),
    },
  ]
}

const createCollectionId = (): string => `collection-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

export const createStudentFromInput = (
  studentNumber: number,
  name: string,
  displayName?: string,
): DemoCollectionStudent => ({
  id: `student-${studentNumber}-${Math.random().toString(16).slice(2, 8)}`,
  studentNumber,
  name,
  displayName: displayName || name,
})

const toBlankCollectionRows = (students: DemoCollectionStudent[]): Record<string, CollectionRow> => {
  return Object.fromEntries(
    students.map((student) => [
      student.id,
      {
        studentId: student.id,
        status: 'MISSING',
        submittedAt: null,
        memo: '',
      },
    ]),
  )
}

export const buildSubmissionCollection = ({
  id,
  userId = isDemoAuthMode() ? DEMO_USER_ID : 'user-demo',
  classId,
  taskId,
  officialDocumentTaskId = null,
  title,
  dueDate,
  students,
  createdAt,
  updatedAt,
}: {
  id?: string
  userId?: string
  classId: string
  taskId: string
  officialDocumentTaskId?: string | null
  title: string
  dueDate: string | null
  students: DemoCollectionStudent[]
  createdAt?: string
  updatedAt?: string
}): SubmissionCollection => {
  const now = nowIsoString()
  return {
    id: id ?? createCollectionId(),
    userId,
    classId,
    officialDocumentTaskId,
    taskId,
    title,
    dueDate,
    rows: toBlankCollectionRows(students),
    createdAt: createdAt ?? now,
    updatedAt: updatedAt ?? now,
  }
}

export const createSubmissionCollectionWithTask = ({
  id,
  classId,
  title,
  dueDate,
  students,
  userId,
  officialDocumentTaskId,
  createdAt,
  updatedAt,
  collectionTask,
}: NewSubmissionCollectionInput & { collectionTask?: TaskItem }): {
  collection: SubmissionCollection
  task: TaskItem
} => {
  const task =
    collectionTask ??
    createClassSubmissionTask({
      title,
      dueDate,
      userId,
      createdAt,
      updatedAt,
    })

  return {
    collection: buildSubmissionCollection({
      id,
      classId,
      taskId: task.id,
      officialDocumentTaskId: officialDocumentTaskId ?? null,
      title,
      dueDate,
      students,
      userId,
      createdAt,
      updatedAt,
    }),
    task,
  }
}

export const getStoredCollections = (): CollectionWithStudents[] => {
  if (collectionStore === null) {
    collectionStore = readCollectionStore()

    if (collectionStore.length === 0 && isDemoAuthMode()) {
      collectionStore = toDemoCollections()
    }
  }
  return normalizeCollectionStore(collectionStore)
}

export const saveCollectionStore = (records: CollectionWithStudents[]): CollectionWithStudents[] => {
  const normalized = normalizeCollectionStore(records)
  collectionStore = normalized

  if (canUseBrowserStorage()) {
    window.localStorage.setItem(COLLECTION_STORE_KEY, JSON.stringify(normalized))
  }

  return normalizeCollectionStore(normalized)
}

export const upsertCollectionWithStudents = (record: CollectionWithStudents): CollectionWithStudents[] => {
  const current = getStoredCollections()
  const next = [...current]
  const index = next.findIndex((entry) => entry.collection.id === record.collection.id)

  const savedRecord = cloneCollectionWithStudents(record)

  if (index === -1) {
    next.push(savedRecord)
  } else {
    next[index] = savedRecord
  }

  return saveCollectionStore(next)
}

export const getCollectionById = (collectionId: string): CollectionWithStudents | null => {
  return getStoredCollections().find((entry) => entry.collection.id === collectionId) ?? null
}

export const updateCollectionRowInStore = (
  collectionId: string,
  studentId: string,
  patch: Partial<Pick<CollectionRow, 'status' | 'memo'>>,
): CollectionWithStudents | null => {
  const current = getStoredCollections()
  const currentIndex = current.findIndex((entry) => entry.collection.id === collectionId)
  if (currentIndex === -1) {
    return null
  }

  const currentEntry = current[currentIndex]
  const nextCollection = updateCollectionRow(currentEntry.collection, studentId, patch)
  const updated: CollectionWithStudents = {
    ...currentEntry,
    id: currentEntry.id ?? currentEntry.collection.id,
    collection: nextCollection,
  }
  current[currentIndex] = updated
  const next = saveCollectionStore(current)
  return next.find((entry) => entry.collection.id === collectionId) ?? null
}

export const updateCollectionOfficialDocumentInStore = (
  collectionId: string,
  officialDocumentTaskId: string | null,
): CollectionWithStudents | null => {
  const current = getStoredCollections()
  const currentIndex = current.findIndex((entry) => entry.collection.id === collectionId)
  if (currentIndex === -1) {
    return null
  }

  const currentEntry = current[currentIndex]
  if (currentEntry.collection.officialDocumentTaskId === officialDocumentTaskId) {
    return cloneCollectionWithStudents(currentEntry)
  }

  const updated: CollectionWithStudents = {
    ...currentEntry,
    id: currentEntry.id ?? currentEntry.collection.id,
    collection: {
      ...currentEntry.collection,
      officialDocumentTaskId,
      updatedAt: new Date().toISOString(),
    },
  }
  current[currentIndex] = updated
  const next = saveCollectionStore(current)
  return next.find((entry) => entry.collection.id === collectionId) ?? null
}

export const isCollectionCreationBlocked = (students: unknown[] | null | undefined): string | null => {
  const hasStudents = (students ?? []).length > 0
  return hasStudents ? null : COLLECTION_EMPTY_ROSTER_MESSAGE
}

const isCountedCollectionStatus = (status: CollectionStatus): boolean => {
  return status === 'SUBMITTED' || status === 'MISSING' || status === 'NEEDS_REVISION'
}

export const completionRate = (collection: SubmissionCollection): number => {
  const rows = Object.values(collection.rows)
  return completionRateFromRows(rows)
}

const completionRateFromRows = (rows: CollectionRow[]): number => {
  const countedRows = rows.filter((row) => isCountedCollectionStatus(row.status))

  if (countedRows.length === 0) {
    return 1
  }

  const submittedRows = countedRows.filter((row) => row.status === 'SUBMITTED')
  return submittedRows.length / countedRows.length
}

export const summarizeCollection = (collection: SubmissionCollection): CollectionSummary => {
  const rows = Object.values(collection.rows)

  return {
    completionRate: completionRateFromRows(rows),
    missingCount: rows.filter((row) => row.status === 'MISSING').length,
    needsRevisionCount: rows.filter((row) => row.status === 'NEEDS_REVISION').length,
    notApplicableCount: rows.filter((row) => row.status === 'NOT_APPLICABLE').length,
    totalCount: rows.length,
  }
}

export const filterCollectionRows = (
  rows: CollectionRow[],
  filter: CollectionStatusFilter,
): CollectionRow[] => {
  switch (filter) {
    case 'MISSING_ONLY':
      return rows.filter((row) => row.status === 'MISSING')
    case 'NEEDS_REVISION_ONLY':
      return rows.filter((row) => row.status === 'NEEDS_REVISION')
    default:
      return [...rows]
  }
}

export const updateCollectionRow = (
  collection: SubmissionCollection,
  studentId: string,
  patch: Partial<Pick<CollectionRow, 'status' | 'memo'>>,
): SubmissionCollection => {
  const currentRow = collection.rows[studentId]
  if (!currentRow) {
    return collection
  }

  const nextStatus = patch.status ?? currentRow.status
  const nextSubmittedAt =
    patch.status === undefined
      ? currentRow.submittedAt
      : patch.status === 'SUBMITTED'
        ? (currentRow.status === 'SUBMITTED' ? currentRow.submittedAt : nowIsoString())
        : null

  const nextRow: CollectionRow = {
    ...currentRow,
    ...patch,
    status: nextStatus,
    submittedAt: nextSubmittedAt,
  }

  return {
    ...collection,
    rows: {
      ...collection.rows,
      [studentId]: nextRow,
    },
    updatedAt: nowIsoString(),
  }
}

export const hasRows = (collection: SubmissionCollection): boolean => Object.keys(collection.rows).length > 0

export const toCollectionStudentRows = (
  students: DemoCollectionStudent[],
  rows: Record<string, CollectionRow>,
): Array<
  DemoCollectionStudent & { row: CollectionRow; studentId: string }
> => {
  const rowByStudentId = new Map(Object.entries(rows).map(([studentId, row]) => [studentId, row]))

  return students
    .map((student) => {
      const row = rowByStudentId.get(student.id)
      if (!row) {
        return null
      }

      return {
        ...student,
        row,
        studentId: student.id,
      }
    })
    .filter((entry): entry is DemoCollectionStudent & { row: CollectionRow; studentId: string } => entry !== null)
}

export const linkedTaskForCollection = (tasks: TaskItem[], collectionTaskId: string): TaskItem | null => {
  return tasks.find((task) => task.id === collectionTaskId) ?? null
}
