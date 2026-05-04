import { Link } from 'react-router-dom';
import type { TaskItem } from '../types/domain';
import { getTaskDetailHref } from './taskLinks';
import './TaskCard.css';

type TaskTypeLabel = {
  [key in TaskItem['type']]: string;
};

type TaskStatusLabel = {
  [key in TaskItem['status']]: string;
};

const taskTypeLabel: TaskTypeLabel = {
  OFFICIAL_DOCUMENT: '공문',
  CLASS_SUBMISSION: '수합판',
  PERSONAL_DUE: '개인 마감',
};

const taskStatusLabel: TaskStatusLabel = {
  RECEIVED: '접수',
  IN_PROGRESS: '처리 중',
  WAITING_SUBMISSION: '제출 대기',
  DONE: '완료',
  ARCHIVED: '보관',
};

type TaskCardProps = {
  task: TaskItem;
  onComplete: (taskId: string) => void;
};

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const hasCollection = task.linkedCollectionIds.length > 0;
  const hasAttachmentLocation = task.locationLinks.length > 0;
  const canComplete = task.status !== 'DONE' && task.status !== 'ARCHIVED';
  const completedLabel =
    task.status === 'DONE' ? '완료 처리됨' : task.status === 'ARCHIVED' ? '보관됨' : null;

  return (
    <article className="task-card">
      <div className="task-card-title-row">
        <h3 className="task-card-title">{task.title}</h3>
        <span className={`task-card-status-chip task-card-status-${task.status.toLowerCase()}`}>
          {taskStatusLabel[task.status]}
        </span>
      </div>

      <dl className="task-card-metadata">
        <div>
          <dt>유형</dt>
          <dd>{taskTypeLabel[task.type]}</dd>
        </div>
        <div>
          <dt>마감일</dt>
          <dd>{task.dueDate ?? '미정'}</dd>
        </div>
        <div>
          <dt>상태</dt>
          <dd>{taskStatusLabel[task.status]}</dd>
        </div>
        <div>
          <dt>연결 수합판 여부</dt>
          <dd>{hasCollection ? '있음' : '없음'}</dd>
        </div>
        <div>
          <dt>첨부 위치 여부</dt>
          <dd>{hasAttachmentLocation ? '있음' : '없음'}</dd>
        </div>
      </dl>

      <div className="task-card-actions">
        {canComplete ? (
          <button type="button" className="task-card-complete" onClick={() => onComplete(task.id)}>
            완료 처리
          </button>
        ) : (
          <span className="task-card-complete-text" role="status">
            {completedLabel}
          </span>
        )}
        <Link to={getTaskDetailHref(task)} className="task-card-detail-link">
          상세 보기
        </Link>
      </div>
    </article>
  );
}
