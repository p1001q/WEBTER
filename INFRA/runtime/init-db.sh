#!/usr/bin/env bash
set -euo pipefail

# 최초 DB 초기화 때만 실행된다. 앱에는 관리자 계정을 전달하지 않는다.
# 스키마 마이그레이션은 별도의 관리자 연결로 실행해야 한다.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 --set=app_password="$APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE webter_app LOGIN PASSWORD %L', :'app_password') \gexec
GRANT CONNECT ON DATABASE webter TO webter_app;
GRANT USAGE ON SCHEMA public TO webter_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE webter_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO webter_app;
ALTER DEFAULT PRIVILEGES FOR ROLE webter_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO webter_app;
SQL
