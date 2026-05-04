import type { TaskItem } from '../types/domain';

export const getTaskDetailHref = (task: TaskItem): string => {
  switch (task.type) {
    case 'OFFICIAL_DOCUMENT':
      return `/app/tasks/${task.id}`;
    case 'CLASS_SUBMISSION':
      return `/app/collections?taskId=${encodeURIComponent(task.id)}`;
    default:
      return `/app/tasks?taskId=${encodeURIComponent(task.id)}`;
  }
};
