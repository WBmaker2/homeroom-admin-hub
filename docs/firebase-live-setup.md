# Firebase 실사용 연결 체크리스트

## 현재 설정 상태

- Firebase project: `homeroom-admin-hub-wbmaker2`
- Firebase web app: `Homeroom Admin Hub Web`
- Firebase app id: `1:1092215945337:web:7015731b0af3ed0e55bca8`
- Firestore database: `(default)`, Native mode, Standard edition
- Firestore location: `asia-northeast3` (Seoul)
- Firestore rules/indexes: 서울 리전 재생성 후 재배포 완료
- GitHub repository variables: Firebase 웹앱 설정값 등록 완료
- GitHub Pages mode: `VITE_APP_MODE=demo` 유지

공개 GitHub Pages는 현재 데모 모드로 유지합니다. Firebase 설정값은 Actions variables에 등록되어 있으므로, Authentication 제공업체와 데이터 영속화가 준비되면 `VITE_APP_MODE=live`로 전환할 수 있습니다.

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

현재는 공개 데모 운영을 위해 아래 값으로 유지합니다.

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
2. Firebase 콘솔에서 Authentication 이메일/비밀번호 제공업체를 활성화합니다.
3. GitHub Actions variable `VITE_APP_MODE`를 `live`로 바꿉니다.
4. 로그인 화면에서 `실사용 모드` 문구가 보이는지 확인합니다.
5. 새 계정을 만들고 `/app/inbox`로 이동되는지 확인합니다.
6. 잘못된 비밀번호, 약한 비밀번호, 네트워크 오류 문구가 `role="alert"`로 표시되는지 확인합니다.

## 현재 제한

- 공개 GitHub Pages는 기본적으로 데모 모드 배포를 권장합니다.
- Firebase Authentication 이메일/비밀번호 제공업체 활성화는 Firebase 콘솔에서 수동 확인이 필요합니다.
- 실사용 데이터 저장소 연결은 Auth/Firestore 경계와 환경 분리까지 준비되어 있으며, 화면별 영구 Firestore 저장 동기화는 다음 단계에서 확장합니다.
