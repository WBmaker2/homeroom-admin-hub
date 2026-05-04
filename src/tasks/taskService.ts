import { compareLocalDate, isLocalDate } from '../utils/dates';
import type { LocationType, TaskItem } from '../types/domain';
import { DEMO_USER_ID, getDemoTasks, isDemoAuthMode } from '../firebase/seedDemoData';

export type BuildTaskListInput = {
  tasks: TaskItem[];
  includeArchived: boolean;
};

export type OfficialDocumentDraftOverrides = Partial<TaskItem>;

const canUseBrowserStorage = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

const TASK_STORE_KEY = 'homeroom-demo-tasks-v1';

const normalizeTaskStore = (tasks: TaskItem[]): TaskItem[] =>
  tasks.map((task) => ({
    ...task,
    locationLinks: [...task.locationLinks],
    linkedCollectionIds: [...task.linkedCollectionIds],
  }));

const parseStoredTasks = (): TaskItem[] | null => {
  if (!canUseBrowserStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(TASK_STORE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return normalizeTaskStore(
      parsed.filter((item): item is TaskItem => item && typeof item.id === 'string' && typeof item.type === 'string'),
    );
  } catch {
    return null;
  }
};

let taskStore: TaskItem[] | null = null;

type ClassSubmissionTaskInput = {
  id?: string;
  title: string;
  dueDate: string | null;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
};

const getFallbackTaskSeed = (): TaskItem[] => {
  if (isDemoAuthMode()) {
    return getDemoTasks();
  }

  return officialDocumentDrafts;
};

const getNowIsoString = (): string => new Date().toISOString();

export const createTaskId = (): string =>
  `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const cloneTask = (task: TaskItem): TaskItem => ({
  ...task,
  locationLinks: [...task.locationLinks],
  linkedCollectionIds: [...task.linkedCollectionIds],
});

export const getTaskStore = (): TaskItem[] => {
  if (taskStore !== null) {
    return normalizeTaskStore(taskStore);
  }

  const stored = parseStoredTasks();
  if (stored !== null) {
    taskStore = stored;
    return normalizeTaskStore(stored);
  }

  if (isDemoAuthMode()) {
    taskStore = getDemoTasks().map((task) => ({ ...task, userId: DEMO_USER_ID }));
    return normalizeTaskStore(taskStore);
  }

  taskStore = getFallbackTaskSeed().map((task) => ({
    ...task,
    userId: isDemoAuthMode() ? DEMO_USER_ID : task.userId,
  }));
  return normalizeTaskStore(taskStore);
};

export const saveTaskStore = (tasks: TaskItem[]): TaskItem[] => {
  const next = normalizeTaskStore(tasks);
  taskStore = next;

  if (canUseBrowserStorage()) {
    window.localStorage.setItem(TASK_STORE_KEY, JSON.stringify(next));
  }

  return normalizeTaskStore(next);
};

export const upsertTaskInStore = (task: TaskItem): TaskItem[] => {
  const current = getTaskStore();
  const next = current.some((item) => item.id === task.id)
    ? current.map((item) => (item.id === task.id ? cloneTask(task) : item))
    : [...current, cloneTask(task)];
  return saveTaskStore(next);
};

export const reassignCollectionOfficialTask = (params: {
  tasks: TaskItem[];
  collectionId: string;
  currentOfficialTaskId: string | null;
  nextOfficialTaskId: string | null;
}): TaskItem[] => {
  const { tasks, collectionId, currentOfficialTaskId, nextOfficialTaskId } = params;

  if (currentOfficialTaskId === nextOfficialTaskId) {
    return tasks;
  }

  let next = tasks;
  if (currentOfficialTaskId) {
    next = unlinkCollectionFromTaskList(next, currentOfficialTaskId, collectionId);
  }
  if (nextOfficialTaskId) {
    next = linkCollectionToTaskList(next, nextOfficialTaskId, collectionId);
  }
  return next;
};

export const createClassSubmissionTask = ({
  id,
  title,
  dueDate,
  userId = isDemoAuthMode() ? DEMO_USER_ID : 'user-demo',
  createdAt,
  updatedAt,
}: ClassSubmissionTaskInput): TaskItem => {
  const now = getNowIsoString();

  return {
    id: id ?? createTaskId(),
    userId,
    type: 'CLASS_SUBMISSION',
    calendarCategory: 'CLASS',
    title,
    dueDate,
    status: 'RECEIVED',
    memo: '',
    sourceMemo: '',
    submissionTarget: '학급',
    locationLinks: [],
    linkedCollectionIds: [],
    createdAt: createdAt ?? now,
    updatedAt: updatedAt ?? now,
  };
};

export const linkCollectionToTask = (task: TaskItem, collectionId: string): TaskItem => {
  if (task.linkedCollectionIds.includes(collectionId)) {
    return task;
  }

  return {
    ...task,
    linkedCollectionIds: [...task.linkedCollectionIds, collectionId],
    updatedAt: getNowIsoString(),
  };
};

export const linkCollectionToTaskList = (
  tasks: TaskItem[],
  taskId: string,
  collectionId: string,
): TaskItem[] => {
  return tasks.map((task) => (task.id === taskId ? linkCollectionToTask(task, collectionId) : task));
};

export const unlinkCollectionFromTask = (task: TaskItem, collectionId: string): TaskItem => {
  const nextCollectionIds = task.linkedCollectionIds.filter((id) => id !== collectionId);
  if (nextCollectionIds.length === task.linkedCollectionIds.length) {
    return task;
  }

  return {
    ...task,
    linkedCollectionIds: nextCollectionIds,
    updatedAt: getNowIsoString(),
  };
};

export const unlinkCollectionFromTaskList = (
  tasks: TaskItem[],
  taskId: string,
  collectionId: string,
): TaskItem[] => {
  return tasks.map((task) => (task.id === taskId ? unlinkCollectionFromTask(task, collectionId) : task));
};

export const resolveOfficialDocumentDrafts = (): TaskItem[] => {
  return getTaskStore();
};

export const createOfficialDocumentDraft = (
  overrides: OfficialDocumentDraftOverrides = {},
): TaskItem => {
  const now = getNowIsoString();

  return {
    id: overrides.id ?? createTaskId(),
    userId: overrides.userId ?? (isDemoAuthMode() ? DEMO_USER_ID : 'user-demo'),
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'SCHOOL',
    title: '',
    dueDate: null,
    status: 'RECEIVED',
    memo: '',
    sourceMemo: '',
    submissionTarget: '',
    locationLinks: [],
    linkedCollectionIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const updateOfficialDocumentDraft = (
  task: TaskItem,
  patch: OfficialDocumentDraftOverrides,
): TaskItem => {
  return {
    ...task,
    ...patch,
    updatedAt: getNowIsoString(),
  };
};

export const setOfficialDocumentStatus = (
  task: TaskItem,
  status: TaskItem['status'],
): TaskItem => {
  if (task.status === status) {
    return task;
  }

  return updateOfficialDocumentDraft(task, { status });
};

export const createOfficialDocumentLocationLink = ({
  type,
  title,
  value,
  memo,
}: {
  type: LocationType;
  title: string;
  value: string;
  memo: string;
}): TaskItem['locationLinks'][number] => ({
  id: `loc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  type,
  title,
  value,
  memo,
});

export const officialDocumentDrafts: TaskItem[] = [
  {
    id: 'task-today-due',
    userId: 'user-demo',
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'SCHOOL',
    title: '오늘 처리할 공문',
    dueDate: '2026-05-04',
    status: 'RECEIVED',
    memo: '',
    sourceMemo: '',
    submissionTarget: '학부모',
    locationLinks: [
      {
        id: 'loc-today-url',
        type: 'URL',
        title: '행정 포털',
        value: 'https://example.com/today',
        memo: '처리 진행용 공문 링크',
      },
    ],
    linkedCollectionIds: [],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-04T07:20:00.000Z',
  },
  {
    id: 'task-overdue',
    userId: 'user-demo',
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'SCHOOL',
    title: '마감 임박 공문',
    dueDate: '2026-05-03',
    status: 'IN_PROGRESS',
    memo: '',
    sourceMemo: '',
    submissionTarget: '학교',
    locationLinks: [
      {
        id: 'loc-overdue',
        type: 'PORTAL_DOC_NUMBER',
        title: '문서번호',
        value: 'DOC-2026-042',
        memo: '제출 채널 참고',
      },
    ],
    linkedCollectionIds: [],
    createdAt: '2026-05-01T08:30:00.000Z',
    updatedAt: '2026-05-03T11:30:00.000Z',
  },
  {
    id: 'task-demo-official',
    userId: 'user-demo',
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'SCHOOL',
    title: '임시 공문',
    dueDate: '2026-05-08',
    status: 'WAITING_SUBMISSION',
    memo: '담당자 메모 샘플',
    sourceMemo: '내 처리 메모 샘플',
    submissionTarget: '행정실',
    locationLinks: [],
    linkedCollectionIds: [],
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-04T07:00:00.000Z',
  },
];

export const resolveOfficialDocumentDraft = (taskId: string | null | undefined): TaskItem => {
  const normalizedTaskId = taskId?.trim();
  const taskBase = isDemoAuthMode() ? getDemoTasks() : officialDocumentDrafts;

  if (normalizedTaskId) {
    const matched = taskBase.find((task) => task.id === normalizedTaskId);
    if (matched) {
      return cloneTask(matched);
    }
  }

  return createOfficialDocumentDraft({
    id: normalizedTaskId ?? createTaskId(),
    title: normalizedTaskId ? `새 공문 (${normalizedTaskId})` : '새 공문 초안',
  });
};

const taskSortWeight = (status: TaskItem['status']): number => {
  if (status === 'ARCHIVED') {
    return 2;
  }

  if (status === 'DONE') {
    return 1;
  }

  return 0;
};

const hasValidDueDate = (value: string | null): boolean => value !== null && isLocalDate(value);

const compareTaskDueDate = (left: TaskItem, right: TaskItem): number | null => {
  if (!hasValidDueDate(left.dueDate) && !hasValidDueDate(right.dueDate)) {
    return 0;
  }

  if (left.dueDate && !hasValidDueDate(right.dueDate)) {
    return -1;
  }

  if (!hasValidDueDate(left.dueDate) && right.dueDate) {
    return 1;
  }

  const diff = compareLocalDate(left.dueDate!, right.dueDate!);
  if (diff === null) {
    return 0;
  }

  return diff;
};

const compareTaskUpdatedAt = (left: TaskItem, right: TaskItem): number => {
  const updatedAtDiff = right.updatedAt.localeCompare(left.updatedAt);
  if (updatedAtDiff !== 0) {
    return updatedAtDiff;
  }

  return left.id.localeCompare(right.id);
};

const compareTaskListItems = (left: TaskItem, right: TaskItem): number => {
  const leftWeight = taskSortWeight(left.status);
  const rightWeight = taskSortWeight(right.status);
  if (leftWeight !== rightWeight) {
    return leftWeight - rightWeight;
  }

  const dueDateOrder = compareTaskDueDate(left, right);
  if (dueDateOrder !== null && dueDateOrder !== 0) {
    return dueDateOrder;
  }

  return compareTaskUpdatedAt(left, right);
};

export const filterTaskList = (tasks: TaskItem[], includeArchived: boolean): TaskItem[] => {
  return includeArchived ? [...tasks] : tasks.filter((task) => task.status !== 'ARCHIVED');
};

export const sortTaskList = (tasks: TaskItem[]): TaskItem[] => {
  return [...tasks].sort(compareTaskListItems);
};

export const buildTaskList = ({ tasks, includeArchived }: BuildTaskListInput): TaskItem[] => {
  return sortTaskList(filterTaskList(tasks, includeArchived));
};
