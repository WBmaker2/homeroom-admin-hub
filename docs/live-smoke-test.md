# 실서비스 smoke test 체크리스트

공개 배포 후 `VITE_APP_MODE=live`와 Firebase 연결이 실제 사용자 흐름에서 정상 동작하는지 확인하는 절차입니다.

## 대상

- 앱 URL: https://wbmaker2.github.io/homeroom-admin-hub/
- Firebase 프로젝트: `homeroom-admin-hub-wbmaker2`
- Firestore 리전: `asia-northeast3` (Seoul)

## 사전 확인

- GitHub Pages workflow가 성공 상태인지 확인합니다.
- Firebase Authentication Email/Password 제공업체가 활성화되어 있는지 확인합니다.
- Firestore rules/indexes가 배포되어 있는지 확인합니다.
- 테스트 계정은 smoke test 후 Auth와 Firestore에서 삭제합니다.

## 확인 흐름

1. 공개 URL에 접속합니다.
2. `시작` 또는 `업무함 열기`로 로그인 화면에 진입합니다.
3. smoke test 전용 이메일 계정을 생성합니다.
4. `/app/inbox`에서 오늘 업무함이 열리는지 확인합니다.
5. `/app/tasks?intent=create&type=OFFICIAL_DOCUMENT`에서 공문을 하나 생성합니다.
   - 제목: `Smoke 공문`
   - 마감일: 오늘 또는 내일
   - 제출 대상: `행정실`
6. `/app/tasks?intent=create&type=PERSONAL_DUE`에서 개인 마감을 하나 생성합니다.
   - 제목: `Smoke 개인 마감`
   - 마감일: 오늘 또는 내일
   - 메모: `배포 확인`
7. `/app/tasks`에서 방금 만든 두 업무가 보이는지 확인합니다.
8. `/app/calendar`에서 마감일에 두 업무가 표시되는지 확인합니다.
9. 캘린더의 `Smoke 개인 마감`을 열어 `/app/tasks?taskId=...` 상세 패널로 이동하는지 확인합니다.
10. 개인 마감 상세 패널에서 상태 또는 메모를 수정하고 즉시 저장되는지 확인합니다.
11. `/app/tasks/{공문 taskId}` 공문 상세에서 상태를 `완료`로 바꿉니다.
12. `/app/inbox`로 돌아와 완료된 공문이 긴급/오늘 섹션에서 제외되는지 확인합니다.

## 정리

1. Firebase Authentication에서 smoke test 계정을 삭제합니다.
2. Firestore `users/{uid}` 아래 `tasks`, `classes`, `collections`, `templates` 문서를 삭제합니다.
3. 같은 이메일로 다시 가입했을 때 이전 smoke test 데이터가 보이지 않는지 확인합니다.

## 통과 기준

- 로그인/계정 생성이 정상 동작합니다.
- live mode에서 새 계정은 seed 데이터 없이 빈 개인 저장소로 시작합니다.
- 생성한 공문/개인 마감이 전체 업무와 캘린더에 표시됩니다.
- 개인 마감 상세 패널에서 수정한 내용이 새로고침 후에도 유지됩니다.
- 공문 완료 상태가 오늘 업무함에 반영됩니다.
- 파일 업로드 입력은 어느 화면에도 나타나지 않습니다.

## 실패 시 우선 확인

- 흰 화면: Pages base path, SPA fallback, Firebase env 누락 여부를 확인합니다.
- 저장 실패: Firestore rules, Auth uid, repository variables를 확인합니다.
- 캘린더 누락: task의 `dueDate`, `status !== ARCHIVED`, `calendarCategory` 값을 확인합니다.
- 테스트 데이터 잔존: Auth 계정 삭제와 Firestore `users/{uid}` 정리를 모두 수행했는지 확인합니다.
