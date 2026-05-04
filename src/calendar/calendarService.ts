import { isLocalDate } from '../utils/dates'
import { getTaskDetailHref } from '../inbox/taskLinks'
import type { CalendarCategory, TaskItem, TaskStatus, TaskType } from '../types/domain'

export type CalendarEvent = {
  id: string
  title: string
  dueDate: string
  taskType: TaskType
  calendarCategory: CalendarCategory
  status: TaskStatus
  href: string
  colorName: 'blue' | 'green' | 'amber'
  colorLabel: '학교 업무' | '학급 업무' | '개인 업무'
}

type CalendarCategoryMapEntry = {
  colorName: 'blue' | 'green' | 'amber'
  colorLabel: '학교 업무' | '학급 업무' | '개인 업무'
}

const CATEGORY_META: Record<CalendarCategory, CalendarCategoryMapEntry> = {
  SCHOOL: {
    colorName: 'blue',
    colorLabel: '학교 업무',
  },
  CLASS: {
    colorName: 'green',
    colorLabel: '학급 업무',
  },
  PERSONAL: {
    colorName: 'amber',
    colorLabel: '개인 업무',
  },
}

type CalendarMapOptions = {
  includeArchived?: boolean
}

type CalendarView = 'month' | 'week'
type CalendarDirection = 'previous' | 'next'

const parseLocalDateParts = (value: string): [number, number, number] | null => {
  if (!isLocalDate(value)) {
    return null
  }

  const [yearText, monthText, dayText] = value.split('-')
  return [Number(yearText), Number(monthText), Number(dayText)]
}

const parseLocalDate = (value: string): Date | null => {
  const parts = parseLocalDateParts(value)
  if (!parts) {
    return null
  }

  const [year, month, day] = parts
  return new Date(year, month - 1, day)
}

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const daysInMonth = (year: number, monthIndex: number): number => {
  return new Date(year, monthIndex + 1, 0).getDate()
}

const getMondayOffset = (value: Date): number => {
  const dayOfWeek = value.getDay()
  return (dayOfWeek + 6) % 7
}

export const mapTasksToCalendarEvents = (
  tasks: TaskItem[],
  { includeArchived = false }: CalendarMapOptions = {},
): CalendarEvent[] =>
  tasks
    .filter((task) => isLocalDate(task.dueDate ?? ''))
    .filter((task) => includeArchived || task.status !== 'ARCHIVED')
    .map((task) => {
      const categoryMeta = CATEGORY_META[task.calendarCategory]

      return {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate!,
        taskType: task.type,
        calendarCategory: task.calendarCategory,
        status: task.status,
        href: getTaskDetailHref(task),
        colorName: categoryMeta.colorName,
        colorLabel: categoryMeta.colorLabel,
      }
    })

export const getMonthGrid = (anchorDate: string): string[] => {
  const anchor = parseLocalDate(anchorDate)
  if (!anchor) {
    return []
  }

  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const leadingDays = getMondayOffset(firstOfMonth)
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1 - leadingDays)

  const monthGrid: string[] = []
  for (let index = 0; index < 42; index += 1) {
    monthGrid.push(toLocalDateString(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)))
  }

  return monthGrid
}

export const getWeekDays = (anchorDate: string): string[] => {
  const anchor = parseLocalDate(anchorDate)
  if (!anchor) {
    return []
  }

  const offset = getMondayOffset(anchor)
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset)
  const weekDays: string[] = []

  for (let index = 0; index < 7; index += 1) {
    weekDays.push(toLocalDateString(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)))
  }

  return weekDays
}

export const groupEventsByDate = (events: CalendarEvent[]): Record<string, CalendarEvent[]> =>
  events.reduce<Record<string, CalendarEvent[]>>((accumulator, event) => {
    if (!accumulator[event.dueDate]) {
      accumulator[event.dueDate] = []
    }
    accumulator[event.dueDate].push(event)
    return accumulator
  }, {})

export const moveCalendarAnchor = (
  anchorDate: string,
  view: CalendarView,
  direction: CalendarDirection,
): string => {
  const anchor = parseLocalDate(anchorDate)
  if (!anchor) {
    return anchorDate
  }

  if (view === 'month') {
    const year = anchor.getFullYear()
    const month = anchor.getMonth()
    const monthShift = direction === 'next' ? 1 : -1
    const nextMonth = month + monthShift
    const nextYear = year + Math.floor(nextMonth / 12)
    const normalizedMonth = ((nextMonth % 12) + 12) % 12
    const maxDay = daysInMonth(nextYear, normalizedMonth)
    const day = Math.min(anchor.getDate(), maxDay)
    return toLocalDateString(new Date(nextYear, normalizedMonth, day))
  }

  const nextAnchor = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  const weekShift = direction === 'next' ? 7 : -7
  nextAnchor.setDate(nextAnchor.getDate() + weekShift)
  return toLocalDateString(nextAnchor)
}
