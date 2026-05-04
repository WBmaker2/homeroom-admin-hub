import {
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

export function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): T {
      const data = snapshot.data();
      return { ...data, id: snapshot.id } as T;
    },
    toFirestore(model: T): DocumentData {
      const payload = { ...model } as DocumentData;
      delete (payload as { id?: string }).id;
      return payload;
    },
  };
}
