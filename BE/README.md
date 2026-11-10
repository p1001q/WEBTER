# WEBTER 백엔드

Spring Boot(Java) 기반 API 서버입니다. 엔티티·리포지토리, Flyway V1~V4·기본 데이터, 공통 응답/예외·CORS·OpenAPI·Testcontainers 기반과 구글 로그인·온보딩 가입·현재 사용자 조회·계정 설정·로그아웃·회원 탈퇴 API가 있습니다. 서비스·리뷰·댓글·알림·좋아요·저장 등 나머지 업무 API와 배포 연결은 후속 작업입니다.

## 실행 환경

| 항목 | 버전 |
|---|---|
| Java | 21 (LTS) |
| Spring Boot | 4.1.2 |
| Gradle | 9.8.2 (래퍼 `./gradlew` 사용, 별도 설치 불필요) |
| DB | PostgreSQL 17 |

프로젝트는 Java 21을 기준으로 구성했습니다. 버전을 변경하면 `build.gradle`의 toolchain, `Dockerfile`, `.github/workflows/backend-check.yml`을 함께 맞춥니다.

## 로컬 실행

DB를 먼저 띄웁니다(Docker 필요).

```sh
cd BE
docker compose up -d db
./gradlew bootRun
```

기본(`local`)은 서버 메모리 세션이라 Redis 없이 실행됩니다. Redis 세션으로 확인하려면 Redis를 함께 띄우고 `redis-session` 프로파일을 추가합니다.

```sh
docker compose up -d db redis
SPRING_PROFILES_ACTIVE=local,redis-session ./gradlew bootRun
```

FE·BE·DB·Redis를 한 번에 띄우려면 저장소 루트의 `compose.yml`을 사용합니다(루트 [README](../README.md) 참고).

`bootRun`은 `local` 프로파일로 실행되고 `BE/.env`를 선택적으로 읽습니다. 비밀값은 이 파일 또는 로컬 환경변수로만 제공하고 커밋하지 않습니다. 기본 접속 정보는 `compose.yml`과 같은 `localhost:5432`, `webter/webter`입니다. 종료는 `docker compose down`이고, 데이터까지 지우려면 `down -v`를 씁니다.

## 명령어

| 명령어 | 용도 |
|---|---|
| `./gradlew bootRun` | 로컬 실행(`local` 프로파일) |
| `./gradlew test` | 테스트. Testcontainers가 운영과 같은 PostgreSQL 17과 Redis 7.4를 컨테이너로 띄우므로 Docker가 필요하다 |
| `./gradlew build` | 테스트 + 실행 jar 빌드 (`build/libs/app.jar`) |
| `docker build -t webter-backend .` | Docker 이미지 빌드 |

Docker 이미지는 JVM 힙을 컨테이너 메모리의 60%로 제한합니다(`Dockerfile`). 운영 compose의 앱 메모리 제한(768MiB)에서 힙 밖 메모리가 쓸 공간을 남기기 위한 값이며, 제한이 바뀌면 함께 조정합니다.

## 헬스체크

| 경로 | 의미 |
|---|---|
| `/health` | 전체 상태 |
| `/health/liveness` | 프로세스 생존 |
| `/health/readiness` | 요청을 받을 준비 상태(DB 연결 포함, Redis 세션이면 Redis 연결도 포함). DB가 내려가면 5초 안에 503, Redis가 응답하지 않아도 503 |

`IN/`의 배포 설정이 기본으로 기대하는 경로(`/health`)와 같습니다. DB 연결 대기 시간은 기본 30초 대신 5초(`spring.datasource.hikari.connection-timeout`)로 줄여, DB 장애 때 일반 요청도 5초 안에 실패합니다.

## 환경변수

`BE/.env.example`에 같은 목록이 있습니다. 비밀값은 코드와 레포에 넣지 않습니다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | (`bootRun`만 `local`) | 운영에서는 지정하지 않는다 |
| `PORT` | `8080` | 수신 포트 |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `5432` / `webter` | DB 주소 |
| `DB_USER` / `DB_PASSWORD` | 없음 (`local`은 `webter`) | DB 계정 |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis 주소(로그인 세션 저장소). 메모리 세션(`local`·`test` 기본)에서는 쓰지 않는다 |
| `REDIS_PASSWORD` | 없음 | Redis 비밀번호 |
| `CORS_ALLOWED_ORIGINS` | 없음 (`local`은 `http://localhost:3000`) | API 호출을 허용할 프론트엔드 origin. 쉼표로 여러 개 지정 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 없음 | 웹 OAuth 클라이언트 정보. 미설정이면 로그인 시작은 503이며 테스트용 인증으로 대체하지 않는다 |
| `AUTH_FRONTEND_ORIGIN` | `http://localhost:3000` | 로그인 후 이동할 프론트 origin. 경로·쿼리 없이 지정 |
| `AUTH_BACKEND_ORIGIN` | `http://localhost:8080` | 구글 콜백 주소를 조립할 백엔드 origin |
| `SESSION_TIMEOUT` | `30m` | 비활동 기준 만료 시간. 메모리·Redis 세션 공통이며 현재 구현값이고 운영 정책은 미정 |
| `SESSION_COOKIE_SECURE` | `true` (`local`은 `false`) | HTTPS 환경은 Secure 쿠키 사용 |

## CORS

다른 origin의 프론트에서 호출하려면 `CORS_ALLOWED_ORIGINS`에 정확한 origin을 등록하고 요청에 `credentials: "include"`를 사용합니다. 세션 쿠키를 사용하므로 와일드카드 origin은 쓰지 않습니다. MVC의 `CorsConfig`를 Spring Security에서도 사용합니다. CORS 허용만으로 다른 사이트 간 쿠키 전달이 해결되지는 않으며 운영 도메인·프록시 구성은 미정입니다.

## 스키마 관리

- **로컬(`local`)·테스트(`test`)**: 스키마는 Flyway가 `src/main/resources/db/migration/`의 SQL로 만들고(`spring.flyway.enabled: true`), JPA는 엔티티와 DB가 맞는지 검증만 합니다(`ddl-auto: validate`). 엔티티가 DB와 다르면 앱이 시작할 때 오류가 납니다. CHECK·부분 인덱스·복합 FK 같은 제약은 JPA가 만들 수 없어서 SQL로 관리합니다.
- **운영**: 자동 생성을 쓰지 않습니다(`ddl-auto: none`). 앱 DB 계정에는 테이블 변경 권한이 없다는 `IN/` 설계에 맞춘 것입니다.
- **마이그레이션 규칙**: V1 초기 스키마·V2 카테고리/동의 문구·V3 수락 초대 제약·V4 닉네임 규칙이 있습니다. V3·V4는 이미 앞 버전을 적용한 로컬 DB를 재생성하지 않도록 새 파일로 추가했고, 이후 스키마 변경도 새 파일(V5~)로 추가하며 V1은 수정하지 않습니다. 공유 DB에 적용한 SQL은 적용 이력과 팀 동기화를 확인합니다. 첫 배포 이후에는 적용한 파일을 바꾸지 않고 새 버전으로 추가합니다. 운영 DB에는 DDL 권한이 있는 관리자 계정으로 따로 실행하며, 실행 방법은 서버 환경이 정해질 때 정리합니다(`application.yaml`의 기본값은 `enabled: false`).
- **로컬 DB 다시 만들기**: `docker compose down -v && docker compose up -d`(데이터가 모두 지워집니다).

## 구조

```
BE/
├─ src/main/java/com/webter/
│  ├─ global/                       공통 기반(config, response, exception, entity, security)
│  └─ domain/<기능>/                기능별 패키지(user, webservice, review 등). 안에 controller·service·repository·entity·dto·exception을 둔다
├─ src/main/resources/
│  ├─ application.yaml              공통 설정(환경변수 기반)
│  ├─ application-local.yaml        로컬 개발 설정
│  └─ db/migration/                 Flyway 마이그레이션(V1 초기 23개 테이블, V2 기본 데이터, V3 수락 초대 제약)
├─ src/test/                        테스트(test 프로파일, Testcontainers PostgreSQL)
├─ Dockerfile                       멀티스테이지 이미지(비루트 실행)
└─ compose.yml                      로컬 개발용 PostgreSQL·Redis
```

## API 공통 규칙

- 모든 응답은 `ApiResponse`(`success`, `code`, `message`, `data`) 형식입니다. 실패하면 `data`는 비고 `code`로 원인을 구분합니다. 입력 검증 실패는 `data`에 필드별 메시지가 담깁니다.
- 업무 규칙 위반은 `BusinessException(ErrorCode)`를 던지면 `GlobalExceptionHandler`가 오류 응답으로 바꿉니다. 공통 코드는 `CommonErrorCode`, 기능별 코드는 각 기능 패키지의 `exception`에 둡니다. 코드 형식은 `{기능}_{HTTP 상태}_{번호}`입니다(예: `COMMON_404_01`).
- 예상하지 못한 예외는 내용을 응답에 담지 않습니다. DB 예외는 PostgreSQL 오류 원문에 키 값이 포함될 수 있어 Hibernate의 JDBC 오류 원문 로깅을 끄고 예외 종류·SQLState만 기록합니다. 구글 sub·이메일·토큰·비밀값을 로그에 추가하지 않습니다.
- 엔티티의 시각 컬럼은 `BaseCreatedEntity`(created_at) 또는 `BaseTimeEntity`(created_at + updated_at)를 상속해 자동으로 채웁니다.
- API 문서(Swagger UI)는 로컬에서만 열립니다(`http://localhost:8080/swagger-ui.html`).

## 인증·회원 API

구글 OIDC 범위는 `openid email`입니다. 구글 sub로 계정을 식별하며 이메일은 식별자로 쓰지 않습니다. 검증된 이메일만 비공개 회원 정보로 저장하고 구글 토큰·프로필 사진은 보관하지 않습니다. 로그인 후 `WEBTER_SESSION` 쿠키(HttpOnly, SameSite=Lax, 운영 기본 Secure)로 서버 세션을 사용합니다.

| 메서드 | 경로 | 용도·접근 |
|---|---|---|
| GET | `/api/auth/login/google?returnTo=...` | 로그인 시작. 구글 인증 화면으로 이동 |
| GET | `/login/oauth2/code/google` | Spring Security가 처리하는 구글 콜백 |
| GET | `/api/auth/csrf` | 변경 요청에 사용할 `headerName`, `token` 조회 |
| GET | `/api/auth/session` | 비회원도 200. 현재 로그인 상태와 본인 정보 조회 |
| GET | `/api/auth/username-available?username=...` | 가입 대기 세션만 아이디 중복 확인. 응답 `available` |
| POST | `/api/auth/signup` | 가입 대기 세션의 온보딩 최종 제출. 성공 201 |
| POST | `/api/auth/logout` | 현재 세션 무효화·쿠키 삭제 |
| PUT | `/api/users/me` | 회원 본인의 계정 설정 저장 |
| DELETE | `/api/users/me` | 회원 본인 탈퇴·현재 세션 무효화 |
| GET | `/api/policies/current` | 현재 약관 목록(`documentType`, `version`, `title`). 본문 조회 API는 아님 |

JSON 응답은 `ApiResponse`를 따릅니다. 로그인 시작·콜백은 리디렉션을 사용합니다. POST·PUT·DELETE 요청은 쿠키와 함께 `/api/auth/csrf`가 알려 준 헤더 이름·토큰을 보내야 합니다. 권한이 필요한 요청은 비로그인 401, 가입 대기의 회원 API 접근 등은 403입니다.

### 로그인 상태와 가입

`GET /api/auth/session`의 `data`는 `status`, `pending`, `member`입니다. 해당하지 않는 필드는 null입니다.

- `ANONYMOUS`: 비로그인. `pending`, `member` 모두 null.
- `SIGNUP_PENDING`: 구글 인증만 완료. `pending.email`은 본인 확인용 비공개 이메일이며 회원 권한은 없습니다. 이 단계에서는 DB에 회원을 저장하지 않습니다.
- `MEMBER`: 가입 완료. `member`는 `id`, `username`, `nickname`, `email`, `bio`, `links`(kind/url), `role`, `accountStatus`, `interests`(카테고리 코드)를 담습니다.

가입 본문은 `username`, `nickname`, `interests`(코드 배열, 건너뛰면 빈 배열), `consents`(`documentType`, `version` 배열)입니다. 이용약관 `TERMS`, 개인정보 수집·이용 `PRIVACY`, 만 14세 확인 `AGE_CONFIRMATION`의 현재 버전을 각각 한 번씩 보내야 합니다. 회원·소셜 연결·동의·관심 카테고리는 한 트랜잭션으로 저장하고 실패하면 전부 롤백합니다.

최종 제출의 아이디 중복은 `USER_409_01`, 이미 가입한 구글 계정은 `USER_409_02`, 약관 버전 변경은 `USER_409_03`입니다. 약관이 바뀌면 새 버전에 자동 동의시키지 않고 프론트가 버전 재조회·동의 해제·약관 단계 복귀를 처리합니다. 기존 회원 전체 재동의 API·정책은 이번 범위가 아닙니다.

### 계정 설정과 탈퇴

`PUT /api/users/me`는 `username`, `nickname`, `bio`, `links`(`kind`, `url`), `interests`를 전체 전송합니다. 소개는 최대 80자, 링크는 종류별 1개·최대 5개, 관심 카테고리는 최대 3개입니다. 링크는 http(s)만 허용하며 스킴이 없으면 `https://`를 붙입니다. **보완한 최종 주소까지 300자**로 제한합니다. 응답의 링크는 종류 이름순이므로 프론트 입력칸도 실제 응답과 동기화합니다.

탈퇴는 회원 행을 삭제합니다. 현재 DB 외래키에 따라 등록 서비스·좋아요·저장·동의·알림은 삭제하고 리뷰·댓글은 작성자를 비워 둡니다. 같은 구글 계정으로 재가입하면 새 회원입니다. 팀원이 있는 서비스의 등록자 탈퇴 처리(서비스 유지, 등록자 승계)는 정책으로 정했지만 이 구현에는 포함하지 않았습니다.

새 닉네임 정책은 최소 1글자·가중 길이 16칸(완성형 한글 2, 영문/숫자/공백 1), 중간 단일 공백, 초성·모음·특수문자·이모지 금지입니다. 정책서에 확정했고 FE·BE 검증에 적용했습니다. BE는 `ValidNickname`(가입·계정 설정 요청)이 가중 길이와 허용 문자를 검사하며 아이디 규칙(`UserPatterns.USERNAME`)과 별개입니다. 부적절한 닉네임 금지는 정책이며 자동 욕설 필터는 두지 않습니다.

### 프론트 이동·로컬 설정

- 기존 회원 로그인 성공: 허용된 `returnTo`로 이동. 신규 인증 성공: `/onboarding?back=...`. 취소·실패: `/login?error=cancelled|failed&back=...`.
- `returnTo`는 내부 경로만 허용하며 외부 URL·역슬래시·제어문자·경로 우회 등은 차단합니다. 콜백과 프론트 이동은 설정된 origin을 기준으로 합니다.
- 이 PC의 독립 검증 포트는 BE `18082`, FE `3100`입니다. 이 구성이면 `PORT=18082`, `AUTH_BACKEND_ORIGIN=http://localhost:18082`, `AUTH_FRONTEND_ORIGIN=http://localhost:3100`, `CORS_ALLOWED_ORIGINS=http://localhost:3100`을 맞춥니다. HTTP 로컬에만 `SESSION_COOKIE_SECURE=false`를 사용합니다.
- Google Console의 웹 OAuth 클라이언트에는 콜백 `http://localhost:18082/login/oauth2/code/google`을 정확히 등록합니다. 클라이언트 ID·secret은 로컬 환경으로만 제공합니다. 이 문서 수정에서 콘솔 설정은 바꾸지 않았습니다.
- 인증 구현 자체는 기존 Flyway V1~V3를 사용합니다. 닉네임 최소 1글자를 허용하려고 `V4__allow_single_character_nickname.sql`을 추가했습니다(`users.nickname` CHECK를 2~20자에서 1~20자로 교체, 앞뒤 공백 금지는 유지). 형식·가중 길이는 애플리케이션이 검증합니다. 운영 DB에는 실행하지 않았으며 운영 스키마 변경은 관리자 계정으로 따로 적용해야 합니다.

### 검증 범위

2026-11-04 Java 21·독립 Testcontainers PostgreSQL에서 BE 전체 95개 테스트가 통과했습니다(닉네임 정책 적용 후 재실행 결과). 신규·기존 사용자, 가입 저장·롤백, 닉네임 가중 길이 경계, 권한·CSRF·세션 교체/유지/만료·로그아웃/탈퇴, 취소/실패·잘못된 복귀 경로, 약관 변경 재제출·링크 길이 경계·DB 오류 로그를 검사합니다. OIDC 흐름 자동 테스트는 가짜 공급자이며 실제 Google 검증과 구분합니다.

실제 Google 브라우저 재검증은 사용자가 완료했다고 보고했습니다. 이는 사용자 수동 검증 결과이며 이번 자동 테스트·문서 수정 중 재수행한 검증과 구분합니다. 닉네임 정책 적용 후의 실제 브라우저 확인은 아직 하지 않았습니다.

## 세션 저장소

로그인 세션은 Redis에 저장합니다(Spring Session). 운영(프로파일 없음)이 기본이고, `local`·`test` 프로파일은 서버 메모리 세션이며 `redis-session` 프로파일을 함께 켜면 Redis를 씁니다. 만료 시간은 `server.servlet.session.timeout`(`SESSION_TIMEOUT`) 하나로 정합니다. 세션 키 접두어는 `webter:session`이며, Redis 연결·명령 대기는 2초입니다.

- **직렬화**: 세션 값은 JSON으로 저장합니다(`RedisSessionSerializationConfig`). 로그인 주체·구글 인증 요청 정보·CSRF 토큰을 변환하며, 허용 목록에 없는 타입은 읽지 않습니다. 세션에 새 타입을 넣으면 이 설정에 허용 타입을 추가하고 Redis 세션 테스트로 확인합니다.
- **읽기 실패**: 읽을 수 없는 세션 값은 오류가 아니라 값이 없는 것으로 처리해 해당 회원만 로그아웃됩니다. 생성·마지막 접근 시각이나 만료 간격이 손상된 세션은 통째로 폐기하고 Redis에서 지웁니다. 필드가 늘거나 줄어도 기존 세션을 읽도록 설정했습니다.
- **크기·용량**: 세션 하나는 가입 대기 약 2.2KB, 회원 약 1.7KB, CSRF 토큰만 받은 비로그인 약 1.2KB입니다(로컬 Redis 7.4 실측). 운영 Redis 상한 96MB 기준 가입 대기 세션 약 4만 개, 비로그인 세션 약 8만 개로 추정하며 AOF 재작성 여유분은 반영하지 않았습니다. `GET /api/auth/csrf`만 호출해도 세션이 생겨 비로그인 세션도 용량을 씁니다.
- **메모리 상한**: 운영 Redis는 상한 도달 시 쓰기를 거절(`noeviction`)합니다. 도달하면 새 세션 생성과 기존 세션의 요청 모두 500이 됩니다(요청마다 세션을 갱신하기 때문). 세션 쿠키가 없는 요청과 `/health`는 영향이 없었습니다. 정책 변경은 `IN/` 범위라 이번에 다루지 않았습니다.
- **Redis 장애**: Redis를 일시정지한 로컬 측정에서 세션 쿠키가 있는 요청은 약 8초 뒤 500이었고, 쿠키 없는 요청은 정상이었습니다. 연결·명령 대기를 2초로 설정했는데 8초가 걸린 원인은 확인하지 못했습니다. readiness는 503입니다.

위 수치는 로컬 컨테이너 측정이며 운영 환경 검증이 아닙니다.

## 인증·회원 구현 기준

- 구글 인증과 WEBTER 가입 완료를 분리합니다. 검증된 구글 식별자와 자체 회원 고유 번호를 연결하며 `auth.users`나 Supabase Auth에 의존하지 않습니다.
- 온보딩 중간 입력·진행 단계는 저장하지 않습니다. 최종 제출에서 회원·계정 연결·필수 동의·관심 카테고리를 검증하고 함께 저장합니다. 가입 완료 전에는 회원 기능을 허용하지 않습니다.
- OIDC(`openid email`)·서버 세션 쿠키 `WEBTER_SESSION`(HttpOnly·SameSite=Lax)·변경 요청의 CSRF 헤더를 구현했습니다. 구글 토큰·사진은 보관하지 않고 검증된 이메일은 비공개로 저장합니다. 비활동 30분은 구현값이며 세션은 Redis에 저장합니다(로컬·테스트 기본은 서버 메모리). 운영 유지 기간·재인증·다중 기기·도메인/쿠키 전달·Redis의 세션 외 용도는 미정입니다.
- 수락한 팀원은 등록자와 같은 권한(서비스 관리·수정·삭제, 버전 기록, 팀원 초대·삭제, 등록자 제거)을 가지며 등록자를 제외해 서비스당 최대 5명입니다. 팀원이 남아 있는 서비스는 등록자가 탈퇴해도 삭제하지 않고 가장 먼저 수락한 팀원이 등록자 자리를 잇습니다. 이 권한 판정과 승계 처리(`services.owner_id` 규칙 변경 포함)는 아직 구현하지 않았고, 알림 조회·초대 수락은 수신자 본인만 허용합니다.
- 정책과 ERD SQL 갱신은 Spring Security·업무 API·마이그레이션 구현 완료를 뜻하지 않습니다. 정책은 `PM/docs/정책서.md`, 테이블 설계는 작업공간의 현행 ERD 검토본을 참고하며 운영 반영 전에 별도 검증합니다.

## 구현된 기반과 업무 API 적용 사항

- [PR #8~#14](https://github.com/p1001q/WEBTER/pull/14): 가입·서비스·반응·리뷰·리뷰 투표·댓글·신고·집계·초대/팀원·알림·운영 조치·사용량 엔티티와 리포지토리를 구성했습니다. #14에서 PostgreSQL 17 Testcontainers 테스트 58개 통과를 보고했습니다.
- 팀원은 **수락된 초대만** 연결할 수 있습니다(V3). 초대 수락 UPDATE를 flush한 뒤 팀원 INSERT를 수행하는 현재 제약·저장 순서를 확인합니다. 엔티티가 있다는 사실은 초대 UI·업무 API 완료를 뜻하지 않습니다.
- 약관은 버전 행을 동의 이력에서 참조합니다. 현재 `draft-1`은 초안이며 실제 문구는 기존 동의가 가리키는 행을 덮어쓰지 않고 새 버전으로 추가합니다.
- 최신 확정값은 신고 런칭 초반 서로 다른 회원 **4명**(규모가 커지면 상향), 하루 등록 **5개**, 아이디 변경 **14일 내 2회**입니다. 서버 변경 이력·제약 적용이 필요하며 목업 상수는 아직 이전 값을 포함합니다.
- 서비스 단독 평가와 리뷰는 같은 평가 한 건을 공유하고 리뷰 글 투표는 별도입니다. 삭제 후 단독 평가 유지 등 미정 세부는 정책서대로 구분합니다.
- 서비스 삭제 시 하위 리뷰·댓글·버전·반응을 삭제합니다. 회원 탈퇴 시 본인 서비스·좋아요·저장·알림은 지우고 다른 서비스의 리뷰·댓글은 탈퇴한 사용자로 남깁니다. 리뷰 투표·팀 관계·초대는 현행 FK 규칙을 따르며 운영 기록·비회원 IP 보관은 미정입니다.
- API enum은 DB 코드값을 사용하고 프론트 어댑터에서 변환합니다. 익명 작성자 내부 ID를 공개 응답에 넣지 않고 본인 여부·권한을 따로 전달합니다. 저장 목록은 저장 시각 기준 정렬이 필요합니다.
- 목록 응답은 서비스 목록·검색·마이페이지 목록이 페이지 번호(offset) 방식, 알림·댓글·리뷰가 마지막 항목 기준(cursor) 방식입니다.
- 인증 후속으로 운영 세션 정책·제재 계정 처리·프로필 사진 서버 저장·아이디 변경 이력·도메인/프록시·쿠키 전달이 남아 있습니다. 실제 회원 탈퇴와 업무 목업의 화면 데이터 삭제를 혼동하지 않습니다.
- 알림은 9종(정책서 6.5)이며 현재 DB 3종을 맞춰야 합니다. 팀 초대는 별도이고 좋아요·저장·리뷰 투표 수신 알림은 제외합니다. DB 변경은 새 마이그레이션 파일로 추가하며 이번에는 SQL을 수정하지 않았습니다.
- 이미지 업로드는 1차 연동에서 S3로 구현합니다. 비공개 버킷에 CloudFront를 앞에 두고 브라우저가 일회용 주소로 직접 올리며, 백업용 버킷과 분리합니다. 용량을 넘는 이미지는 브라우저에서 압축하고 서버가 형식·용량을 다시 검증합니다. 아직 구현하지 않았습니다.
- 관리자 페이지(신고 목록·처리, 임시 비공개 목록, 회원 제재 지정, 조치 이력)는 첫 출시에 포함합니다. 아직 구현하지 않았습니다.
- 팀원이 있는 서비스의 등록자 탈퇴는 서비스를 유지하고 가장 먼저 수락한 팀원이 등록자 자리를 잇는 것으로 정했습니다. 구현은 팀원 기능을 붙일 때 함께 합니다.

## 후속 작업

기능별 업무 API와 프론트 연동을 병행하고 저장 유지·소유권·실패를 확인합니다. 완료 후 구현에서 ERD와 API 명세서를 정리합니다. 데이터 관계·중복 제약·요청/응답은 각 기능 구현 전에 맞춥니다. 운영 마이그레이션 실행·배포 연결은 아직 후속입니다.

- 닉네임 최소 1글자를 위한 V4 마이그레이션의 운영 DB 적용(관리자 계정).
- 운영 세션 기간·재인증·여러 기기·도메인별 쿠키 전달과 계정 제재 세부 결정.
- 서비스·리뷰 등 업무 API 연결, 프로필 사진 업로드(이미지 S3 연동과 함께), 아이디 변경 이력·횟수 제한 적용.
- 새 마이그레이션이 필요한 변경: 알림 종류 9종, 팀 초대의 거절됨 상태, 서비스 등록자 승계 규칙(`services.owner_id`), 아이디 변경 이력 테이블.
