import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import { TaskCard } from '../../src/inbox/TaskCard';
import type { TaskItem } from '../../src/types/domain';

const makeTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: 'task-1',
  userId: 'user-1',
  type: 'OFFICIAL_DOCUMENT',
  calendarCategory: 'SCHOOL',
  title: '샘플 공문',
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

describe('TaskCard', () => {
  it('hides complete action for DONE and ARCHIVED tasks', () => {
    render(
      <MemoryRouter>
        <TaskCard task={makeTask({ id: 'done-1', title: '완료된 공문', status: 'DONE' })} onComplete={vi.fn()} />
        <TaskCard
          task={makeTask({
            id: 'archived-1',
            title: '보관된 공문',
            status: 'ARCHIVED',
          })}
          onComplete={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('완료 처리됨')).toBeInTheDocument();
    expect(screen.getByText('보관됨')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '완료 처리' })).toBeNull();
  });

  it('shows complete button for active tasks', () => {
    render(
      <MemoryRouter>
        <TaskCard task={makeTask({ id: 'active-1', title: '진행 중 공문', status: 'IN_PROGRESS' })} onComplete={vi.fn()} />
      </MemoryRouter>,
    );

    const card = screen.getByText('진행 중 공문').closest('article');
    expect(card).not.toBeNull();
    expect(card && within(card).getByRole('button', { name: '완료 처리' })).toBeInTheDocument();
    expect(screen.queryByText('완료 처리됨')).toBeNull();
  });
});
