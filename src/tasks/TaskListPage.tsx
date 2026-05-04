import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { TaskItem } from '../types/domain';
import { buildTaskList } from './taskService';
import { TaskCard } from '../inbox/TaskCard';
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
  const [tasks, setTasks] = useState<TaskItem[]>(baseTasks);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [searchParams] = useSearchParams();
  const intent = searchParams.get('intent');
  const createType = searchParams.get('type');

  const handleComplete = (taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
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

  const intentTitle =
    intent === 'create'
      ? createType === 'PERSONAL_DUE'
        ? '개인 마감 추가 준비'
        : '공문 추가 준비'
      : null;

  return (
    <div className="task-list-page">
      {intentTitle && (
        <section className="task-list-intent" role="status" aria-live="polite">
          <h2 className="task-list-intent-title">{intentTitle}</h2>
          <p>현재는 준비 단계 화면입니다. 다음 단계에서 {intentTitle} 입력 폼이 연결됩니다.</p>
          <form className="task-list-intent-form">
            <label className="task-list-intent-field">
              <span>제목</span>
              <input type="text" placeholder="예: 5월 학급 공지 제출 마감" disabled />
            </label>
            <button type="button" disabled className="task-list-intent-action">
              다음 단계에서 처리
            </button>
          </form>
        </section>
      )}
      <label className="task-list-archive-toggle" htmlFor="include-archived">
        <input
          id="include-archived"
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => setIncludeArchived(event.target.checked)}
        />
        <span>보관 포함</span>
      </label>
      <TaskListView tasks={tasks} includeArchived={includeArchived} onComplete={handleComplete} />
    </div>
  );
}

export default TaskListPage;
