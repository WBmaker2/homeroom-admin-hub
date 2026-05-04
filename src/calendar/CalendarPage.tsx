import { type MouseEvent, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { TaskItem, TaskType } from '../types/domain'
import { addDaysToLocalDateString, toLocalDateString } from '../utils/dates'
import {
  getMonthGrid,
  getWeekDays,
  groupEventsByDate,
  mapTasksToCalendarEvents,
  moveCalendarAnchor,
} from './calendarService'
import './CalendarPage.css'

type CalendarView = 'month' | 'week'

const taskTypeLabel: Record<TaskType, string> = {
  OFFICIAL_DOCUMENT: '공문',
  CLASS_SUBMISSION: '제출물',
  PERSONAL_DUE: '개인 마감',
}

const weekdayLabels = ['월', '화', '수', '목', '금', '토', '일']

const seededTasks = (): TaskItem[] => {
  const today = toLocalDateString(new Date())

  return [
    {
      id: 'calendar-task-school-1',
      userId: 'user-demo',
      type: 'OFFICIAL_DOCUMENT',
      calendarCategory: 'SCHOOL',
      title: '학기 공문 마감',
      dueDate: today,
      status: 'RECEIVED',
      memo: '',
      sourceMemo: '',
      submissionTarget: '학부모',
      locationLinks: [],
      linkedCollectionIds: [],
      createdAt: '2026-05-04T10:00:00.000Z',
      updatedAt: '2026-05-04T10:00:00.000Z',
    },
    {
      id: 'calendar-task-class-1',
      userId: 'user-demo',
      type: 'CLASS_SUBMISSION',
      calendarCategory: 'CLASS',
      title: '수업 보완 제출 마감',
      dueDate: addDaysToLocalDateString(today, 3),
      status: 'IN_PROGRESS',
      memo: '',
      sourceMemo: '',
      submissionTarget: '학생부',
      locationLinks: [],
      linkedCollectionIds: [],
      createdAt: '2026-05-04T10:30:00.000Z',
      updatedAt: '2026-05-04T10:30:00.000Z',
    },
    {
      id: 'calendar-task-personal-1',
      userId: 'user-demo',
      type: 'PERSONAL_DUE',
      calendarCategory: 'PERSONAL',
      title: '개인 워크플로우 점검',
      dueDate: addDaysToLocalDateString(today, 10),
      status: 'WAITING_SUBMISSION',
      memo: '',
      sourceMemo: '',
      submissionTarget: '',
      locationLinks: [],
      linkedCollectionIds: [],
      createdAt: '2026-05-04T11:00:00.000Z',
      updatedAt: '2026-05-04T11:00:00.000Z',
    },
  ]
}

const getMonthLabel = (anchorDate: string): string => {
  const year = Number(anchorDate.slice(0, 4))
  const month = Number(anchorDate.slice(5, 7))
  return `${year}년 ${month}월`
}

export function CalendarPage() {
  const today = toLocalDateString(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [anchorDate, setAnchorDate] = useState<string>(today)
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const tasks = useMemo<TaskItem[]>(() => seededTasks(), [])
  const events = useMemo(() => mapTasksToCalendarEvents(tasks), [tasks])
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events])
  const visibleDays = useMemo(
    () => (view === 'month' ? getMonthGrid(anchorDate) : getWeekDays(anchorDate)),
    [anchorDate, view],
  )

  const selectedEvents = useMemo(
    () => eventsByDate[selectedDate] ?? [],
    [eventsByDate, selectedDate],
  )
  const selectedTasks = useMemo(
    () => ({
      OFFICIAL_DOCUMENT: selectedEvents.filter((item) => item.taskType === 'OFFICIAL_DOCUMENT'),
      CLASS_SUBMISSION: selectedEvents.filter((item) => item.taskType === 'CLASS_SUBMISSION'),
      PERSONAL_DUE: selectedEvents.filter((item) => item.taskType === 'PERSONAL_DUE'),
    }),
    [selectedEvents],
  )
  const isMonthView = view === 'month'

  const isCurrentMonthDate = (date: string): boolean => {
    return date.startsWith(anchorDate.slice(0, 7))
  }

  const periodLabel = useMemo(() => {
    if (view === 'week' && visibleDays.length >= 7) {
      return `${visibleDays[0]} ~ ${visibleDays[6]}`
    }
    return getMonthLabel(anchorDate)
  }, [anchorDate, visibleDays, view])

  const changeAnchor = (direction: 'previous' | 'next') => {
    const nextAnchor = moveCalendarAnchor(anchorDate, view, direction)
    const nextVisibleDays = view === 'month' ? getMonthGrid(nextAnchor) : getWeekDays(nextAnchor)
    const fallbackDate = nextAnchor

    setAnchorDate(nextAnchor)
    setSelectedDate((current) => (nextVisibleDays.includes(current) ? current : fallbackDate))
  }

  const handleNavigation = (
    event: MouseEvent<HTMLButtonElement>,
    direction: 'previous' | 'next',
  ) => {
    event.preventDefault()
    changeAnchor(direction)
  }

  return (
    <div className="calendar-page">
      <section className="calendar-controls" aria-label="캘린더 컨트롤">
        <div className="calendar-view-switch" role="tablist" aria-label="보기 모드">
          <button
            type="button"
            className={`calendar-view-button${isMonthView ? ' calendar-view-button-active' : ''}`}
            onClick={() => setView('month')}
            aria-pressed={isMonthView}
          >
            월간
          </button>
          <button
            type="button"
            className={`calendar-view-button${!isMonthView ? ' calendar-view-button-active' : ''}`}
            onClick={() => setView('week')}
            aria-pressed={!isMonthView}
          >
            주간
          </button>
        </div>

        <div className="calendar-navigation">
          <button type="button" className="calendar-nav-button" onClick={(event) => handleNavigation(event, 'previous')}>
            <ChevronLeft size={16} aria-hidden="true" />
            <span>이전</span>
          </button>
          <button
            type="button"
            className="calendar-nav-button"
            onClick={() => {
              setAnchorDate(today)
              setSelectedDate(today)
            }}
          >
            오늘
          </button>
          <button type="button" className="calendar-nav-button" onClick={(event) => handleNavigation(event, 'next')}>
            <span>다음</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>

      <header className="calendar-header">
        <h1>마감 캘린더</h1>
        <p>{periodLabel}</p>
      </header>

      <section className="calendar-board" aria-label="일자 표시">
        <div className="calendar-weekday-row" role="row">
          {weekdayLabels.map((dayLabel) => (
            <span className="calendar-weekday" key={dayLabel}>
              {dayLabel}
            </span>
          ))}
        </div>

        <div className={`calendar-grid ${isMonthView ? 'calendar-grid-month' : 'calendar-grid-week'}`}>
          {visibleDays.map((dateText) => {
            const eventsForDate = eventsByDate[dateText] ?? []
            const dateNumber = Number(dateText.split('-')[2])
            const isToday = dateText === today
            const isSelected = selectedDate === dateText
            const isInCurrentMonth = isMonthView ? isCurrentMonthDate(dateText) : true
            const stateLabels: string[] = []
            if (isToday) {
              stateLabels.push('오늘')
            }
            if (isSelected) {
              stateLabels.push('선택됨')
            }
            const eventCountLabel = `${eventsForDate.length}개`
            const ariaLabel = `${dateText}${stateLabels.length > 0 ? ` ${stateLabels.join(', ')}` : ''}, ${eventCountLabel}`

            return (
              <button
                type="button"
                key={dateText}
                className={`calendar-day ${isInCurrentMonth ? '' : 'calendar-day-outside'} ${
                  isToday ? 'calendar-day-today' : ''
                } ${isSelected ? 'calendar-day-selected' : ''}`}
                onClick={() => setSelectedDate(dateText)}
                aria-label={ariaLabel}
                aria-pressed={isSelected}
                aria-current={isToday ? 'date' : undefined}
                onDoubleClick={() => setAnchorDate(dateText)}
              >
                <span className="calendar-day-number-wrap">
                  <span className="calendar-day-number">{dateNumber}</span>
                  {stateLabels.length > 0 ? (
                    <span className="calendar-day-state" aria-hidden="true">
                      {stateLabels.join(', ')}
                    </span>
                  ) : null}
                </span>
                <span className="calendar-day-count" aria-hidden="true">
                  {eventCountLabel}
                </span>
                <ul className="calendar-day-events">
                  {eventsForDate.slice(0, 3).map((event) => (
                    <li key={event.id} className={`calendar-event-item calendar-event-${event.colorName}`}>
                      <span className="calendar-event-dot" aria-hidden="true" />
                      <span className="calendar-event-label">{event.colorLabel}</span>
                      <span className="calendar-event-title">{event.title}</span>
                    </li>
                  ))}
                  {eventsForDate.length > 3 ? (
                    <li className="calendar-day-overflow">+{eventsForDate.length - 3}건</li>
                  ) : null}
                </ul>
              </button>
            )
          })}
        </div>
      </section>

      <section className="calendar-selected" aria-live="polite">
        <h2>해당 날짜 업무 목록</h2>
        <p className="calendar-selected-date">{selectedDate}</p>
        {selectedEvents.length === 0 ? (
          <p className="calendar-empty">해당 날짜에 등록된 업무가 없습니다.</p>
        ) : (
          <div className="calendar-selected-groups">
            {(Object.entries(selectedTasks) as [TaskType, typeof selectedEvents][]).map(
              ([taskType, items]) => {
                if (items.length === 0) {
                  return null
                }

                return (
                  <section className="calendar-selected-group" key={taskType}>
                    <h3>{taskTypeLabel[taskType]}</h3>
                    <ul>
                      {items.map((event) => (
                        <li key={event.id} className="calendar-selected-item">
                          <span
                            className={`calendar-event-dot calendar-event-${event.colorName}`}
                            aria-hidden="true"
                          />
                          <Link to={event.href} className="calendar-selected-link">
                            <strong>{event.title}</strong>
                            <span className="calendar-selected-meta">{event.colorLabel}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              },
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default CalendarPage
