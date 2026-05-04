import { useMemo, useState, type ChangeEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { ParsedStudent } from '../classes/rosterService'
import {
  collectionStatusLabel,
  filterCollectionRows,
  getStoredCollections,
  linkedTaskForCollection,
  saveCollectionStore,
  summarizeCollection,
  toCollectionStudentRows,
  updateCollectionRow,
  type CollectionWithStudents,
  type CollectionStatusFilter,
  type DemoCollectionStudent,
} from './collectionService'
import type { CollectionStatus, SubmissionCollection } from '../types/domain'
import { getTaskStore, reassignCollectionOfficialTask, saveTaskStore } from '../tasks/taskService'
import type { TaskItem } from '../types/domain'
import { useUserRecords } from '../firebase/useUserRecords'

import './CollectionsPage.css'

type DemoClass = {
  id: string
  students: ParsedStudent[]
  schoolYear: number
  schoolLevel: string
  grade: string
  className: string
}

type DetailState = {
  collection?: SubmissionCollection
  students?: DemoCollectionStudent[]
  classes?: DemoClass[]
  tasks?: TaskItem[]
}

const statusOptions = ['MISSING', 'SUBMITTED', 'NEEDS_REVISION', 'NOT_APPLICABLE'] as const

const statusFilterOptions: { value: CollectionStatusFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'MISSING_ONLY', label: '미제출만' },
  { value: 'NEEDS_REVISION_ONLY', label: '보완 필요' },
]

const toDateText = (value: string | null): string => (value ? value.slice(0, 10) : '-')

const sortByNumber = (students: DemoCollectionStudent[]): DemoCollectionStudent[] =>
  [...students].sort((left, right) => left.studentNumber - right.studentNumber)

const toCollectionRecord = (
  collection: SubmissionCollection,
  students: DemoCollectionStudent[],
): CollectionWithStudents => ({
  id: collection.id,
  collection,
  students,
})

const upsertCollectionRecord = (
  current: CollectionWithStudents[],
  record: CollectionWithStudents,
): CollectionWithStudents[] => {
  const exists = current.some((item) => item.collection.id === record.collection.id)
  return exists
    ? current.map((item) => (item.collection.id === record.collection.id ? record : item))
    : [...current, record]
}

export function CollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const { state } = useLocation()
  const seededState = (state ?? {}) as DetailState
  const {
    error: collectionsError,
    loading: collectionsLoading,
    records: storedCollections,
    setRecords: setStoredCollections,
  } = useUserRecords<CollectionWithStudents>({
    collectionName: 'collections',
    getInitialRecords: getStoredCollections,
    onSaveLocal: saveCollectionStore,
  })
  const {
    error: tasksError,
    loading: tasksLoading,
    records: storedTasks,
    setRecords: setStoredTasks,
  } = useUserRecords<TaskItem>({
    collectionName: 'tasks',
    getInitialRecords: getTaskStore,
    onSaveLocal: saveTaskStore,
  })

  const collectionRecord = useMemo<CollectionWithStudents | null>(() => {
    if (collectionId) {
      const storeCollection = storedCollections.find((item) => item.collection.id === collectionId)
      if (storeCollection) {
        return storeCollection
      }
    }

    if (seededState.collection && seededState.collection.id === collectionId) {
      return toCollectionRecord(seededState.collection, seededState.students ?? [])
    }

    return null
  }, [collectionId, seededState.collection, seededState.students, storedCollections])

  const students = useMemo<DemoCollectionStudent[]>(
    () => collectionRecord?.students ?? [],
    [collectionRecord?.students],
  )
  const tasks = useMemo<TaskItem[]>(
    () => {
      return storedTasks.length > 0 ? storedTasks : (seededState.tasks ?? [])
    },
    [seededState.tasks, storedTasks],
  )
  const [filter, setFilter] = useState<CollectionStatusFilter>('ALL')

  const currentCollectionId = collectionRecord?.collection.id ?? ''
  const isValidCollection = Boolean(collectionRecord && collectionRecord.collection.id === collectionId)
  const collection = collectionRecord?.collection

  const classLabel = useMemo(() => {
    const classes = seededState.classes ?? []
    const collection = collectionRecord?.collection
    if (!collection) {
      return ''
    }
    const match = classes.find((item) => item.id === collection.classId)
    if (!match) {
      return collection.classId
    }
    return `${match.schoolYear} ${match.schoolLevel} ${match.grade} ${match.className}`
  }, [collectionRecord, seededState.classes])

  const allRows = useMemo(() => {
    if (!collection) {
      return []
    }
    const rows = toCollectionStudentRows(sortByNumber(students), collection.rows)
    return rows
  }, [students, collection])

  const filteredRows = useMemo(() => {
    const baseRows = allRows
      .map((entry) => entry.row)
      .map((row) => ({ ...row }))

    const visibleRows = filterCollectionRows(baseRows, filter)
    const rowByStudentId = new Map(visibleRows.map((row) => [row.studentId, row]))

    return allRows.filter((entry) => rowByStudentId.has(entry.row.studentId))
  }, [allRows, filter])

  const summary = useMemo(() => {
    if (!collection) {
      return {
        completionRate: 1,
        missingCount: 0,
        needsRevisionCount: 0,
        notApplicableCount: 0,
        totalCount: 0,
      }
    }

    return summarizeCollection(collection)
  }, [collection])

  const linkedTask = useMemo(() => {
    if (!collection) {
      return null
    }
    return linkedTaskForCollection(tasks, collection.taskId)
  }, [collection, tasks])

  const officialDocuments = useMemo(
    () => tasks.filter((task) => task.type === 'OFFICIAL_DOCUMENT'),
    [tasks],
  )

  const selectedOfficialDocumentId = collection?.officialDocumentTaskId ?? ''

  const handleStatusChange = (studentId: string, nextStatus: CollectionStatus) => {
    if (!collection?.id) {
      return
    }
    const updatedCollection = updateCollectionRow(collection, studentId, { status: nextStatus })
    const updated = toCollectionRecord(updatedCollection, students)
    setStoredCollections((current) => upsertCollectionRecord(current, updated))
  }

  const handleMemoChange = (studentId: string, nextMemo: string) => {
    if (!collection?.id) {
      return
    }
    const updatedCollection = updateCollectionRow(collection, studentId, { memo: nextMemo })
    const updated = toCollectionRecord(updatedCollection, students)
    setStoredCollections((current) => upsertCollectionRecord(current, updated))
  }

  const handleOfficialDocumentChange = (nextOfficialDocumentTaskId: string) => {
    if (!collection) {
      return
    }

    const currentCollectionId = collection.id

    const nextCollection: SubmissionCollection = {
      ...collection,
      officialDocumentTaskId: nextOfficialDocumentTaskId || null,
      updatedAt: new Date().toISOString(),
    }
    setStoredCollections((current) => upsertCollectionRecord(current, toCollectionRecord(nextCollection, students)))
    setStoredTasks((current) => {
      return reassignCollectionOfficialTask({
        tasks: current.length > 0 ? current : tasks,
        collectionId: currentCollectionId,
        currentOfficialTaskId: collection.officialDocumentTaskId,
        nextOfficialTaskId: nextOfficialDocumentTaskId || null,
      })
    })
  }

  if (collectionsLoading || tasksLoading) {
    return (
      <main className="collections-page">
        <section className="collections-section">
          <h1>수합판을 불러오는 중입니다.</h1>
          <p className="collections-message" role="status" aria-live="polite">
            저장소에서 수합판 데이터를 확인하고 있습니다.
          </p>
        </section>
      </main>
    )
  }

  const loadError = collectionsError || tasksError
  if (loadError) {
    return (
      <main className="collections-page">
        <section className="collections-section">
          <h1>수합판을 불러오지 못했습니다.</h1>
          <p className="collections-message" role="alert">
            {loadError}
          </p>
          <Link to="/app/collections">수합판 목록으로</Link>
        </section>
      </main>
    )
  }

  if (!isValidCollection || !collection) {
    return (
      <main className="collections-page">
        <section className="collections-section">
          <h1>수합판을 찾을 수 없습니다.</h1>
          <p className="collections-message">
            목록에서 수합판을 열어 진입해 주세요.
          </p>
          <Link to="/app/collections">수합판 목록으로</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="collections-page">
      <section className="collections-section">
        <header className="collections-section-header">
          <h1>{collection.title}</h1>
          <p>
            반: {classLabel || collection.classId} / 마감일: {collection.dueDate ?? '-'}
          </p>
        </header>

        <div className="collections-detail-summary">
          <div className="collections-detail-summary-item">
            <p>완료율</p>
            <strong>{Math.round(summary.completionRate * 100)}%</strong>
          </div>
          <div className="collections-detail-summary-item">
            <p>미제출 인원</p>
            <strong>{summary.missingCount}</strong>
          </div>
          <div className="collections-detail-summary-item">
            <p>보완 필요 인원</p>
            <strong>{summary.needsRevisionCount}</strong>
          </div>
          <div className="collections-detail-summary-item">
            <p>해당 없음 인원</p>
            <strong>{summary.notApplicableCount}</strong>
          </div>
        </div>

        <div className="collections-detail-meta">
          <Link to="/app/collections">수합판 목록</Link>
          <p>
            연결 과제: {linkedTask ? linkedTask.title : '연결 과제 없음'} ({collection.taskId})
          </p>
          <label className="collections-field">
            <span>연결 공문</span>
            <select
              value={selectedOfficialDocumentId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleOfficialDocumentChange(event.currentTarget.value)
              }
            >
              <option value="">연결 공문 없음</option>
              {officialDocuments.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="collections-section">
        <div className="collections-toolbar">
          <p>제출 상태 필터</p>
          <div
            className="collections-filter-group"
            role="radiogroup"
            aria-label="제출 상태 필터"
          >
            {statusFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={option.value === filter ? 'collections-filter-active' : ''}
                aria-pressed={option.value === filter}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="collections-table-wrap">
          <table className="collections-table collections-wide-table">
            <thead>
              <tr>
                <th scope="col">번호</th>
                <th scope="col">이름</th>
                <th scope="col">제출 상태</th>
                <th scope="col">제출일</th>
                <th scope="col">메모</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((entry) => (
                <tr key={entry.studentId}>
                  <td>{entry.studentNumber}</td>
                  <td>{entry.name}</td>
                  <td>
                    <select
                      value={entry.row.status}
                      aria-label={`${entry.name}(${entry.studentNumber}) 제출 상태 선택`}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        handleStatusChange(entry.studentId, event.currentTarget.value as CollectionStatus)
                      }
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {collectionStatusLabel[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{toDateText(entry.row.submittedAt)}</td>
                  <td>
                    <textarea
                      value={entry.row.memo}
                      aria-label={`${entry.name}(${entry.studentNumber}) 메모 입력`}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        handleMemoChange(entry.studentId, event.currentTarget.value)
                      }
                      rows={2}
                    />
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="collections-empty" colSpan={5}>
                    표시할 학생이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <p className="collections-inline-alert" role="status" aria-live="polite">
        현재 수합판 ID: {currentCollectionId}
      </p>
    </main>
  )
}

export default CollectionDetailPage
