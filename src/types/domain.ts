export type UserRole = 'OWNER'

export type ClassRoom = {
  id: string
  userId: string
  schoolYear: number
  schoolLevel: '초등학교' | '중학교' | '고등학교' | '기타'
  grade: string
  name: string
  createdAt: string
  updatedAt: string
}

export type Student = {
  id: string
  userId: string
  classId: string
  studentNumber: number
  name: string
  displayName: string
  createdAt: string
  updatedAt: string
}

export type TaskType = 'OFFICIAL_DOCUMENT' | 'CLASS_SUBMISSION' | 'PERSONAL_DUE'
export type CalendarCategory = 'SCHOOL' | 'CLASS' | 'PERSONAL'
export type TaskStatus = 'RECEIVED' | 'IN_PROGRESS' | 'WAITING_SUBMISSION' | 'DONE' | 'ARCHIVED'
export type LocationType = 'URL' | 'PORTAL_DOC_NUMBER' | 'SCHOOL_MESSENGER' | 'LOCAL_FOLDER' | 'NOTE'

export type LocationLink = {
  id: string
  type: LocationType
  title: string
  value: string
  memo: string
}

export type TaskItem = {
  id: string
  userId: string
  type: TaskType
  calendarCategory: CalendarCategory
  title: string
  dueDate: string | null
  status: TaskStatus
  memo: string
  sourceMemo: string
  submissionTarget: string
  locationLinks: LocationLink[]
  linkedCollectionIds: string[]
  createdAt: string
  updatedAt: string
}

export type CollectionStatus = 'MISSING' | 'SUBMITTED' | 'NEEDS_REVISION' | 'NOT_APPLICABLE'

export type CollectionRow = {
  studentId: string
  status: CollectionStatus
  submittedAt: string | null
  memo: string
}

export type SubmissionCollection = {
  id: string
  userId: string
  classId: string
  officialDocumentTaskId: string | null
  taskId: string
  title: string
  dueDate: string | null
  rows: Record<string, CollectionRow>
  createdAt: string
  updatedAt: string
}

export type TemplateType = 'NOTICE' | 'COUNSELING_FORM' | 'REPORT_PHRASE' | 'SUBMISSION_REMINDER' | 'OTHER'

export type TemplateItem = {
  id: string
  userId: string
  title: string
  type: TemplateType
  body: string
  tags: string[]
  replacementKeys: string[]
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}
