import { useCallback, useEffect, useRef, useState } from 'react'
import { useOptionalAuth } from '../auth/AuthContext'
import { isDemoAuthMode } from './environment'
import {
  loadUserRecords,
  replaceUserRecords,
  type UserDataCollectionName,
} from './userDataStore'

type RecordWithId = {
  id: string
}

type UseUserRecordsInput<T extends RecordWithId> = {
  collectionName: UserDataCollectionName
  getInitialRecords: () => T[]
  onSaveLocal?: (records: T[]) => T[] | void
}

const cloneRecords = <T extends RecordWithId>(records: T[]): T[] =>
  records.map((record) => ({ ...record }))

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Firestore 저장 중 문제가 발생했습니다.'
}

export function useUserRecords<T extends RecordWithId>({
  collectionName,
  getInitialRecords,
  onSaveLocal,
}: UseUserRecordsInput<T>) {
  const auth = useOptionalAuth()
  const demoMode = isDemoAuthMode()
  const userId = auth?.user?.uid ?? null
  const usingFirestore = !demoMode && Boolean(userId)
  const [records, setRecordsState] = useState<T[]>(() => cloneRecords(getInitialRecords()))
  const [loading, setLoading] = useState(usingFirestore)
  const [error, setError] = useState('')
  const recordsRef = useRef(records)
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    recordsRef.current = records
  }, [records])

  useEffect(() => {
    let active = true

    if (!usingFirestore || !userId) {
      void Promise.resolve().then(() => {
        if (active) {
          setLoading(false)
        }
      })
      return () => {
        active = false
      }
    }

    void Promise.resolve()
      .then(() => {
        if (!active) return []
        setError('')
        setLoading(true)
        return loadUserRecords<T>(userId, collectionName)
      })
      .then((loadedRecords) => {
        if (!active) return
        const next = cloneRecords(loadedRecords)
        recordsRef.current = next
        setRecordsState(next)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setError(toErrorMessage(loadError))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [collectionName, userId, usingFirestore])

  const persistRecords = useCallback(
    async (nextRecords: T[]): Promise<T[]> => {
      const normalized = cloneRecords(nextRecords)
      setError('')

      if (usingFirestore && userId) {
        await replaceUserRecords(userId, collectionName, normalized)
        return normalized
      }

      const saved = onSaveLocal?.(normalized)
      return cloneRecords(saved ?? normalized)
    },
    [collectionName, onSaveLocal, userId, usingFirestore],
  )

  const setRecords = useCallback(
    (nextRecordsOrUpdater: T[] | ((current: T[]) => T[])): Promise<T[]> => {
      const operation = writeQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const nextRecords =
            typeof nextRecordsOrUpdater === 'function'
              ? nextRecordsOrUpdater(cloneRecords(recordsRef.current))
              : nextRecordsOrUpdater

          try {
            const saved = await persistRecords(nextRecords)
            recordsRef.current = saved
            setRecordsState(saved)
            return saved
          } catch (error: unknown) {
            setError(toErrorMessage(error))
            throw error
          }
        })

      writeQueueRef.current = operation.then(
        () => undefined,
        () => undefined,
      )
      return operation
    },
    [persistRecords],
  )

  return {
    error,
    loading,
    records,
    setRecords,
    userId,
    usingFirestore,
  }
}
