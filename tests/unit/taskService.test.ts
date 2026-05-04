import { describe, expect, it } from 'vitest';
import {
  buildTaskList,
  createOfficialDocumentDraft,
  createOfficialDocumentLocationLink,
  filterTaskList,
  setOfficialDocumentStatus,
  sortTaskList,
  updateOfficialDocumentDraft,
} from '../../src/tasks/taskService';
import type { TaskItem } from '../../src/types/domain';

const task = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 8)}`,
  userId: 'user-1',
  type: 'OFFICIAL_DOCUMENT',
  calendarCategory: 'SCHOOL',
  title: overrides.title ?? '작업',
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
});

describe('taskService', () => {
  it('filters archived tasks by default option', () => {
    const tasks = [
      task({ id: 'done', status: 'DONE', dueDate: '2026-05-02', updatedAt: '2026-05-03T09:00:00.000Z' }),
      task({
        id: 'archived',
        status: 'ARCHIVED',
        dueDate: '2026-05-01',
        updatedAt: '2026-05-03T10:00:00.000Z',
      }),
      task({ id: 'work', status: 'IN_PROGRESS', dueDate: '2026-05-03', updatedAt: '2026-05-03T11:00:00.000Z' }),
    ];

    expect(filterTaskList(tasks, false).map((item) => item.id).sort()).toEqual(['done', 'work'].sort());
    expect(filterTaskList(tasks, true).map((item) => item.id).sort()).toEqual(['done', 'work', 'archived'].sort());
  });

  it('sorts by incomplete first, due date, and updatedAt descending', () => {
    const tasks = [
      task({
        id: 'first-incomplete',
        status: 'IN_PROGRESS',
        dueDate: '2026-05-06',
        updatedAt: '2026-05-03T09:00:00.000Z',
      }),
      task({
        id: 'second-incomplete',
        status: 'RECEIVED',
        dueDate: '2026-05-05',
        updatedAt: '2026-05-03T10:00:00.000Z',
      }),
      task({
        id: 'done-task',
        status: 'DONE',
        dueDate: '2026-05-04',
        updatedAt: '2026-05-03T11:00:00.000Z',
      }),
      task({
        id: 'no-due',
        status: 'WAITING_SUBMISSION',
        dueDate: null,
        updatedAt: '2026-05-03T12:00:00.000Z',
      }),
    ];

    const sorted = sortTaskList(tasks).map((item) => item.id);
    expect(sorted).toEqual(['second-incomplete', 'first-incomplete', 'no-due', 'done-task']);
  });

  it('buildTaskList keeps same behavior with includeArchived switch', () => {
    const tasks = [
      task({ id: 'arch1', status: 'ARCHIVED', dueDate: '2026-05-02' }),
      task({ id: 'work1', status: 'IN_PROGRESS', dueDate: '2026-05-05' }),
    ];

    expect(buildTaskList({ tasks, includeArchived: false }).map((item) => item.id)).toEqual(['work1']);

    expect(buildTaskList({ tasks, includeArchived: true }).map((item) => item.id)).toEqual([
      'work1',
      'arch1',
    ]);
  });

  it('breaks ties by id after same status, dueDate, and updatedAt', () => {
    const tasks = [
      task({ id: 'zulu', dueDate: '2026-05-05', status: 'IN_PROGRESS', updatedAt: '2026-05-04T00:00:00.000Z' }),
      task({ id: 'alpha', dueDate: '2026-05-05', status: 'IN_PROGRESS', updatedAt: '2026-05-04T00:00:00.000Z' }),
      task({ id: 'echo', dueDate: '2026-05-05', status: 'IN_PROGRESS', updatedAt: '2026-05-04T00:00:00.000Z' }),
    ];

    expect(sortTaskList(tasks).map((item) => item.id)).toEqual(['alpha', 'echo', 'zulu']);
  });

  it('creates official document draft with required defaults', () => {
    const draft = createOfficialDocumentDraft({ title: '테스트 공문' });

    expect(draft).toEqual(
      expect.objectContaining({
        type: 'OFFICIAL_DOCUMENT',
        calendarCategory: 'SCHOOL',
        title: '테스트 공문',
        status: 'RECEIVED',
      }),
    );
  });

  it('updates official document draft with touch timestamp', () => {
    const base = task({ updatedAt: '2026-05-01T10:00:00.000Z' });
    const updated = updateOfficialDocumentDraft(base, { title: '수정 테스트' });

    expect(updated).toMatchObject({ title: '수정 테스트' });
    expect(updated.updatedAt).not.toBe(base.updatedAt);
  });

  it('creates URL location link via helper', () => {
    const link = createOfficialDocumentLocationLink({
      type: 'URL',
      title: '행정 포털',
      value: 'https://example.com',
      memo: '메모',
    });

    expect(link).toEqual(
      expect.objectContaining({
        type: 'URL',
        title: '행정 포털',
        value: 'https://example.com',
        memo: '메모',
      }),
    );
  });

  it('marks status as 완료 via helper', () => {
    const base = task({ status: 'IN_PROGRESS', updatedAt: '2026-05-01T10:00:00.000Z' });
    const updated = setOfficialDocumentStatus(base, 'DONE');

    expect(updated.status).toBe('DONE');
    expect(updated.updatedAt).not.toBe(base.updatedAt);
  });

  it('preserves metadata when status changes to DONE', () => {
    const base = task({
      type: 'PERSONAL_DUE',
      calendarCategory: 'PERSONAL',
      dueDate: '2026-05-14',
      updatedAt: '2026-05-01T10:00:00.000Z',
    });

    const doneTask = setOfficialDocumentStatus(base, 'DONE');

    expect(doneTask.status).toBe('DONE');
    expect(doneTask.type).toBe('PERSONAL_DUE');
    expect(doneTask.calendarCategory).toBe('PERSONAL');
    expect(doneTask.dueDate).toBe('2026-05-14');
  });
});
