import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TaskItem } from '../../src/types/domain';
import { TaskEditor } from '../../src/tasks/TaskEditor';

const makeTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: 'task-editor-1',
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

describe('TaskEditor', () => {
  it('falls back invalid URL input to NOTE only after confirming fallback action', async () => {
    const user = userEvent.setup();
    const onTaskPatch = vi.fn();

    render(
      <TaskEditor
        documentType="공문"
        onDocumentTypeChange={vi.fn()}
        task={makeTask()}
        onTaskPatch={onTaskPatch}
      />,
    );

    await user.type(screen.getByPlaceholderText('값을 입력하세요'), 'not-a-url');
    await user.click(screen.getByRole('button', { name: '위치 추가' }));

    expect(onTaskPatch).toHaveBeenCalledTimes(0);
    expect(screen.getByRole('status')).toHaveTextContent(
      'URL 형식이 아닙니다. 기타 메모 위치로 저장하시겠습니까?',
    );
    expect(screen.getByRole('button', { name: '기타 메모로 저장' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 입력' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '기타 메모로 저장' }));

    expect(onTaskPatch).toHaveBeenCalledTimes(1);
    expect(onTaskPatch).toHaveBeenCalledWith({
      locationLinks: [
        expect.objectContaining({
          type: 'NOTE',
          title: '기타 메모',
          value: 'not-a-url',
          memo: '',
        }),
      ],
    });
    expect(screen.queryByText('URL 형식이 아닙니다. 기타 메모 위치로 저장하시겠습니까?')).toBeNull();
  });
});

