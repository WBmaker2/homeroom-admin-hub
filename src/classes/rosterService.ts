export type ParsedStudent = {
  studentNumber: number
  name: string
  displayName: string
}

export type RosterParseErrorCode = 'EMPTY_NUMBER' | 'EMPTY_NAME' | 'INVALID_NUMBER' | 'DUPLICATE_NUMBER'

export type RosterParseError = {
  row: number
  code: RosterParseErrorCode
  value: string
}

export type ParsedRoster = {
  students: ParsedStudent[]
  errors: RosterParseError[]
}

export type ParsedRosterRow = ParsedStudent & {
  row: number
}

export type ParsedRosterWithLineNumbers = {
  students: ParsedRosterRow[]
  errors: RosterParseError[]
}

export type ManualStudentInput = {
  studentNumber: string
  name: string
  displayName: string
}

export type ManualStudentValidationResult = {
  student: ParsedStudent | null
  errorMessage: string
}

const splitRow = (row: string): [string, string] => {
  const parts = row.split(/,|\t| {2,}/)
  const first = (parts[0] ?? '').trim()
  const second = parts
    .slice(1)
    .join(' ')
    .trim()
  return [first, second]
}

export const STUDENT_NUMBER_PATTERN = /^[1-9]\d*$/

export const parseStudentNumber = (value: string): number | null => {
  if (!STUDENT_NUMBER_PATTERN.test(value)) {
    return null
  }

  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}

const normalizeStudent = (value: string): string => value.trim()

const toTrimmedLines = (raw: string): { row: number; value: string }[] =>
  raw
    .split('\n')
    .map((line, index) => ({ row: index + 1, value: line.trim() }))
    .filter((line) => line.value.length > 0)

export const parseRosterRowsWithLineNumbers = (raw: string): ParsedRosterWithLineNumbers => {
  const students: ParsedRosterRow[] = []
  const errors: RosterParseError[] = []
  const seenNumbers = new Set<number>()

  const parsedRows = toTrimmedLines(raw)

  parsedRows.forEach((line) => {
    const rowNumber = line.row
    const [studentNumberRaw, nameRaw] = splitRow(line.value)

    if (!studentNumberRaw) {
      errors.push({
        row: rowNumber,
        code: 'EMPTY_NUMBER',
        value: line.value,
      })
      return
    }

    const parsedStudentNumber = parseStudentNumber(studentNumberRaw)
    if (parsedStudentNumber === null) {
      errors.push({
        row: rowNumber,
        code: 'INVALID_NUMBER',
        value: line.value,
      })
      return
    }
    const studentNumber = parsedStudentNumber

    if (!nameRaw) {
      errors.push({
        row: rowNumber,
        code: 'EMPTY_NAME',
        value: line.value,
      })
      return
    }

    if (seenNumbers.has(studentNumber)) {
      errors.push({
        row: rowNumber,
        code: 'DUPLICATE_NUMBER',
        value: line.value,
      })
      return
    }

    seenNumbers.add(studentNumber)
    students.push({
      row: rowNumber,
      studentNumber,
      name: nameRaw,
      displayName: nameRaw,
    })
  })

  return { students, errors }
}

export const parseRosterRows = (raw: string): ParsedRoster => {
  const parsed = parseRosterRowsWithLineNumbers(raw)
  return {
    students: parsed.students.map(({ studentNumber, name, displayName }) => ({
      studentNumber,
      name,
      displayName,
    })),
    errors: parsed.errors,
  }
}

export const getRosterParseErrorMessage = (code: RosterParseErrorCode): string => {
  switch (code) {
    case 'EMPTY_NUMBER':
      return '번호가 비어 있습니다.'
    case 'EMPTY_NAME':
      return '이름이 비어 있습니다.'
    case 'INVALID_NUMBER':
      return '번호는 숫자만 입력해야 합니다.'
    case 'DUPLICATE_NUMBER':
      return '이미 같은 번호가 존재합니다.'
    default:
      return '입력 형식이 올바르지 않습니다.'
  }
}

export const hasStudentNumber = (students: ParsedStudent[], studentNumber: number): boolean =>
  students.some((student) => student.studentNumber === studentNumber)

export const buildManualStudent = (
  input: ManualStudentInput,
  existingStudents: ParsedStudent[],
): ManualStudentValidationResult => {
  const studentNumberText = normalizeStudent(input.studentNumber)
  const name = input.name.trim()
  const displayName = input.displayName.trim()

  if (!studentNumberText) {
    return {
      student: null,
      errorMessage: '번호를 입력해 주세요.',
    }
  }

  const studentNumber = parseStudentNumber(studentNumberText)
  if (studentNumber === null) {
    return {
      student: null,
      errorMessage: '번호는 숫자만 입력해야 합니다.',
    }
  }

  if (hasStudentNumber(existingStudents, studentNumber)) {
    return {
      student: null,
      errorMessage: '이미 등록된 번호입니다.',
    }
  }

  if (!name) {
    return {
      student: null,
      errorMessage: '이름을 입력해 주세요.',
    }
  }

  return {
    student: {
      studentNumber,
      name,
      displayName: displayName || name,
    },
    errorMessage: '',
  }
}

export const sortRosterStudents = (students: ParsedStudent[]): ParsedStudent[] =>
  [...students].sort((left, right) => left.studentNumber - right.studentNumber)
