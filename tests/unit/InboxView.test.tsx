import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import { InboxView } from '../../src/inbox/InboxPage';
import { buildInboxSections } from '../../src/inbox/inboxService';
import type { SubmissionCollection, TaskItem } from '../../src/types/domain';

const makeTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: `task-${overrides.id ?? 'default'}`,
  userId: 'user-1',
  type: 'OFFICIAL_DOCUMENT',
  calendarCategory: 'SCHOOL',
  title: overrides.id ?? '업무',
  dueDate: '2026-05-04',
  status: 'RECEIVED',
  memo: '',
  sourceMemo: '',
  submissionTarget: '학부모',
  locationLinks: [],
  linkedCollectionIds: [],
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  ...overrides,
});

const makeCollection = (overrides: {
  id: string;
  taskId: string;
  rows: SubmissionCollection['rows'];
}): SubmissionCollection => ({
  id: overrides.id,
  userId: 'user-1',
  classId: 'class-1',
  officialDocumentTaskId: null,
  taskId: overrides.taskId,
  title: '수합판',
  dueDate: '2026-05-04',
  rows: overrides.rows,
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
});

describe('InboxView', () => {
  it('renders all required sections for seeded tasks', () => {
    const tasks: TaskItem[] = [
      makeTask({
        id: 'overdue',
        title: '지난 마감 업무',
        dueDate: '2026-05-03',
        status: 'IN_PROGRESS',
      }),
      makeTask({
        id: 'today',
        title: '오늘 마감 업무',
        dueDate: '2026-05-04',
        status: 'RECEIVED',
        linkedCollectionIds: ['collection-today'],
      }),
      makeTask({
        id: 'upcoming',
        title: '주간 예정 업무',
        dueDate: '2026-05-10',
        status: 'IN_PROGRESS',
      }),
      makeTask({
        id: 'incomplete',
        title: '미완료 제출물 업무',
        dueDate: '2026-05-06',
        status: 'IN_PROGRESS',
        linkedCollectionIds: ['collection-incomplete'],
      }),
    ];

    const collections: SubmissionCollection[] = [
      makeCollection({
        id: 'collection-today',
        taskId: 'today',
        rows: {
          student1: {
            studentId: 'student1',
            status: 'SUBMITTED',
            memo: '',
            submittedAt: '2026-05-03T10:00:00.000Z',
          },
          student2: {
            studentId: 'student2',
            status: 'MISSING',
            memo: '',
            submittedAt: null,
          },
        },
      }),
      makeCollection({
        id: 'collection-incomplete',
        taskId: 'incomplete',
        rows: {
          student1: {
            studentId: 'student1',
            status: 'MISSING',
            memo: '',
            submittedAt: null,
          },
        },
      }),
    ];

    render(
      <MemoryRouter>
        <InboxView
          today="2026-05-04"
          tasks={tasks}
          collections={collections}
          onComplete={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('지난 마감')).toBeInTheDocument();
    expect(screen.getByText('오늘 마감')).toBeInTheDocument();
    expect(screen.getByText('미완료 제출물')).toBeInTheDocument();
    expect(screen.getByText('이번 주 예정')).toBeInTheDocument();

    expect(within(screen.getByTestId('inbox-section-overdue')).getByText('지난 마감 업무')).toBeInTheDocument();
    expect(within(screen.getByTestId('inbox-section-today')).getByText('오늘 마감 업무')).toBeInTheDocument();
    expect(within(screen.getByTestId('inbox-section-incompleteCollections')).getByText('미완료 제출물 업무')).toBeInTheDocument();
    expect(within(screen.getByTestId('inbox-section-upcoming')).getByText('주간 예정 업무')).toBeInTheDocument();

    expect(screen.getAllByText('오늘 마감 업무')).toHaveLength(1);
  });

  it('does not place same task into multiple inbox sections', () => {
    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks: [
        makeTask({
          id: 'multi',
          title: '중복 테스트 업무',
          dueDate: '2026-05-04',
          linkedCollectionIds: ['collection-multi'],
        }),
      ],
      collections: [
        makeCollection({
          id: 'collection-multi',
          taskId: 'multi',
          rows: {
            student1: {
              studentId: 'student1',
              status: 'MISSING',
              memo: '',
              submittedAt: null,
            },
          },
        }),
      ],
    });

    const totalAppearances = sections.today.length + sections.overdue.length + sections.incompleteCollections.length + sections.upcoming.length;
    expect(totalAppearances).toBe(1);
    expect(sections.today).toHaveLength(1);
  });

});
