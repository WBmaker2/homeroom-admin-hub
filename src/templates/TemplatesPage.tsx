import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TemplateEditor, type TemplateFeedback } from './TemplateEditor'
import * as templateService from './templateService'
import type { TemplateItem } from '../types/domain'
import './TemplatesPage.css'
import { getDemoTemplates } from '../firebase/seedDemoData'
import { useUserRecords } from '../firebase/useUserRecords'

const formatLastUsedDate = (value: string | null): string => {
  if (!value) {
    return '미사용'
  }

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

const createTemplateId = (): string => `template-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

const createBlankTemplate = (userId = 'user-demo'): TemplateItem => {
  const now = new Date().toISOString()
  return {
    id: `template-draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId,
    title: '',
    type: 'NOTICE',
    body: '',
    tags: [],
    replacementKeys: [],
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

const normalizeTemplateFromDraft = (template: TemplateItem): TemplateItem => ({
  ...template,
  tags: template.tags.filter(Boolean),
  replacementKeys: templateService.extractTemplateReplacementKeys(template.body),
})

const createEmptyReplacementValues = (): Record<string, string> => {
  return Object.fromEntries(
    templateService.TEMPLATE_REPLACEMENT_KEYS.map((key) => [key, '']),
  ) as Record<string, string>
}

const cloneTemplate = (template: TemplateItem): TemplateItem => ({
  ...template,
  tags: [...template.tags],
  replacementKeys: [...template.replacementKeys],
})

const summarizeText = (body: string): string => {
  const compact = body.replace(/\s+/g, ' ').trim()
  return compact.length > 78 ? `${compact.slice(0, 78)}...` : compact
}

export function TemplatesPage() {
  const [searchParams] = useSearchParams()
  const intent = searchParams.get('intent')
  const intentCreate = intent === 'create'
  const {
    error,
    loading,
    records: templates,
    setRecords: setTemplates,
    userId,
    usingFirestore,
  } = useUserRecords<TemplateItem>({
    collectionName: 'templates',
    getInitialRecords: templateService.getTemplateStore,
    onSaveLocal: templateService.saveTemplateStore,
  })
  const seedTemplates = getDemoTemplates()

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() =>
    intentCreate ? null : seedTemplates[0]?.id ?? null,
  )
  const [isCreateMode, setIsCreateMode] = useState<boolean>(intentCreate || seedTemplates.length === 0)
  const [draftTemplate, setDraftTemplate] = useState<TemplateItem>(() =>
    intentCreate ? createBlankTemplate() : cloneTemplate(seedTemplates[0] ?? createBlankTemplate()),
  )
  const [replacementValues, setReplacementValues] = useState<Record<string, string>>(
    createEmptyReplacementValues,
  )
  const [feedback, setFeedback] = useState<TemplateFeedback | null>(null)

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null

  useEffect(() => {
    if (intentCreate) {
      return
    }

    let active = true

    if (templates.length === 0) {
      void Promise.resolve().then(() => {
        if (!active) return
        setIsCreateMode(true)
        setSelectedTemplateId(null)
        setDraftTemplate(createBlankTemplate(userId ?? 'user-demo'))
      })
      return () => {
        active = false
      }
    }

    if (!selectedTemplateId || !templates.some((template) => template.id === selectedTemplateId)) {
      void Promise.resolve().then(() => {
        if (!active) return
        setIsCreateMode(false)
        setSelectedTemplateId(templates[0].id)
        setDraftTemplate(cloneTemplate(templates[0]))
      })
    }

    return () => {
      active = false
    }
  }, [intentCreate, selectedTemplateId, templates, userId])

  const previewText = templateService.interpolateTemplate(draftTemplate.body, replacementValues)
  const canCopy = Boolean(selectedTemplate)

  const patchDraftTemplate = (patch: Partial<TemplateItem>) => {
    setDraftTemplate((current) => ({ ...current, ...patch }))
  }

  const updateReplacementValue = (key: string, value: string) => {
    setReplacementValues((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleSelectTemplate = (template: TemplateItem) => {
    setIsCreateMode(false)
    setSelectedTemplateId(template.id)
    setDraftTemplate(cloneTemplate(template))
    setReplacementValues(createEmptyReplacementValues)
    setFeedback(null)
  }

  const handleCreateTemplate = () => {
    setIsCreateMode(true)
    setSelectedTemplateId(null)
    setDraftTemplate(createBlankTemplate(userId ?? 'user-demo'))
    setReplacementValues(createEmptyReplacementValues)
    setFeedback(null)
  }

  const handleSaveTemplate = () => {
    const trimmedTitle = draftTemplate.title.trim()
    if (!trimmedTitle) {
      setFeedback({ kind: 'alert', text: '제목을 입력해 주세요.' })
      return
    }

    const now = new Date().toISOString()
    const normalizedDraft = normalizeTemplateFromDraft({
      ...draftTemplate,
      title: trimmedTitle,
      updatedAt: now,
    })

    if (isCreateMode || !selectedTemplateId) {
      const created = {
        ...normalizedDraft,
        id: createTemplateId(),
        userId: userId ?? 'user-demo',
        createdAt: now,
        tags: normalizedDraft.tags.filter(Boolean),
      }
      setTemplates((current) => [...current, created])
      setIsCreateMode(false)
      setSelectedTemplateId(created.id)
      setDraftTemplate(created)
      setFeedback({ kind: 'status', text: '템플릿을 저장했습니다.' })
      return
    }

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplateId
          ? {
              ...normalizedDraft,
              id: selectedTemplateId,
              createdAt: template.createdAt,
            }
          : template,
      ),
    )
    setDraftTemplate((current) => ({
      ...normalizedDraft,
      id: selectedTemplateId,
      createdAt: current.createdAt,
    }))
    setFeedback({ kind: 'status', text: '템플릿을 저장했습니다.' })
  }

  const handleCopyTemplate = async () => {
    if (!selectedTemplate) {
      setFeedback({
        kind: 'alert',
        text: '저장된 템플릿을 선택한 뒤 복사해 주세요.',
      })
      return
    }

    if (!templateService.isClipboardWriteAvailable()) {
      setFeedback({
        kind: 'alert',
        text: '현재 환경에서는 클립보드 복사를 사용할 수 없습니다. 브라우저 권한을 확인해 주세요.',
      })
      return
    }

    try {
      await templateService.writeTextToClipboard(previewText)
      const now = new Date().toISOString()
      const touchedTemplate = templateService.touchTemplateLastUsedAt(selectedTemplate, now)
      setTemplates((current) =>
        current.map((template) =>
          template.id === touchedTemplate.id ? touchedTemplate : template,
        ),
      )
      setDraftTemplate((current) => ({ ...current, lastUsedAt: now, updatedAt: now }))
      setFeedback({ kind: 'status', text: '문구를 클립보드에 복사했습니다.' })
    } catch {
      setFeedback({
        kind: 'alert',
        text: '클립보드 복사 중 문제가 발생했습니다. 브라우저 설정을 확인해 주세요.',
      })
    }
  }

  return (
    <main className="templates-page">
      <h1>템플릿</h1>
      {loading ? (
        <p className="templates-empty" role="status" aria-live="polite">
          템플릿을 불러오는 중입니다.
        </p>
      ) : null}
      {error ? (
        <p className="templates-empty" role="alert">
          템플릿을 불러오지 못했습니다: {error}
        </p>
      ) : null}
      {usingFirestore ? (
        <p className="templates-counseling-caution" role="note">
          템플릿은 Firestore 사용자 문서에 저장됩니다. 상담 기록 본문이나 민감한 학생 정보는 저장하지 마세요.
        </p>
      ) : null}

      <section className="templates-list-section" aria-label="템플릿 목록">
        <div className="templates-list-header">
          <h2>템플릿 목록</h2>
          <button type="button" className="templates-new-button" onClick={handleCreateTemplate}>
            새 템플릿
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="templates-empty">등록된 템플릿이 없습니다.</p>
        ) : (
          <ul className="templates-list" aria-label="템플릿 목록">
            {templates.map((template) => (
              <li key={template.id} className="templates-list-item">
                <button
                  type="button"
                  className={`templates-list-select${template.id === selectedTemplateId ? ' is-active' : ''}`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <span className="templates-list-cell templates-list-title">
                    <strong>{template.title || '제목 없음'}</strong>
                    <small className="templates-list-type">
                      {templateService.TEMPLATE_TYPE_LABEL[template.type]}
                    </small>
                  </span>
                  <span className="templates-list-cell templates-list-body">{summarizeText(template.body)}</span>
                  <span className="templates-list-cell templates-list-tags">{template.tags.join(', ') || '—'}</span>
                  <span className="templates-list-cell templates-list-last-used">
                    {formatLastUsedDate(template.lastUsedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {draftTemplate.type === 'COUNSELING_FORM' ? (
        <p className="templates-counseling-caution" role="note">
          상담 기록 양식은 빈 양식과 반복 문구 보관용입니다. 특정 학생의 실제 상담 내용은 저장하지 마세요.
        </p>
      ) : null}

      <TemplateEditor
        draft={draftTemplate}
        replacementValues={replacementValues}
        previewText={previewText}
        feedback={feedback}
        canCopy={canCopy}
        onPatch={patchDraftTemplate}
        onReplacementValueChange={updateReplacementValue}
        onSave={handleSaveTemplate}
        onCopy={handleCopyTemplate}
      />
    </main>
  )
}

export default TemplatesPage
