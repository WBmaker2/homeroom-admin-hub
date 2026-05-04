import { describe, expect, it } from 'vitest'
import {
  buildManualStudent,
  parseRosterRows,
  parseRosterRowsWithLineNumbers,
  type ManualStudentInput,
} from '../../src/classes/rosterService'

const existingStudents = [
  {
    studentNumber: 1,
    name: '김가온',
    displayName: '김가온',
  },
]

describe('parseRosterRows', () => {
  it('parses comma separated valid rows', () => {
    expect(parseRosterRows('1,김가온\n2,이도윤').students).toEqual([
      {
        studentNumber: 1,
        name: '김가온',
        displayName: '김가온',
      },
      {
        studentNumber: 2,
        name: '이도윤',
        displayName: '이도윤',
      },
    ])
  })

  it('returns EMPTY_NAME when row misses student name', () => {
    const result = parseRosterRows('1,\n2,이도윤')
    expect(result.errors[0].code).toBe('EMPTY_NAME')
  })

  it('rejects invalid student numbers', () => {
    expect(parseRosterRows('0,김가온').students).toHaveLength(0)
    expect(parseRosterRows('0,김가온').errors[0].code).toBe('INVALID_NUMBER')
    expect(parseRosterRows('00,김가온').errors[0].code).toBe('INVALID_NUMBER')
    expect(parseRosterRows('-3,김가온').errors[0].code).toBe('INVALID_NUMBER')
    expect(parseRosterRows('1.5,김가온').errors[0].code).toBe('INVALID_NUMBER')
    expect(parseRosterRows('A,김가온').errors[0].code).toBe('INVALID_NUMBER')
  })

  it('reports invalid student numbers with row numbers for pasted input', () => {
    const result = parseRosterRowsWithLineNumbers('1,김가온\n0,이도윤\n00,박영희\n-3,최민수\n1.5,정민재\nA,유진')

    expect(result.students).toEqual([
      {
        row: 1,
        studentNumber: 1,
        name: '김가온',
        displayName: '김가온',
      },
    ])
    expect(result.errors).toEqual([
      { row: 2, code: 'INVALID_NUMBER', value: '0,이도윤' },
      { row: 3, code: 'INVALID_NUMBER', value: '00,박영희' },
      { row: 4, code: 'INVALID_NUMBER', value: '-3,최민수' },
      { row: 5, code: 'INVALID_NUMBER', value: '1.5,정민재' },
      { row: 6, code: 'INVALID_NUMBER', value: 'A,유진' },
    ])
  })

  it('returns DUPLICATE_NUMBER for repeated student number', () => {
    const result = parseRosterRowsWithLineNumbers('1,김가온\n1,이도윤\n2,박영희\n')
    expect(result.errors[0].code).toBe('DUPLICATE_NUMBER')
    expect(result.errors[0].row).toBe(2)
    expect(result.errors[0].value).toBe('1,이도윤')
  })

  it('keeps original line numbers on parse errors', () => {
    const result = parseRosterRowsWithLineNumbers('1,김가온\n,이도윤\n2,박영희')
    expect(result.errors[0]).toEqual({
      row: 2,
      code: 'EMPTY_NUMBER',
      value: ',이도윤',
    })
  })

  it('supports duplicate row parsing and row numbers on valid lines', () => {
    const result = parseRosterRowsWithLineNumbers('1,김가온\n2\t이도윤\n3  박영희')
    expect(result.students).toEqual([
      { row: 1, studentNumber: 1, name: '김가온', displayName: '김가온' },
      { row: 2, studentNumber: 2, name: '이도윤', displayName: '이도윤' },
      { row: 3, studentNumber: 3, name: '박영희', displayName: '박영희' },
    ])
  })

  it('rejects manual import for duplicate student number', () => {
    const input: ManualStudentInput = { studentNumber: '1', name: '이도윤', displayName: '이도윤' }
    const result = buildManualStudent(input, existingStudents)
    expect(result.student).toBeNull()
    expect(result.errorMessage).toBe('이미 등록된 번호입니다.')
  })

  it('trims and normalizes display name on valid manual add', () => {
    const input: ManualStudentInput = {
      studentNumber: ' 15 ',
      name: ' 홍 길동 ',
      displayName: '   ',
    }
    const result = buildManualStudent(input, existingStudents)
    expect(result.student).toEqual({
      studentNumber: 15,
      name: '홍 길동',
      displayName: '홍 길동',
    })
    expect(result.errorMessage).toBe('')
  })

  it('invalid manual student number cases', () => {
    const inputForZero: ManualStudentInput = { studentNumber: '0', name: '김가온', displayName: '' }
    const inputForLeadingZero: ManualStudentInput = {
      studentNumber: '00',
      name: '김가온',
      displayName: '',
    }
    const inputForDecimal: ManualStudentInput = {
      studentNumber: '1.5',
      name: '김가온',
      displayName: '',
    }
    const inputForNegative: ManualStudentInput = {
      studentNumber: '-3',
      name: '김가온',
      displayName: '',
    }

    expect(buildManualStudent(inputForZero, existingStudents).student).toBeNull()
    expect(buildManualStudent(inputForZero, existingStudents).errorMessage).toBe('번호는 숫자만 입력해야 합니다.')
    expect(buildManualStudent(inputForLeadingZero, existingStudents).student).toBeNull()
    expect(buildManualStudent(inputForLeadingZero, existingStudents).errorMessage).toBe(
      '번호는 숫자만 입력해야 합니다.',
    )
    expect(buildManualStudent(inputForDecimal, existingStudents).student).toBeNull()
    expect(buildManualStudent(inputForDecimal, existingStudents).errorMessage).toBe('번호는 숫자만 입력해야 합니다.')
    expect(buildManualStudent(inputForNegative, existingStudents).student).toBeNull()
    expect(buildManualStudent(inputForNegative, existingStudents).errorMessage).toBe('번호는 숫자만 입력해야 합니다.')
  })

  it('parses tab-separated input', () => {
    expect(parseRosterRows('1\t김가온\n2\t이도윤').students).toEqual([
      {
        studentNumber: 1,
        name: '김가온',
        displayName: '김가온',
      },
      {
        studentNumber: 2,
        name: '이도윤',
        displayName: '이도윤',
      },
    ])
  })

  it('parses two-or-more-space-separated input', () => {
    expect(parseRosterRows('1  김가온\n2  이도윤').students).toEqual([
      {
        studentNumber: 1,
        name: '김가온',
        displayName: '김가온',
      },
      {
        studentNumber: 2,
        name: '이도윤',
        displayName: '이도윤',
      },
    ])
  })
})
