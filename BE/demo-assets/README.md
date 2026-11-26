# 시연 데이터 시드

발표 시연용 데이터를 만드는 일회성 실행기다(#72). 업무 데이터를 지우고 같은 구성으로 다시 채운다.

## 구성

| 파일 | 내용 |
|---|---|
| `src/main/java/com/webter/demo/DemoContent.java` | 회원·서비스·리뷰·댓글·신고·제재·회고 내용 |
| `src/main/java/com/webter/demo/DemoSeeder.java` | 정리·저장·알림 생성·운영 조치·탈퇴 처리 |
| `src/main/java/com/webter/demo/DemoSeedRunner.java` | 실행 조건 확인, 실행 뒤 프로세스 종료 |
| `src/main/resources/demo/images/` | 시연 이미지(직접 제작, JPEG) |
| `demo-assets/mock.html`, `render.sh` | 이미지 생성기(macOS의 Chrome·sips로 다시 만든다) |
| `demo-assets/verify.sql` | 시드 뒤 정합성 확인(읽기 전용) |

## 초기화 범위

| 구분 | 대상 |
|---|---|
| 보존 | 본계정(회원·Google 연결·동의·관심 카테고리·권한), 카테고리·약관, Flyway 이력, URL 검사 캐시 |
| 삭제 후 재생성 | 본계정 외 회원, 서비스·리뷰·평가·댓글·좋아요·저장·조회/클릭 이벤트·알림·신고·조치 이력·초대·팀원·회고·등록 초안·하루 사용 횟수 |
| 이미지 저장소 | `uploads/demo/` 경로에만 쓴다(같은 이름은 덮어씀). 다른 업로드 파일은 지우지 않으며, 참조가 끊긴 기존 업로드는 기존 미사용 이미지 정리 작업이 처리한다 |

- DB 작업은 한 트랜잭션이다. 중간에 실패하면 DB는 실행 전 상태로 돌아간다.
- 다시 실행하면 앞서 만든 시연 데이터를 지우고 같은 구성으로 다시 만든다(ID는 바뀐다).
- 트렌딩(3일)·주간·월간 순위는 실행 시각 기준이다. 발표 하루 전에 실행한다.
- 본계정은 `DEMO_OWNER_EMAIL`과 이메일이 같은 기존 회원이며, `ADMIN`·`ACTIVE`가 아니면 실행하지 않는다.
- 시드 회원의 활동(리뷰·댓글·평가·투표·반응)은 그 회원의 가입 시각 이후로만 만든다. 본계정은 실제 가입 시각을 바꾸지 않으므로 이 검사에서 빠지고, 본계정의 시연 활동이 가입 시각보다 앞설 수 있다.

## 실행 조건

아래 세 값이 모두 있어야 실행되고, 끝나면 프로세스가 종료된다. 일반 실행·배포에서는 실행되지 않는다.

| 환경변수 | 값 |
|---|---|
| `DEMO_SEED_ENABLED` | `true` |
| `DEMO_SEED_CONFIRM` | `replace-business-data` |
| `DEMO_OWNER_EMAIL` | 본계정 이메일(소스·저장소에 남기지 않는다) |

이미지 저장소 설정(`IMAGE_BUCKET`, `IMAGE_PUBLIC_BASE_URL` 등)이 없으면 실행하지 않는다.

## 로컬 실행

```sh
cd BE
./gradlew bootJar
set -a; source .env; set +a
PORT=18099 SPRING_PROFILES_ACTIVE=local \
DEMO_SEED_ENABLED=true DEMO_SEED_CONFIRM=replace-business-data DEMO_OWNER_EMAIL='<본계정 이메일>' \
java -jar build/libs/app.jar
docker exec -i webter-local-db-1 psql -U webter -d webter -v owner="'<본계정 이메일>'" < demo-assets/verify.sql
```

실행 중인 로컬 서버와 같은 `app.jar`를 다시 빌드하면 실행 중인 서버가 클래스를 읽지 못하므로, 빌드 뒤 서버를 다시 시작한다.

## 운영 실행(EC2)

시드 코드가 들어간 이미지가 `main`으로 배포된 뒤, SSM 세션에서 실행한다.

```sh
# 1. 백업(S3 백업 버킷에 업로드). 실패하면 여기서 멈추고 다음 단계로 가지 않는다
sudo /opt/webter/bin/backup.sh || { echo "백업 실패: 시드를 실행하지 않는다"; exit 1; }

# 2. 앱 중지(실행 중 요청과 겹치지 않게, 메모리 확보)
sudo /usr/local/sbin/webter-compose stop app

# 3. 시드 실행(끝나면 컨테이너가 종료된다)
sudo /usr/local/sbin/webter-compose run --rm --no-deps -T \
  -e DEMO_SEED_ENABLED=true -e DEMO_SEED_CONFIRM=replace-business-data \
  -e DEMO_OWNER_EMAIL='<본계정 이메일>' app

# 4. 앱 시작
sudo /usr/local/sbin/webter-compose up -d --no-deps app

# 5. 확인(verify.sql을 서버에 옮긴 뒤 실행)
sudo /usr/local/sbin/webter-compose exec -T db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v owner="'"'"'<본계정 이메일>'"'"'"' < verify.sql
```

`verify.sql`은 서버에 없으므로 SSM 세션에서 파일로 만들어 둔다.

복구가 필요하면 1번 백업을 `pg_restore --clean`으로 되돌린다. 백업은 DB만 담고 이미지 파일은 담지 않는다.
시드 뒤 참조가 끊긴 기존 업로드 이미지는 미사용 이미지 정리 작업이 `IMAGE_UNUSED_RETENTION_DAYS`(기본 7일)가 지난 뒤 저장소에서 지운다.
따라서 이전 데이터로 되돌리려면 시드 실행 후 7일 안에 복구해야 이미지가 함께 살아 있다. 그 뒤에 복구하면 기존 데이터의 이미지 링크는 깨진다.
이미지 저장소의 `uploads/demo/`는 다음 시드에서 덮어쓴다.

## 공개 전 정리

공개 운영 전에는 시연 데이터를 지운다. 범위는 위 "삭제 후 재생성" 대상과 `uploads/demo/` 이미지다.
