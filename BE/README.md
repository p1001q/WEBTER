# WEBTER 백엔드

Spring Boot(Java) 기반 API 서버입니다. 현재는 실행·헬스체크·DB 연결·Docker 이미지까지만 포함하며, 업무 API와 인증은 후속 작업입니다.

## 실행 환경

| 항목 | 버전 |
|---|---|
| Java | 21 (LTS) |
| Spring Boot | 4.1.2 |
| Gradle | 9.8.2 (래퍼 `./gradlew` 사용, 별도 설치 불필요) |
| DB | PostgreSQL 17 |

Java는 최신 LTS인 25가 아니라 21을 선택했습니다. 둘 다 LTS이고 Spring Boot 4가 모두 지원해서 이 프로젝트에서 기능 차이는 없습니다. 개발 환경에 기본 설치된 JDK가 21이라 별도 설치 없이 바로 쓸 수 있다는 점이 이유입니다. 올릴 때는 `build.gradle`의 toolchain, `Dockerfile`, `.github/workflows/backend-check.yml`의 21을 함께 바꿉니다.

## 로컬 실행

DB를 먼저 띄웁니다(Docker 필요).

```sh
cd BE
docker compose up -d db
./gradlew bootRun
```

`bootRun`은 `local` 프로파일로 실행됩니다. 기본 접속 정보는 `compose.yml`과 같은 `localhost:5432`, `webter/webter`입니다. 종료는 `docker compose down`이고, 데이터까지 지우려면 `down -v`를 씁니다.

## 명령어

| 명령어 | 용도 |
|---|---|
| `./gradlew bootRun` | 로컬 실행(`local` 프로파일) |
| `./gradlew test` | 테스트. Testcontainers가 운영과 같은 PostgreSQL 17을 컨테이너로 띄우므로 Docker가 필요하다 |
| `./gradlew build` | 테스트 + 실행 jar 빌드 (`build/libs/app.jar`) |
| `docker build -t webter-backend .` | Docker 이미지 빌드 |

Docker 이미지는 JVM 힙을 컨테이너 메모리의 60%로 제한합니다(`Dockerfile`). 운영 compose의 앱 메모리 제한(768MiB)에서 힙 밖 메모리가 쓸 공간을 남기기 위한 값이며, 제한이 바뀌면 함께 조정합니다.

## 헬스체크

| 경로 | 의미 |
|---|---|
| `/health` | 전체 상태 |
| `/health/liveness` | 프로세스 생존 |
| `/health/readiness` | 요청을 받을 준비 상태(DB 연결 포함). DB가 내려가면 5초 안에 503 |

`IN/`의 배포 설정이 기본으로 기대하는 경로(`/health`)와 같습니다. DB 연결 대기 시간은 기본 30초 대신 5초(`spring.datasource.hikari.connection-timeout`)로 줄여, DB 장애 때 일반 요청도 5초 안에 실패합니다.

## 환경변수

`BE/.env.example`에 같은 목록이 있습니다. 비밀값은 코드와 레포에 넣지 않습니다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | (`bootRun`만 `local`) | 운영에서는 지정하지 않는다 |
| `PORT` | `8080` | 수신 포트 |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `5432` / `webter` | DB 주소 |
| `DB_USER` / `DB_PASSWORD` | 없음 (`local`은 `webter`) | DB 계정 |
| `CORS_ALLOWED_ORIGINS` | 없음 (`local`은 `http://localhost:3000`) | API 호출을 허용할 프론트엔드 도메인. 쉼표로 여러 개 지정 |

## CORS

프론트엔드(Vercel 등 다른 도메인)가 브라우저에서 API를 호출하려면 허용 도메인 등록이 필요합니다. `CORS_ALLOWED_ORIGINS`가 비어 있으면 다른 도메인의 호출을 모두 막으므로, 배포할 때 프론트 도메인을 넣어야 합니다(`com.webter.global.config.CorsConfig`). 쿠키 인증을 쓸 가능성에 대비해 인증 정보 포함 요청(`allowCredentials`)을 허용해 두었으며, 인증 방식을 정할 때 다시 확인합니다. Spring Security를 도입하면 보안 설정 쪽에도 CORS를 함께 설정해야 합니다.

## 스키마 관리

- **로컬(`local`)·테스트(`test`)**: 스키마는 Flyway가 `src/main/resources/db/migration/`의 SQL로 만들고(`spring.flyway.enabled: true`), JPA는 엔티티와 DB가 맞는지 검증만 합니다(`ddl-auto: validate`). 엔티티가 DB와 다르면 앱이 시작할 때 오류가 납니다. CHECK·부분 인덱스·복합 FK 같은 제약은 JPA가 만들 수 없어서 SQL로 관리합니다.
- **운영**: 자동 생성을 쓰지 않습니다(`ddl-auto: none`). 앱 DB 계정에는 테이블 변경 권한이 없다는 `IN/` 설계에 맞춘 것입니다.
- **마이그레이션 규칙**: 첫 배포 전까지는 `V1__init.sql`을 직접 고치고 로컬 DB를 다시 만듭니다(아래 명령). 첫 배포 이후에는 V1을 수정하지 않고 `V2__설명.sql`처럼 새 파일로 변경을 추가합니다. 운영 DB에는 DDL 권한이 있는 관리자 계정으로 따로 실행하며, 실행 방법은 서버 환경이 정해질 때 정리합니다(`application.yaml`의 기본값은 `enabled: false`).
- **로컬 DB 다시 만들기**: `docker compose down -v && docker compose up -d`(데이터가 모두 지워집니다).

## 구조

```
BE/
├─ src/main/java/com/webter/
│  ├─ global/                       공통 기반(config, response, exception, entity). 로그인 단계에서 security 등을 추가한다
│  └─ domain/<기능>/                기능별 패키지(user, webservice, review 등). 안에 controller·service·repository·entity·dto·exception을 둔다
├─ src/main/resources/
│  ├─ application.yaml              공통 설정(환경변수 기반)
│  ├─ application-local.yaml        로컬 개발 설정
│  └─ db/migration/                 Flyway 마이그레이션(V1__init.sql: 초기 23개 테이블)
├─ src/test/                        테스트(test 프로파일, Testcontainers PostgreSQL)
├─ Dockerfile                       멀티스테이지 이미지(비루트 실행)
└─ compose.yml                      로컬 개발용 PostgreSQL
```

## API 공통 규칙

- 모든 응답은 `ApiResponse`(`success`, `code`, `message`, `data`) 형식입니다. 실패하면 `data`는 비고 `code`로 원인을 구분합니다. 입력 검증 실패는 `data`에 필드별 메시지가 담깁니다.
- 업무 규칙 위반은 `BusinessException(ErrorCode)`를 던지면 `GlobalExceptionHandler`가 오류 응답으로 바꿉니다. 공통 코드는 `CommonErrorCode`, 기능별 코드는 각 기능 패키지의 `exception`에 둡니다. 코드 형식은 `{기능}_{HTTP 상태}_{번호}`입니다(예: `COMMON_404_01`).
- 예상하지 못한 예외는 내용을 응답에 담지 않고 로그에만 남깁니다.
- 엔티티의 시각 컬럼은 `BaseCreatedEntity`(created_at) 또는 `BaseTimeEntity`(created_at + updated_at)를 상속해 자동으로 채웁니다.
- API 문서(Swagger UI)는 로컬에서만 열립니다(`http://localhost:8080/swagger-ui.html`).

## 후속 작업

구글 로그인(인증), 업무 API와 엔티티, 마이그레이션 실행 방식, 배포 연결은 아직 포함하지 않습니다.
