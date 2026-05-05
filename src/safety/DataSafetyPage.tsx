import { useMemo, useState } from 'react'
import { useUserRecords } from '../firebase/useUserRecords'
import { getClassStore, saveClassStore } from '../classes/classService'
import {
  getStoredCollections,
  saveCollectionStore,
} from '../collections/collectionService'
import {
  createBackupFilename,
  createBackupPayload,
  parseBackupPayload,
  serializeBackupPayload,
} from './dataBackup'
import { getTaskStore, saveTaskStore } from '../tasks/taskService'
import { getTemplateStore, isClipboardWriteAvailable, saveTemplateStore } from '../templates/templateService'
import type { TaskItem, TemplateItem } from '../types/domain'
import type { ClassRecord } from '../classes/classService'
import type { CollectionWithStudents } from '../collections/collectionService'
import './DataSafetyPage.css'

type BackupGroupKey = 'tasks' | 'classes' | 'collections' | 'templates'

type Feedback = {
  kind: 'status' | 'alert'
  text: string
}

const backupGroups = [
  { key: 'tasks', label: '업무' },
  { key: 'classes', label: '학급' },
  { key: 'collections', label: '수합판' },
  { key: 'templates', label: '템플릿' },
] as const

const initialSelections = {
  tasks: false,
  classes: false,
  collections: false,
  templates: false,
} satisfies Record<BackupGroupKey, boolean>

const isClipboardSupported = () => isClipboardWriteAvailable()

export function DataSafetyPage() {
  const {
    error: tasksError,
    loading: tasksLoading,
    records: tasks,
    setRecords: setTasks,
    usingFirestore: tasksUsingFirestore,
  } = useUserRecords<TaskItem>({
    collectionName: 'tasks',
    getInitialRecords: getTaskStore,
    onSaveLocal: saveTaskStore,
  })

  const {
    error: classesError,
    loading: classesLoading,
    records: classes,
    setRecords: setClasses,
    usingFirestore: classesUsingFirestore,
  } = useUserRecords<ClassRecord>({
    collectionName: 'classes',
    getInitialRecords: getClassStore,
    onSaveLocal: saveClassStore,
  })

  const {
    error: collectionsError,
    loading: collectionsLoading,
    records: collections,
    setRecords: setCollections,
    usingFirestore: collectionsUsingFirestore,
  } = useUserRecords<CollectionWithStudents>({
    collectionName: 'collections',
    getInitialRecords: getStoredCollections,
    onSaveLocal: saveCollectionStore,
  })

  const {
    error: templatesError,
    loading: templatesLoading,
    records: templates,
    setRecords: setTemplates,
    usingFirestore: templatesUsingFirestore,
  } = useUserRecords<TemplateItem>({
    collectionName: 'templates',
    getInitialRecords: getTemplateStore,
    onSaveLocal: saveTemplateStore,
  })

  const isLoading = tasksLoading || classesLoading || collectionsLoading || templatesLoading
  const hasError = tasksError || classesError || collectionsError || templatesError

  const storageMode = [
    tasksUsingFirestore,
    classesUsingFirestore,
    collectionsUsingFirestore,
    templatesUsingFirestore,
  ]
  const storageModeText = storageMode.every(Boolean)
    ? 'Firestore 사용자 저장소'
    : storageMode.every((value) => !value)
      ? '브라우저 로컬/데모 저장소'
      : '혼합 저장소(부분 Firestore)'

  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [importText, setImportText] = useState('')
  const importParse = useMemo(() => {
    if (!importText.trim()) {
      return { parsed: null, error: '' }
    }

    const parsed = parseBackupPayload(importText)
    if (parsed.ok) {
      return {
        parsed: parsed.value,
        error: '',
      }
    }

    return {
      parsed: null,
      error: parsed.error,
    }
  }, [importText])
  const importParsed = importParse.parsed
  const importError = importParse.error
  const [selectedGroups, setSelectedGroups] = useState<Record<BackupGroupKey, boolean>>(initialSelections)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const backupPayload = useMemo(
    () => createBackupPayload(tasks, classes, collections, templates),
    [classes, collections, tasks, templates],
  )

  const backupText = useMemo(() => serializeBackupPayload(backupPayload), [backupPayload])

  const hasReadyImport = importParse.parsed !== null && !importError

  const counts = useMemo(
    () => ({
      tasks: tasks.length,
      classes: classes.length,
      collections: collections.length,
      templates: templates.length,
    }),
    [tasks.length, classes.length, collections.length, templates.length],
  )

  const selectedCount = useMemo(() => {
    return Object.values(selectedGroups).filter(Boolean).length
  }, [selectedGroups])

  const handleCopyPreview = async () => {
    if (!isClipboardSupported()) {
      setFeedback({
        kind: 'alert',
        text: '현재 브라우저에서 클립보드 복사가 지원되지 않습니다.',
      })
      return
    }

    try {
      await navigator.clipboard.writeText(backupText)
      setFeedback({ kind: 'status', text: '백업 JSON을 클립보드에 복사했습니다.' })
    } catch {
      setFeedback({
        kind: 'alert',
        text: '클립보드 복사 중 문제가 발생했습니다.',
      })
    }
  }

  const handleExport = () => {
    const blob = new Blob([backupText], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = createBackupFilename()
    anchor.style.display = 'none'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    setFeedback({ kind: 'status', text: '백업 파일 다운로드를 시작했습니다.' })
  }

  const handleImportApply = () => {
    if (!importParsed) {
      setFeedback({ kind: 'alert', text: '유효한 백업 데이터가 없습니다.' })
      return
    }

    setTasks(importParsed.tasks)
    setClasses(importParsed.classes)
    setCollections(importParsed.collections)
    setTemplates(importParsed.templates)
    setFeedback({ kind: 'status', text: '백업 데이터를 복원했습니다.' })
    setImportText('')
  }

  const handleSelectionChange = (key: BackupGroupKey, checked: boolean) => {
    setSelectedGroups((current) => ({
      ...current,
      [key]: checked,
    }))
  }

  const handleClearSelected = () => {
    if (deleteConfirmText !== '삭제' || selectedCount === 0) {
      return
    }

    if (selectedGroups.tasks) {
      setTasks([])
    }

    if (selectedGroups.classes) {
      setClasses([])
    }

    if (selectedGroups.collections) {
      setCollections([])
    }

    if (selectedGroups.templates) {
      setTemplates([])
    }

    setSelectedGroups(initialSelections)

    setDeleteConfirmText('')
    setFeedback({
      kind: 'status',
      text: `${selectedCount}개 그룹 데이터가 초기화되었습니다.`,
    })
  }

  const canClear = deleteConfirmText === '삭제' && selectedCount > 0

  return (
    <main className="safety-page">
      <h1>데이터 안전</h1>

      {isLoading ? <p className="safety-status" role="status" aria-live="polite">데이터를 불러오는 중입니다.</p> : null}
      {hasError ? <p className="safety-feedback safety-feedback-alert" role="alert">데이터 저장소에 문제가 있습니다. 저장 후 다시 확인해 주세요.</p> : null}

      <section className="safety-section" aria-label="데이터 백업/내보내기">
        <h2>백업</h2>
        <p className="safety-mode">저장 위치: {storageModeText}</p>
        <label className="safety-label" htmlFor="safety-backup-preview">
          백업 미리보기
        </label>
        <textarea
          id="safety-backup-preview"
          className="safety-textarea safety-textarea--preview"
          readOnly
          value={backupText}
          rows={12}
          aria-label="백업 JSON 미리보기"
        />
        <div className="safety-actions">
          <button type="button" onClick={handleCopyPreview} disabled={isLoading}>
            JSON 복사
          </button>
          <button type="button" onClick={handleExport} disabled={isLoading}>
            JSON 파일로 저장
          </button>
        </div>
      </section>

      <section className="safety-section" aria-label="데이터 복원">
        <h2>복원</h2>
        <label className="safety-label" htmlFor="safety-import-input">
          백업 JSON 붙여넣기
        </label>
        <textarea
          id="safety-import-input"
          className="safety-textarea"
          value={importText}
          onChange={(event) => setImportText(event.currentTarget.value)}
          placeholder='{"tasks":[],"classes":[],"collections":[],"templates":[]}'
          rows={10}
          aria-label="백업 JSON 붙여넣기"
        />
        {importError ? <p className="safety-feedback safety-feedback-alert" role="alert">{importError}</p> : null}
        {hasReadyImport ? (
          <p className="safety-feedback" role="status" aria-live="polite">
            교체 대상: 업무 {importParsed?.tasks.length}건, 학급 {importParsed?.classes.length}건, 수합판 {importParsed?.collections.length}건, 템플릿 {importParsed?.templates.length}건
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleImportApply}
          disabled={!hasReadyImport || isLoading}
        >
          데이터 복원
        </button>
      </section>

      <section className="safety-section" aria-label="데이터 초기화">
        <h2>초기화</h2>
        <p className="safety-note">초기화할 그룹을 선택한 뒤, 아래 입력창에 `삭제`를 입력해 주세요.</p>

        <fieldset className="safety-checklist">
          <legend>초기화할 데이터 그룹</legend>
          {backupGroups.map((group) => {
            const count = counts[group.key]
            return (
              <label key={group.key} className="safety-checklist-item">
                <input
                  type="checkbox"
                  checked={selectedGroups[group.key]}
                  onChange={(event) => handleSelectionChange(group.key, event.currentTarget.checked)}
                />
                {`${group.label} (${count}건)`}
              </label>
            )
          })}
        </fieldset>

        <label className="safety-label" htmlFor="safety-delete-confirm">
          삭제 확인
        </label>
        <input
          id="safety-delete-confirm"
          className="safety-input"
          value={deleteConfirmText}
          onChange={(event) => setDeleteConfirmText(event.currentTarget.value)}
          placeholder="삭제"
          aria-label="삭제 확인 입력"
        />

        <button type="button" onClick={handleClearSelected} disabled={!canClear || isLoading}>
          선택 항목 삭제
        </button>
      </section>

      {feedback ? (
        <p className={`safety-feedback safety-feedback-${feedback.kind}`} role={feedback.kind} aria-live="polite">
          {feedback.text}
        </p>
      ) : null}
    </main>
  )
}

export default DataSafetyPage
