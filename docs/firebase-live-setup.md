# Firebase 실사용 연결 체크리스트

## 현재 설정 상태

- Firebase project: `homeroom-admin-hub-wbmaker2`
- Firebase web app: `Homeroom Admin Hub Web`
- Firebase app id: `1:1092215945337:web:7015731b0af3ed0e55bca8`
- Firestore database: `(default)`, Native mode, Standard edition
- Firestore location: `asia-northeast3` (Seoul)
- Firestore rules/indexes: 서울 리전 재생성 후 재배포 완료
- Firestore data sync: `classes`, `tasks`, `collections`, `templates` 화면 저장 연결 완료
- GitHub repository variables: Firebase 웹앱 설정값 등록 완료
- Firebase Authentication: 이메일/비밀번호 제공업체 활성화 완료
- GitHub Pages mode: `VITE_APP_MODE=live` 전환

공개 GitHub Pages는 현재 Firebase Auth와 사용자별 Firestore 저장 경계를 사용하는 실사용 모드로 운영합니다.

> 참고: 최초 생성된 `nam5` DB는 실데이터 입력 전 삭제했고, `(default)` DB를 `asia-northeast3`으로 다시 생성했습니다.

## 1. Firebase 콘솔 설정

1. Firebase 프로젝트 `homeroom-admin-hub-wbmaker2`를 사용합니다.
2. Authentication에서 이메일/비밀번호 제공업체를 활성화합니다.
3. Firestore Database는 이미 생성되어 있습니다.
4. 웹앱 `Homeroom Admin Hub Web`의 Firebase SDK 설정값은 GitHub repository variables에 등록되어 있습니다.

## 2. GitHub repository variables

GitHub repository `WBmaker2/homeroom-admin-hub`의 Actions variables에 아래 값을 등록합니다.

```bash
VITE_APP_MODE=live
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

데모 모드가 필요할 때는 아래 값으로 되돌립니다.

```bash
VITE_APP_MODE=demo
VITE_DEMO_AUTH_USER=demo-user
```

## 3. Firestore rules

이 앱의 데이터 경계는 `users/{uid}` 아래입니다. Firestore rules는 로그인한 사용자가 자기 uid 문서와 하위 문서만 읽고 쓰도록 제한합니다.

실사용 모드에서 화면별 저장 경로는 아래와 같습니다.

```text
users/{uid}/classes/{classId}
users/{uid}/tasks/{taskId}
users/{uid}/collections/{collectionId}
users/{uid}/templates/{templateId}
```

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <firebase-project-id>
```

## 4. 확인 흐름

1. Firebase 콘솔에서 Authentication 이메일/비밀번호 제공업체가 `사용 설정됨`인지 확인합니다.
2. GitHub Actions variable `VITE_APP_MODE=live` 상태를 확인합니다.
3. GitHub Actions `Deploy GitHub Pages` workflow가 성공하는지 확인합니다.
4. 로그인 화면에서 `실사용 모드` 문구가 보이는지 확인합니다.
5. 새 계정을 만들고 `/app/inbox`로 이동되는지 확인합니다.
6. 학급, 업무, 수합판, 템플릿을 하나씩 저장한 뒤 새로고침 후에도 유지되는지 확인합니다.
7. 잘못된 비밀번호, 약한 비밀번호, 네트워크 오류 문구가 `role="alert"`로 표시되는지 확인합니다.

## 현재 제한

- 공개 GitHub Pages는 실사용 모드이므로 접속하려면 Firebase Auth 계정이 필요합니다.
- 새 사용자 계정 생성은 Firebase Authentication에 실제 계정을 추가하므로 운영 전 테스트 계정을 정리합니다.
