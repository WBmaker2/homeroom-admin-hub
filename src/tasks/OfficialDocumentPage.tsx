import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TaskEditor } from './TaskEditor'
import {
  deleteOfficialDocumentKeepCollectionsPlan,
  deleteOfficialDocumentWithCollectionsPlan,
  DELETE_OFFICIAL_DOCUMENT_KEEP_COLLECTIONS_LABEL,
  DELETE_OFFICIAL_DOCUMENT_WITH_COLLECTIONS_LABEL,
  applyCollectionDeletionPlan,
  getStoredCollections,
  saveCollectionStore,
  type CollectionWithStudents,
} from '../collections/collectionService'
import {
  createOfficialDocumentDraft,
  resolveOfficialDocumentDraft,
  setOfficialDocumentStatus,
  updateOfficialDocumentDraft,
  getTaskStore,
  saveTaskStore,
} from './taskService'
import type { TaskItem } from '../types/domain'
import { useUserRecords } from '../firebase/useUserRecords'
import './OfficialDocumentPage.css'

type StatusLabelMap = {
  [key in TaskItem['status']]: string
}

type OfficialPageProps = {
  taskId: string | undefined
}

const statusLabel: StatusLabelMap = {
  RECEIVED: '접수',
  IN_PROGRESS: '처리 중',
  WAITING_SUBMISSION: '제출 대기',
  DONE: '완료',
  ARCHIVED: '보관',
}

export function OfficialDocumentPage() {
  const { taskId } = useParams<{ taskId: string }>()

  return <OfficialDocumentPageInner key={taskId ?? 'new'} taskId={taskId} />
}

function OfficialDocumentPageInner({ taskId }: OfficialPageProps) {
  const {
    error: tasksError,
    loading: tasksLoading,
    records: tasks,
    setRecords: setTasks,
    usingFirestore,
  } = useUserRecords<TaskItem>({
    collectionName: 'tasks',
    getInitialRecords: getTaskStore,
    onSaveLocal: saveTaskStore,
  })
  const {
    error: collectionsError,
    records: collections,
    setRecords: setCollections,
  } = useUserRecords<CollectionWithStudents>({
    collectionName: 'collections',
    getInitialRecords: getStoredCollections,
    onSaveLocal: saveCollectionStore,
  })
  const [draftTask, setDraftTask] = useState<TaskItem | null>(null)
  const [documentType, setDocumentType] = useState('공문')
  const [statusInfo, setStatusInfo] = useState('')
  const navigate = useNavigate()
  const normalizedTaskId = taskId?.trim()

  const task = useMemo(() => {
    if (normalizedTaskId) {
      return (
        tasks.find((item) => item.id === normalizedTaskId) ??
        draftTask ??
        resolveOfficialDocumentDraft(normalizedTaskId)
      )
    }

    return draftTask ?? createOfficialDocumentDraft()
  }, [draftTask, normalizedTaskId, tasks])

  const isStoredTask = tasks.some((item) => item.id === task.id)
  const isDraftTask = !taskId || !isStoredTask
  const storageLabel = usingFirestore ? 'Firestore 개인 저장소' : '브라우저 로컬 저장소'

  const applyPatch = (patch: Partial<TaskItem>) => {
    const updated = 'status' in patch && patch.status
      ? setOfficialDocumentStatus(task, patch.status)
      : updateOfficialDocumentDraft(task, patch)
    const nextTasks = tasks.some((item) => item.id === updated.id)
      ? tasks.map((item) => (item.id === updated.id ? updated : item))
      : [...tasks, updated]

    setDraftTask(updated)
    setStatusInfo('저장 중입니다.')
    void setTasks(nextTasks).then(() => {
      setStatusInfo(
        updated.status === 'DONE'
          ? '완료로 변경했습니다. 긴급 섹션에서 즉시 제외됩니다.'
          : `현재 상태: ${statusLabel[updated.status]}`,
      )
    }).catch(() => {
      setStatusInfo('공문 상태를 저장하지 못했습니다. 다시 시도해 주세요.')
    })
  }

  const applyOfficialDelete = (mode: 'KEEP' | 'WITH_COLLECTIONS') => {
    if (!taskId) {
      setStatusInfo('새 초안은 삭제 대신 새 초안을 시작해 주세요.')
      return
    }

    const latestCollections = collections
    const latestTasks = tasks
    const latestTask = latestTasks.find((item) => item.id === task.id) ?? task
    const latestCollectionRecords = latestCollections.map((record) => record.collection)

    const plan =
      mode === 'KEEP'
        ? deleteOfficialDocumentKeepCollectionsPlan(latestTask, latestCollectionRecords, latestTasks)
        : deleteOfficialDocumentWithCollectionsPlan(latestTask, latestCollectionRecords)

    const removeCollectionMessage = `${plan.officialCollectionLinkRemovals.length}개 수합판 연결`
    const message =
      mode === 'KEEP'
        ? `정말 삭제하시겠습니까?\n${DELETE_OFFICIAL_DOCUMENT_KEEP_COLLECTIONS_LABEL}\n영향: 공문 1개, ${removeCollectionMessage}만 분리`
        : `정말 삭제하시겠습니까?\n${DELETE_OFFICIAL_DOCUMENT_WITH_COLLECTIONS_LABEL}\n영향: 공문 1개, 수합판 ${plan.collectionIdsToDelete.length}개, 수합판 업무 ${Math.max(0, plan.taskIdsToDelete.length - 1)}개가 함께 삭제됩니다.`

    if (!window.confirm(message)) {
      return
    }

    const nextTaskSet = latestTasks.filter((item) => !plan.taskIdsToDelete.includes(item.id))
    const result = applyCollectionDeletionPlan({
      collections: latestCollections,
      plan,
      tasks: nextTaskSet,
    })
    setCollections(result.collections)
    setTasks(result.tasks)

    setDraftTask(latestTask)
    navigate('/app/inbox')
    setStatusInfo('공문 삭제가 완료되었습니다.')
  }

  const urgentHint = task.status === 'DONE' ? (
    <p className="official-document-urgent-note" role="status" aria-live="polite">
      완료로 변경되어 오늘 업무함 긴급 항목에서 사라집니다.
      {usingFirestore ? ' Firestore에 반영되었습니다.' : ' 브라우저 로컬 저장소에 반영되었습니다.'}
    </p>
  ) : null

  if (tasksLoading) {
    return (
      <main className="official-document-page">
        <section className="official-document-headline">
          <h1>공문을 불러오는 중입니다.</h1>
          <p className="official-document-description" role="status" aria-live="polite">
            저장소에서 업무 항목을 확인하고 있습니다.
          </p>
        </section>
      </main>
    )
  }

  const loadError = tasksError || collectionsError
  if (loadError) {
    return (
      <main className="official-document-page">
        <section className="official-document-headline">
          <h1>공문을 불러오지 못했습니다.</h1>
          <p className="official-document-description" role="alert">
            {loadError}
          </p>
          <Link to="/app/inbox" className="official-document-action-link">
            오늘 업무함으로 이동
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="official-document-page">
      <section className="official-document-headline">
        <h1>{task.title || '새 공문 작성'}</h1>
        <p className="official-document-mode">
          저장 상태: {isDraftTask ? '새 초안' : `저장된 항목 (${task.id})`} / {storageLabel}
        </p>
        <p className="official-document-description">
          공문 처리 상태, 마감일, 제출 대상, 위치 메모를 {storageLabel}에 저장합니다.
        </p>
        <p className="official-document-privacy-notice">
          이 앱은 개인용 담임 행정 정리 도구입니다. 공문 원본 파일, 학생 사진, 실제 상담 기록, 생활지도 사건 기록은 저장하지 마세요.
        </p>
      </section>

      <TaskEditor
        documentType={documentType}
        onDocumentTypeChange={setDocumentType}
        task={task}
        onTaskPatch={applyPatch}
      />

      <section className="official-document-statusline" role="status" aria-live="polite">
        <p>{statusInfo || `현재 상태: ${statusLabel[task.status]}`}</p>
      </section>

      {urgentHint}

      <section className="official-document-actions">
        <Link to="/app/inbox" className="official-document-action-link">
          오늘 업무함으로 이동
        </Link>
        <button
          type="button"
          className="official-document-action-link"
          onClick={() => {
            const next = resolveOfficialDocumentDraft(undefined)
            setDraftTask(next)
            setDocumentType('공문')
            setStatusInfo('새로운 공문 초안으로 초기화했습니다.')
          }}
        >
          새 초안 시작
        </button>
      </section>

      <section className="official-document-delete-section">
        <p>삭제 옵션</p>
        <div className="official-document-actions">
          <button
            type="button"
            className="official-document-action-link official-document-delete-keep"
            onClick={() => applyOfficialDelete('KEEP')}
          >
            {DELETE_OFFICIAL_DOCUMENT_KEEP_COLLECTIONS_LABEL}
          </button>
          <button
            type="button"
            className="official-document-action-link"
            onClick={() => applyOfficialDelete('WITH_COLLECTIONS')}
          >
            {DELETE_OFFICIAL_DOCUMENT_WITH_COLLECTIONS_LABEL}
          </button>
        </div>
      </section>
    </main>
  )
}

export default OfficialDocumentPage
