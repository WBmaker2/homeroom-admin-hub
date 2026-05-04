import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { buildManualStudent, sortRosterStudents } from '../classes/rosterService'
import {
  createClassId,
  getClassStore,
  saveClassStore,
  type ClassRecord,
  type SchoolLevel,
} from '../classes/classService'
import { useUserRecords } from '../firebase/useUserRecords'
import {
  createStudentFromInput,
  createSubmissionCollectionWithTask,
  deleteCollectionPlan,
  COLLECTION_DELETE_WARNING,
  applyCollectionDeletionPlan,
  getStoredCollections,
  saveCollectionStore,
  isCollectionCreationBlocked,
  summarizeCollection,
  type CollectionWithStudents,
} from './collectionService'
import {
  linkCollectionToTaskList,
  saveTaskStore,
  resolveOfficialDocumentDrafts,
} from '../tasks/taskService'
import type { TaskItem } from '../types/domain'
import './CollectionsPage.css'

type ClassFormState = {
  schoolYear: string
  schoolLevel: SchoolLevel
  grade: string
  className: string
}

type StudentFormState = {
  studentNumber: string
  name: string
  displayName: string
}

type CollectionFormState = {
  classId: string
  title: string
  dueDate: string
  officialDocumentTaskId: string
}

const schoolLevels: SchoolLevel[] = ['초등학교', '중학교', '고등학교', '기타']

const createInitialClassForm = (): ClassFormState => ({
  schoolYear: String(new Date().getFullYear()),
  schoolLevel: '초등학교',
  grade: '',
  className: '',
})

const initialStudentForm: StudentFormState = {
  studentNumber: '',
  name: '',
  displayName: '',
}

const initialCollectionForm = (classId = ''): CollectionFormState => ({
  classId,
  title: '',
  dueDate: '',
  officialDocumentTaskId: '',
})

const normalize = (value: string): string => value.trim()

const toPercent = (value: number): string => `${Math.round(value * 100)}%`

const upsertCollectionRecord = (
  current: CollectionWithStudents[],
  record: CollectionWithStudents,
): CollectionWithStudents[] => {
  const index = current.findIndex((entry) => entry.collection.id === record.collection.id)
  if (index === -1) {
    return [...current, record]
  }

  return current.map((entry) =>
    entry.collection.id === record.collection.id ? record : entry,
  )
}

export function CollectionsPage() {
  const [searchParams] = useSearchParams()
  const intent = searchParams.get('intent')
  const {
    error: classesError,
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
    error: collectionsError,
    loading: collectionsLoading,
    records: collections,
    setRecords: setCollections,
  } = useUserRecords<CollectionWithStudents>({
    collectionName: 'collections',
    getInitialRecords: getStoredCollections,
    onSaveLocal: saveCollectionStore,
  })
  const {
    error: tasksError,
    loading: tasksLoading,
    records: tasks,
    setRecords: setTasks,
  } = useUserRecords<TaskItem>({
    collectionName: 'tasks',
    getInitialRecords: resolveOfficialDocumentDrafts,
    onSaveLocal: saveTaskStore,
  })
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classForm, setClassForm] = useState<ClassFormState>(createInitialClassForm())
  const [classMessage, setClassMessage] = useState('')
  const [studentForm, setStudentForm] = useState<StudentFormState>(initialStudentForm)
  const [studentMessage, setStudentMessage] = useState('')
  const [collectionForm, setCollectionForm] = useState<CollectionFormState>(initialCollectionForm())
  const [collectionMessage, setCollectionMessage] = useState('')
  const loading = classesLoading || collectionsLoading || tasksLoading
  const loadError = classesError || collectionsError || tasksError

  const activeClass = useMemo(
    () => classes.find((classRecord) => classRecord.id === selectedClassId) ?? classes[0],
    [classes, selectedClassId],
  )
  const activeRoster = useMemo(() => sortRosterStudents(activeClass?.students ?? []), [activeClass])
  const officialDocumentTasks = useMemo(
    () => tasks.filter((task) => task.type === 'OFFICIAL_DOCUMENT'),
    [tasks],
  )

  const intentTitle =
    intent === 'create' ? '수합판 생성 준비' : null

  const isCollectionCreateBlocked = activeClass ? isCollectionCreationBlocked(activeClass.students) : null

  const handleCreateClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setClassMessage('')

    const schoolYear = Number(normalize(classForm.schoolYear))
    if (!Number.isInteger(schoolYear) || schoolYear < 2000 || schoolYear > 2100) {
      setClassMessage('학년도는 2000~2100 사이의 숫자로 입력해 주세요.')
      return
    }

    const grade = normalize(classForm.grade)
    const className = normalize(classForm.className)
    if (!grade || !className) {
      setClassMessage('학년과 반 이름은 모두 입력해 주세요.')
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
    setCollectionForm((current) => ({ ...current, classId: nextClass.id }))
    setClassMessage('반이 생성되었습니다. 학생을 추가해 수합판을 만들 수 있습니다.')
    setClassForm((current) => ({
      ...current,
      grade: '',
      className: '',
    }))
  }

  const handleAddStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStudentMessage('')

    if (!activeClass) {
      setStudentMessage('반이 선택되지 않았습니다.')
      return
    }

    const validation = buildManualStudent(studentForm, activeClass.students)
    if (!validation.student) {
      setStudentMessage(validation.errorMessage)
      return
    }

    const nextStudent = validation.student
    setClasses((current) =>
      current.map((classRecord) =>
        classRecord.id === activeClass.id
          ? {
              ...classRecord,
              students: sortRosterStudents([...classRecord.students, nextStudent]),
            }
          : classRecord,
      ),
    )

    setStudentForm(initialStudentForm)
    setStudentMessage(`${nextStudent.name} 학생이 추가되었습니다.`)
  }

  const handleCreateCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCollectionMessage('')

    const targetClassId = collectionForm.classId || activeClass?.id || ''
    const targetClass = classes.find((item) => item.id === targetClassId)

    if (!targetClass) {
      setCollectionMessage('반을 먼저 선택해 주세요.')
      return
    }

    const blockedMessage = isCollectionCreationBlocked(targetClass.students)
    if (blockedMessage) {
      setCollectionMessage(blockedMessage)
      return
    }

    const title = normalize(collectionForm.title)
    if (!title) {
      setCollectionMessage('수합판 제목을 입력해 주세요.')
      return
    }

    const students = targetClass.students.map((student) =>
      createStudentFromInput(student.studentNumber, student.name, student.displayName),
    )
    const { collection, task } = createSubmissionCollectionWithTask({
      classId: targetClass.id,
      title,
      dueDate: collectionForm.dueDate || null,
      students,
      officialDocumentTaskId: collectionForm.officialDocumentTaskId || null,
    })

    setTasks((current) => {
      const withLink =
        collectionForm.officialDocumentTaskId
          ? linkCollectionToTaskList(current, collectionForm.officialDocumentTaskId, collection.id)
          : current
      const merged = withLink.find((item) => item.id === task.id)
        ? withLink
        : [...withLink, task]
      return merged
    })

    setCollections((current) =>
      upsertCollectionRecord(current, {
        id: collection.id,
        collection,
        students,
      }),
    )
    setCollectionMessage('수합판이 생성되었고 과제 항목도 함께 생성했습니다.')
    setCollectionForm((current) => ({ ...current, title: '', dueDate: '', officialDocumentTaskId: '' }))
  }

  const handleDeleteCollection = (collectionId: string) => {
    const target = collections.find((entry) => entry.collection.id === collectionId)
    if (!target) {
      return
    }

    if (!window.confirm(COLLECTION_DELETE_WARNING)) {
      return
    }

    const plan = deleteCollectionPlan(target.collection)
    const result = applyCollectionDeletionPlan({
      collections,
      plan,
      tasks,
    })
    setTasks(result.tasks)
    setCollections(result.collections)
    setCollectionMessage('수합판을 삭제했습니다.')
  }

  const resolveClassName = (classId: string): string => {
    const found = classes.find((item) => item.id === classId)
    if (!found) {
      return classId
    }

    return `${found.schoolYear} ${found.schoolLevel} ${found.grade} ${found.className}`
  }

  return (
    <main className="collections-page">
      <section className="collections-section">
        <header className="collections-section-header">
          <h1>학급 수합판</h1>
          <p>
            반 생성부터 명부 등록, 수합판 생성까지 운영합니다.
            {usingFirestore ? ' 현재 수합판 데이터는 Firestore에 저장됩니다.' : ' 현재는 로컬 데모 상태입니다.'}
          </p>
        </header>

        {loading ? (
          <p className="collections-inline-alert" role="status" aria-live="polite">
            학급/수합판 데이터를 불러오는 중입니다.
          </p>
        ) : null}
        {loadError ? (
          <p className="collections-inline-alert" role="alert">
            저장소 데이터를 불러오지 못했습니다: {loadError}
          </p>
        ) : null}

        {intentTitle ? (
          <p className="collections-inline-alert" role="status" aria-live="polite">
            {intentTitle}
          </p>
        ) : null}

        <form className="collections-form" onSubmit={handleCreateClass}>
          <h2>반 생성</h2>
          <div className="collections-form-row">
            <label className="collections-field">
              <span>학년도</span>
              <input
                type="text"
                value={classForm.schoolYear}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setClassForm((current) => ({ ...current, schoolYear: normalize(event.currentTarget.value) }))
                }
                required
              />
            </label>
            <label className="collections-field">
              <span>학교급</span>
              <select
                value={classForm.schoolLevel}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setClassForm((current) => ({
                    ...current,
                    schoolLevel: event.currentTarget.value as SchoolLevel,
                  }))
                }
              >
                {schoolLevels.map((schoolLevel) => (
                  <option key={schoolLevel} value={schoolLevel}>
                    {schoolLevel}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="collections-form-row">
            <label className="collections-field">
              <span>학년</span>
              <input
                type="text"
                value={classForm.grade}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setClassForm((current) => ({ ...current, grade: event.currentTarget.value }))
                }
                placeholder="예: 3학년"
                required
              />
            </label>
            <label className="collections-field">
              <span>반 이름</span>
              <input
                type="text"
                value={classForm.className}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setClassForm((current) => ({ ...current, className: event.currentTarget.value }))
                }
                placeholder="예: 3-2"
                required
              />
            </label>
            <button type="submit">반 생성</button>
          </div>
          {classMessage ? <p className="collections-message" role="status" aria-live="polite">{classMessage}</p> : null}
        </form>
      </section>

      <section className="collections-section">
        <header className="collections-section-header">
          <h2>명부 등록</h2>
          <label className="collections-field">
            <span>반 선택</span>
            <select
              value={activeClass?.id ?? ''}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setSelectedClassId(event.currentTarget.value)
                setCollectionForm((current) => ({ ...current, classId: event.currentTarget.value }))
              }}
            >
              {classes.length === 0 ? <option value="">반을 먼저 생성해 주세요</option> : null}
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {`${item.schoolYear} ${item.schoolLevel} ${item.grade} ${item.className}`}
                </option>
              ))}
            </select>
          </label>
        </header>

        <form className="collections-form" onSubmit={handleAddStudent}>
          <h3>학생 수동 등록</h3>
          <div className="collections-form-row">
            <label className="collections-field">
              <span>번호</span>
              <input
                type="text"
                value={studentForm.studentNumber}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setStudentForm((current) => ({
                    ...current,
                    studentNumber: event.currentTarget.value,
                  }))
                }
                placeholder="예: 1"
              />
            </label>
            <label className="collections-field">
              <span>이름</span>
              <input
                type="text"
                value={studentForm.name}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setStudentForm((current) => ({ ...current, name: event.currentTarget.value }))
                }
                placeholder="예: 김가온"
              />
            </label>
            <label className="collections-field">
              <span>표시 이름</span>
              <input
                type="text"
                value={studentForm.displayName}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setStudentForm((current) => ({ ...current, displayName: event.currentTarget.value }))
                }
                placeholder="입력 안 하면 이름 사용"
              />
            </label>
            <button type="submit">학생 추가</button>
          </div>
          {studentMessage ? <p className="collections-message" role="status" aria-live="polite">{studentMessage}</p> : null}
        </form>

        <div className="collections-table-wrap">
          <h3>현재 반 학생 목록 ({activeRoster.length}명)</h3>
          <table className="collections-table">
            <thead>
              <tr>
                <th scope="col">번호</th>
                <th scope="col">이름</th>
                <th scope="col">표시 이름</th>
              </tr>
            </thead>
            <tbody>
              {activeRoster.length === 0 ? (
                <tr>
                  <td className="collections-empty" colSpan={3}>
                    명부가 비어 있습니다. 수합판 생성 전 학생을 추가해 주세요.
                  </td>
                </tr>
              ) : (
                activeRoster.map((student) => (
                  <tr key={`${activeClass?.id}-${student.studentNumber}-${student.name}`}>
                    <td>{student.studentNumber}</td>
                    <td>{student.name}</td>
                    <td>{student.displayName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="collections-section">
        <h2>수합판 생성</h2>
        <form className="collections-form" onSubmit={handleCreateCollection}>
          <label className="collections-field">
            <span>반</span>
            <select
              value={collectionForm.classId || activeClass?.id || ''}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setCollectionForm((current) => ({ ...current, classId: event.currentTarget.value }))
              }
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {`${item.schoolYear} ${item.schoolLevel} ${item.grade} ${item.className}`}
                </option>
              ))}
            </select>
          </label>
          <label className="collections-field">
            <span>수합판 제목</span>
            <input
              type="text"
              value={collectionForm.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setCollectionForm((current) => ({ ...current, title: event.currentTarget.value }))
              }
              placeholder="예: 5월 수합판"
            />
          </label>
          <label className="collections-field">
            <span>마감일</span>
            <input
              type="date"
              value={collectionForm.dueDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setCollectionForm((current) => ({ ...current, dueDate: event.currentTarget.value }))
              }
            />
          </label>
          <label className="collections-field">
            <span>연결 공문</span>
            <select
              value={collectionForm.officialDocumentTaskId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setCollectionForm((current) => ({ ...current, officialDocumentTaskId: event.currentTarget.value }))
              }
            >
              <option value="">연결하지 않음</option>
              {officialDocumentTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
          >
            수합판 생성
          </button>
          {collectionMessage ? (
            <p className="collections-message" role="status" aria-live="polite">
              {collectionMessage}
            </p>
          ) : isCollectionCreateBlocked ? (
            <p className="collections-message" role="status" aria-live="polite">
              {isCollectionCreateBlocked}
            </p>
          ) : null}
        </form>
      </section>

      <section className="collections-section">
        <h2>수합판 목록</h2>
        <p>생성된 수합판은 반별 상태 요약을 확인하고 상세로 이동해 학생별 제출 상태를 수정합니다.</p>
        {collections.length === 0 ? (
          <p className="collections-empty">생성된 수합판이 없습니다.</p>
        ) : (
          <div className="collections-table-wrap">
            <table className="collections-table collections-wide-table">
            <thead>
              <tr>
                <th scope="col">수합판</th>
                <th scope="col">반</th>
                <th scope="col">완료율</th>
                <th scope="col">미제출</th>
                <th scope="col">보완 필요</th>
                <th scope="col">해당 없음</th>
                <th scope="col">연결 공문</th>
                <th scope="col">작업 연결</th>
                <th scope="col">삭제</th>
              </tr>
            </thead>
              <tbody>
                {collections.map((item) => {
                  const summary = summarizeCollection(item.collection)
                  return (
                    <tr key={item.collection.id}>
                      <td>{item.collection.title}</td>
                      <td>{resolveClassName(item.collection.classId)}</td>
                      <td>{toPercent(summary.completionRate)}</td>
                      <td>{summary.missingCount}</td>
                      <td>{summary.needsRevisionCount}</td>
                      <td>{summary.notApplicableCount}</td>
                      <td>
                        {officialDocumentTasks.find((task) => task.id === item.collection.officialDocumentTaskId)?.title ??
                          '연결 없음'}
                      </td>
                      <td>
                        <Link
                          to={`/app/collections/${item.collection.id}`}
                          state={{
                            collection: item.collection,
                            students: item.students,
                            classes,
                            tasks,
                          }}
                          className="collections-table-link"
                        >
                          상세 보기
                        </Link>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="collections-table-action"
                          onClick={() => handleDeleteCollection(item.collection.id)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

export default CollectionsPage
