import { collection, doc } from 'firebase/firestore';
import { db } from './client';

export function userDoc(userId: string) {
  return doc(db, 'users', userId);
}

export function userTaskDoc(userId: string, taskId: string) {
  return doc(db, 'users', userId, 'tasks', taskId);
}

export function userCollection(
  userId: string,
  name: 'classes' | 'students' | 'tasks' | 'collections' | 'templates',
) {
  return collection(db, 'users', userId, name);
}
