const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

const isValidMonthDay = (year: number, month: number, day: number): boolean => {
  if (month < 1 || month > 12) {
    return false
  }

  if (day < 1) {
    return false
  }

  const monthDays = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= monthDays[month - 1]
}

const parseLocalDateParts = (value: string): [number, number, number] | null => {
  if (!LOCAL_DATE_RE.test(value)) {
    return null
  }

  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!isValidMonthDay(year, month, day)) {
    return null
  }

  return [year, month, day]
}

export const isLocalDate = (value: string): value is string => parseLocalDateParts(value) !== null

export const compareLocalDate = (left: string, right: string): number | null => {
  const leftParts = parseLocalDateParts(left)
  const rightParts = parseLocalDateParts(right)

  if (!leftParts || !rightParts) {
    return null
  }

  const [leftYear, leftMonth, leftDay] = leftParts
  const [rightYear, rightMonth, rightDay] = rightParts

  if (leftYear !== rightYear) {
    return leftYear - rightYear
  }

  if (leftMonth !== rightMonth) {
    return leftMonth - rightMonth
  }

  return leftDay - rightDay
}

export const isBeforeDate = (left: string, right: string): boolean => {
  const diff = compareLocalDate(left, right)
  return diff !== null && diff < 0
}

export const isAfterDate = (left: string, right: string): boolean => {
  const diff = compareLocalDate(left, right)
  return diff !== null && diff > 0
}

export const isSameDate = (left: string, right: string): boolean => {
  const diff = compareLocalDate(left, right)
  return diff !== null && diff === 0
}

export const toLocalDateString = (date = new Date()): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toDateFromLocalDateString = (value: string): Date | null => {
  const parts = parseLocalDateParts(value)
  if (!parts) {
    return null
  }

  const [year, month, day] = parts
  return new Date(year, month - 1, day)
}

export const addDaysToLocalDateString = (value: string, days: number): string => {
  const parsed = toDateFromLocalDateString(value)
  if (!parsed) {
    return value
  }

  const shifted = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + days)
  return toLocalDateString(shifted)
}
