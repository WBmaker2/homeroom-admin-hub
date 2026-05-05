# 2026-05-05 캘린더 live tasks 연결 구현 계획

## 목표

`/app/calendar`가 하드코딩 seed 업무가 아니라 현재 사용자 저장소의 `tasks`를 읽어 마감 캘린더를 구성한다.

이 작업은 직전 `공문/개인 마감 생성 UX` 구현과 이어진다. 사용자가 `/app/tasks?intent=create&type=OFFICIAL_DOCUMENT` 또는 `PERSONAL_DUE`에서 새 업무를 만들면, 마감일이 있는 업무가 `/app/calendar`의 월간/주간 보기와 선택 날짜 업무 목록에 나타나야 한다.

## 현재 상태

- `src/calendar/CalendarPage.tsx`는 `seededTasks()`를 `useMemo`로 호출해서 정적 캘린더 데이터를 만든다.
- `src/calendar/calendarService.ts`의 `mapTasksToCalendarEvents()`는 이미 `TaskItem[]`을 캘린더 이벤트로 변환한다.
- `src/firebase/useUserRecords.ts`는 live Firestore 모드에서 `users/{uid}/tasks`를 로드하고, demo/local 모드에서는 `getTaskStore()`와 `saveTaskStore()`를 사용한다.
- `/app/tasks`는 live Firestore가 로딩 중일 때 생성 폼을 막고, demo/local에서는 fallback 업무 목록에 새 항목을 append한다.

## 범위

### 포함

- `CalendarPage`에서 `useUserRecords<TaskItem>`로 `tasks`를 로드한다.
- live Firestore 모드에서는 Firestore가 빈 배열을 반환하면 빈 캘린더를 그대로 보여준다.
- demo/local 모드에서는 저장된 업무가 없을 때 기존 calendar seed를 fallback으로 보여준다.
- 로딩 중에는 접근 가능한 status 메시지를 보여준다.
- 로드 오류가 있으면 접근 가능한 alert 메시지를 보여준다.
- 마감일이 있는 업무만 캘린더 이벤트로 표시한다.
- `ARCHIVED` 업무는 기본적으로 캘린더에서 숨긴다.
- 선택 날짜 목록의 링크는 기존 `getTaskDetailHref()` 결과를 유지한다.
- 단위 또는 통합 테스트를 추가해 live empty, local fallback, 저장 task 표시를 보호한다.

### 제외

- 캘린더 안에서 업무 생성/수정/삭제 UI 추가
- 개인 마감 전용 상세 페이지 신설
- 캘린더 이벤트 드래그 앤 드롭
- 반복 일정/시간 단위 일정
- 파일 업로드

## 구현 작업

### Task 1. CalendarPage live task source 전환

수정 예상 파일:

- `src/calendar/CalendarPage.tsx`
- `tests/unit/CalendarPage.test.tsx` 또는 기존 테스트 확장

작업 내용:

1. `CalendarPage`에서 `seededTasks()`를 직접 source로 쓰는 구조를 제거한다.
2. `useUserRecords<TaskItem>({ collectionName: 'tasks', getInitialRecords: getTaskStore, onSaveLocal: saveTaskStore })`를 사용한다.
3. task source 규칙을 다음처럼 맞춘다.
   - `usingFirestore === true`: `storedTasks`를 그대로 사용한다. 빈 배열이면 빈 캘린더다.
   - `usingFirestore === false`: `storedTasks.length > 0 ? storedTasks : seededTasks()`
4. `loading`이면 “캘린더 업무를 불러오는 중입니다.” status 메시지를 보여준다.
5. `error`가 있으면 “캘린더 업무를 불러오지 못했습니다: …” alert 메시지를 보여준다.
6. 기존 월간/주간 전환, 날짜 선택, 이벤트 그룹, 링크 동작은 유지한다.

## 수용 기준

- live Firestore 신규 계정처럼 tasks가 비어 있으면 seed 업무가 캘린더에 섞이지 않는다.
- demo/local 상태에서는 저장된 업무가 없을 때 기존 샘플 캘린더가 유지된다.
- demo/local 상태에서 `/app/tasks`에서 만든 마감일 있는 업무는 캘린더에 나타난다.
- 마감일 없는 업무와 `ARCHIVED` 업무는 캘린더 이벤트로 나타나지 않는다.
- 로딩/오류 상태가 스크린리더 친화적인 `role="status"`/`role="alert"` 경로로 노출된다.
- `npm run check`와 `npm run test:e2e`가 통과한다.

## 검증 계획

- `npm test -- --run tests/unit/CalendarPage.test.tsx`
- `npm run check`
- `npm run test:e2e`

## 리뷰 기준

Spec review:

- 캘린더가 더 이상 live mode에서 seed source를 쓰지 않는지 확인한다.
- demo/local fallback이 사라지지 않았는지 확인한다.
- 로딩/오류 피드백과 링크 동작이 요구사항에 맞는지 확인한다.

Code quality review:

- `useUserRecords` 초기 상태와 Firestore loading race가 seed 오염을 만들지 않는지 확인한다.
- 테스트가 hook mock 또는 storage state를 통해 실제 분기 조건을 보호하는지 확인한다.
- 캘린더 서비스의 순수 함수 책임과 화면 컴포넌트 책임이 불필요하게 섞이지 않았는지 확인한다.
