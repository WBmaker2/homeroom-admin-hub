import type { SubmissionCollection, TaskItem, TemplateItem } from '../types/domain'

export const DEMO_USER_ID = 'demo-user'

export const DEMO_TASK_IDS = {
  OFFICIAL_DOCUMENT: 'task-demo-official',
  COLLECTION_TASK: 'task-demo-collection-task',
  PERSONAL_DEADLINE: 'task-demo-personal-deadline',
} as const

export const DEMO_COLLECTION_ID = 'collection-demo-2026-05'
export const DEMO_TEMPLATE_ID = 'template-demo-notice-001'
export const DEMO_CLASS_ID = 'class-demo-1'

const hasFirebaseConfig = (): boolean => {
  return [
    import.meta.env.VITE_FIREBASE_API_KEY,
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    import.meta.env.VITE_FIREBASE_APP_ID,
  ].every((value) => typeof value === 'string' && value.trim().length > 0)
}

export const isDemoAuthMode = (): boolean => {
  return (
    import.meta.env.VITE_DEMO_AUTH_USER === DEMO_USER_ID ||
    (import.meta.env.MODE !== 'test' && !hasFirebaseConfig())
  )
}

type DemoSeedStudent = {
  id: string
  studentNumber: number
  name: string
  displayName: string
}

type DemoSeedClass = {
  id: string
  schoolYear: number
  schoolLevel: '초등학교' | '중학교' | '고등학교' | '기타'
  grade: string
  className: string
  name: string
  students: DemoSeedStudent[]
}

const DEMO_CLASS: DemoSeedClass = {
  id: DEMO_CLASS_ID,
  schoolYear: 2026,
  schoolLevel: '초등학교',
  grade: '3학년',
  className: '2반',
  name: '3학년 2반',
  students: [
    {
      id: 'student-demo-01',
      studentNumber: 1,
      name: '김가온',
      displayName: '가온',
    },
    {
      id: 'student-demo-02',
      studentNumber: 2,
      name: '이별',
      displayName: '별이',
    },
    {
      id: 'student-demo-03',
      studentNumber: 3,
      name: '박준',
      displayName: '준',
    },
  ],
}

const DEMO_DRAFT_TASKS: TaskItem[] = [
  {
    id: DEMO_TASK_IDS.OFFICIAL_DOCUMENT,
    userId: DEMO_USER_ID,
    type: 'OFFICIAL_DOCUMENT',
    calendarCategory: 'SCHOOL',
    title: '5월 공문 제출 확인',
    dueDate: '2026-05-04',
    status: 'RECEIVED',
    memo: '담당: 행정업무',
    sourceMemo: '세션 로그에서 추적',
    submissionTarget: '교육지원청',
    locationLinks: [
      {
        id: 'loc-demo-official-1',
        type: 'URL',
        title: '공문 원문',
        value: 'https://example.com/demo-official',
        memo: '데모 라우팅용 링크',
      },
    ],
    linkedCollectionIds: [DEMO_COLLECTION_ID],
    createdAt: '2026-05-01T08:10:00.000Z',
    updatedAt: '2026-05-03T10:15:00.000Z',
  },
  {
    id: DEMO_TASK_IDS.COLLECTION_TASK,
    userId: DEMO_USER_ID,
    type: 'CLASS_SUBMISSION',
    calendarCategory: 'CLASS',
    title: '수합물 제출물 수합',
    dueDate: '2026-05-06',
    status: 'WAITING_SUBMISSION',
    memo: '수합판과 함께 업데이트',
    sourceMemo: '데모 수합판 과제',
    submissionTarget: '학생',
    locationLinks: [],
    linkedCollectionIds: [DEMO_COLLECTION_ID],
    createdAt: '2026-05-01T08:20:00.000Z',
    updatedAt: '2026-05-03T10:18:00.000Z',
  },
  {
    id: DEMO_TASK_IDS.PERSONAL_DEADLINE,
    userId: DEMO_USER_ID,
    type: 'PERSONAL_DUE',
    calendarCategory: 'PERSONAL',
    title: '개인 점검 마감',
    dueDate: '2026-05-10',
    status: 'IN_PROGRESS',
    memo: '개인 체크용 더미 데이터',
    sourceMemo: '데모 개인 마감',
    submissionTarget: '',
    locationLinks: [],
    linkedCollectionIds: [],
    createdAt: '2026-05-02T09:00:00.000Z',
    updatedAt: '2026-05-03T09:00:00.000Z',
  },
]

const DEMO_TEMPLATE: TemplateItem = {
  id: DEMO_TEMPLATE_ID,
  userId: DEMO_USER_ID,
  title: '학급 제출물 안내',
  type: 'NOTICE',
  body: '{학급}에 제출물 {제출물명}을(를) 안내합니다. 마감일: {마감일}',
  tags: ['공지', '반'],
  replacementKeys: ['학급', '제출물명', '마감일'],
  lastUsedAt: '2026-05-02T08:30:00.000Z',
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-05-03T09:20:00.000Z',
}

const DEMO_COLLECTION: SubmissionCollection = {
  id: DEMO_COLLECTION_ID,
  userId: DEMO_USER_ID,
  classId: DEMO_CLASS_ID,
  officialDocumentTaskId: DEMO_TASK_IDS.OFFICIAL_DOCUMENT,
  taskId: DEMO_TASK_IDS.COLLECTION_TASK,
  title: '5월 제출물 수합판',
  dueDate: '2026-05-06',
  rows: {
    'student-demo-01': {
      studentId: 'student-demo-01',
      status: 'MISSING',
      submittedAt: null,
      memo: '',
    },
    'student-demo-02': {
      studentId: 'student-demo-02',
      status: 'SUBMITTED',
      submittedAt: '2026-05-03T12:00:00.000Z',
      memo: '제출 완료',
    },
    'student-demo-03': {
      studentId: 'student-demo-03',
      status: 'NEEDS_REVISION',
      submittedAt: null,
      memo: '제출 파일 형식 확인 필요',
    },
  },
  createdAt: '2026-05-01T08:30:00.000Z',
  updatedAt: '2026-05-03T12:20:00.000Z',
}

const cloneTask = (task: TaskItem): TaskItem => ({
  ...task,
  locationLinks: [...task.locationLinks],
  linkedCollectionIds: [...task.linkedCollectionIds],
})

const cloneTemplate = (template: TemplateItem): TemplateItem => ({
  ...template,
  tags: [...template.tags],
  replacementKeys: [...template.replacementKeys],
})

const cloneStudent = (student: DemoSeedStudent): DemoSeedStudent => ({ ...student })

const cloneClass = (seedClass: DemoSeedClass): DemoSeedClass => ({
  ...seedClass,
  students: seedClass.students.map(cloneStudent),
})

export const getDemoClassSeed = (): DemoSeedClass => cloneClass(DEMO_CLASS)

export const getDemoClassSeeds = (): DemoSeedClass[] => [getDemoClassSeed()]

export const getDemoTasks = (): TaskItem[] => {
  return DEMO_DRAFT_TASKS.map(cloneTask)
}

export const getDemoOfficialDocument = (): TaskItem => {
  return cloneTask(DEMO_DRAFT_TASKS.find((task) => task.id === DEMO_TASK_IDS.OFFICIAL_DOCUMENT) as TaskItem)
}

export const getDemoPersonalDeadline = (): TaskItem => {
  return cloneTask(DEMO_DRAFT_TASKS.find((task) => task.id === DEMO_TASK_IDS.PERSONAL_DEADLINE) as TaskItem)
}

export const getDemoCollection = (): SubmissionCollection => {
  return {
    ...DEMO_COLLECTION,
    rows: { ...DEMO_COLLECTION.rows },
  }
}

export const getDemoCollectionWithStudents = (): {
  collection: SubmissionCollection
  students: DemoSeedStudent[]
} => {
  return {
    collection: getDemoCollection(),
    students: getDemoClassSeed().students,
  }
}

export const getDemoTemplates = (): TemplateItem[] => [cloneTemplate(DEMO_TEMPLATE)]

export const getDemoInboxSeedTasks = (): TaskItem[] => {
  return getDemoTasks().filter((task) => task.type === 'OFFICIAL_DOCUMENT' || task.type === 'PERSONAL_DUE')
}

export const getDemoInboxSeedCollections = (): SubmissionCollection[] => {
  const collection = getDemoCollection()
  return [collection]
}
