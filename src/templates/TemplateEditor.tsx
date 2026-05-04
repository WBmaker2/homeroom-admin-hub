import { type ChangeEvent } from 'react'
import type { TemplateItem } from '../types/domain'
import { TEMPLATE_REPLACEMENT_KEYS, TEMPLATE_TYPE_LABEL } from './templateService'
import './TemplateEditor.css'

type TemplateFeedback = {
  kind: 'status' | 'alert'
  text: string
}

type TemplateEditorProps = {
  draft: TemplateItem
  replacementValues: Record<string, string>
  previewText: string
  feedback: TemplateFeedback | null
  canCopy: boolean
  onPatch: (patch: Partial<TemplateItem>) => void
  onReplacementValueChange: (key: string, value: string) => void
  onSave: () => void
  onCopy: () => void
}

const toTagArray = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

export function TemplateEditor({
  draft,
  replacementValues,
  previewText,
  feedback,
  canCopy,
  onPatch,
  onReplacementValueChange,
  onSave,
  onCopy,
}: TemplateEditorProps) {
  const handleTagsChange = (nextTags: string) => {
    onPatch({ tags: toTagArray(nextTags) })
  }

  return (
    <section className="template-editor">
      <header className="template-editor-header">
        <h2 className="template-editor-title">템플릿 편집</h2>
      </header>

      <form className="template-editor-form" onSubmit={(event) => event.preventDefault()}>
        <label className="template-editor-field">
          <span>제목</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onPatch({ title: event.currentTarget.value })
            }
            placeholder="예: 제출일 안내문"
          />
        </label>

        <label className="template-editor-field">
          <span>유형</span>
          <select
            value={draft.type}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onPatch({ type: event.currentTarget.value as TemplateItem['type'] })
            }
          >
            {(Object.entries(TEMPLATE_TYPE_LABEL) as Array<
              [TemplateItem['type'], string]
            >).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {draft.type === 'COUNSELING_FORM' && (
          <p className="template-editor-warning">
            상담 기록 양식은 양식 문구/체크리스트 재사용 영역입니다. 실제 학생 상담 내용은 별도 보관소에 별도
            저장하고, 이 템플릿에는 민감한 학생 개별 내용이 들어가지 않도록 관리해 주세요.
          </p>
        )}

        <label className="template-editor-field">
          <span>본문</span>
          <textarea
            value={draft.body}
            className="template-editor-body"
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              onPatch({ body: event.currentTarget.value })
            }}
            placeholder="템플릿 본문을 입력하세요"
          />
        </label>

        <label className="template-editor-field">
          <span>태그</span>
          <input
            type="text"
            value={draft.tags.join(', ')}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              handleTagsChange(event.currentTarget.value)
            }}
            placeholder="예: 안내, 반별, 마감"
          />
        </label>

        <label className="template-editor-field">
          <span>마지막 사용일</span>
          <input type="text" value={draft.lastUsedAt ?? ''} readOnly disabled />
        </label>

        <fieldset className="template-editor-fieldset">
          <legend>대체 키값</legend>
          <div className="template-editor-replacements">
            {TEMPLATE_REPLACEMENT_KEYS.map((key) => (
              <label className="template-editor-replacement-field" key={key}>
                <span>{`{${key}}`}</span>
                <input
                  type="text"
                  value={replacementValues[key] ?? ''}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    onReplacementValueChange(key, event.currentTarget.value)
                  }}
                  placeholder={`${key} 입력`}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <label className="template-editor-field">
          <span>미리보기</span>
          <pre className="template-editor-preview">{previewText}</pre>
        </label>

        <div className="template-editor-actions">
          <button type="button" className="template-editor-save" onClick={onSave}>
            저장
          </button>
          <button type="button" className="template-editor-copy" onClick={onCopy} disabled={!canCopy}>
            미리보기 복사
          </button>
        </div>
      </form>

      {feedback ? (
        <p
          className={`template-editor-feedback template-editor-feedback-${feedback.kind}`}
          role={feedback.kind}
          aria-live="polite"
        >
          {feedback.text}
        </p>
      ) : null}
    </section>
  )
}

export default TemplateEditor
export type { TemplateFeedback }
