#!/usr/bin/env bash
set -euo pipefail
umask 077

[[ ${1:-} =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "Invalid image digest" >&2; exit 1; }
[[ -f /opt/webter/.bootstrap-complete ]] || { echo "Bootstrap is not complete" >&2; exit 1; }
mountpoint -q /srv/webter/data || { echo "Data EBS is not mounted" >&2; exit 1; }
exec 9>/run/webter-operation.lock
flock -w 600 9 || { echo "Another deployment/backup is running" >&2; exit 1; }

# Terraform이 쓴 비밀이 아닌 설정만 source한다. SSM 값은 셸 코드로 실행하지 않는다.
source /opt/webter/stack.env
config=/srv/webter/data/config
mkdir -p "$config"
chmod 700 "$config"
staging=$(mktemp -d "$config/.deploy.XXXXXX")
trap 'rm -rf "$staging"' EXIT

aws ssm get-parameter --region "$AWS_REGION" --name "$RUNTIME_ENV_NAME" \
  --with-decryption --query Parameter.Value --output text > "$staging/runtime.env"

python3 - "$staging/runtime.env" "$config/runtime.env" "$staging/app.env" <<'PY'
import pathlib, re, sys

def parse(path):
    values = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        key, sep, value = line.partition('=')
        if not sep or not re.fullmatch(r'[A-Z_][A-Z0-9_]*', key) or key in values:
            raise SystemExit('Invalid or duplicate runtime environment key')
        values[key] = value
    return values

new = parse(pathlib.Path(sys.argv[1]))
protected = {'PG_ADMIN_PASSWORD', 'PG_APP_PASSWORD', 'REDIS_PASSWORD'}
for key in protected:
    if not re.fullmatch(r'[a-f0-9]{64}', new.get(key, '')):
        raise SystemExit(f'{key} must contain exactly 64 lowercase hex characters')
if len({new[key] for key in protected}) != 3:
    raise SystemExit('Use different passwords for admin, app and Redis')
previous = pathlib.Path(sys.argv[2])
if previous.exists():
    old = parse(previous)
    if any(old.get(key) != new[key] for key in protected):
        raise SystemExit('Database/Redis password rotation requires a separate maintenance procedure')
pathlib.Path(sys.argv[3]).write_text(''.join(f'{k}={v}\n' for k, v in new.items() if k not in protected))
PY

image="$ECR_REPOSITORY_URL@$1"
registry="${ECR_REPOSITORY_URL%%/*}"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$registry"
docker pull "$image"

# 이전 환경과 이미지를 함께 보관한다. DB 스키마를 되돌리는 기능은 아니다.
previous=false
if [[ -f "$config/release.env" ]]; then
  previous=true
  cp "$config/release.env" "$staging/previous-release.env"
  cp "$config/runtime.env" "$staging/previous-runtime.env"
  cp "$config/app.env" "$staging/previous-app.env"
fi
install -m 600 "$staging/runtime.env" "$config/runtime.env"
install -m 600 "$staging/app.env" "$config/app.env"
printf 'APP_IMAGE=%s\n' "$image" > "$config/release.env"

ready() {
  local code
  for _ in $(seq 1 40); do
    code=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 \
      "http://127.0.0.1:$APP_PORT$APP_HEALTH_PATH") || code=000
    if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then return 0; fi
    sleep 3
  done
  return 1
}

rollback() {
  echo "Deployment failed; restoring the previous application release" >&2
  if [[ "$previous" == true ]]; then
    install -m 600 "$staging/previous-runtime.env" "$config/runtime.env"
    install -m 600 "$staging/previous-app.env" "$config/app.env"
    install -m 600 "$staging/previous-release.env" "$config/release.env"
    /usr/local/sbin/webter-compose up -d --no-deps app proxy && ready || {
      echo "Rollback failed; inspect Docker and journal logs" >&2
      return 1
    }
  else
    /usr/local/sbin/webter-compose stop app || true
    rm -f "$config/release.env"
    echo "No previous application exists; database and credentials were preserved" >&2
  fi
}

if ! /usr/local/sbin/webter-compose config --quiet \
  || ! /usr/local/sbin/webter-compose up -d --wait --wait-timeout 180 db redis \
  || ! /usr/local/sbin/webter-compose up -d --no-deps app proxy \
  || ! ready; then
  rollback || true
  exit 1
fi

systemctl start webter.service
echo "Application deployment and local readiness check succeeded: $1"
