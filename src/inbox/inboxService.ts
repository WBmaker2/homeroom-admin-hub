import {
  addDaysToLocalDateString,
  compareLocalDate,
  isAfterDate,
  isBeforeDate,
  isSameDate,
} from '../utils/dates'
import { completionRate } from '../collections/collectionService'
import type { SubmissionCollection, TaskItem } from '../types/domain'

export type InboxItem = TaskItem & {
  collectionCompletionRate: number | null
}

export type InboxSections = {
  overdue: InboxItem[]
  today: InboxItem[]
  incompleteCollections: InboxItem[]
  upcoming: InboxItem[]
}

type BuildInboxSectionsInput = {
  today: string
  tasks: TaskItem[]
  collections: SubmissionCollection[]
}

const toCollectionRatesByTaskId = (collections: SubmissionCollection[]) => {
  const map = new Map<string, number[]>()

  for (const collection of collections) {
    const rates = map.get(collection.taskId) ?? []
    rates.push(completionRate(collection))
    map.set(collection.taskId, rates)
  }

  return map
}

const taskCollectionCompletionRate = (
  task: TaskItem,
  collectionRatesByTaskId: Map<string, number[]>,
): number | null => {
  const rates = collectionRatesByTaskId.get(task.id)
  if (!rates || rates.length === 0) {
    return null
  }

  return rates.reduce((acc, value) => acc + value, 0) / rates.length
}

const hasIncompleteCollection = (
  task: TaskItem,
  collectionRatesByTaskId: Map<string, number[]>,
): boolean => {
  return (collectionRatesByTaskId.get(task.id) ?? []).some((rate) => rate < 1)
}

const toInboxItem = (
  task: TaskItem,
  collectionRatesByTaskId: Map<string, number[]>,
): InboxItem => ({
  ...task,
  collectionCompletionRate: taskCollectionCompletionRate(task, collectionRatesByTaskId),
})

const sortInboxItems = (left: InboxItem, right: InboxItem): number => {
  if (left.dueDate && right.dueDate) {
    const dateDiff = compareLocalDate(left.dueDate, right.dueDate)
    if (dateDiff !== null && dateDiff !== 0) {
      return dateDiff
    }
  }

  return right.updatedAt.localeCompare(left.updatedAt)
}

export const buildInboxSections = ({
  today,
  tasks,
  collections,
}: BuildInboxSectionsInput): InboxSections => {
  const collectionRatesByTaskId = toCollectionRatesByTaskId(collections)
  const sections: InboxSections = {
    overdue: [],
    today: [],
    incompleteCollections: [],
    upcoming: [],
  }

  const upcomingCutoff = addDaysToLocalDateString(today, 7)

  if (compareLocalDate(today, upcomingCutoff) === null) {
    return sections
  }

  for (const task of tasks) {
    if (task.status === 'DONE' || task.status === 'ARCHIVED') {
      continue
    }

    if (!task.dueDate || compareLocalDate(task.dueDate, today) === null) {
      continue
    }

    const item = toInboxItem(task, collectionRatesByTaskId)
    const hasIncomplete = hasIncompleteCollection(task, collectionRatesByTaskId)
    const taskDueDate = task.dueDate

    if (isBeforeDate(taskDueDate, today)) {
      sections.overdue.push(item)
      continue
    }

    if (isSameDate(taskDueDate, today)) {
      sections.today.push(item)
      continue
    }

    if (hasIncomplete && !isAfterDate(taskDueDate, upcomingCutoff)) {
      sections.incompleteCollections.push(item)
      continue
    }

    if (isAfterDate(taskDueDate, today) && !isAfterDate(taskDueDate, upcomingCutoff)) {
      sections.upcoming.push(item)
    }
  }

  sections.overdue.sort(sortInboxItems)
  sections.today.sort(sortInboxItems)
  sections.incompleteCollections.sort(sortInboxItems)
  sections.upcoming.sort(sortInboxItems)

  return sections
}
