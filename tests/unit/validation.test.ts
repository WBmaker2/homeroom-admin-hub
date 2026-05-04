import { describe, expect, it } from 'vitest'
import { validateLocationValue } from '../../src/utils/validation'

describe('validateLocationValue', () => {
  it('validates URL location type', () => {
    expect(validateLocationValue('URL', 'https://drive.google.com/file/d/abc')).toEqual({
      valid: true,
    })
    expect(validateLocationValue('URL', '업무포털 123')).toEqual({
      valid: false,
      fallbackType: 'NOTE',
    })
    expect(validateLocationValue('URL', '   ')).toEqual({
      valid: false,
      fallbackType: 'NOTE',
    })
  })

  it('validates portal document number', () => {
    expect(validateLocationValue('PORTAL_DOC_NUMBER', '서울교육-1234')).toEqual({ valid: true })
  })
})
