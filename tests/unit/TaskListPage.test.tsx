import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskListPage } from '../../src/tasks/TaskListPage';
import * as taskService from '../../src/tasks/taskService';
import * as userRecordsModule from '../../src/firebase/useUserRecords';
import type { TaskItem } from '../../src/types/domain';

type SaveTaskStoreSpy = ReturnType<typeof vi.spyOn>;

const setupWindowLocalStorage = () => {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => {
          delete store[key];
        });
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      get length() {
        return Object.keys(store).length;
      },
    },
    configurable: true,
  });
};

const renderCreatePage = (type: 'OFFICIAL_DOCUMENT' | 'PERSONAL_DUE') =>
  render(
    <MemoryRouter initialEntries={[`/app/tasks?intent=create&type=${type}`]}>
      <TaskListPage />
    </MemoryRouter>,
  );

const getLatestSavedTasks = (
  spy: SaveTaskStoreSpy
): TaskItem[] | undefined => {
  const call = spy.mock.calls.at(-1);
  return call?.[0];
};

describe('TaskListPage create intent form', () => {
  beforeEach(() => {
    setupWindowLocalStorage();
    vi.spyOn(taskService, 'getTaskStore').mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates official document and appends it to the visible list from fallback data', async () => {
    const saveSpy = vi.spyOn(taskService, 'saveTaskStore');
    const user = userEvent.setup();

    renderCreatePage('OFFICIAL_DOCUMENT');

    await user.type(screen.getByLabelText('제목'), '5월 공문 제출 확인');
    await user.type(screen.getByLabelText('마감일'), '2026-05-15');
    await user.type(screen.getByLabelText('제출 대상'), '행정실');
    await user.type(screen.getByLabelText('메모'), '부모 알림');

    await user.click(screen.getByRole('button', { name: '공문 추가 저장' }));

    const confirm = await screen.findByText('공문 추가 항목이 생성되었습니다.');
    expect(confirm).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '5월 공문 제출 확인' })).toBeInTheDocument();

    const savedTasks = getLatestSavedTasks(saveSpy);
    const createdTask = savedTasks?.find((item) => item.title === '5월 공문 제출 확인');
    expect(savedTasks).toHaveLength(6);
    expect(createdTask).toMatchObject({
      type: 'OFFICIAL_DOCUMENT',
      calendarCategory: 'SCHOOL',
      title: '5월 공문 제출 확인',
      status: 'RECEIVED',
      dueDate: '2026-05-15',
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '공문 추가' })).toBeNull();
    });
  });

  it('shows accessible error when title is missing', async () => {
    const saveSpy = vi.spyOn(taskService, 'saveTaskStore');
    const user = userEvent.setup();

    renderCreatePage('OFFICIAL_DOCUMENT');

    await user.click(screen.getByRole('button', { name: '공문 추가 저장' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('제목은 필수입니다.');
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('creates personal due with PERSONAL calendarCategory', async () => {
    const saveSpy = vi.spyOn(taskService, 'saveTaskStore');
    const user = userEvent.setup();

    renderCreatePage('PERSONAL_DUE');

    await user.type(screen.getByLabelText('제목'), '개인 제출물 마감 체크');
    await user.type(screen.getByLabelText('마감일'), '2026-06-01');
    await user.type(screen.getByLabelText('메모'), '점검 필요');

    await user.click(screen.getByRole('button', { name: '개인 마감 추가 저장' }));

    const confirm = await screen.findByText('개인 마감 추가 항목이 생성되었습니다.');
    expect(confirm).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '개인 제출물 마감 체크' })).toBeInTheDocument();

    const savedTasks = getLatestSavedTasks(saveSpy);
    const createdTask = savedTasks?.find((item) => item.title === '개인 제출물 마감 체크');
    expect(createdTask).toMatchObject({
      type: 'PERSONAL_DUE',
      calendarCategory: 'PERSONAL',
      dueDate: '2026-06-01',
    });
  });

  it('does not render create form while Firestore is loading', () => {
    vi.spyOn(userRecordsModule, 'useUserRecords').mockReturnValue({
      error: '',
      loading: true,
      records: [],
      setRecords: vi.fn(),
      usingFirestore: true,
      userId: 'user-live',
    });
    vi.spyOn(taskService, 'getTaskStore').mockReturnValue([]);

    renderCreatePage('OFFICIAL_DOCUMENT');

    expect(screen.queryByRole('heading', { name: '공문 추가' })).toBeNull();
    expect(screen.queryByRole('button', { name: '공문 추가 저장' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('업무 목록을 불러오는 중입니다.');
  });
});
