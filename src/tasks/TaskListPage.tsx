import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { TaskItem, TaskStatus } from '../types/domain';
import { buildTaskList, createTaskId, getTaskStore, saveTaskStore } from './taskService';
import { TaskCard } from '../inbox/TaskCard';
import { useUserRecords } from '../firebase/useUserRecords';
import './TaskListPage.css';

const baseTasks: TaskItem[] = [
  {
    id: 'task-pending-1',
    userId: 'user-demo',
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'SCHOOL',
    title: '진행 중 공문',
    dueDate: '2026-05-05',
    status: 'IN_PROGRESS',
    memo: '',
    sourceMemo: '',
    submissionTarget: '학부모',
    locationLinks: [
      {
        id: 'loc1',
        type: 'URL',
        title: '메신저 공지',
        value: 'https://example.com/notice',
        memo: '',
      },
    ],
    linkedCollectionIds: ['col-1'],
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-03T11:00:00.000Z',
  },
  {
    id: 'task-done-1',
    userId: 'user-demo',
    type: 'PERSONAL_DUE',
    calendarCategory: 'PERSONAL',
    title: '완료된 개인 마감',
    dueDate: '2026-05-02',
    status: 'DONE',
    memo: '',
    sourceMemo: '',
    submissionTarget: '',
    locationLinks: [],
    linkedCollectionIds: [],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-03T09:30:00.000Z',
  },
  {
    id: 'task-archive-1',
    userId: 'user-demo',
    type: 'CLASS_SUBMISSION',
    calendarCategory: 'CLASS',
    title: '보관된 제출물',
    dueDate: '2026-05-01',
    status: 'ARCHIVED',
    memo: '',
    sourceMemo: '',
    submissionTarget: '학급',
    locationLinks: [
      {
        id: 'loc2',
        type: 'LOCAL_FOLDER',
        title: '폴더',
        value: '/Users/user/notes',
        memo: '',
      },
    ],
    linkedCollectionIds: [],
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z',
  },
  {
    id: 'task-today-due',
    userId: 'user-demo',
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'SCHOOL',
    title: '오늘 마감 공문',
    dueDate: '2026-05-04',
    status: 'RECEIVED',
    memo: '',
    sourceMemo: '',
    submissionTarget: '행정실',
    locationLinks: [],
    linkedCollectionIds: ['col-2'],
    createdAt: '2026-05-01T07:00:00.000Z',
    updatedAt: '2026-05-03T12:00:00.000Z',
  },
  {
    id: 'task-upcoming-due',
    userId: 'user-demo',
    type: 'PERSONAL_DUE',
    calendarCategory: 'PERSONAL',
    title: '주간 예정 개인 마감',
    dueDate: '2026-05-09',
    status: 'WAITING_SUBMISSION',
    memo: '',
    sourceMemo: '',
    submissionTarget: '',
    locationLinks: [
      {
        id: 'loc3',
        type: 'NOTE',
        title: '메모',
        value: '자율활동 제출 마감',
        memo: '추가 안내 필요',
      },
    ],
    linkedCollectionIds: [],
    createdAt: '2026-05-01T11:00:00.000Z',
    updatedAt: '2026-05-03T12:30:00.000Z',
  },
];

type CreateMode = 'OFFICIAL_DOCUMENT' | 'PERSONAL_DUE';
type TaskPatch = Partial<Pick<TaskItem, 'title' | 'dueDate' | 'status' | 'submissionTarget' | 'memo'>>;

type CreateModeLabel = (type: CreateMode) => string;
type CreatePayload = {
  title: string;
  dueDate: string;
  submissionTarget: string;
  memo: string;
};

const taskTypeLabel: Record<TaskItem['type'], string> = {
  OFFICIAL_DOCUMENT: '공문',
  CLASS_SUBMISSION: '수합판',
  PERSONAL_DUE: '개인 마감',
};

const taskStatusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'RECEIVED', label: '접수' },
  { value: 'IN_PROGRESS', label: '처리 중' },
  { value: 'WAITING_SUBMISSION', label: '제출 대기' },
  { value: 'DONE', label: '완료' },
  { value: 'ARCHIVED', label: '보관' },
];

const getCreateModeLabel: CreateModeLabel = (type) => {
  return type === 'OFFICIAL_DOCUMENT' ? '공문 추가' : '개인 마감 추가';
};

const getCreatePrompt = (type: CreateMode) => {
  return type === 'OFFICIAL_DOCUMENT'
    ? '공문 제목을 입력하고 간단한 보조 정보를 함께 저장해 주세요.'
    : '개인 마감 제목을 입력하고 간단한 보조 정보를 함께 저장해 주세요.';
};

const normalizeDate = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

function TaskCreateForm({
  mode,
  onCreate,
}: {
  mode: CreateMode;
  onCreate: (mode: CreateMode, payload: CreatePayload) => void;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submissionTarget, setSubmissionTarget] = useState('');
  const [memo, setMemo] = useState('');
  const [formError, setFormError] = useState('');

  const titleLabel = getCreateModeLabel(mode);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setFormError('제목은 필수입니다.');
      return;
    }

    onCreate(mode, {
      title: normalizedTitle,
      dueDate,
      submissionTarget: submissionTarget.trim(),
      memo: memo.trim(),
    });
    setTitle('');
    setDueDate('');
    setSubmissionTarget('');
    setMemo('');
  };

  return (
    <section className="task-list-intent" role="status" aria-live="polite">
      <h2 className="task-list-intent-title">{titleLabel}</h2>
      <p>{getCreatePrompt(mode)}</p>
      <form className="task-list-intent-form" onSubmit={handleSubmit}>
        <label className="task-list-intent-field">
          <span>제목</span>
          <input
            type="text"
            value={title}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setTitle(event.currentTarget.value);
            }}
          />
        </label>
        <label className="task-list-intent-field">
          <span>마감일</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setDueDate(event.currentTarget.value);
            }}
          />
        </label>
        <label className="task-list-intent-field">
          <span>제출 대상</span>
          <input
            type="text"
            value={submissionTarget}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setSubmissionTarget(event.currentTarget.value);
            }}
            placeholder="예: 학부모, 행정실"
          />
        </label>
        <label className="task-list-intent-field">
          <span>메모</span>
          <textarea
            value={memo}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              setMemo(event.currentTarget.value);
            }}
            placeholder="추가 메모"
          />
        </label>
        <button type="submit" className="task-list-intent-action">
          {titleLabel} 저장
        </button>
      </form>
      {formError ? <p className="task-list-message task-list-message-error" role="alert">{formError}</p> : null}
    </section>
  );
}

function TaskDetailPanel({
  task,
  onClose,
  onTaskPatch,
}: {
  task: TaskItem;
  onClose: () => void;
  onTaskPatch: (taskId: string, patch: TaskPatch) => void;
}) {
  const title =
    task.type === 'PERSONAL_DUE'
      ? '개인 마감 상세'
      : `${taskTypeLabel[task.type]} 상세`;

  return (
    <section className="task-list-detail" aria-labelledby="task-list-detail-title">
      <div className="task-list-detail-header">
        <div>
          <p className="task-list-detail-kicker">{taskTypeLabel[task.type]}</p>
          <h2 id="task-list-detail-title">{title}</h2>
        </div>
        <button type="button" className="task-list-detail-close" onClick={onClose}>
          닫기
        </button>
      </div>
      <form className="task-list-detail-form" onSubmit={(event) => event.preventDefault()}>
        <label className="task-list-intent-field">
          <span>제목</span>
          <input
            type="text"
            value={task.title}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onTaskPatch(task.id, { title: event.currentTarget.value })
            }
          />
        </label>
        <label className="task-list-intent-field">
          <span>마감일</span>
          <input
            type="date"
            value={task.dueDate ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onTaskPatch(task.id, { dueDate: normalizeDate(event.currentTarget.value) })
            }
          />
        </label>
        <label className="task-list-intent-field">
          <span>상태</span>
          <select
            value={task.status}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onTaskPatch(task.id, { status: event.currentTarget.value as TaskStatus })
            }
          >
            {taskStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="task-list-intent-field">
          <span>제출 대상</span>
          <input
            type="text"
            value={task.submissionTarget}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onTaskPatch(task.id, { submissionTarget: event.currentTarget.value })
            }
            placeholder={task.type === 'PERSONAL_DUE' ? '예: 내 점검 항목' : '예: 학부모, 행정실'}
          />
        </label>
        <label className="task-list-intent-field task-list-detail-wide">
          <span>메모</span>
          <textarea
            value={task.memo}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onTaskPatch(task.id, { memo: event.currentTarget.value })
            }
            placeholder="처리 전에 확인할 메모"
          />
        </label>
      </form>
      <p className="task-list-detail-note">
        수정 내용은 현재 업무 목록과 캘린더에 바로 반영됩니다.
      </p>
    </section>
  );
}

export function TaskListView({
  tasks,
  includeArchived,
  onComplete,
}: {
  tasks: TaskItem[];
  includeArchived: boolean;
  onComplete: (taskId: string) => void;
}) {
  const visibleTasks = useMemo(
    () =>
      buildTaskList({
        tasks,
        includeArchived,
      }),
    [tasks, includeArchived],
  );

  return (
    <section className="task-list-view">
      <header className="task-list-header">
        <h1 className="task-list-title">전체 업무</h1>
        <div className="task-list-quick-actions">
          <Link to="/app/tasks?intent=create&type=OFFICIAL_DOCUMENT" className="task-list-quick-action">
            공문 추가
          </Link>
          <Link to="/app/collections?intent=create" className="task-list-quick-action">
            수합판 추가
          </Link>
          <Link to="/app/tasks?intent=create&type=PERSONAL_DUE" className="task-list-quick-action">
            개인 마감 추가
          </Link>
          <Link to="/app/templates?intent=create" className="task-list-quick-action">
            템플릿 추가
          </Link>
        </div>
      </header>
      <div className="task-list-content">
        {visibleTasks.length === 0 ? (
          <p className="task-list-empty">표시할 업무가 없습니다.</p>
        ) : (
          <div className="task-list-grid">
            {visibleTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={onComplete} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function TaskListPage() {
  const {
    error,
    loading,
    records: storedTasks,
    setRecords: setStoredTasks,
    usingFirestore,
  } = useUserRecords<TaskItem>({
    collectionName: 'tasks',
    getInitialRecords: getTaskStore,
    onSaveLocal: saveTaskStore,
  })
  const tasks = storedTasks.length > 0 || usingFirestore ? storedTasks : baseTasks
  const [includeArchived, setIncludeArchived] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const intent = searchParams.get('intent');
  const createType = searchParams.get('type');
  const selectedTaskId = searchParams.get('taskId')?.trim() ?? '';
  const createMode = intent === 'create' && (createType === 'OFFICIAL_DOCUMENT' || createType === 'PERSONAL_DUE')
    ? createType
    : null;
  const isCreateReady = !(usingFirestore && loading);
  const [formMessage, setFormMessage] = useState('');
  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) : null;

  const handleComplete = (taskId: string) => {
    setStoredTasks((current) =>
      (current.length > 0 ? current : tasks).map((task) =>
        task.id === taskId && task.status !== 'DONE' && task.status !== 'ARCHIVED'
          ? {
              ...task,
              status: 'DONE',
              updatedAt: new Date().toISOString(),
            }
          : task,
      ),
    );
  };

  const handleTaskPatch = (taskId: string, patch: TaskPatch) => {
    setStoredTasks((current) => {
      const source = current.length > 0 ? current : tasks;
      return source.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : task,
      );
    });
    setFormMessage('업무 상세가 저장되었습니다.');
  };

  const createDraftTask = (
    type: CreateMode,
    overrides: {
      title: string;
      dueDate: string | null;
      memo: string;
      submissionTarget: string;
    },
  ): TaskItem => ({
    id: createTaskId(),
    userId: 'user-demo',
    type,
    calendarCategory: type === 'OFFICIAL_DOCUMENT' ? 'SCHOOL' : 'PERSONAL',
    title: overrides.title,
    dueDate: overrides.dueDate,
    status: 'RECEIVED',
    memo: overrides.memo,
    sourceMemo: '',
    submissionTarget: overrides.submissionTarget,
    locationLinks: [],
    linkedCollectionIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleCreateSubmit = (mode: CreateMode, payload: CreatePayload) => {
    if (usingFirestore && loading) {
      return;
    }

    const nextTask = createDraftTask(mode, {
      title: payload.title,
      dueDate: normalizeDate(payload.dueDate),
      memo: payload.memo,
      submissionTarget: payload.submissionTarget,
    });

    setStoredTasks((current) => {
      const currentOrSeed = current.length > 0 || usingFirestore ? current : baseTasks;
      return [...currentOrSeed, nextTask];
    });

    setFormMessage(`${getCreateModeLabel(mode)} 항목이 생성되었습니다.`);
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="task-list-page">
      {createMode && isCreateReady ? <TaskCreateForm key={createMode} mode={createMode} onCreate={handleCreateSubmit} /> : null}
      {!createMode && selectedTask ? (
        <TaskDetailPanel
          task={selectedTask}
          onTaskPatch={handleTaskPatch}
          onClose={() => setSearchParams({}, { replace: true })}
        />
      ) : null}
      {!createMode && selectedTaskId && !selectedTask && !loading ? (
        <p className="task-list-empty" role="alert">
          선택한 업무를 찾지 못했습니다.
        </p>
      ) : null}
      {formMessage ? <p className="task-list-message" role="status" aria-live="polite">{formMessage}</p> : null}
      <label className="task-list-archive-toggle" htmlFor="include-archived">
        <input
          id="include-archived"
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => setIncludeArchived(event.target.checked)}
        />
        <span>보관 포함</span>
      </label>
      {loading ? (
        <p className="task-list-empty" role="status" aria-live="polite">
          업무 목록을 불러오는 중입니다.
        </p>
      ) : null}
      {error ? (
        <p className="task-list-empty" role="alert">
          업무 목록을 불러오지 못했습니다: {error}
        </p>
      ) : null}
      <TaskListView tasks={tasks} includeArchived={includeArchived} onComplete={handleComplete} />
    </div>
  );
}

export default TaskListPage;
