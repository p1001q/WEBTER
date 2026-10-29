# WEBTER 프론트엔드

Next.js App Router, React, TypeScript, Tailwind CSS 기반 프로젝트입니다.
현재는 초기 실행 화면과 개발·검사 설정만 포함합니다. 실제 화면 디자인, API 및 로그인 연동은 후속 작업입니다.

## 실행 환경

- Node.js: `.nvmrc`에 지정한 24.22.1 LTS
- pnpm: `package.json`에 지정한 10.12.1
- 패키지 버전은 `pnpm-lock.yaml`로 고정합니다. npm·Yarn의 잠금 파일은 함께 사용하지 않습니다.

## 로컬 실행

레포 최상단에서 시작합니다. nvm을 사용하는 경우:

```sh
cd FE
nvm install
nvm use
npm install --global pnpm@10.12.1
pnpm install --frozen-lockfile
pnpm dev
```

다른 Node 버전 관리 도구를 사용해도 동일한 Node 버전을 선택하면 됩니다.
Node 25에서는 `engines`의 Node 24 범위와 `engine-strict=true` 설정 때문에 설치가 차단됩니다.
`nvm install 24 && nvm use 24`로 전환하세요. 팀·CI와 정확히 맞추려면 `FE/`에서 위의 `nvm install`·`nvm use`로 `.nvmrc`의 24.22.1을 선택하세요.
브라우저에서 `http://localhost:3000`으로 접속합니다.
현재 필수 환경변수는 없으며 `.env.example`에 원칙만 적어 두었습니다.
추후 로컬 값은 `.env.local`에 보관합니다. 이 파일은 Git에서 제외합니다.
`NEXT_PUBLIC_` 변수는 브라우저에 공개되므로 비밀키를 넣지 않습니다.

## 명령어

| 명령어        | 용도                  |
| ------------- | --------------------- |
| `pnpm dev`    | 개발 서버 실행        |
| `pnpm check`  | 포맷·ESLint·타입 검사 |
| `pnpm format` | 코드 포맷 정리        |
| `pnpm build`  | 프로덕션 빌드         |
| `pnpm start`  | 빌드 결과로 서버 실행 |

## 구조와 작성 기준

- `src/app/`: 라우트, 공통 레이아웃, 전역 스타일
- `@/*`: `src/*` 경로 별칭
- TypeScript strict 모드, ESLint의 Next.js·TypeScript 규칙, Prettier 사용
- 서버 컴포넌트를 기본으로 사용하고 브라우저 상호작용이 필요한 곳에만 클라이언트 컴포넌트 사용
- Tailwind CSS를 기본으로 사용하고 복잡한 부분만 CSS Modules로 분리
- `globals.css`의 색상·폰트는 초기 실행용 임시값이며 실제 디자인 토큰은 퍼블리싱 시 적용
- 외부 폰트 다운로드 없이 빌드 가능하도록 시스템 폰트 사용
- 상태 관리·데이터 조회 라이브러리는 해당 기능이 필요할 때 추가

ESLint는 Next.js 공식 템플릿 및 플러그인 호환 범위에 맞춰 9.39.5로 고정했습니다.
이 버전은 지원 종료 경고가 있습니다. ESLint 10에서는 현재 포함된 React·접근성·import
플러그인의 peer dependency 범위를 벗어나므로, 플러그인 지원이 갖춰지면 함께 갱신해야 합니다.

## 자동 검사

`.github/workflows/frontend-check.yml`이 `develop` 또는 `main`을 대상으로 하는 PR에서
잠금 파일 기반 설치, 포맷·린트·타입 검사, 프로덕션 빌드를 수행합니다.
필수 검사로 강제하려면 GitHub 브랜치 보호 설정에서 `Frontend checks`를 별도로 지정해야 합니다.
이번 초기 세팅에는 배포 연결과 GitHub 브랜치 보호 설정 변경이 포함되지 않습니다.

Vercel 배포를 선택하면 프로젝트 Root Directory를 `FE`로 지정합니다.
구글 인증, Spring Boot API 연결, 도메인 및 배포 환경변수는 연동 설계 후 설정합니다.
