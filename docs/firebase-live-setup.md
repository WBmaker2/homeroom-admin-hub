# Firebase 실사용 연결 체크리스트

## 1. Firebase 콘솔 설정

1. Firebase 프로젝트를 만들거나 기존 프로젝트를 선택합니다.
2. Authentication에서 이메일/비밀번호 제공업체를 활성화합니다.
3. Firestore Database를 생성합니다.
4. 웹앱을 추가하고 Firebase SDK 설정값을 확인합니다.

## 2. GitHub repository variables

GitHub repository `WBmaker2/homeroom-admin-hub`의 Actions variables에 아래 값을 등록합니다.

```bash
VITE_APP_MODE=live
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

공개 데모 상태로 유지하려면 아래 값을 사용합니다.

```bash
VITE_APP_MODE=demo
VITE_DEMO_AUTH_USER=demo-user
```

## 3. Firestore rules

이 앱의 데이터 경계는 `users/{uid}` 아래입니다. Firestore rules는 로그인한 사용자가 자기 uid 문서와 하위 문서만 읽고 쓰도록 제한합니다.

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <firebase-project-id>
```

## 4. 확인 흐름

1. GitHub Actions `Deploy GitHub Pages` workflow가 성공하는지 확인합니다.
2. 로그인 화면에서 `실사용 모드` 문구가 보이는지 확인합니다.
3. 새 계정을 만들고 `/app/inbox`로 이동되는지 확인합니다.
4. 잘못된 비밀번호, 약한 비밀번호, 네트워크 오류 문구가 `role="alert"`로 표시되는지 확인합니다.

## 현재 제한

- 공개 GitHub Pages는 기본적으로 데모 모드 배포를 권장합니다.
- 실사용 데이터 저장소 연결은 Auth/Firestore 경계와 환경 분리까지 준비되어 있으며, 화면별 영구 Firestore 저장 동기화는 다음 단계에서 확장합니다.
