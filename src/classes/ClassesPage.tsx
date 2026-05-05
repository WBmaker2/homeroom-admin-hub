import { type FormEvent, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { RosterImportPanel } from './RosterImportPanel'
import {
  CLASS_DELETE_WARNING,
  applyCollectionDeletionPlan,
  deleteClassPlan,
  getStoredCollections,
  saveCollectionStore,
  type CollectionWithStudents,
} from '../collections/collectionService'
import {
  createClassId,
  getClassStore,
  saveClassStore,
  type ClassRecord,
  type SchoolLevel,
} from './classService'
import {
  buildManualStudent,
  sortRosterStudents,
  type ManualStudentInput,
  type ParsedStudent,
} from './rosterService'
import { getTaskStore, saveTaskStore } from '../tasks/taskService'
import { useUserRecords } from '../firebase/useUserRecords'
import type { TaskItem } from '../types/domain'
import './ClassesPage.css'

type ClassFormState = {
  schoolYear: string
  schoolLevel: SchoolLevel
  grade: string
  className: string
}

type FeedbackState = {
  text: string
  kind: 'status' | 'alert'
}

const schoolLevels: SchoolLevel[] = ['초등학교', '중학교', '고등학교', '기타']

const initialClassForm = (): ClassFormState => ({
  schoolYear: String(new Date().getFullYear()),
  schoolLevel: '초등학교',
  grade: '',
  className: '',
})

const initialStudentForm: ManualStudentInput = {
  studentNumber: '',
  name: '',
  displayName: '',
}

const normalize = (value: string): string => value.trim()

export function ClassesPage() {
  const { user } = useAuth()
  const {
    error: classLoadError,
    loading: classesLoading,
    records: classes,
    setRecords: setClasses,
    usingFirestore,
  } = useUserRecords<ClassRecord>({
    collectionName: 'classes',
    getInitialRecords: getClassStore,
    onSaveLocal: saveClassStore,
  })
  const {
    records: collections,
    setRecords: setCollections,
  } = useUserRecords<CollectionWithStudents>({
    collectionName: 'collections',
    getInitialRecords: getStoredCollections,
    onSaveLocal: saveCollectionStore,
  })
  const {
    records: tasks,
    setRecords: setTasks,
  } = useUserRecords<TaskItem>({
    collectionName: 'tasks',
    getInitialRecords: getTaskStore,
    onSaveLocal: saveTaskStore,
  })
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classForm, setClassForm] = useState<ClassFormState>(initialClassForm())
  const [classFormMessage, setClassFormMessage] = useState('')
  const [classActionMessage, setClassActionMessage] = useState<FeedbackState>({
    text: '',
    kind: 'status',
  })
  const [studentForm, setStudentForm] = useState<ManualStudentInput>(initialStudentForm)
  const [studentFormMessage, setStudentFormMessage] = useState<FeedbackState>({
    text: '',
    kind: 'status',
  })

  const selectedClass = useMemo(
    () => classes.find((classRecord) => classRecord.id === selectedClassId),
    [classes, selectedClassId],
  )
  const activeClass = selectedClass ?? classes[0]

  const sortedStudents = useMemo(
    () => sortRosterStudents(activeClass?.students ?? []),
    [activeClass?.students],
  )

  const handleClassFormChange = (
    key: keyof Omit<ClassFormState, 'schoolLevel'> | 'schoolLevel',
    value: string,
  ) => {
    setClassForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleCreateClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setClassFormMessage('')

    const schoolYear = Number(normalize(classForm.schoolYear))
    if (!Number.isInteger(schoolYear) || schoolYear < 2000 || schoolYear > 2100) {
      setClassFormMessage('학년도는 2000~2100 사이의 숫자로 입력해 주세요.')
      return
    }

    const grade = normalize(classForm.grade)
    const className = normalize(classForm.className)
    if (!grade || !className) {
      setClassFormMessage('학년과 반 이름은 모두 입력해 주세요.')
      return
    }

    const nextClass: ClassRecord = {
      id: createClassId(),
      schoolYear,
      schoolLevel: classForm.schoolLevel,
      grade,
      className,
      students: [],
    }

    setClasses((current) => [...current, nextClass])
    setSelectedClassId(nextClass.id)
    setClassForm({
      ...classForm,
      grade: '',
      className: '',
    })
    setClassFormMessage(
      usingFirestore
        ? `반이 저장되었습니다. (users/${user?.uid ?? 'anonymous'}/classes)`
        : `반이 생성되었습니다. (현재는 로컬 임시 저장: users/${user?.uid ?? 'anonymous'}/classes)`,
    )
  }

  const handleStudentAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStudentFormMessage({ text: '', kind: 'status' })

    if (!activeClass) {
      setStudentFormMessage({ text: '반이 선택되지 않았습니다.', kind: 'alert' })
      return
    }

    const validation = buildManualStudent(studentForm, activeClass.students)
    if (!validation.student) {
      setStudentFormMessage({ text: validation.errorMessage, kind: 'alert' })
      return
    }

    const validatedStudent = validation.student

    setClasses((current) =>
      current.map((classRecord) =>
        classRecord.id === activeClass.id
          ? {
              ...classRecord,
              students: sortRosterStudents([
                ...classRecord.students,
                {
                  ...validatedStudent,
                  studentNumber: validatedStudent.studentNumber,
                  name: normalize(validatedStudent.name),
                  displayName:
                    normalize(validatedStudent.displayName) || normalize(validatedStudent.name),
                },
              ]),
            }
          : classRecord,
      ),
    )

    setStudentForm(initialStudentForm)
    setStudentFormMessage({ text: `${validatedStudent.name} 학생이 등록되었습니다.`, kind: 'status' })
  }

  const handleImportStudents = (students: ParsedStudent[]) => {
    if (!activeClass) {
      return
    }

    setClasses((current) =>
      current.map((classRecord) =>
        classRecord.id === activeClass.id
          ? {
              ...classRecord,
              students: sortRosterStudents([...classRecord.students, ...students]),
            }
          : classRecord,
      ),
    )
    setStudentFormMessage({ text: '붙여넣기 명부가 반에 반영되었습니다.', kind: 'status' })
  }

  const handleDeleteClass = () => {
    if (!activeClass) {
      return
    }

    if (!window.confirm(CLASS_DELETE_WARNING)) {
      return
    }

    const plan = deleteClassPlan(
      {
        id: activeClass.id,
        students: activeClass.students,
      },
      collections.map((record) => record.collection),
      tasks,
    )

    const result = applyCollectionDeletionPlan({
      collections,
      plan,
      tasks,
    })

    const nextClasses = classes.filter((classRecord) => classRecord.id !== activeClass.id)

    setCollections(result.collections)
    setTasks(result.tasks)
    setClasses(nextClasses)
    setSelectedClassId(nextClasses[0]?.id ?? '')
    setClassActionMessage({
      kind: 'status',
      text: `학급을 삭제했습니다. (${plan.classIdsToDelete.length}개 학급, ${plan.studentIdsToDelete.length}명 학생, ${plan.collectionIdsToDelete.length}개 수합판)`,
    })
    setClassFormMessage('')
    setStudentFormMessage({ text: '', kind: 'status' })
  }

  return (
    <main className="classes-page">
      <section className="classes-form-section">
        <header>
          <h1 className="classes-page-title">학급 명부</h1>
          <p className="classes-subtitle">
            학급 생성 후 학생 명부를 직접 입력하거나 붙여넣기로 등록합니다.
            {usingFirestore ? ' 현재 학급 명부는 Firestore에 저장됩니다.' : ' 현재는 로컬 데모 상태를 사용합니다.'}
          </p>
        </header>
        {classesLoading ? (
          <p className="classes-status" role="status" aria-live="polite">
            학급 명부를 불러오는 중입니다.
          </p>
        ) : null}
        {classLoadError ? (
          <p className="classes-status" role="alert">
            학급 명부를 불러오지 못했습니다: {classLoadError}
          </p>
        ) : null}

        <form className="classes-class-form" onSubmit={handleCreateClass}>
          <h2 className="classes-section-title">반 생성</h2>
          <label className="classes-form-field">
            <span>학년도</span>
            <input
              type="text"
              value={classForm.schoolYear}
              onChange={(event) =>
                handleClassFormChange('schoolYear', normalize(event.currentTarget.value))
              }
              placeholder="예: 2026"
              required
            />
          </label>
          <label className="classes-form-field">
            <span>학교급</span>
            <select
              value={classForm.schoolLevel}
              onChange={(event) => handleClassFormChange('schoolLevel', event.currentTarget.value)}
            >
              {schoolLevels.map((schoolLevel) => (
                <option key={schoolLevel} value={schoolLevel}>
                  {schoolLevel}
                </option>
              ))}
            </select>
          </label>
          <label className="classes-form-field">
            <span>학년</span>
            <input
              type="text"
              value={classForm.grade}
              onChange={(event) => handleClassFormChange('grade', normalize(event.currentTarget.value))}
              placeholder="예: 3학년"
              required
            />
          </label>
          <label className="classes-form-field">
            <span>반 이름</span>
            <input
              type="text"
              value={classForm.className}
              onChange={(event) => handleClassFormChange('className', normalize(event.currentTarget.value))}
              placeholder="예: 3-2"
              required
            />
          </label>
          <button type="submit" className="classes-primary-action">
            반 생성
          </button>
          {classFormMessage && (
            <p className="classes-status" role="status" aria-live="polite">
              {classFormMessage}
            </p>
          )}
        </form>
      </section>

      {classes.length === 0 ? (
        <section className="classes-empty">
          <h2 className="classes-section-title">학급 생성이 필요합니다.</h2>
          <p className="classes-empty-text">
            위에 반 생성 폼에서 반을 먼저 만들어야 학생 등록이 가능합니다.
          </p>
        </section>
      ) : (
        <section className="classes-management">
          <header className="classes-management-header">
            <div>
              <h2 className="classes-section-title">학급 관리</h2>
              <label className="classes-quick-select">
                <span>현재 반</span>
                <select
                  value={activeClass?.id ?? ''}
                  onChange={(event) => setSelectedClassId(event.currentTarget.value)}
                >
                  {classes.map((classRecord) => (
                    <option key={classRecord.id} value={classRecord.id}>
                      {`${classRecord.schoolYear} ${classRecord.schoolLevel} ${classRecord.grade} ${classRecord.className}`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="classes-delete-action"
                onClick={handleDeleteClass}
              >
                학급 삭제
              </button>
            </div>
            <p className="classes-save-note">
              저장 경로: {usingFirestore ? `users/${user?.uid ?? 'anonymous'}/classes` : '브라우저 로컬 데모 저장소'}
            </p>
            <p className="classes-warning" role={classActionMessage.kind} aria-live="polite">
              {CLASS_DELETE_WARNING}
            </p>
            {classActionMessage.text ? (
              <p className="classes-status" role={classActionMessage.kind} aria-live="polite">
                {classActionMessage.text}
              </p>
            ) : null}
          </header>

          <form className="classes-form-section" onSubmit={handleStudentAdd}>
            <h3 className="classes-section-title">학생 수동 입력</h3>
            <div className="classes-form-grid">
              <label className="classes-form-field">
                <span>번호</span>
                <input
                  type="text"
                  value={studentForm.studentNumber}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    setStudentForm((current) => ({
                      ...current,
                      studentNumber: value,
                    }))
                  }}
                  placeholder="예: 1"
                />
              </label>
              <label className="classes-form-field">
                <span>이름</span>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    setStudentForm((current) => ({ ...current, name: value }))
                  }}
                  placeholder="예: 김가온"
                />
              </label>
              <label className="classes-form-field">
                <span>표시 이름</span>
                <input
                  type="text"
                  value={studentForm.displayName}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    setStudentForm((current) => ({
                      ...current,
                      displayName: value,
                    }))
                  }}
                  placeholder="비워두면 이름과 동일"
                />
              </label>
            </div>
            <button type="submit" className="classes-primary-action">
              학생 추가
            </button>
            {studentFormMessage.text && (
              <p className="classes-status" role={studentFormMessage.kind} aria-live="polite">
                {studentFormMessage.text}
              </p>
            )}
          </form>

          <RosterImportPanel
            currentStudents={activeClass.students}
            disabled={false}
            onImport={handleImportStudents}
          />

          <section className="classes-roster-section">
            <h3 className="classes-section-title">학생 명부 (번호 정렬)</h3>
            {sortedStudents.length === 0 ? (
              <p className="classes-empty-text">아직 등록된 학생이 없습니다.</p>
            ) : (
              <div className="classes-table-wrap">
                <table className="classes-table">
                  <thead>
                    <tr>
                      <th>번호</th>
                      <th>이름</th>
                      <th>표시 이름</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((student) => (
                      <tr key={`${student.studentNumber}-${student.name}`}>
                        <td>{student.studentNumber}</td>
                        <td>{student.name}</td>
                        <td>{student.displayName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  )
}

export default ClassesPage
