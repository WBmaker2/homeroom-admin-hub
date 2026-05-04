import type { LocationType } from '../types/domain'

type ValidLocationValidation = {
  valid: true
}

type InvalidLocationValidation = {
  valid: false
  fallbackType: LocationType
}

export type LocationValidationResult = ValidLocationValidation | InvalidLocationValidation

const isNonEmptyString = (value: string): boolean => value.trim().length > 0

const isPortalDocNumber = (value: string): boolean => /^[가-힣a-zA-Z0-9]+-\d+$/u.test(value)

const isUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const fallbackType: LocationType = 'NOTE'

export const validateLocationValue = (
  type: LocationType,
  value: string,
): LocationValidationResult => {
  const normalized = value.trim()

  if (normalized.length === 0) {
    return { valid: false, fallbackType }
  }

  switch (type) {
    case 'URL':
      if (!isUrl(normalized)) {
        return { valid: false, fallbackType }
      }
      return { valid: true }

    case 'PORTAL_DOC_NUMBER':
      if (!isPortalDocNumber(normalized)) {
        return { valid: false, fallbackType }
      }
      return { valid: true }

    case 'SCHOOL_MESSENGER':
      if (!isNonEmptyString(normalized)) {
        return { valid: false, fallbackType }
      }
      return { valid: true }

    case 'LOCAL_FOLDER':
      if (!isNonEmptyString(normalized)) {
        return { valid: false, fallbackType }
      }
      return { valid: true }

    case 'NOTE':
    default:
      return { valid: true }
  }
}
