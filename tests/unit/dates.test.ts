import { describe, expect, it } from 'vitest'
import { addDaysToLocalDateString, compareLocalDate, isLocalDate } from '../../src/utils/dates'

describe('dates', () => {
  it('validates leap day correctly', () => {
    expect(isLocalDate('2024-02-29')).toBe(true)
    expect(isLocalDate('2025-02-29')).toBe(false)
    expect(isLocalDate('2026-02-31')).toBe(false)
  })

  it('validates month/day ranges', () => {
    expect(isLocalDate('2026-13-01')).toBe(false)
    expect(isLocalDate('2026-00-10')).toBe(false)
    expect(isLocalDate('2026-12-00')).toBe(false)
    expect(isLocalDate('2026-11-31')).toBe(false)
  })

  it('compares with null on invalid input', () => {
    expect(compareLocalDate('2025-02-29', '2025-03-01')).toBeNull()
  })

  it('adds local days without timezone drift', () => {
    expect(addDaysToLocalDateString('2026-05-04', 7)).toBe('2026-05-11')
  })
})
