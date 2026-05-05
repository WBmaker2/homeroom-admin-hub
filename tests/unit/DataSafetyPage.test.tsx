import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../../src/app/routes'
import { AppShell } from '../../src/app/AppShell'
import { DataSafetyPage } from '../../src/safety/DataSafetyPage'
import * as userRecordsModule from '../../src/firebase/useUserRecords'
import type { TaskItem, TemplateItem } from '../../src/types/domain'
import type { ClassRecord } from '../../src/classes/classService'
import type { CollectionWithStudents } from '../../src/collections/collectionService'

const signOutMock = vi.fn()
const demoUser = { uid: 'demo-user', email: 'demo@local.test' }

vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: demoUser,
    loading: false,
    signIn: vi.fn(),
    createAccount: vi.fn(),
    signOut: signOutMock,
  }),
  useOptionalAuth: () => ({
    user: demoUser,
    loading: false,
    signIn: vi.fn(),
    createAccount: vi.fn(),
    signOut: signOutMock,
  }),
}))

const makeTask = (id: string): TaskItem => ({
  id,
  userId: 'user-1',
  type: 'PERSONAL_DUE',
  calendarCategory: 'PERSONAL',
  title: `과제 ${id}`,
  dueDate: '2026-06-01',
  status: 'RECEIVED',
  memo: '',
  sourceMemo: '',
  submissionTarget: '',
  locationLinks: [],
  linkedCollectionIds: [],
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-05-01T09:00:00.000Z',
})

const makeClass = (id: string): ClassRecord => ({
  id,
  schoolYear: 2026,
  schoolLevel: '초등학교',
  grade: '3학년',
  className: '2반',
  students: [
    {
      studentNumber: 1,
      name: '김교사',
      displayName: '교사',
      id: 'student-1',
    },
  ],
})

const makeCollection = (id: string): CollectionWithStudents => ({
  id,
  collection: {
    id: `collection-${id}`,
    userId: 'user-1',
    classId: 'class-1',
    officialDocumentTaskId: null,
    taskId: 'task-import',
    title: `수합판 ${id}`,
    dueDate: null,
    rows: {
      student1: {
        studentId: 'student-1',
        status: 'MISSING',
        submittedAt: null,
        memo: '',
      },
    },
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },
  students: [
    {
      studentNumber: 1,
      name: '김교사',
      displayName: '교사',
      id: 'student-1',
    },
  ],
})

const makeTemplate = (id: string): TemplateItem => ({
  id,
  userId: 'user-1',
  title: `템플릿 ${id}`,
  type: 'NOTICE',
  body: '{학급} 안내',
  tags: ['안내'],
  replacementKeys: ['학급'],
  lastUsedAt: null,
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-05-01T09:00:00.000Z',
})

type UseUserRecordsState = ReturnType<typeof userRecordsModule.useUserRecords>

const createRecordsState = <T,>(
  records: T[],
  setRecords: ReturnType<typeof vi.fn>,
  usingFirestore = false,
  error = '',
): UseUserRecordsState => ({
  error,
  loading: false,
  records,
  setRecords,
  userId: 'user-1',
  usingFirestore,
})

describe('DataSafetyPage and route/nav visibility', () => {
  const userEventSetup = userEvent.setup

  const setupRecordsMock = () => {
    const setTasks = vi.fn()
    const setClasses = vi.fn()
    const setCollections = vi.fn()
    const setTemplates = vi.fn()

    vi.spyOn(userRecordsModule, 'useUserRecords').mockImplementation((input: { collectionName: string }) => {
      switch (input.collectionName) {
        case 'tasks':
          return createRecordsState<TaskItem>([], setTasks)
        case 'classes':
          return createRecordsState<ClassRecord>([], setClasses)
        case 'collections':
          return createRecordsState<CollectionWithStudents>([], setCollections)
        case 'templates':
          return createRecordsState<TemplateItem>([], setTemplates)
        default:
          throw new Error(`Unexpected collection name: ${input.collectionName}`)
      }
    })

    return {
      setTasks,
      setClasses,
      setCollections,
      setTemplates,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows data safety route in navigation', async () => {
    setupRecordsMock()

    render(
      <MemoryRouter>
        <AppShell>
          <div>app body</div>
        </AppShell>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: '데이터 안전' })).toBeVisible()
  })

  it('renders /app/safety route through app routes', () => {
    setupRecordsMock()

    render(
      <MemoryRouter initialEntries={['/app/safety']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '데이터 안전' })).toBeInTheDocument()
  })

  it('imports pasted backup and applies it on button click', async () => {
    const setTasks = vi.fn()
    const setClasses = vi.fn()
    const setCollections = vi.fn()
    const setTemplates = vi.fn()

    vi.spyOn(userRecordsModule, 'useUserRecords').mockImplementation((input: { collectionName: string }) => {
      switch (input.collectionName) {
        case 'tasks':
          return createRecordsState<TaskItem>([], setTasks)
        case 'classes':
          return createRecordsState<ClassRecord>([], setClasses)
        case 'collections':
          return createRecordsState<CollectionWithStudents>([], setCollections)
        case 'templates':
          return createRecordsState<TemplateItem>([], setTemplates)
        default:
          throw new Error(`Unexpected collection name: ${input.collectionName}`)
      }
    })

    const user = userEventSetup()
    render(<DataSafetyPage />)

    const importBox = screen.getByRole('textbox', { name: '백업 JSON 붙여넣기' })
    const importPayload = {
      tasks: [makeTask('import-task')],
      classes: [makeClass('class-import')],
      collections: [makeCollection('collection-import')],
      templates: [makeTemplate('template-import')],
    }

    fireEvent.change(importBox, { target: { value: JSON.stringify(importPayload) } })
    await screen.findByRole('button', { name: '데이터 복원' })
    const importButton = screen.getByRole('button', { name: '데이터 복원' })
    expect(importButton).toBeEnabled()

    await user.click(importButton)

    expect(setTasks).toHaveBeenCalledWith(importPayload.tasks)
    expect(setClasses).toHaveBeenCalledWith(importPayload.classes)
    expect(setCollections).toHaveBeenCalledWith(importPayload.collections)
    expect(setTemplates).toHaveBeenCalledWith(importPayload.templates)
  })

  it('shows restore success and clears import text after all stores are persisted', async () => {
    const importPayload = {
      tasks: [makeTask('import-task')],
      classes: [makeClass('class-import')],
      collections: [makeCollection('collection-import')],
      templates: [makeTemplate('template-import')],
    }
    const setTasks = vi.fn().mockResolvedValue(undefined)
    const setClasses = vi.fn().mockResolvedValue(undefined)
    const setCollections = vi.fn().mockResolvedValue(undefined)
    const setTemplates = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(userRecordsModule, 'useUserRecords').mockImplementation((input: { collectionName: string }) => {
      switch (input.collectionName) {
        case 'tasks':
          return createRecordsState<TaskItem>([], setTasks)
        case 'classes':
          return createRecordsState<ClassRecord>([], setClasses)
        case 'collections':
          return createRecordsState<CollectionWithStudents>([], setCollections)
        case 'templates':
          return createRecordsState<TemplateItem>([], setTemplates)
        default:
          throw new Error(`Unexpected collection name: ${input.collectionName}`)
      }
    })

    const user = userEventSetup()
    render(<DataSafetyPage />)

    const importBox = screen.getByRole('textbox', { name: '백업 JSON 붙여넣기' })
    fireEvent.change(importBox, { target: { value: JSON.stringify(importPayload) } })
    const importButton = screen.getByRole('button', { name: '데이터 복원' })

    await user.click(importButton)

    await screen.findByText('백업 데이터를 복원했습니다.')

    expect(importBox).toHaveValue('')
    expect(setTasks).toHaveBeenCalledWith(importPayload.tasks)
    expect(setClasses).toHaveBeenCalledWith(importPayload.classes)
    expect(setCollections).toHaveBeenCalledWith(importPayload.collections)
    expect(setTemplates).toHaveBeenCalledWith(importPayload.templates)
  })

  it('clears only selected groups when 삭제 확인이 입력되고 버튼이 활성화됨', async () => {
    const setTasks = vi.fn()
    const setClasses = vi.fn()
    const setCollections = vi.fn()
    const setTemplates = vi.fn()

    vi.spyOn(userRecordsModule, 'useUserRecords').mockImplementation((input: { collectionName: string }) => {
      switch (input.collectionName) {
        case 'tasks':
          return createRecordsState([makeTask('task-1'), makeTask('task-2')], setTasks)
        case 'classes':
          return createRecordsState<ClassRecord>([makeClass('class-1')], setClasses)
        case 'collections':
          return createRecordsState<CollectionWithStudents>([makeCollection('collection-1')], setCollections)
        case 'templates':
          return createRecordsState<TemplateItem>([makeTemplate('template-1')], setTemplates)
        default:
          throw new Error(`Unexpected collection name: ${input.collectionName}`)
      }
    })

    const user = userEventSetup()
    render(<DataSafetyPage />)

    await user.click(screen.getByRole('checkbox', { name: /업무/ }))
    await user.click(screen.getByRole('checkbox', { name: /템플릿/ }))
    await user.type(screen.getByRole('textbox', { name: '삭제 확인 입력' }), '삭제')

    await user.click(screen.getByRole('button', { name: '선택 항목 삭제' }))

    expect(setTasks).toHaveBeenCalledWith([])
    expect(setTemplates).toHaveBeenCalledWith([])
    expect(setClasses).not.toHaveBeenCalledWith([])
    expect(setCollections).not.toHaveBeenCalledWith([])
  })

  it('disables export/import/reset actions when any store has error', () => {
    const setTasks = vi.fn()
    const setClasses = vi.fn()
    const setCollections = vi.fn()
    const setTemplates = vi.fn()

    vi.spyOn(userRecordsModule, 'useUserRecords').mockImplementation((input: { collectionName: string }) => {
      switch (input.collectionName) {
        case 'tasks':
          return createRecordsState<TaskItem>([], setTasks, false, '저장소 장애')
        case 'classes':
          return createRecordsState<ClassRecord>([], setClasses)
        case 'collections':
          return createRecordsState<CollectionWithStudents>([], setCollections)
        case 'templates':
          return createRecordsState<TemplateItem>([], setTemplates)
        default:
          throw new Error(`Unexpected collection name: ${input.collectionName}`)
      }
    })

    render(<DataSafetyPage />)

    expect(screen.getByRole('button', { name: 'JSON 복사' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'JSON 파일로 저장' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '데이터 복원' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '선택 항목 삭제' })).toBeDisabled()
  })

  it('does not run import without valid parsed payload', async () => {
    const setTasks = vi.fn()
    const setClasses = vi.fn()
    const setCollections = vi.fn()
    const setTemplates = vi.fn()

    vi.spyOn(userRecordsModule, 'useUserRecords').mockImplementation((input: { collectionName: string }) => {
      switch (input.collectionName) {
        case 'tasks':
          return createRecordsState<TaskItem>([], setTasks)
        case 'classes':
          return createRecordsState<ClassRecord>([], setClasses)
        case 'collections':
          return createRecordsState<CollectionWithStudents>([], setCollections)
        case 'templates':
          return createRecordsState<TemplateItem>([], setTemplates)
        default:
          throw new Error(`Unexpected collection name: ${input.collectionName}`)
      }
    })

    const user = userEventSetup()
    render(<DataSafetyPage />)

    const importBox = screen.getByRole('textbox', { name: '백업 JSON 붙여넣기' })
    fireEvent.change(importBox, { target: { value: '{"tasks":[],"classes":[]}' } })

    const importButton = screen.getByRole('button', { name: '데이터 복원' })
    expect(importButton).toBeDisabled()
    expect(await screen.findByText((content) => content.includes('collections 그룹이 배열이 아닙니다.'))).toBeInTheDocument()
    await user.click(importButton)

    expect(screen.getByRole('alert')).toHaveTextContent('collections 그룹이 배열이 아닙니다.')
    expect(setTasks).not.toHaveBeenCalled()
    expect(setClasses).not.toHaveBeenCalled()
    expect(setCollections).not.toHaveBeenCalled()
    expect(setTemplates).not.toHaveBeenCalled()
  })

  it('requires "삭제" confirmation text before reset', async () => {
    const user = userEventSetup()
    const setTasks = vi.fn()
    const setClasses = vi.fn()
    const setCollections = vi.fn()
    const setTemplates = vi.fn()

    vi.spyOn(userRecordsModule, 'useUserRecords').mockImplementation((input: { collectionName: string }) => {
      switch (input.collectionName) {
        case 'tasks':
          return createRecordsState([makeTask('task-1')], setTasks)
        case 'classes':
          return createRecordsState<ClassRecord>([], setClasses)
        case 'collections':
          return createRecordsState<CollectionWithStudents>([], setCollections)
        case 'templates':
          return createRecordsState<TemplateItem>([], setTemplates)
        default:
          throw new Error(`Unexpected collection name: ${input.collectionName}`)
      }
    })

    render(<DataSafetyPage />)

    const deleteButton = screen.getByRole('button', { name: '선택 항목 삭제' })
    expect(deleteButton).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /업무/ })).not.toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: /업무/ }))
    expect(deleteButton).toBeDisabled()
  })
})
