export const DEMO_USER_ID = 'demo-user'

type RequestedAppMode = 'auto' | 'demo' | 'live'

const firebaseEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const

const requiredFirebaseEnvLabels: Record<keyof typeof firebaseEnv, string> = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID',
}

const isFilled = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const getRequestedAppMode = (): RequestedAppMode => {
  const mode = import.meta.env.VITE_APP_MODE

  if (mode === 'demo' || mode === 'live') {
    return mode
  }

  return 'auto'
}

export const missingFirebaseConfigKeys = (): string[] => {
  return Object.entries(firebaseEnv)
    .filter(([, value]) => !isFilled(value))
    .map(([key]) => requiredFirebaseEnvLabels[key as keyof typeof firebaseEnv])
}

export const hasFirebaseConfig = (): boolean => missingFirebaseConfigKeys().length === 0

export const getFirebaseConfig = () => ({
  apiKey: firebaseEnv.apiKey,
  authDomain: firebaseEnv.authDomain,
  projectId: firebaseEnv.projectId,
  appId: firebaseEnv.appId,
})

export const isDemoAuthMode = (): boolean => {
  const requestedMode = getRequestedAppMode()

  if (requestedMode === 'demo') {
    return true
  }

  if (requestedMode === 'live') {
    return false
  }

  if (import.meta.env.MODE === 'test') {
    return import.meta.env.VITE_DEMO_AUTH_USER === DEMO_USER_ID
  }

  return import.meta.env.VITE_DEMO_AUTH_USER === DEMO_USER_ID || !hasFirebaseConfig()
}

export const getRuntimeModeLabel = (): string => {
  if (isDemoAuthMode()) {
    return '데모 모드'
  }

  return hasFirebaseConfig() ? '실사용 모드' : '설정 점검 필요'
}

export const getRuntimeModeDescription = (): string => {
  if (isDemoAuthMode()) {
    return '현재 화면은 데모 데이터로 동작합니다. 입력 내용은 브라우저 임시 저장소를 기준으로 확인합니다.'
  }

  if (!hasFirebaseConfig()) {
    return `실사용 모드가 요청되었지만 Firebase 설정이 비어 있습니다: ${missingFirebaseConfigKeys().join(', ')}`
  }

  return 'Firebase Auth와 사용자별 Firestore 경계를 사용하는 실사용 모드입니다.'
}
