import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { CalendarPage } from '../../src/calendar/CalendarPage'
import * as taskService from '../../src/tasks/taskService'
import * as userRecordsModule from '../../src/firebase/useUserRecords'
import type { TaskItem } from '../../src/types/domain'
import { toLocalDateString } from '../../src/utils/dates'

type TaskRecordHookResult = ReturnType<typeof userRecordsModule.useUserRecords>
type TaskRecordSetterSpy = TaskRecordHookResult['setRecords']

const setupWindowLocalStorage = () => {
  const store: Record<string, string> = {}
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => {
          delete store[key]
        })
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      get length() {
        return Object.keys(store).length
      },
    },
    configurable: true,
  })
}

const makeTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 8)}`,
  userId: overrides.userId ?? 'user-local',
  type: overrides.type ?? 'OFFICIAL_DOCUMENT',
  calendarCategory: overrides.calendarCategory ?? 'SCHOOL',
  title: overrides.title ?? '작업 제목',
  dueDate: overrides.dueDate ?? '2026-05-01',
  status: overrides.status ?? 'RECEIVED',
  memo: overrides.memo ?? '',
  sourceMemo: overrides.sourceMemo ?? '',
  submissionTarget: overrides.submissionTarget ?? '학부모',
  locationLinks: overrides.locationLinks ?? [],
  linkedCollectionIds: overrides.linkedCollectionIds ?? [],
  createdAt: overrides.createdAt ?? '2026-05-01T10:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-05-01T10:00:00.000Z',
  ...overrides,
})

const renderCalendar = () =>
  render(
    <MemoryRouter>
      <CalendarPage />
    </MemoryRouter>,
  )

const getDefaultHookShape = (
  override: Partial<TaskRecordHookResult>,
): TaskRecordHookResult => ({
  error: '',
  loading: false,
  records: [],
  setRecords: vi.fn() as TaskRecordSetterSpy,
  usingFirestore: false,
  userId: 'user-local',
  ...override,
})

const today = toLocalDateString(new Date())

describe('CalendarPage data source and states', () => {
  beforeEach(() => {
    setupWindowLocalStorage()
    taskService.saveTaskStore([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('uses seeded tasks when local/demo has no stored tasks', () => {
    renderCalendar()

    expect(screen.getByRole('link', { name: /학기 공문 마감/ })).toBeInTheDocument()
  })

  it('does not mix seeded tasks when Firestore is loading', () => {
    vi.spyOn(userRecordsModule, 'useUserRecords').mockReturnValue(
      getDefaultHookShape({
        usingFirestore: true,
        loading: true,
        records: [],
      }),
    )

    renderCalendar()

    expect(screen.getByRole('status')).toHaveTextContent('캘린더 업무를 불러오는 중입니다.')
    expect(screen.queryAllByRole('link', { name: /학기 공문 마감/ })).toHaveLength(0)
  })

  it('shows empty calendar without seeded tasks when Firestore returns empty', () => {
    vi.spyOn(userRecordsModule, 'useUserRecords').mockReturnValue(
      getDefaultHookShape({ usingFirestore: true, records: [] }),
    )

    renderCalendar()

    expect(screen.queryAllByRole('link', { name: /학기 공문 마감/ })).toHaveLength(0)
    expect(screen.getByText('해당 날짜에 등록된 업무가 없습니다.')).toBeInTheDocument()
  })

  it('shows saved task in calendar and selected date list when records exist', () => {
    vi.spyOn(userRecordsModule, 'useUserRecords').mockReturnValue(
      getDefaultHookShape({
        usingFirestore: false,
        records: [
          makeTask({
            id: 'saved-task-1',
            userId: 'user-local',
            type: 'OFFICIAL_DOCUMENT',
            title: '저장된 공문 마감',
            dueDate: today,
          }),
        ],
      }),
    )

    renderCalendar()

    expect(screen.getByRole('link', { name: /저장된 공문 마감/ })).toHaveAttribute(
      'href',
      '/app/tasks/saved-task-1',
    )
  })

  it('shows error message when loading failed', () => {
    vi.spyOn(userRecordsModule, 'useUserRecords').mockReturnValue(
      getDefaultHookShape({
        usingFirestore: false,
        error: 'Firestore 연결 실패',
        records: [],
      }),
    )

    renderCalendar()

    expect(screen.getByRole('alert')).toHaveTextContent(
      '캘린더 업무를 불러오지 못했습니다: Firestore 연결 실패',
    )
  })

  it('does not render tasks with no due date or archived status', () => {
    vi.spyOn(userRecordsModule, 'useUserRecords').mockReturnValue(
      getDefaultHookShape({
        usingFirestore: false,
        records: [
          makeTask({
            id: 'visible-task',
            title: '일반 공문(표시)',
            dueDate: today,
          }),
          makeTask({
            id: 'missing-due-date',
            title: '마감일 없음 공문',
            dueDate: null,
          }),
          makeTask({
            id: 'archived-task',
            title: '보관됨 공문',
            dueDate: today,
            status: 'ARCHIVED',
          }),
        ],
      }),
    )

    renderCalendar()

    expect(screen.getByRole('link', { name: /일반 공문\(표시\)/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /마감일 없음 공문/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /보관됨 공문/ })).toBeNull()
  })

  it('uses useUserRecords with task store fallback handlers', () => {
    const hookSpy = vi.spyOn(userRecordsModule, 'useUserRecords').mockReturnValue(
      getDefaultHookShape({
        usingFirestore: false,
        records: [],
      }),
    )

    vi.spyOn(taskService, 'getTaskStore').mockReturnValue([])
    vi.spyOn(taskService, 'saveTaskStore').mockReturnValue([])

    renderCalendar()

    expect(hookSpy).toHaveBeenCalledWith({
      collectionName: 'tasks',
      getInitialRecords: taskService.getTaskStore,
      onSaveLocal: taskService.saveTaskStore,
    })
  })
})
