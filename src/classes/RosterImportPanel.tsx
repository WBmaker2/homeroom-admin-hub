import { type FormEvent, useState } from 'react'
import {
  getRosterParseErrorMessage,
  parseRosterRowsWithLineNumbers,
  sortRosterStudents,
  type ParsedRosterRow,
  type ParsedStudent,
  type RosterParseError,
} from './rosterService'

type RosterImportPanelProps = {
  currentStudents: ParsedStudent[]
  disabled: boolean
  onImport: (students: ParsedStudent[]) => void
}

type FeedbackState = {
  text: string
  kind: 'status' | 'alert'
}

const toLineErrorMessage = (error: RosterParseError): string =>
  `${error.row}행: ${getRosterParseErrorMessage(error.code)}`

export function RosterImportPanel({ currentStudents, disabled, onImport }: RosterImportPanelProps) {
  const [rawRows, setRawRows] = useState('')
  const [errors, setErrors] = useState<RosterParseError[]>([])
  const [info, setInfo] = useState<FeedbackState>({
    text: '',
    kind: 'status',
  })

  const existingNumbers = new Set(currentStudents.map((student) => student.studentNumber))

  const handleImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setInfo({ text: '', kind: 'status' })
    setErrors([])

    const parsed = parseRosterRowsWithLineNumbers(rawRows)
    const duplicateErrors: RosterParseError[] = []
    const validRowsForImport: ParsedRosterRow[] = []

    parsed.students.forEach((student) => {
      if (existingNumbers.has(student.studentNumber)) {
        duplicateErrors.push({
          row: student.row,
          code: 'DUPLICATE_NUMBER',
          value: `${student.studentNumber},${student.name}`,
        })
        return
      }

      validRowsForImport.push(student)
    })

    const mergedErrors = [...parsed.errors, ...duplicateErrors]
    const studentsToImport = validRowsForImport.map(
      ({ studentNumber, name, displayName }) => ({
        studentNumber,
        name,
        displayName,
      }),
    )

    if (mergedErrors.length > 0) {
      setErrors(mergedErrors)
      if (!rawRows.trim()) {
        setInfo({ text: '붙여넣을 데이터가 없습니다.', kind: 'alert' })
      } else {
        setInfo({
          text: `${mergedErrors.length}개의 에러를 수정한 뒤 다시 시도해 주세요.`,
          kind: 'alert',
        })
      }
      return
    }

    if (studentsToImport.length === 0) {
      setErrors([])
      setInfo({ text: '처리할 유효 데이터가 없습니다.', kind: 'alert' })
      return
    }

    onImport(sortRosterStudents(studentsToImport))
    setRawRows('')
    setInfo({ text: `${studentsToImport.length}명의 학생을 등록했습니다.`, kind: 'status' })
  }

  return (
    <section className="classes-import">
      <h3 className="classes-section-title">표 붙여넣기로 학생 추가</h3>
      <p className="classes-import-hint">
        쉼표(,), 탭(Tab), 또는 두 칸 이상 공백으로 구분된 <b>번호,이름</b> 형식으로 붙여넣어 주세요.
      </p>
      <form onSubmit={handleImport} className="classes-import-form">
        <label className="classes-import-field">
          <span>학생 목록 붙여넣기</span>
          <textarea
            className="classes-textarea"
            rows={7}
            value={rawRows}
            onChange={(event) => setRawRows(event.target.value)}
            placeholder={'1,김가온\n2\t이도윤'}
            disabled={disabled}
          />
        </label>
        <button type="submit" disabled={disabled || rawRows.trim().length === 0} className="classes-primary-action">
          붙여넣기 적용
        </button>
      </form>

      {info.text && (
        <p className="classes-status" role={info.kind} aria-live="polite">
          {info.text}
        </p>
      )}

      {errors.length > 0 ? (
        <section className="classes-import-errors">
          <h4 className="classes-subtitle">수정 필요</h4>
          <ul>
            {errors.map((error) => (
              <li key={`${error.row}-${error.code}-${error.value}`}>
                <span className="classes-error-row">{toLineErrorMessage(error)}</span>
                <span className="classes-error-value">{error.value}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  )
}
