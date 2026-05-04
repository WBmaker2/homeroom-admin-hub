import { describe, expect, it } from 'vitest'
import type { TaskItem } from '../../src/types/domain'
import {
  getMonthGrid,
  getWeekDays,
  groupEventsByDate,
  mapTasksToCalendarEvents,
  moveCalendarAnchor,
} from '../../src/calendar/calendarService'

const taskFactory = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: overrides.id ?? `task-${Math.random().toString(16).slice(2, 8)}`,
  userId: 'user-demo',
  type: 'OFFICIAL_DOCUMENT',
  calendarCategory: 'SCHOOL',
  title: overrides.title ?? '업무',
  dueDate: '2026-05-04',
  status: 'RECEIVED',
  memo: '',
  sourceMemo: '',
  submissionTarget: '',
  locationLinks: [],
  linkedCollectionIds: [],
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  ...overrides,
})

describe('calendarService', () => {
  it('mapTasksToCalendarEvents hides tasks without dueDate and ARCHIVED by default', () => {
    const events = mapTasksToCalendarEvents([
      taskFactory({ id: 'no-due', dueDate: null }),
      taskFactory({ id: 'archived', status: 'ARCHIVED' }),
      taskFactory({ id: 'valid' }),
    ])

    expect(events.map((event) => event.id)).toEqual(['valid'])
  })

  it('mapTasksToCalendarEvents maps category labels and task-aware hrefs', () => {
    const tasks = [
      taskFactory({
        id: 'school-doc',
        type: 'OFFICIAL_DOCUMENT',
        calendarCategory: 'SCHOOL',
        dueDate: '2026-05-02',
        title: '학교 공문',
      }),
      taskFactory({
        id: 'class-submit',
        type: 'CLASS_SUBMISSION',
        calendarCategory: 'CLASS',
        dueDate: '2026-05-02',
        title: '수합 제출',
      }),
      taskFactory({
        id: 'personal-due',
        type: 'PERSONAL_DUE',
        calendarCategory: 'PERSONAL',
        dueDate: '2026-05-02',
        title: '개인 과제',
      }),
    ]

    const events = mapTasksToCalendarEvents(tasks)
    const byId = Object.fromEntries(events.map((event) => [event.id, event]))

    expect(byId['school-doc']?.colorName).toBe('blue')
    expect(byId['school-doc']?.colorLabel).toBe('학교 업무')
    expect(byId['school-doc']?.href).toBe('/app/tasks/school-doc')

    expect(byId['class-submit']?.colorName).toBe('green')
    expect(byId['class-submit']?.colorLabel).toBe('학급 업무')
    expect(byId['class-submit']?.href).toBe('/app/collections?taskId=class-submit')

    expect(byId['personal-due']?.colorName).toBe('amber')
    expect(byId['personal-due']?.colorLabel).toBe('개인 업무')
    expect(byId['personal-due']?.href).toBe('/app/tasks?taskId=personal-due')
  })

  it('groupEventsByDate groups events by local due date', () => {
    const events = mapTasksToCalendarEvents([
      taskFactory({ id: 'a', dueDate: '2026-05-04' }),
      taskFactory({ id: 'b', dueDate: '2026-05-04' }),
      taskFactory({ id: 'c', dueDate: '2026-05-08' }),
    ])

    const grouped = groupEventsByDate(events)

    expect(grouped['2026-05-04']).toHaveLength(2)
    expect(grouped['2026-05-08']).toHaveLength(1)
    expect(grouped['2026-05-04']?.map((event) => event.id)).toEqual(['a', 'b'])
  })

  it('getWeekDays returns 7 dates that contain anchor date', () => {
    const week = getWeekDays('2026-05-06')

    expect(week).toHaveLength(7)
    expect(week[0]).toBe('2026-05-04')
    expect(week[6]).toBe('2026-05-10')
    expect(week).toContain('2026-05-06')
  })

  it('getMonthGrid includes leading/trailing dates and keeps week-multiple length', () => {
    const grid = getMonthGrid('2026-05-15')

    expect(grid.length % 7).toBe(0)
    expect(grid[0]).toMatch(/^2026-05|2026-04|2026-06/)
    expect(grid[grid.length - 1]).toMatch(/2026-05|2026-06|2026-04/)
    expect(grid).toContain('2026-05-01')
    expect(grid).toContain('2026-05-31')
  })

  it('moveCalendarAnchor works for month and week and clamps month-day boundaries', () => {
    expect(moveCalendarAnchor('2026-01-31', 'month', 'next')).toBe('2026-02-28')
    expect(moveCalendarAnchor('2026-03-31', 'month', 'previous')).toBe('2026-02-28')
    expect(moveCalendarAnchor('2026-05-15', 'month', 'next')).toBe('2026-06-15')
    expect(moveCalendarAnchor('2026-05-15', 'month', 'previous')).toBe('2026-04-15')
    expect(moveCalendarAnchor('2024-02-29', 'month', 'next')).toBe('2024-03-29')
    expect(moveCalendarAnchor('2024-02-29', 'month', 'previous')).toBe('2024-01-29')
    expect(moveCalendarAnchor('2026-12-31', 'month', 'next')).toBe('2027-01-31')
    expect(moveCalendarAnchor('2026-05-04', 'week', 'next')).toBe('2026-05-11')
    expect(moveCalendarAnchor('2026-05-04', 'week', 'previous')).toBe('2026-04-27')
  })

  it('moveCalendarAnchor keeps invalid anchor unchanged', () => {
    expect(moveCalendarAnchor('2026-13-99', 'month', 'next')).toBe('2026-13-99')
    expect(moveCalendarAnchor('foo', 'week', 'previous')).toBe('foo')
  })
})
