import { getDemoClassSeeds, isDemoAuthMode } from '../firebase/seedDemoData'
import type { ParsedStudent } from './rosterService'

export type SchoolLevel = '초등학교' | '중학교' | '고등학교' | '기타'

export type ClassRecord = {
  id: string
  schoolYear: number
  schoolLevel: SchoolLevel
  grade: string
  className: string
  students: ParsedStudent[]
}

const CLASS_STORE_KEY = 'homeroom-demo-classes-v1'

const canUseBrowserStorage = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export const createClassId = (): string => `class-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

const cloneStudent = (student: ParsedStudent): ParsedStudent => ({ ...student })

export const cloneClassRecord = (classRecord: ClassRecord): ClassRecord => ({
  ...classRecord,
  students: classRecord.students.map(cloneStudent),
})

const normalizeClassStore = (records: ClassRecord[]): ClassRecord[] =>
  records
    .filter((record): record is ClassRecord => Boolean(record?.id))
    .map(cloneClassRecord)

const toDemoClasses = (): ClassRecord[] =>
  getDemoClassSeeds().map((seedClass) => ({
    id: seedClass.id,
    schoolYear: seedClass.schoolYear,
    schoolLevel: seedClass.schoolLevel,
    grade: seedClass.grade,
    className: seedClass.className,
    students: seedClass.students.map((student) => ({
      studentNumber: student.studentNumber,
      name: student.name,
      displayName: student.displayName,
    })),
  }))

const readClassStore = (): ClassRecord[] => {
  if (!canUseBrowserStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(CLASS_STORE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return normalizeClassStore(parsed)
  } catch {
    return []
  }
}

let classStore: ClassRecord[] | null = null

export const getClassStore = (): ClassRecord[] => {
  if (classStore === null) {
    classStore = readClassStore()

    if (classStore.length === 0 && isDemoAuthMode()) {
      classStore = toDemoClasses()
    }
  }

  return normalizeClassStore(classStore)
}

export const saveClassStore = (records: ClassRecord[]): ClassRecord[] => {
  const normalized = normalizeClassStore(records)
  classStore = normalized

  if (canUseBrowserStorage()) {
    window.localStorage.setItem(CLASS_STORE_KEY, JSON.stringify(normalized))
  }

  return normalizeClassStore(normalized)
}
