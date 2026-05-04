# 담임 행정 허브

## 앱 목적

담임교사가 공문, 제출물 수합판, 템플릿, 마감일을 한 화면에서 정리하고 오늘 할 일을 빠르게 확인할 수 있도록 지원합니다.  
학생 개별 개인 정보는 저장하지 않고, 문서 원문 파일도 별도 업로드하지 않는 운영 흐름으로 설계합니다.

## 첫 버전 포함 범위

- 이메일 기반 로그인 후 개인 워크스페이스 진입
- 오늘 업무함(우선순위 정렬)
- 공문 업무 등록/상태 관리/상세 편집
- 제출물 수합판(학급별 제출 상태 및 메모)
- 반복 템플릿(안내문·보고 문구) 작성/저장/미리보기
- 마감 캘린더 및 간단 보관 목록
- 공문-수합판 연결 로직
- 실사용 모드에서 `users/{uid}` 아래 학급/업무/수합판/템플릿 Firestore 저장
- E2E 데모 모드에서 실제 Firebase 인증 없이 기본 시연 흐름 확인

## 첫 버전 제외 범위

- 파일 업로드/첨부 보관
- 외부 학교/행정 API 연동
- 교사 간 협업 공유/권한 분리
- 실제 화상문서 저장(외부 스토리지 연동)

## Firebase 환경 변수 설정

`.env.local` 또는 실행 시 환경 변수로 설정합니다.

```bash
VITE_APP_MODE=live
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

공개 GitHub Pages 데모는 실제 인증 없이 데모 데이터로 동작하도록 아래 값을 사용합니다.

```bash
VITE_APP_MODE=demo
VITE_DEMO_AUTH_USER=demo-user
```

GitHub Pages workflow는 repository variables를 읽어 빌드합니다. 실사용 모드로 전환하려면 repo variables에
`VITE_APP_MODE=live`와 `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`를 등록합니다.

현재 Firebase 프로젝트는 `homeroom-admin-hub-wbmaker2`, Firestore 리전은 `asia-northeast3`(Seoul)입니다.
Authentication Email/Password 제공업체를 콘솔에서 활성화한 뒤 `VITE_APP_MODE=live`로 전환합니다.

자세한 실사용 연결 순서는 [Firebase 실사용 연결 체크리스트](docs/firebase-live-setup.md)를 참고합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

기본 URL: `http://127.0.0.1:5173`

## 테스트 실행

```bash
npm run test
npm run test:e2e
npm run check
```

`npm run check`는 단위 테스트 실행(`npm test -- --run`) 후 빌드/린트를 수행합니다.

## 파일 업로드를 제공하지 않는 이유

- 문서 원본은 보안/저작권/개인정보 이슈와 저장 용량 관리 부담이 있어 별도 업로드 기능을 두지 않았습니다.
- 공문/과제/템플릿 링크, 문서번호, 메모 형태로 운영하도록 구성해 운영 부담을 낮춥니다.
- 실제 제출물은 학생·학부모측 제출 채널(공문 원문 링크, 메신저, 로컬 폴더 참조)로 처리합니다.
