# Homeroom Admin Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this workspace, AGENTS.md requires worker subagents to use GPT-5.3-Codex-Spark, while the orchestrator and review agent stay on the main model.

**Goal:** Build the first version of "담임 행정 허브: 오늘 처리할 업무함", a login-based personal web app for homeroom teachers to manage official documents, collection boards, reusable templates, and deadlines without storing files.

**Architecture:** Start from an empty repository and build a React + Vite + TypeScript single-page app. Use Firebase Authentication and Firestore with every document stored under `users/{userId}`; keep domain rules in pure TypeScript services so inbox grouping, roster parsing, completion rates, template interpolation, and deletion cascades are testable without a browser.

**Tech Stack:** React, Vite, TypeScript, React Router, Firebase Auth, Firestore, Vitest, React Testing Library, Playwright, CSS custom properties, lucide-react icons.

---

## Source Spec

- Primary requirements document: `2026-05-04-homeroom-admin-inbox-design.md`
- Current repository state: empty app project with only the requirements document and this implementation plan.
- Open Design route: `/opendesign` -> `open-design-saas-landing`, with a workspace `DESIGN.md` created before producing the landing page artifact.

## Implementation Decisions

- Use a React + Vite app because this is a new complex app UI and there is no existing framework constraint.
- Use Firebase Auth email/password for first-version login. Add Google sign-in only after the user provides Firebase provider configuration.
- Store all app data under `users/{uid}` and enforce that boundary in Firestore rules.
- Do not add file upload UI. Store only URL, 업무포털 문서번호, 학교 메신저 위치, 로컬 폴더 위치, or 기타 메모.
- Treat `/` as the signed-out Open Design landing page. After login, route to `/app/inbox`.
- Use an Airtable-inspired light, structured, table-friendly design direction for the landing page and app shell: white surfaces, deep navy text, cobalt/blue primary action, restrained borders, no decorative gradient-orb backgrounds.
- Keep the first implementation personal-only: one owner, no shared classes, no school system integrations.

## File Structure

Create these files and keep responsibilities narrow:

```text
.
├── DESIGN.md
├── design/
│   └── opendesign-landing.html
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── package.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── app/
│   │   ├── AppShell.tsx
│   │   ├── AuthGate.tsx
│   │   └── routes.tsx
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   ├── LoginPage.tsx
│   │   └── authService.ts
│   ├── calendar/
│   │   ├── CalendarPage.tsx
│   │   └── calendarService.ts
│   ├── classes/
│   │   ├── ClassesPage.tsx
│   │   ├── RosterImportPanel.tsx
│   │   └── rosterService.ts
│   ├── collections/
│   │   ├── CollectionDetailPage.tsx
│   │   ├── CollectionsPage.tsx
│   │   └── collectionService.ts
│   ├── design/
│   │   ├── tokens.css
│   │   └── ui.tsx
│   ├── firebase/
│   │   ├── client.ts
│   │   ├── converters.ts
│   │   └── repository.ts
│   ├── inbox/
│   │   ├── InboxPage.tsx
│   │   ├── TaskCard.tsx
│   │   └── inboxService.ts
│   ├── landing/
│   │   └── LandingPage.tsx
│   ├── tasks/
│   │   ├── OfficialDocumentPage.tsx
│   │   ├── TaskListPage.tsx
│   │   ├── TaskEditor.tsx
│   │   └── taskService.ts
│   ├── templates/
│   │   ├── TemplateEditor.tsx
│   │   ├── TemplatesPage.tsx
│   │   └── templateService.ts
│   ├── types/
│   │   └── domain.ts
│   └── utils/
│       ├── dates.ts
│       └── validation.ts
├── tests/
│   ├── e2e/
│   │   ├── app-flows.spec.ts
│   │   └── no-file-upload.spec.ts
│   ├── setup.ts
│   └── unit/
│       ├── collectionService.test.ts
│       ├── inboxService.test.ts
│       ├── rosterService.test.ts
│       ├── templateService.test.ts
│       └── validation.test.ts
└── vite.config.ts
```

## Data Model

Use these TypeScript shapes in `src/types/domain.ts`:

```ts
export type UserRole = 'OWNER';

export type ClassRoom = {
  id: string;
  userId: string;
  schoolYear: number;
  schoolLevel: '초등학교' | '중학교' | '고등학교' | '기타';
  grade: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Student = {
  id: string;
  userId: string;
  classId: string;
  studentNumber: number;
  name: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskType = 'OFFICIAL_DOCUMENT' | 'CLASS_SUBMISSION' | 'PERSONAL_DUE';
export type CalendarCategory = 'SCHOOL' | 'CLASS' | 'PERSONAL';
export type TaskStatus = 'RECEIVED' | 'IN_PROGRESS' | 'WAITING_SUBMISSION' | 'DONE' | 'ARCHIVED';
export type LocationType = 'URL' | 'PORTAL_DOC_NUMBER' | 'SCHOOL_MESSENGER' | 'LOCAL_FOLDER' | 'NOTE';

export type LocationLink = {
  id: string;
  type: LocationType;
  title: string;
  value: string;
  memo: string;
};

export type TaskItem = {
  id: string;
  userId: string;
  type: TaskType;
  calendarCategory: CalendarCategory;
  title: string;
  dueDate: string | null;
  status: TaskStatus;
  memo: string;
  sourceMemo: string;
  submissionTarget: string;
  locationLinks: LocationLink[];
  linkedCollectionIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CollectionStatus = 'MISSING' | 'SUBMITTED' | 'NEEDS_REVISION' | 'NOT_APPLICABLE';

export type CollectionRow = {
  studentId: string;
  status: CollectionStatus;
  submittedAt: string | null;
  memo: string;
};

export type SubmissionCollection = {
  id: string;
  userId: string;
  classId: string;
  officialDocumentTaskId: string | null;
  taskId: string;
  title: string;
  dueDate: string | null;
  rows: Record<string, CollectionRow>;
  createdAt: string;
  updatedAt: string;
};

export type TemplateType = 'NOTICE' | 'COUNSELING_FORM' | 'REPORT_PHRASE' | 'SUBMISSION_REMINDER' | 'OTHER';

export type TemplateItem = {
  id: string;
  userId: string;
  title: string;
  type: TemplateType;
  body: string;
  tags: string[];
  replacementKeys: string[];
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

Firestore collections:

```text
users/{uid}/classes/{classId}
users/{uid}/students/{studentId}
users/{uid}/tasks/{taskId}
users/{uid}/collections/{collectionId}
users/{uid}/templates/{templateId}
```

---

## Task 1: Scaffold the React App

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `tests/setup.ts`

- [ ] **Step 1: Create the Vite scaffold outside the non-empty repo**

Run:

```bash
npm create vite@latest /private/tmp/homeroom-admin-hub-vite -- --template react-ts
rsync -a /private/tmp/homeroom-admin-hub-vite/ ./
```

Expected: `package.json`, `index.html`, `src/main.tsx`, and `vite.config.ts` appear in the repository while the existing requirements document remains.

- [ ] **Step 2: Install runtime dependencies**

Run:

```bash
npm install firebase react-router-dom lucide-react date-fns zod clsx
```

Expected: `package-lock.json` is created and dependencies are listed in `package.json`.

- [ ] **Step 3: Install test dependencies**

Run:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```

Expected: dev dependencies are listed in `package.json`.

- [ ] **Step 4: Configure Vitest**

Update `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
});
```

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Replace the default app with initial route shell text**

Update `src/App.tsx`:

```tsx
export function App() {
  return <div>담임 행정 허브 준비 중</div>;
}

export default App;
```

- [ ] **Step 6: Verify scaffold**

Run:

```bash
npm run build
npm test -- --run
```

Expected: build passes; test command exits successfully even before app tests are added.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts index.html src tests
git commit -m "chore: scaffold homeroom admin hub"
```

---

## Task 2: Add Domain Types and Pure Services

**Files:**
- Create: `src/types/domain.ts`
- Create: `src/utils/dates.ts`
- Create: `src/utils/validation.ts`
- Create: `src/inbox/inboxService.ts`
- Create: `src/classes/rosterService.ts`
- Create: `src/collections/collectionService.ts`
- Create: `src/templates/templateService.ts`
- Test: `tests/unit/inboxService.test.ts`
- Test: `tests/unit/rosterService.test.ts`
- Test: `tests/unit/collectionService.test.ts`
- Test: `tests/unit/templateService.test.ts`
- Test: `tests/unit/validation.test.ts`

- [ ] **Step 1: Add the domain model**

Create `src/types/domain.ts` using the full Data Model section above.

- [ ] **Step 2: Write inbox grouping tests first**

Create `tests/unit/inboxService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildInboxSections } from '../../src/inbox/inboxService';
import type { SubmissionCollection, TaskItem } from '../../src/types/domain';

const baseTask = (overrides: Partial<TaskItem>): TaskItem => ({
  id: 'task-1',
  userId: 'user-1',
  type: 'OFFICIAL_DOCUMENT',
  calendarCategory: 'SCHOOL',
  title: '가정통신문 제출',
  dueDate: '2026-05-04',
  status: 'RECEIVED',
  memo: '',
  sourceMemo: '',
  submissionTarget: '학년부',
  locationLinks: [],
  linkedCollectionIds: [],
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const baseCollection = (overrides: Partial<SubmissionCollection>): SubmissionCollection => ({
  id: 'collection-1',
  userId: 'user-1',
  classId: 'class-1',
  officialDocumentTaskId: null,
  taskId: 'task-collection',
  title: '개인정보 동의서',
  dueDate: '2026-05-06',
  rows: {
    'student-1': { studentId: 'student-1', status: 'MISSING', submittedAt: null, memo: '' },
    'student-2': { studentId: 'student-2', status: 'SUBMITTED', submittedAt: '2026-05-01', memo: '' },
  },
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

describe('buildInboxSections', () => {
  it('puts overdue unfinished items only in overdue', () => {
    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks: [baseTask({ id: 'overdue', dueDate: '2026-05-03' })],
      collections: [],
    });

    expect(sections.overdue.map((item) => item.id)).toEqual(['overdue']);
    expect(sections.today).toHaveLength(0);
    expect(sections.incompleteCollections).toHaveLength(0);
    expect(sections.upcoming).toHaveLength(0);
  });

  it('deduplicates today collection tasks before incomplete collection section', () => {
    const sections = buildInboxSections({
      today: '2026-05-04',
      tasks: [baseTask({ id: 'task-collection', type: 'CLASS_SUBMISSION', dueDate: '2026-05-04' })],
      collections: [baseCollection({ taskId: 'task-collection', dueDate: '2026-05-04' })],
    });

    expect(sections.today.map((item) => item.id)).toEqual(['task-collection']);
    expect(sections.incompleteCollections).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Implement inbox grouping**

Create `src/inbox/inboxService.ts`:

```ts
import type { SubmissionCollection, TaskItem } from '../types/domain';
import { completionRate } from '../collections/collectionService';
import { compareLocalDate, isWithinNextDays } from '../utils/dates';

export type InboxItem = TaskItem & {
  collectionCompletionRate: number | null;
};

export type InboxSections = {
  overdue: InboxItem[];
  today: InboxItem[];
  incompleteCollections: InboxItem[];
  upcoming: InboxItem[];
};

export function buildInboxSections(input: {
  today: string;
  tasks: TaskItem[];
  collections: SubmissionCollection[];
}): InboxSections {
  const collectionByTaskId = new Map(input.collections.map((collection) => [collection.taskId, collection]));
  const used = new Set<string>();
  const unfinishedTasks = input.tasks.filter((task) => task.status !== 'DONE' && task.status !== 'ARCHIVED' && task.dueDate);

  const toInboxItem = (task: TaskItem): InboxItem => {
    const collection = collectionByTaskId.get(task.id);
    return {
      ...task,
      collectionCompletionRate: collection ? completionRate(collection) : null,
    };
  };

  const pick = (predicate: (task: TaskItem) => boolean) => {
    const items = unfinishedTasks
      .filter((task) => !used.has(task.id))
      .filter(predicate)
      .sort((a, b) => compareLocalDate(a.dueDate, b.dueDate) || b.updatedAt.localeCompare(a.updatedAt))
      .map(toInboxItem);

    for (const item of items) used.add(item.id);
    return items;
  };

  const overdue = pick((task) => compareLocalDate(task.dueDate, input.today) < 0);
  const today = pick((task) => task.dueDate === input.today);
  const incompleteCollections = pick((task) => {
    const collection = collectionByTaskId.get(task.id);
    return Boolean(collection && completionRate(collection) < 1 && isWithinNextDays(task.dueDate, input.today, 7));
  });
  const upcoming = pick((task) => compareLocalDate(task.dueDate, input.today) > 0 && isWithinNextDays(task.dueDate, input.today, 7));

  return { overdue, today, incompleteCollections, upcoming };
}
```

- [ ] **Step 4: Add roster parser tests and implementation**

Test cases:

```ts
expect(parseRosterRows('1,김가온\n2,이도윤').students).toEqual([
  { studentNumber: 1, name: '김가온', displayName: '김가온' },
  { studentNumber: 2, name: '이도윤', displayName: '이도윤' },
]);
expect(parseRosterRows('1,\n2,이도윤').errors[0].code).toBe('EMPTY_NAME');
expect(parseRosterRows('1,김가온\n1,이도윤').errors[0].code).toBe('DUPLICATE_NUMBER');
```

Implementation rule: accept comma, tab, or two-or-more spaces as separators; reject rows with missing number, missing name, non-numeric number, or duplicate number.

- [ ] **Step 5: Add completion-rate tests and implementation**

Test cases:

```ts
expect(completionRate(collectionWithStatuses(['SUBMITTED', 'MISSING']))).toBe(0.5);
expect(completionRate(collectionWithStatuses(['SUBMITTED', 'NOT_APPLICABLE']))).toBe(1);
expect(completionRate(collectionWithStatuses(['NOT_APPLICABLE']))).toBe(1);
```

- [ ] **Step 6: Add template interpolation tests and implementation**

Test cases:

```ts
expect(interpolateTemplate('안내: {학급} {마감일}', { 학급: '3-2', 마감일: '5월 8일' })).toBe('안내: 3-2 5월 8일');
expect(interpolateTemplate('{학급} {준비물}', { 학급: '3-2', 준비물: '' })).toBe('3-2 {준비물}');
```

- [ ] **Step 7: Add URL validation tests and implementation**

Test cases:

```ts
expect(validateLocationValue('URL', 'https://drive.google.com/file/d/abc')).toEqual({ valid: true });
expect(validateLocationValue('URL', '업무포털 123')).toEqual({ valid: false, fallbackType: 'NOTE' });
expect(validateLocationValue('PORTAL_DOC_NUMBER', '서울교육-1234')).toEqual({ valid: true });
```

- [ ] **Step 8: Verify pure services**

Run:

```bash
npm test -- --run tests/unit
```

Expected: all unit tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/types src/utils src/inbox src/classes src/collections src/templates tests/unit
git commit -m "feat: add homeroom domain services"
```

---

## Task 3: Add Firebase Auth, Firestore Boundary, and Security Rules

**Files:**
- Create: `.env.example`
- Create: `src/firebase/client.ts`
- Create: `src/firebase/converters.ts`
- Create: `src/firebase/repository.ts`
- Create: `src/auth/authService.ts`
- Create: `src/auth/AuthContext.tsx`
- Create: `src/app/AuthGate.tsx`
- Create: `firebase.json`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`

- [ ] **Step 1: Create environment example**

Create `.env.example`:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 2: Create Firebase client**

Create `src/firebase/client.ts`:

```ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
```

- [ ] **Step 3: Add auth service**

Create `src/auth/authService.ts`:

```ts
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/client';

export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function createAccountWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signOutCurrentUser() {
  return signOut(auth);
}
```

- [ ] **Step 4: Add repository path helpers**

Create `src/firebase/repository.ts`:

```ts
import { collection, doc } from 'firebase/firestore';
import { db } from './client';

export function userDoc(userId: string) {
  return doc(db, 'users', userId);
}

export function userCollection(userId: string, name: 'classes' | 'students' | 'tasks' | 'collections' | 'templates') {
  return collection(db, 'users', userId, name);
}
```

- [ ] **Step 5: Add Firestore rules**

Create `firestore.rules`:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function ownsUserData(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if ownsUserData(userId);

      match /{document=**} {
        allow read, write: if ownsUserData(userId);
      }
    }
  }
}
```

- [ ] **Step 6: Add Firebase config files**

Create `firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

Create `firestore.indexes.json`:

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

- [ ] **Step 7: Verify**

Run:

```bash
npm run build
```

Expected: build passes with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add .env.example firebase.json firestore.rules firestore.indexes.json src/firebase src/auth src/app/AuthGate.tsx
git commit -m "feat: add firebase auth boundary"
```

---

## Task 4: Produce the Open Design Landing Artifact

**Files:**
- Create: `DESIGN.md`
- Create: `design/opendesign-landing.html`
- Create: `src/design/tokens.css`
- Create: `src/landing/LandingPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create workspace DESIGN.md**

Use a light structured-data system inspired by Open Design Airtable and Neutral Modern:

```md
# 담임 행정 허브 Design System

## Palette
- Background: #FAFAFA
- Surface: #FFFFFF
- Foreground: #181D26
- Muted: rgba(4, 14, 32, 0.69)
- Border: #E0E2E6
- Accent: #1B61C9
- Success: #17A34A
- Warn: #EAB308
- Danger: #DC2626

## Typography
- Display: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Body: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Scale: 12, 14, 16, 20, 24, 32, 48
- Headings use weight 600 and line-height 1.2.
- Body text uses weight 400 and line-height 1.5.

## Layout
- Max width: 1200px
- Grid: 12 columns desktop, 8 columns tablet, 4 columns phone
- Section spacing: 80px desktop, 48px tablet, 32px phone
- Cards use 8px radius, 1px border, no shadow.
- Buttons use 8px radius.

## Agent Prompt Guide
- Make the product itself visible in the first viewport through a real dashboard preview.
- Do not use decorative orbs, bokeh blobs, or a one-note purple palette.
- Keep the landing page useful for a teacher deciding whether to open the app, not a generic startup page.
- Accent is used for the primary CTA and one product signal only.
```

- [ ] **Step 2: Create Open Design single-page HTML artifact**

Create `design/opendesign-landing.html` as a self-contained page with inline CSS and `data-od-id` attributes. Required sections:

```text
1. Hero: wordmark, H1 "오늘 처리할 담임 행정 업무가 한 화면에 정리됩니다", subhead, "업무함 열기" CTA, "데모 보기" secondary CTA, dashboard preview.
2. Features: 오늘 업무함, 공문 처리 체크리스트, 제출물 수합판, 반복 문서 템플릿함, 마감 캘린더.
3. Footer CTA: "오늘 놓칠 일을 줄이고, 내일 처리할 일을 미리 봅니다."
4. Footer: minimal product links and copyright.
```

Set `proof_count` to `0` and `has_pricing` to `false` because this is a personal school utility, not a paid SaaS offer in v1.

- [ ] **Step 3: Add app design tokens**

Create `src/design/tokens.css`:

```css
:root {
  color-scheme: light;
  --color-background: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-foreground: #181D26;
  --color-muted: rgba(4, 14, 32, 0.69);
  --color-border: #E0E2E6;
  --color-accent: #1B61C9;
  --color-success: #17A34A;
  --color-warn: #EAB308;
  --color-danger: #DC2626;
  --radius-control: 8px;
  --radius-panel: 8px;
  --space-page: clamp(16px, 4vw, 40px);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-foreground);
}
```

- [ ] **Step 4: Implement React landing page from the artifact**

Create `src/landing/LandingPage.tsx` using the same section order and copy as `design/opendesign-landing.html`. Keep buttons code-native and route primary CTA to `/login`.

- [ ] **Step 5: Verify responsive first viewport**

Run:

```bash
npm run build
npm run dev
```

Open the local URL and verify:

```text
1440px: hero preview and next section hint are visible.
768px: hero copy, CTA row, and preview do not overlap.
375px: H1 wraps cleanly and buttons stay inside viewport.
```

- [ ] **Step 6: Commit**

```bash
git add DESIGN.md design src/design src/landing src/App.tsx
git commit -m "feat: add open design landing page"
```

---

## Task 5: Add Routing, Auth Screens, and App Shell

**Files:**
- Create: `src/app/routes.tsx`
- Create: `src/app/AppShell.tsx`
- Create: `src/auth/LoginPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Add routes**

Routes:

```text
/ -> LandingPage
/login -> LoginPage
/app/inbox -> InboxPage
/app/tasks -> TaskListPage
/app/tasks/:taskId -> OfficialDocumentPage or TaskEditor
/app/classes -> ClassesPage
/app/collections -> CollectionsPage
/app/collections/:collectionId -> CollectionDetailPage
/app/templates -> TemplatesPage
/app/calendar -> CalendarPage
```

- [ ] **Step 2: Implement `AppShell`**

Use a left navigation on desktop and a bottom navigation on mobile. Required nav labels:

```text
오늘 업무함
전체 업무
공문
수합판
템플릿
마감 캘린더
학급 명부
```

Use lucide-react icons: `Inbox`, `ListChecks`, `FileText`, `ClipboardCheck`, `Copy`, `CalendarDays`, `Users`.

- [ ] **Step 3: Implement login page**

Fields:

```text
이메일
비밀번호
로그인
새 계정 만들기
```

Show errors with `role="alert"` and successful auth changes through `AuthContext`.

- [ ] **Step 4: Verify auth routing**

Run:

```bash
npm test -- --run
npm run build
```

Manual check:

```text
Signed out user opening /app/inbox is redirected to /login.
Signed in user opening /login is redirected to /app/inbox.
```

- [ ] **Step 5: Commit**

```bash
git add src/app src/auth src/App.tsx src/main.tsx
git commit -m "feat: add authenticated app shell"
```

---

## Task 6: Build Today Inbox and Full Task List

**Files:**
- Create: `src/inbox/InboxPage.tsx`
- Create: `src/inbox/TaskCard.tsx`
- Create: `src/tasks/TaskListPage.tsx`
- Create: `src/tasks/taskService.ts`
- Modify: `src/firebase/repository.ts`

- [ ] **Step 1: Write component tests for visible sections**

Test that `InboxPage` renders these sections when seeded:

```text
지난 마감
오늘 마감
미완료 제출물
이번 주 예정
```

Test that one task appears only once when it qualifies for multiple sections.

- [ ] **Step 2: Implement `TaskCard`**

Each card shows:

```text
제목
유형
마감일
상태
연결 수합판 여부
첨부 위치 여부
완료 처리 button
상세 보기 link
```

Use compact 8px-radius panels and status chips.

- [ ] **Step 3: Implement quick actions**

Buttons:

```text
공문 추가
수합판 추가
개인 마감 추가
템플릿 추가
```

Each opens the matching route or modal; every button must perform its named action.

- [ ] **Step 4: Implement full task list**

Default sort:

```text
1. 미완료 먼저
2. 마감일 빠른 순
3. 최근 수정 순
```

Default filter hides `ARCHIVED`; include a "보관 포함" checkbox.

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- --run tests/unit/inboxService.test.ts
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/inbox src/tasks src/firebase/repository.ts tests
git commit -m "feat: add today inbox and task list"
```

---

## Task 7: Build Classes and Student Roster Management

**Files:**
- Create: `src/classes/ClassesPage.tsx`
- Create: `src/classes/RosterImportPanel.tsx`
- Modify: `src/classes/rosterService.ts`
- Test: `tests/unit/rosterService.test.ts`

- [ ] **Step 1: Add class form**

Fields:

```text
학년도
학교급
학년
반 이름
```

Save to `users/{uid}/classes`.

- [ ] **Step 2: Add manual student entry**

Fields:

```text
번호
이름
표시 이름
```

Reject duplicate `studentNumber` in the same class before writing to Firestore.

- [ ] **Step 3: Add CSV/table paste import**

Paste examples accepted:

```text
1,김가온
2,이도윤
```

```text
1	김가온
2	이도윤
```

Show row-specific errors and block import when number or name is empty.

- [ ] **Step 4: Verify roster flow**

Run:

```bash
npm test -- --run tests/unit/rosterService.test.ts
npm run build
```

Manual check:

```text
Create class -> add one student manually -> paste two students -> duplicate number is blocked.
```

- [ ] **Step 5: Commit**

```bash
git add src/classes tests/unit/rosterService.test.ts
git commit -m "feat: add class roster management"
```

---

## Task 8: Build Official Document Checklist

**Files:**
- Create: `src/tasks/OfficialDocumentPage.tsx`
- Create: `src/tasks/TaskEditor.tsx`
- Modify: `src/tasks/taskService.ts`
- Modify: `src/utils/validation.ts`
- Test: `tests/unit/validation.test.ts`

- [ ] **Step 1: Add official document form**

Fields:

```text
제목
접수일
마감일
업무 유형
제출 대상
상태
담당자 메모
내 처리 메모
```

Create `TaskItem` with `type: 'OFFICIAL_DOCUMENT'` and default `calendarCategory: 'SCHOOL'`.

- [ ] **Step 2: Add location links editor**

Location types:

```text
URL
업무포털 문서번호
학교 메신저 위치
로컬 폴더 위치
기타 메모
```

When URL validation fails, show:

```text
URL 형식이 아닙니다. 기타 메모 위치로 저장하시겠습니까?
```

Provide "기타 메모로 저장" and "다시 입력" actions.

- [ ] **Step 3: Add status transition controls**

Supported statuses:

```text
접수
처리 중
제출 대기
완료
보관
```

Changing to `완료` immediately removes the item from urgent inbox sections.

- [ ] **Step 4: Verify official document flow**

Run:

```bash
npm test -- --run tests/unit/validation.test.ts
npm run build
```

Manual check:

```text
Create official document -> add location link -> move status from 접수 to 처리 중 to 완료 -> verify inbox and calendar update.
```

- [ ] **Step 5: Commit**

```bash
git add src/tasks src/utils tests/unit/validation.test.ts
git commit -m "feat: add official document checklist"
```

---

## Task 9: Build Submission Collection Boards

**Files:**
- Create: `src/collections/CollectionsPage.tsx`
- Create: `src/collections/CollectionDetailPage.tsx`
- Modify: `src/collections/collectionService.ts`
- Modify: `src/tasks/taskService.ts`
- Test: `tests/unit/collectionService.test.ts`

- [ ] **Step 1: Block collection creation when roster is empty**

If the selected class has no students, show:

```text
제출물 수합판을 만들기 전에 학급 명부를 먼저 추가해 주세요.
```

Do not create a collection or task.

- [ ] **Step 2: Create collection and linked task together**

When creating a collection, write:

```text
users/{uid}/collections/{collectionId}
users/{uid}/tasks/{taskId}
```

The linked task uses:

```ts
{
  type: 'CLASS_SUBMISSION',
  calendarCategory: 'CLASS',
  status: 'RECEIVED'
}
```

- [ ] **Step 3: Add row status controls**

Each row shows:

```text
번호
이름
제출 상태
제출일
메모
```

Status options:

```text
미제출
제출
보완 필요
해당 없음
```

- [ ] **Step 4: Add filters and summary**

Filters:

```text
전체
미제출만
보완 필요
```

Summary:

```text
완료율
미제출 인원
보완 필요 인원
해당 없음 인원
```

- [ ] **Step 5: Add official document linkage**

Allow one collection to link to at most one official document. Allow one official document to link to multiple collections by updating `TaskItem.linkedCollectionIds`.

- [ ] **Step 6: Verify collection flow**

Run:

```bash
npm test -- --run tests/unit/collectionService.test.ts
npm run build
```

Manual check:

```text
Create class -> add roster -> create collection -> update statuses -> 미제출 filter and completion rate update.
```

- [ ] **Step 7: Commit**

```bash
git add src/collections src/tasks tests/unit/collectionService.test.ts
git commit -m "feat: add submission collection boards"
```

---

## Task 10: Build Template Library

**Files:**
- Create: `src/templates/TemplatesPage.tsx`
- Create: `src/templates/TemplateEditor.tsx`
- Modify: `src/templates/templateService.ts`
- Test: `tests/unit/templateService.test.ts`

- [ ] **Step 1: Add template list and editor**

Fields:

```text
제목
유형
본문
태그
마지막 사용일
```

Template types:

```text
안내문
상담 기록 양식
보고 문구
제출 독촉 문구
기타
```

- [ ] **Step 2: Add replacement preview**

Supported keys:

```text
{학급}
{마감일}
{제출물명}
{준비물}
{담임명}
```

If a value is blank, keep the token unchanged.

- [ ] **Step 3: Add clipboard copy**

Use `navigator.clipboard.writeText(previewText)`. After copy, update `lastUsedAt` and show:

```text
문구를 클립보드에 복사했습니다.
```

Use `role="status"` for the confirmation.

- [ ] **Step 4: Verify template flow**

Run:

```bash
npm test -- --run tests/unit/templateService.test.ts
npm run build
```

Manual check:

```text
Create template -> preview with values -> leave one value blank -> copy preview -> last used date updates.
```

- [ ] **Step 5: Commit**

```bash
git add src/templates tests/unit/templateService.test.ts
git commit -m "feat: add reusable template library"
```

---

## Task 11: Build Deadline Calendar

**Files:**
- Create: `src/calendar/CalendarPage.tsx`
- Create: `src/calendar/calendarService.ts`
- Modify: `src/tasks/taskService.ts`
- Test: `tests/unit/inboxService.test.ts`

- [ ] **Step 1: Add calendar event mapping**

Only tasks with `dueDate` appear. Hide `ARCHIVED` by default.

Color mapping:

```text
SCHOOL -> blue
CLASS -> green
PERSONAL -> amber
```

- [ ] **Step 2: Add month and week views**

Controls:

```text
월간
주간
이전
오늘
다음
```

Use buttons with icons for previous and next actions.

- [ ] **Step 3: Add selected-day panel**

When selecting a date, show:

```text
해당 날짜 업무 목록
공문
제출물
개인 마감
```

Clicking an item routes to the matching detail page.

- [ ] **Step 4: Verify calendar flow**

Run:

```bash
npm run build
```

Manual check:

```text
Create official document due today -> create collection due this week -> create personal due date -> verify all appear with category colors.
```

- [ ] **Step 5: Commit**

```bash
git add src/calendar src/tasks
git commit -m "feat: add deadline calendar"
```

---

## Task 12: Add Deletion Cascades and Safety Warnings

**Files:**
- Modify: `src/classes/ClassesPage.tsx`
- Modify: `src/collections/CollectionsPage.tsx`
- Modify: `src/tasks/OfficialDocumentPage.tsx`
- Modify: `src/classes/rosterService.ts`
- Modify: `src/collections/collectionService.ts`
- Modify: `src/tasks/taskService.ts`
- Test: `tests/unit/collectionService.test.ts`

- [ ] **Step 1: Implement collection deletion cascade**

When deleting a collection:

```text
Delete collection
Delete linked CLASS_SUBMISSION task
Remove collection id from official document linkedCollectionIds
Remove calendar item because task is deleted
```

Warning text:

```text
수합판과 학생별 체크 기록이 삭제됩니다. 연결된 공문에서는 수합판 연결만 제거됩니다.
```

- [ ] **Step 2: Implement official document deletion options**

Options:

```text
공문만 삭제하고 수합판은 독립 수합판으로 유지
공문과 연결 수합판을 함께 삭제
```

- [ ] **Step 3: Implement class deletion cascade**

When deleting a class:

```text
Delete class
Delete students in class
Delete collections in class
Delete linked CLASS_SUBMISSION tasks
Remove deleted collection ids from official documents
```

Warning text:

```text
학급, 학생 명부, 연결된 수합판, 학생별 체크 기록, 수합판 업무 항목이 함께 삭제됩니다.
```

- [ ] **Step 4: Add batch write service tests**

Test the pure deletion planner returns exact operations for:

```text
deleteCollectionPlan
deleteOfficialDocumentKeepCollectionsPlan
deleteOfficialDocumentWithCollectionsPlan
deleteClassPlan
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- --run tests/unit/collectionService.test.ts
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/classes src/collections src/tasks tests/unit/collectionService.test.ts
git commit -m "feat: add deletion safety flows"
```

---

## Task 13: Add Privacy Guardrails and No-File-Upload Tests

**Files:**
- Modify: `src/app/AppShell.tsx`
- Modify: `src/tasks/OfficialDocumentPage.tsx`
- Modify: `src/templates/TemplatesPage.tsx`
- Test: `tests/e2e/no-file-upload.spec.ts`

- [ ] **Step 1: Add personal-data notice**

Show a compact notice in the app shell:

```text
이 앱은 개인용 담임 행정 정리 도구입니다. 공문 원본 파일, 학생 사진, 실제 상담 기록, 생활지도 사건 기록은 저장하지 마세요.
```

- [ ] **Step 2: Add template-specific caution**

Near 상담 기록 양식 templates, show:

```text
상담 기록 양식은 빈 양식과 반복 문구 보관용입니다. 특정 학생의 실제 상담 내용은 저장하지 마세요.
```

- [ ] **Step 3: Add E2E no-file-upload test**

Create `tests/e2e/no-file-upload.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('app does not expose file upload inputs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});
```

- [ ] **Step 4: Verify**

Run:

```bash
npx playwright install chromium
npm run build
npx playwright test tests/e2e/no-file-upload.spec.ts
```

Expected: Playwright confirms no file upload input exists on the landing page. After authenticated seed support is added, expand the same assertion to app routes.

- [ ] **Step 5: Commit**

```bash
git add src/app src/tasks src/templates tests/e2e/no-file-upload.spec.ts
git commit -m "feat: add privacy guardrails"
```

---

## Task 14: Add Seed Data, E2E Flows, and Release Checks

**Files:**
- Create: `src/firebase/seedDemoData.ts`
- Create: `tests/e2e/app-flows.spec.ts`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Add demo seed data**

Seed one class, three students, one official document, one collection, one template, and one personal deadline for local E2E runs. Use user id `demo-user` in fake repository mode and never write seed data to production Firestore.

- [ ] **Step 2: Add E2E tests for required verification flows**

`tests/e2e/app-flows.spec.ts` should cover:

```text
공문 업무 흐름
제출물 수합 흐름
공문과 수합판 연결 흐름
템플릿 재사용 흐름
파일 저장 제외 흐름
```

- [ ] **Step 3: Add scripts**

Update `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "check": "npm test -- --run && npm run build"
  }
}
```

- [ ] **Step 4: Add README runbook**

`README.md` must include:

```text
앱 목적
첫 버전 포함 범위
첫 버전 제외 범위
Firebase 환경 변수 설정
로컬 실행
테스트 실행
파일 업로드를 제공하지 않는 이유
```

- [ ] **Step 5: Final verification**

Run:

```bash
npm run check
npm run test:e2e
```

Expected:

```text
Vitest unit tests pass.
Vite production build passes.
Playwright verifies the five required user flows.
No file upload input appears in the app.
```

- [ ] **Step 6: Commit**

```bash
git add src/firebase/seedDemoData.ts tests/e2e package.json README.md
git commit -m "test: add release verification flows"
```

---

## Self-Review

**Spec coverage:**  
The plan covers 오늘 업무함, 공문 처리 체크리스트, 제출물 수합판, 반복 문서 템플릿함, 마감 캘린더, 로그인 기반 개인 저장, `userId` data isolation, no file uploads, duplicate roster validation, URL fallback, no urgent display for undated tasks, deletion/linking consistency, and required verification flows.

**Known scope boundaries:**  
The plan intentionally excludes student/parent submission screens, shared editing, school-system integrations, file storage, automatic document analysis, real counseling record storage, notification sending, and school administrator statistics.

**Open Design coverage:**  
The plan routes `/opendesign` through the SaaS landing skill, creates a workspace `DESIGN.md`, produces a single self-contained landing artifact with `data-od-id` attributes, then ports the approved structure into the React landing page.

**Execution guidance:**  
Implement task-by-task with tests first for pure services. Commit after each task. If subagents are used, each worker subagent must use GPT-5.3-Codex-Spark per AGENTS.md.
