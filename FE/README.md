# WEBTER 프론트엔드

Next.js App Router, React, TypeScript, Tailwind CSS 기반 프로젝트입니다.
화면의 모의 API(`src/api/mock`) 위에 실제 구글 로그인·온보딩 가입·세션 복원·계정 설정·로그아웃·탈퇴를 연결했습니다. 서비스·리뷰·댓글·알림·좋아요·저장은 아직 목업입니다.

## 실행 환경

- Node.js: `.nvmrc`에 지정한 24.22.2 LTS
- pnpm: `package.json`에 지정한 10.34.9
- 패키지 버전은 `package.json`에 정확한 버전으로 적고 `pnpm-lock.yaml`로 함께 고정합니다. npm·Yarn의 잠금 파일은 함께 사용하지 않습니다.

## 로컬 실행

레포 최상단에서 시작합니다. nvm을 사용하는 경우:

```sh
cd FE
nvm install
nvm use
npm install --global pnpm@10.34.9
pnpm install --frozen-lockfile
pnpm dev
```

다른 Node 버전 관리 도구를 사용해도 동일한 Node 버전을 선택하면 됩니다.
Node 25에서는 `engines`의 Node 24 범위와 `engine-strict=true` 설정 때문에 설치가 차단됩니다.
`nvm install 24 && nvm use 24`로 전환하세요. 팀·CI와 정확히 맞추려면 `FE/`에서 위의 `nvm install`·`nvm use`로 `.nvmrc`의 24.22.2를 선택하세요.
브라우저에서 `http://localhost:3000`으로 접속합니다.
목업 모드에는 필수 환경변수가 없습니다. 실제 로그인은 `NEXT_PUBLIC_API_BASE_URL`을 지정합니다(아래 인증 연결 참고). 로컬 값은 `.env.local`에 보관하며 Git에서 제외합니다. 설정 항목은 `.env.example`을 참고하세요.
`NEXT_PUBLIC_` 변수는 브라우저에 공개되므로 비밀키를 넣지 않습니다.

## 명령어

| 명령어             | 용도                                                     |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | 개발 서버 실행(개발 전용 도구 포함)                      |
| `pnpm check`       | 포맷·ESLint·타입 검사                                    |
| `pnpm test`        | 복귀 경로·인증/가입 상태·설정 저장·입력 경계 회귀 테스트 |
| `pnpm format`      | 코드 포맷 정리                                           |
| `pnpm build`       | 프로덕션 빌드                                            |
| `pnpm verify:prod` | 프로덕션 빌드 후 개발 전용 코드가 섞이지 않았는지 확인   |
| `pnpm start`       | 빌드 결과로 서버 실행                                    |

## 구조와 작성 기준

- `src/app/`: 라우트, 공통 레이아웃, 전역 스타일(디자인 토큰 포함)
- `src/components/`: 화면 공통 컴포넌트(`ui`, `layout`, `service`, `review`, `comment`, `modals`, `legal`)
- `src/domain/`: 화면과 무관한 규칙(점수, 필터, 검증 등)
- `src/api/`: 화면 데이터 계약(`WebterApi`)과 모의 구현, 실제 인증/회원 HTTP 연결(`auth/`). `WebterApi`·목업은 실제 HTTP API 명세와 구분합니다.
- `src/providers/`: 앱 상태(`useWt()`)와 라우트 감시
- `src/dev/`: 개발 전용 도구(Tweaks 컨트롤 패널, UI 갤러리). `pnpm dev`에서만 동작합니다.
- `@/*`: `src/*` 경로 별칭
- TypeScript strict 모드, ESLint의 Next.js·TypeScript 규칙, Prettier 사용
- 서버 컴포넌트를 기본으로 사용하고 브라우저 상호작용이 필요한 곳에만 클라이언트 컴포넌트 사용
- Tailwind CSS를 기본으로 사용하고 복잡한 부분만 CSS Modules로 분리
- 디자인 토큰은 `src/app/globals.css`의 `@theme`에 정의하고 이 토큰만 사용
- 폰트(Pretendard, JetBrains Mono)는 패키지로 포함해 외부 다운로드 없이 빌드
- 상태 관리는 `src/providers`의 자체 스토어를 사용하며 별도 상태·데이터 조회 라이브러리는 아직 도입하지 않음

ESLint는 Next.js 공식 템플릿 및 플러그인 호환 범위에 맞춰 9.39.5로 고정했습니다.
이 버전은 지원 종료 경고가 있습니다. ESLint 10에서는 현재 포함된 React·접근성·import
플러그인의 peer dependency 범위를 벗어나므로, 플러그인 지원이 갖춰지면 함께 갱신해야 합니다.

## 개발 전용 코드

개발 전용 라우트는 `page.dev.tsx`로 만들고, 개발 전용 도구는 `src/dev/`에 둡니다.
프로덕션 빌드에는 포함되지 않으며 `pnpm verify:prod`가 `src/dev/marker.ts`의 표식이 빌드 결과에 없는지 확인합니다. Tweaks의 회원·비회원·신규 가입 강제 전환과 바로가기의 자동 회원 전환은 제거했습니다. 예전에 저장한 세션 선택값도 무시합니다. 화면 폭·샘플·데이터·이미지·실패 재현 설정은 유지하며 실제 회원 반영(`adoptMember`)은 오류 재현 대상에서 제외합니다.

## 자동 검사

`.github/workflows/frontend-check.yml`이 `develop` 또는 `main`을 대상으로 하는 PR에서
잠금 파일 기반 설치, 포맷·린트·타입 검사, 프로덕션 빌드를 수행합니다.
`pnpm test`와 `pnpm verify:prod`는 로컬에서 실행합니다.
필수 검사로 강제하려면 GitHub 브랜치 보호 설정에서 `Frontend checks`를 별도로 지정해야 합니다.
이번 초기 세팅에는 배포 연결과 GitHub 브랜치 보호 설정 변경이 포함되지 않습니다.

Vercel 배포를 선택하면 프로젝트 Root Directory를 `FE`로 지정합니다.
인증/회원의 로컬 HTTP 연결은 아래와 같습니다. 운영 도메인·프록시·쿠키 전달과 배포 환경변수는 별도로 정합니다.

## 실제 인증·회원 연결

- `NEXT_PUBLIC_API_BASE_URL`이 비어 있으면 기존 목업 로그인입니다. 실제 연결에서는 백엔드 origin을 지정하며 이 PC의 로컬 검증 구성은 `http://localhost:18082`입니다. 프론트는 `3100` 포트를 사용했고 백엔드 CORS·프론트 origin·Google 콜백도 함께 맞춥니다. 구글 클라이언트 secret은 FE에 두지 않습니다.
- `src/api/auth/http.ts`가 `credentials: "include"`로 세션 쿠키를 보내고 변경 요청 전에 CSRF 토큰을 받아 헤더에 싣습니다. 서버 오류 코드를 보존해 약관 버전 변경도 구분합니다.
- 로그인은 백엔드 `/api/auth/login/google?returnTo=...`로 문서 이동합니다. 구글 인증 후 기존 회원은 보던 내부 경로, 미가입자는 온보딩으로 이동합니다. 로그인 취소·실패는 로그인 화면에서 안내합니다.
- 첫 화면 이후 `/api/auth/session`으로 세션을 복원합니다. 확인 중에는 `sessionReady`로 인증이 필요한 화면을 기다리게 하고 비회원·가입 대기·조회 실패에서는 남아 있던 목업 회원 상태를 제거합니다.
- 실제 연결 범위는 로그인·온보딩 가입·본인 조회·계정 설정·로그아웃·탈퇴입니다. 서비스·리뷰·댓글·알림·좋아요·저장과 집계 데이터는 여전히 목업입니다. 전체 HTTP 계약은 `BE/README.md`를 따릅니다.

### 온보딩·설정의 실패 처리

- 가입 대기 세션만 온보딩을 진행합니다. 약관 버전 조회 전·조회 실패 시 동의를 막고 재시도할 수 있게 합니다. 동의하지 않은 새 버전을 최종 제출 때 자동 조회해 수락시키지 않습니다.
- 최종 가입이 `USER_409_03`이면 최신 버전을 다시 조회하고 동의를 해제해 약관 단계로 돌아갑니다. 현재 화면의 아이디·닉네임·카테고리는 유지하며 이탈 후 복원용으로 저장하지 않습니다.
- 시작·건너뛰기는 아이디 중복 확인이 시작될 때부터 가입 응답까지 한 번만 실행합니다. 실패하면 다시 제출할 수 있습니다.
- 계정 설정은 실제 서버 응답의 링크 순서·보완된 주소를 입력칸에 반영합니다. 응답 대기 중 새로 편집한 링크는 덮어쓰지 않습니다.
- 모든 프로필 링크는 생략한 `https://`를 포함해 최종 주소 300자로 제한합니다. 서버도 같은 최종 주소를 검사합니다.

### 닉네임 정책

최소 1글자, 완성형 한글 2칸·영문/숫자/일반 공백 1칸의 합계 최대 16칸입니다. 혼용과 중간 단일 공백은 허용하고 초성·모음·특수문자·이모지·앞뒤/연속 공백은 금지합니다. 중복·변경은 허용하며 부적절한 닉네임 금지는 정책이고 자동 욕설 필터는 두지 않습니다.

`nickWeight`·`nickCheck`(`domain/validation.ts`)가 같은 규칙으로 온보딩·계정 설정의 검증을 맡고, 길이 카운터는 글자 수가 아니라 가중 길이(`n/16`)를 표시합니다. 상수는 `POLICY.nickMin`·`nickMaxWeight`·`nickHangulWeight`이며 아이디 규칙과 별개입니다. BE는 같은 규칙을 `ValidNickname`으로 검사합니다.

### 이번 변경의 검증 기록

2026-11-04 FE 자동 테스트 19개(닉네임 경계 5개 포함)와 `tsc --noEmit`, ESLint 경고 0개, Prettier 검사가 통과했습니다. UI 테스트는 실제 TSX의 이벤트·상태/effect 경계를 가벼운 테스트 도구로 실행하며 DOM 렌더링·브라우저·실제 Google을 대신하지 않습니다. OIDC 자동 검증과 BE 테스트는 백엔드 README를 참고하세요.

실제 Google 브라우저 재검증은 사용자가 완료했다고 보고했습니다. 이는 사용자 수동 검증 결과이며 이번 자동 테스트·문서 수정 중 직접 재수행한 결과와 구분합니다. 닉네임 정책 적용 후의 실제 브라우저 확인은 아직 하지 않았습니다.
