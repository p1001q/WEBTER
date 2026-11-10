# WEBTER

> 웹이 모이는 터, 웹터

개발자가 만든 웹 서비스를 발견하고, 설치 없이 바로 이용하며 리뷰와 반응을 나누는 **웹 서비스 스토어**입니다.
SW인재양성 프로젝트로 진행합니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | Next.js (App Router), React, TypeScript, Tailwind CSS |
| 백엔드 | Spring Boot (Java), PostgreSQL |
| 인프라 | AWS EC2, Docker Compose, Terraform, GitHub Actions |

인프라는 초안이며 서버 제공 방식 확인 전까지 실제 서버 생성·배포 세팅을 보류합니다. 구글 로그인·온보딩 가입·계정 설정·로그아웃·탈퇴는 구현해 `develop`에 반영했고, 엔티티·스키마 기반 위에서 업무 API와 프론트 연동을 기능별로 진행합니다.

## 현재 기준

- 실제 런칭을 목표로 하며 MVP는 첫 출시 범위입니다. 주요 화면 퍼블리싱과 목업 상호작용을 구현했고, 업무 API 구현과 프론트 연동을 병행하는 단계입니다.
- 기능별로 저장 유지·권한·실패 처리를 확인하고, 구현·연동 결과에서 ERD와 API 명세서를 정리합니다. 관계·제약·요청/응답은 기능 개발 전에 맞춥니다.
- 첫 출시는 구글 로그인만 제공합니다. 구글 OIDC와 서버 세션 쿠키로 인증·가입·계정 설정·탈퇴를 구현했습니다. 세션 30분은 구현값이며 운영 유지 기간·여러 기기·도메인/쿠키 전달 방식은 미정입니다.
- 단독 서비스 평가·리뷰 연결과 리뷰 글 추천/비추천은 별도 기능입니다. 마이페이지 정렬·비공개 저장·팀원 동일 권한·알림 9종·이미지 업로드(S3, 1차 연동)·신고 런칭 초반 4명·하루 등록 5개·아이디 14일 2회·관리자 페이지(MVP) 등은 [정책서](PM/docs/정책서.md)를 따릅니다.
- 엔티티·리포지토리·Flyway V1~V4·공통 응답/예외·CORS·OpenAPI 기반과 인증·회원 API가 있습니다. 로컬은 Flyway와 JPA validate, 운영은 자동 DDL과 앱 실행 시 Flyway를 끕니다. 서비스·리뷰·이미지·알림 등 나머지 업무 API 연결 완료를 뜻하지 않습니다.
- HTML 3종은 이전 시안입니다. 현재 Next.js 화면·남은 요구·당시 검수 기록은 [화면설계서](PM/docs/화면설계서.md)에서 구분합니다. 독립 오픈소스 영역은 런칭 이후 확장으로 보류했습니다.
- 실제 서버 제공 방식 확인 전 배포는 보류합니다. 구성은 프론트 Vercel(개발·시연은 Hobby), 백엔드 AWS EC2, 같은 상위 도메인의 서브도메인이며 도메인은 구매하기로 했습니다. 런칭이 확정되면 요금제와 서버 사양을 다시 정합니다. 버전·실행 방법은 각 영역 README를 따릅니다.

## 폴더 구조

```
WEBTER/
├─ FE/          프론트엔드 (Next.js)
├─ BE/          백엔드 (Spring Boot)
├─ IN/          인프라·배포 설정 (Terraform, Docker Compose)
├─ PM/docs/     기획서, 정책서, 화면설계서, 프로토타입
├─ .github/     CI 워크플로
├─ compose.yml  로컬 통합 실행(DB·Redis·BE·FE)
└─ README.md
```

각 영역의 설정 파일은 해당 폴더 안에 두고, 루트에는 프로젝트 공통 파일만 둡니다.

## 문서

| 문서 | 내용 |
|---|---|
| [기획서](PM/docs/기획서.md) | 서비스 방향, 범위, 경쟁 분석 |
| [정책서](PM/docs/정책서.md) | 기능 규칙(권한, 상태, 등록·리뷰·신고·집계) |
| [화면설계서](PM/docs/화면설계서.md) | 화면 구성과 흐름 |
| [약관·고지 관리](PM/docs/약관·고지 관리.md) | 약관·개인정보처리방침 등 고지 항목의 보완 목록과 진행 순서 |
| [프로토타입](PM/docs/프로토타입.html) · [디자인시스템](PM/docs/디자인시스템.html) · [와이어프레임](PM/docs/와이어프레임.html) | 화면 시안 |

## 시작하기

- 로컬 통합 실행: 아래 "로컬 통합 실행"
- 프론트엔드: [FE/README.md](FE/README.md)
- 백엔드: [BE/README.md](BE/README.md)
- 인프라: [IN/README.md](IN/README.md)

## 로컬 통합 실행

Docker로 DB·Redis·BE·FE를 한 번에 띄웁니다(로컬 개발 전용, 운영 구성은 `IN/`).

```sh
docker compose up --build
```

- 기본 접속: FE `http://localhost:3000`, BE `http://localhost:8080`. BE는 `local,redis-session` 프로파일(Flyway 스키마, Redis 세션)로 실행하고 FE는 Node 24.22.2 컨테이너에서 `pnpm dev`로 실행합니다. DB·Redis는 `BE/compose.yml`을 그대로 쓰며 데이터는 BE 폴더에서 띄우던 DB와 같습니다.
- 설정은 루트 `.env`(Git 제외, 예시는 `.env.example`)로 합니다. 8080 등이 이미 쓰이면 `FE_PORT`, `BE_PORT`를 바꾸며, CORS·로그인 후 이동 주소·FE의 API 주소는 두 값에서 자동으로 맞춰집니다.
- 구글 로그인은 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`을 `.env`에만 적으면 켜집니다. 구글 콘솔 콜백은 `http://localhost:{BE_PORT}/login/oauth2/code/google`입니다. 값이 없으면 로그인 시작은 503입니다.
- 종료는 `docker compose down`입니다. Redis는 디스크 보존을 끄고 띄워서 종료하면 Redis의 로그인 세션이 삭제되고, PostgreSQL 데이터는 볼륨에 남습니다. PostgreSQL 데이터까지 지우려면 `down -v`를 씁니다.
