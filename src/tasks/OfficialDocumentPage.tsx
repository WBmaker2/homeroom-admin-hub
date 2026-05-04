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
} from '../collections/collectionService'
import {
  resolveOfficialDocumentDraft,
  setOfficialDocumentStatus,
  updateOfficialDocumentDraft,
  getTaskStore,
  saveTaskStore,
} from './taskService'
import type { TaskItem } from '../types/domain'
import './OfficialDocumentPage.css'

type StatusLabelMap = {
  [key in TaskItem['status']]: string
}

type OfficialPageProps = {
  seedTask: TaskItem
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
  const seedTask = useMemo(() => {
    const tasks = getTaskStore()
    return (
      tasks.find((task) => task.id === taskId?.trim()) ??
      resolveOfficialDocumentDraft(taskId ? taskId.trim() : undefined)
    )
  }, [taskId])

  return <OfficialDocumentPageInner key={seedTask.id} taskId={taskId} seedTask={seedTask} />
}

function OfficialDocumentPageInner({ seedTask, taskId }: OfficialPageProps) {
  const [tasks, setTasks] = useState(() => getTaskStore())
  const [task, setTask] = useState<TaskItem>(seedTask)
  const [documentType, setDocumentType] = useState('공문')
  const [statusInfo, setStatusInfo] = useState(`현재 상태: ${statusLabel[seedTask.status]}`)
  const navigate = useNavigate()

  const isLocalDemoTask = taskId
    ? !tasks.some((item) => item.id === task.id)
    : true

  const applyPatch = (patch: Partial<TaskItem>) => {
    const updated = 'status' in patch && patch.status
      ? setOfficialDocumentStatus(task, patch.status)
      : updateOfficialDocumentDraft(task, patch)
    const nextTasks = tasks.some((item) => item.id === updated.id)
      ? tasks.map((item) => (item.id === updated.id ? updated : item))
      : [...tasks, updated]

    setTask(updated)
    setTasks(saveTaskStore(nextTasks))

    setStatusInfo(
      updated.status === 'DONE'
        ? '완료로 변경했습니다. 긴급 섹션에서 즉시 제외됩니다.'
        : `현재 상태: ${statusLabel[updated.status]}`,
    )
  }

  const applyOfficialDelete = (mode: 'KEEP' | 'WITH_COLLECTIONS') => {
    if (!taskId) {
      setStatusInfo('새 초안은 삭제 대신 새 초안을 시작해 주세요.')
      return
    }

    const latestCollections = getStoredCollections()
    const latestTasks = getTaskStore()
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
    saveCollectionStore(result.collections)
    const nextTasks = saveTaskStore(result.tasks)

    setTasks(nextTasks)
    setTask(latestTask)
    navigate('/app/inbox')
    setStatusInfo('공문 삭제가 완료되었습니다.')
  }

  const urgentHint = task.status === 'DONE' ? (
    <p className="official-document-urgent-note" role="status" aria-live="polite">
      완료로 변경되어 오늘 업무함 긴급 항목에서 사라집니다. (현재 화면은 로컬 데모 임시 저장)
    </p>
  ) : null

  return (
    <main className="official-document-page">
      <section className="official-document-headline">
        <h1>{task.title || '새 공문 작성'}</h1>
        <p className="official-document-mode">
          대상: {isLocalDemoTask ? '로컬 임시 초안' : `기존 항목 (${taskId})`}
          {isLocalDemoTask ? ' / 데모 모드' : ''}
        </p>
        <p className="official-document-description">TaskItem 형식으로 로컬 데모 데이터를 직접 편집합니다.</p>
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
        <p>{statusInfo}</p>
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
            setTask(next)
            setDocumentType('공문')
            setTasks(getTaskStore())
            setStatusInfo('새로운 데모 초안으로 초기화했습니다.')
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
