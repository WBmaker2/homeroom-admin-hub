import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toLocalDateString } from '../utils/dates';
import type { SubmissionCollection, TaskItem } from '../types/domain';
import { buildInboxSections } from './inboxService';
import { TaskCard } from './TaskCard';
import { getStoredCollections, saveCollectionStore, type CollectionWithStudents } from '../collections/collectionService';
import { useUserRecords } from '../firebase/useUserRecords';
import { getTaskStore, saveTaskStore } from '../tasks/taskService';
import './InboxPage.css';

type DemoInboxProps = {
  today?: string;
  tasks?: TaskItem[];
  collections?: SubmissionCollection[];
  onComplete?: (taskId: string) => void;
};

const baseTasks: TaskItem[] = [
  {
    id: 'task-overdue',
    userId: 'user-demo',
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'SCHOOL',
    title: '지난 제출공문',
    dueDate: '2026-05-03',
    status: 'IN_PROGRESS',
    memo: '',
    sourceMemo: '',
    submissionTarget: '교육지원청',
    locationLinks: [
      {
        id: 'loc-overdue',
        type: 'URL',
        title: '행정 포털',
        value: 'https://example.com/overdue',
        memo: '빠른 링크',
      },
    ],
    linkedCollectionIds: [],
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z',
  },
  {
    id: 'task-today',
    userId: 'user-demo',
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'SCHOOL',
    title: '오늘 처리할 공문',
    dueDate: '2026-05-04',
    status: 'RECEIVED',
    memo: '',
    sourceMemo: '',
    submissionTarget: '학부모',
    locationLinks: [],
    linkedCollectionIds: ['col-today'],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-03T11:00:00.000Z',
  },
  {
    id: 'task-incomplete-collection',
    userId: 'user-demo',
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'CLASS',
    title: '미완료 제출물 공문',
    dueDate: '2026-05-06',
    status: 'WAITING_SUBMISSION',
    memo: '',
    sourceMemo: '',
    submissionTarget: '학부모',
    locationLinks: [
      {
        id: 'loc-collect',
        type: 'PORTAL_DOC_NUMBER',
        title: '문서 번호',
        value: 'DOC-2026-01',
        memo: '제출 전송자료',
      },
    ],
    linkedCollectionIds: ['col-incomplete'],
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-03T10:30:00.000Z',
  },
  {
    id: 'task-upcoming',
    userId: 'user-demo',
    type: 'PERSONAL_DUE',
    calendarCategory: 'PERSONAL',
    title: '개인 마감 예정',
    dueDate: '2026-05-10',
    status: 'IN_PROGRESS',
    memo: '',
    sourceMemo: '',
    submissionTarget: '',
    locationLinks: [],
    linkedCollectionIds: [],
    createdAt: '2026-05-01T10:30:00.000Z',
    updatedAt: '2026-05-03T09:00:00.000Z',
  },
];

const baseCollections: SubmissionCollection[] = [
  {
    id: 'col-today',
    userId: 'user-demo',
    classId: 'class-demo',
    officialDocumentTaskId: 'task-today',
    taskId: 'task-today',
    title: '오늘 공문 제출 수합',
    dueDate: '2026-05-04',
    rows: {
      student_1: {
        studentId: 'student_1',
        status: 'MISSING',
        submittedAt: null,
        memo: '',
      },
      student_2: {
        studentId: 'student_2',
        status: 'SUBMITTED',
        submittedAt: '2026-05-03T10:00:00.000Z',
        memo: '',
      },
    },
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-03T09:10:00.000Z',
  },
  {
    id: 'col-incomplete',
    userId: 'user-demo',
    classId: 'class-demo',
    officialDocumentTaskId: 'task-incomplete-collection',
    taskId: 'task-incomplete-collection',
    title: '수합 미완료 수집',
    dueDate: '2026-05-06',
    rows: {
      student_1: {
        studentId: 'student_1',
        status: 'MISSING',
        submittedAt: null,
        memo: '',
      },
      student_2: {
        studentId: 'student_2',
        status: 'SUBMITTED',
        submittedAt: '2026-05-03T10:00:00.000Z',
        memo: '',
      },
    },
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-03T09:10:00.000Z',
  },
];

type Section = {
  id: 'overdue' | 'today' | 'incompleteCollections' | 'upcoming';
  title: string;
  tasks: ReturnType<typeof buildInboxSections>['overdue'];
};

export function InboxView({
  today,
  tasks,
  collections,
  onComplete,
}: {
  today: string;
  tasks: TaskItem[];
  collections: SubmissionCollection[];
  onComplete: (taskId: string) => void;
}) {
  const sections = useMemo(
    () => buildInboxSections({ today, tasks, collections }),
    [today, tasks, collections],
  );

  const inboxSections: Section[] = [
    { id: 'overdue', title: '지난 마감', tasks: sections.overdue },
    { id: 'today', title: '오늘 마감', tasks: sections.today },
    { id: 'incompleteCollections', title: '미완료 제출물', tasks: sections.incompleteCollections },
    { id: 'upcoming', title: '이번 주 예정', tasks: sections.upcoming },
  ];

  return (
    <section className="inbox-view">
      <header>
        <h1 className="inbox-page-title">오늘 업무함</h1>
        <div className="inbox-quick-actions" aria-label="빠른 추가">
          <Link to="/app/tasks?intent=create&type=OFFICIAL_DOCUMENT" className="inbox-quick-action">
            공문 추가
          </Link>
          <Link to="/app/collections?intent=create" className="inbox-quick-action">
            수합판 추가
          </Link>
          <Link to="/app/tasks?intent=create&type=PERSONAL_DUE" className="inbox-quick-action">
            개인 마감 추가
          </Link>
          <Link to="/app/templates?intent=create" className="inbox-quick-action">
            템플릿 추가
          </Link>
        </div>
      </header>

      <div className="inbox-sections">
        {inboxSections.map((section) => (
          <section
            className="inbox-section"
            key={section.id}
            aria-label={section.title}
            data-testid={`inbox-section-${section.id}`}
          >
            <h2 className="inbox-section-title">{section.title}</h2>
            {section.tasks.length === 0 ? (
              <p className="inbox-empty">해당 항목이 없습니다.</p>
            ) : (
              <div className="inbox-section-list">
                {section.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onComplete={onComplete} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

export function InboxPage(props: DemoInboxProps = {}) {
  const {
    error: tasksError,
    loading: tasksLoading,
    records: storedTasks,
    setRecords: setStoredTasks,
    usingFirestore,
  } = useUserRecords<TaskItem>({
    collectionName: 'tasks',
    getInitialRecords: getTaskStore,
    onSaveLocal: saveTaskStore,
  })
  const {
    error: collectionsError,
    loading: collectionsLoading,
    records: storedCollectionRecords,
  } = useUserRecords<CollectionWithStudents>({
    collectionName: 'collections',
    getInitialRecords: getStoredCollections,
    onSaveLocal: saveCollectionStore,
  })

  const {
    today = toLocalDateString(new Date()),
    tasks: seededTasks,
    collections: seededCollections,
    onComplete: seedOnComplete,
  } = props;
  const tasks = seededTasks ?? (storedTasks.length > 0 || usingFirestore ? storedTasks : baseTasks)
  const collections =
    seededCollections ??
    (storedCollectionRecords.length > 0 || usingFirestore
      ? storedCollectionRecords.map((record) => record.collection)
      : baseCollections)
  const loading = tasksLoading || collectionsLoading
  const loadError = tasksError || collectionsError

  const completeByDefault = (taskId: string) => {
    setStoredTasks((current) => {
      const base = current.length > 0 ? current : tasks
      const nextTasks: TaskItem[] = base.map((task): TaskItem =>
        task.id === taskId && task.status !== 'DONE' && task.status !== 'ARCHIVED'
          ? {
              ...task,
              status: 'DONE',
              updatedAt: new Date().toISOString(),
            }
          : task,
      );

      return nextTasks;
    });
  };

  const onComplete = (taskId: string) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || target.status === 'DONE' || target.status === 'ARCHIVED') {
      return;
    }

    if (seedOnComplete) {
      seedOnComplete(taskId);
      return;
    }

    completeByDefault(taskId);
  };

  if (loading) {
    return (
      <section className="inbox-view">
        <p className="inbox-empty" role="status" aria-live="polite">
          오늘 업무함을 불러오는 중입니다.
        </p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="inbox-view">
        <p className="inbox-empty" role="alert">
          오늘 업무함 데이터를 불러오지 못했습니다: {loadError}
        </p>
      </section>
    )
  }

  return (
    <InboxView
      today={today}
      tasks={tasks}
      collections={collections}
      onComplete={onComplete}
    />
  );
}

export default InboxPage;
