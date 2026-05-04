import { deleteDoc, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './client'
import { createConverter } from './converters'
import { userCollection } from './repository'

export type UserDataCollectionName = 'classes' | 'tasks' | 'collections' | 'templates'

type UserRecord = {
  id: string
}

const sortByRecentUpdate = <T extends UserRecord>(left: T, right: T): number => {
  const leftUpdatedAt = 'updatedAt' in left && typeof left.updatedAt === 'string' ? left.updatedAt : ''
  const rightUpdatedAt = 'updatedAt' in right && typeof right.updatedAt === 'string' ? right.updatedAt : ''

  if (leftUpdatedAt && rightUpdatedAt && leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt.localeCompare(leftUpdatedAt)
  }

  return left.id.localeCompare(right.id)
}

export async function loadUserRecords<T extends UserRecord>(
  userId: string,
  collectionName: UserDataCollectionName,
): Promise<T[]> {
  const collectionRef = userCollection(userId, collectionName).withConverter(createConverter<T>())
  const snapshot = await getDocs(collectionRef)

  return snapshot.docs
    .map((record) => record.data())
    .sort(sortByRecentUpdate)
}

export async function saveUserRecord<T extends UserRecord>(
  userId: string,
  collectionName: UserDataCollectionName,
  record: T,
): Promise<void> {
  const docRef = doc(userCollection(userId, collectionName), record.id).withConverter(createConverter<T>())
  await setDoc(docRef, record)
}

export async function deleteUserRecord(
  userId: string,
  collectionName: UserDataCollectionName,
  recordId: string,
): Promise<void> {
  await deleteDoc(doc(userCollection(userId, collectionName), recordId))
}

export async function replaceUserRecords<T extends UserRecord>(
  userId: string,
  collectionName: UserDataCollectionName,
  records: T[],
): Promise<void> {
  const collectionRef = userCollection(userId, collectionName)
  const currentSnapshot = await getDocs(collectionRef)
  const nextIds = new Set(records.map((record) => record.id))
  const batch = writeBatch(db)

  currentSnapshot.docs.forEach((snapshot) => {
    if (!nextIds.has(snapshot.id)) {
      batch.delete(snapshot.ref)
    }
  })

  records.forEach((record) => {
    batch.set(doc(collectionRef, record.id), record)
  })

  await batch.commit()
}
