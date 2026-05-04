import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { LocationType, TaskItem, TaskStatus } from '../types/domain';
import { createOfficialDocumentLocationLink } from './taskService';
import { validateLocationValue } from '../utils/validation';
import './TaskEditor.css';

type TaskPatch = Partial<TaskItem>;

type TaskEditorProps = {
  documentType: string;
  onDocumentTypeChange: (value: string) => void;
  task: TaskItem;
  onTaskPatch: (patch: TaskPatch) => void;
};

type LocationFormState = {
  type: LocationType;
  title: string;
  value: string;
  memo: string;
};

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'RECEIVED', label: '접수' },
  { value: 'IN_PROGRESS', label: '처리 중' },
  { value: 'WAITING_SUBMISSION', label: '제출 대기' },
  { value: 'DONE', label: '완료' },
  { value: 'ARCHIVED', label: '보관' },
];

const documentTypeLabel: string[] = ['공문', '행정', '안전', '기타'];

const locationTypeLabel: Record<LocationType, string> = {
  URL: 'URL',
  PORTAL_DOC_NUMBER: '업무포털 문서번호',
  SCHOOL_MESSENGER: '학교 메신저 위치',
  LOCAL_FOLDER: '로컬 폴더 위치',
  NOTE: '기타 메모',
};

const locationTypeOptions = Object.entries(locationTypeLabel).map(([type, label]) => ({
  type: type as LocationType,
  label,
}))

const receiveDateValue = (value: string): string => value.slice(0, 10);

const toLocalDateIso = (date: string): string => `${date}T00:00:00.000Z`;

const normalizeTaskPatchText = (value: string): string => value.trim();

export function TaskEditor({
  documentType,
  onDocumentTypeChange,
  task,
  onTaskPatch,
}: TaskEditorProps) {
  const [locationForm, setLocationForm] = useState<LocationFormState>({
    type: 'URL',
    title: '',
    value: '',
    memo: '',
  });
  const [invalidUrlDraft, setInvalidUrlDraft] = useState<LocationFormState | null>(null);

  const addLocation = (draft: LocationFormState, forcedType?: LocationType) => {
    const type = forcedType ?? draft.type;
    const normalizedDraft = {
      ...draft,
      type,
      title: draft.title.trim() || locationTypeLabel[type],
      value: normalizeTaskPatchText(draft.value),
      memo: draft.memo.trim(),
    };

    const validation = validateLocationValue(type, normalizedDraft.value);
    if (!validation.valid && type !== 'NOTE') {
      return;
    }

    const link = createOfficialDocumentLocationLink({
      type: normalizedDraft.type,
      title: normalizedDraft.title,
      value: normalizedDraft.value,
      memo: normalizedDraft.memo,
    });

    onTaskPatch({
      locationLinks: [...task.locationLinks, link],
    });
    setLocationForm({
      type: 'URL',
      title: '',
      value: '',
      memo: '',
    });
    setInvalidUrlDraft(null);
  };

  const handleAddLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedValue = normalizeTaskPatchText(locationForm.value);
    const validation = validateLocationValue(locationForm.type, normalizedValue);

    if (!validation.valid && locationForm.type === 'URL') {
      setInvalidUrlDraft({
        ...locationForm,
        value: normalizedValue,
      });
      return;
    }

    if (!validation.valid && locationForm.type !== 'URL') {
      return;
    }

    addLocation(locationForm);
  };

  return (
    <section className="task-editor">
      <form className="task-editor-form" onSubmit={(event) => event.preventDefault()}>
        <h2>공문 체크리스트</h2>

        <label className="task-editor-field">
          <span>제목</span>
          <input
            type="text"
            value={task.title}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onTaskPatch({ title: event.currentTarget.value })
            }
            placeholder="예: 5월 학부모 안내 공문"
          />
        </label>

        <label className="task-editor-field">
          <span>접수일</span>
          <input
            type="date"
            value={receiveDateValue(task.createdAt)}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const value = event.currentTarget.value;
              if (!value) {
                return;
              }
              onTaskPatch({ createdAt: toLocalDateIso(value) });
            }}
          />
        </label>

        <label className="task-editor-field">
          <span>마감일</span>
          <input
            type="date"
            value={task.dueDate ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const value = event.currentTarget.value;
              onTaskPatch({
                dueDate: value || null,
              });
            }}
          />
        </label>

        <label className="task-editor-field">
          <span>업무 유형</span>
          <select
            value={documentType}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              onDocumentTypeChange(event.currentTarget.value);
            }}
          >
            {documentTypeLabel.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="task-editor-field">
          <span>제출 대상</span>
          <input
            type="text"
            value={task.submissionTarget}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              onTaskPatch({ submissionTarget: event.currentTarget.value });
            }}
            placeholder="예: 학부모, 학교행정실"
          />
        </label>

        <label className="task-editor-field">
          <span>상태</span>
          <select
            value={task.status}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              onTaskPatch({ status: event.currentTarget.value as TaskStatus });
            }}
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        <label className="task-editor-field">
          <span>담당자 메모</span>
          <textarea
            value={task.memo}
            onChange={(event) =>
              onTaskPatch({
                memo: event.currentTarget.value,
              })
            }
            placeholder="담당자용 메모를 입력하세요"
          />
        </label>

        <label className="task-editor-field">
          <span>내 처리 메모</span>
          <textarea
            value={task.sourceMemo}
            onChange={(event) =>
              onTaskPatch({
                sourceMemo: event.currentTarget.value,
              })
            }
            placeholder="처리 중에 필요한 메모를 입력하세요"
          />
        </label>
      </form>

      <section className="task-editor-location-section" aria-label="위치 링크 편집">
        <h3>위치 링크</h3>

        <form className="task-editor-location-form" onSubmit={handleAddLocation}>
          <label className="task-editor-field">
            <span>유형</span>
            <select
              value={locationForm.type}
              onChange={(event) => {
                const value = event.currentTarget.value as LocationType;
                setLocationForm((current) => ({
                  ...current,
                  type: value,
                }))
              }}
            >
              {locationTypeOptions.map((type) => (
                <option key={type.type} value={type.type}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="task-editor-field">
            <span>제목</span>
            <input
              type="text"
              value={locationForm.title}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setLocationForm((current) => ({
                  ...current,
                  title: value,
                }))
              }}
              placeholder="예: 행정 포털"
            />
          </label>
          <label className="task-editor-field">
            <span>값</span>
              <input
                type="text"
                value={locationForm.value}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setLocationForm((current) => ({
                    ...current,
                    value,
                  }))
                }}
                placeholder="값을 입력하세요"
                required
              />
          </label>
          <label className="task-editor-field">
            <span>메모</span>
            <input
              type="text"
              value={locationForm.memo}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setLocationForm((current) => ({
                  ...current,
                  memo: value,
                }))
              }}
              placeholder="메모"
            />
          </label>
          <button className="task-editor-location-add" type="submit">
            위치 추가
          </button>
        </form>

        {invalidUrlDraft && (
          <section className="task-editor-location-fallback" role="status" aria-live="polite">
            <p>
              URL 형식이 아닙니다. 기타 메모 위치로 저장하시겠습니까?
            </p>
            <div className="task-editor-location-fallback-actions">
              <button
                type="button"
                onClick={() => {
                  addLocation(invalidUrlDraft, 'NOTE');
                }}
              >
                기타 메모로 저장
              </button>
              <button type="button" onClick={() => setInvalidUrlDraft(null)}>
                다시 입력
              </button>
            </div>
          </section>
        )}

        <div className="task-editor-location-list">
          {task.locationLinks.length === 0 ? (
            <p className="task-editor-empty">아직 위치가 없습니다.</p>
          ) : (
            task.locationLinks.map((locationLink) => (
              <article className="task-editor-location-item" key={locationLink.id}>
                <div className="task-editor-location-content">
                  <p>
                    <strong>{locationTypeLabel[locationLink.type]}</strong>
                    {locationLink.title ? ` / ${locationLink.title}` : ''}
                  </p>
                  <p className="task-editor-location-value">{locationLink.value}</p>
                  {locationLink.memo ? <p>메모: {locationLink.memo}</p> : null}
                </div>
                <button
                  type="button"
                  className="task-editor-location-delete"
                  onClick={() =>
                    onTaskPatch({
                      locationLinks: task.locationLinks.filter((item) => item.id !== locationLink.id),
                    })
                  }
                >
                  삭제
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}

export default TaskEditor;
