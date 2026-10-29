# WEBTER 백엔드

Spring Boot(Java) 기반 API 서버입니다. 현재는 실행·헬스체크·DB 연결·Docker 이미지까지만 포함하며, 업무 API와 인증은 후속 작업입니다.

## 실행 환경

| 항목 | 버전 |
|---|---|
| Java | 21 (LTS) |
| Spring Boot | 4.1.2 |
| Gradle | 9.8.2 (래퍼 `./gradlew` 사용, 별도 설치 불필요) |
| DB | PostgreSQL 17 |

Java는 최신 LTS인 25가 아니라 21을 선택했습니다. 로컬·CI·Docker 이미지에서 모두 안정적으로 쓰이고 Spring Boot 4가 지원합니다. 올릴 때는 `build.gradle`의 toolchain, `Dockerfile`, `.github/workflows/backend-check.yml`의 21을 함께 바꿉니다.

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
| `./gradlew test` | 테스트 (메모리 DB H2 사용, 외부 DB 불필요) |
| `./gradlew build` | 테스트 + 실행 jar 빌드 (`build/libs/app.jar`) |
| `docker build -t webter-backend .` | Docker 이미지 빌드 |

## 헬스체크

| 경로 | 의미 |
|---|---|
| `/health` | 전체 상태 |
| `/health/liveness` | 프로세스 생존 |
| `/health/readiness` | 요청을 받을 준비 상태(DB 연결 포함). DB가 내려가면 약 3초 안에 503 |

`IN/`의 배포 설정이 기본으로 기대하는 경로(`/health`)와 같습니다.

## 환경변수

`BE/.env.example`에 같은 목록이 있습니다. 비밀값은 코드와 레포에 넣지 않습니다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | (`bootRun`만 `local`) | 운영에서는 지정하지 않는다 |
| `PORT` | `8080` | 수신 포트 |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `5432` / `webter` | DB 주소 |
| `DB_USER` / `DB_PASSWORD` | 없음 (`local`은 `webter`) | DB 계정 |

## 스키마 관리

- **로컬(`local`)**: JPA 스키마 자동 생성(`ddl-auto: update`)을 허용합니다. 엔티티를 먼저 만들고 ERD를 역으로 뽑는 단계에서 쓰는 설정입니다.
- **운영**: 자동 생성을 쓰지 않습니다(`ddl-auto: none`). 앱 DB 계정에는 테이블 변경 권한이 없다는 `IN/` 설계에 맞춘 것입니다.
- **Flyway**: 의존성과 `src/main/resources/db/migration/` 폴더만 준비했고 앱 실행 시에는 꺼져 있습니다(`spring.flyway.enabled: false`). ERD가 확정되면 `V1__...sql`부터 추가하고, 운영 DB에는 DDL 권한이 있는 관리자 계정으로 따로 실행합니다. 실행 방법은 서버 환경이 정해질 때 정리합니다.

## 구조

```
BE/
├─ src/main/java/com/webter/        패키지 루트. 기능이 정해지면 하위 패키지를 추가한다
├─ src/main/resources/
│  ├─ application.yaml              공통 설정(환경변수 기반)
│  ├─ application-local.yaml        로컬 개발 설정
│  └─ db/migration/                 Flyway 마이그레이션(아직 비어 있음)
├─ src/test/                        테스트(test 프로파일, H2)
├─ Dockerfile                       멀티스테이지 이미지(비루트 실행)
└─ compose.yml                      로컬 개발용 PostgreSQL
```

## 후속 작업

구글 로그인(인증), 업무 API와 엔티티, CORS 허용 도메인 설정, 마이그레이션 실행 방식, 배포 연결은 아직 포함하지 않습니다.
