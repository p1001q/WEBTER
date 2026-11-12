#!/usr/bin/env bash
set -euo pipefail
umask 077

mountpoint -q /srv/webter/data || { echo "Data EBS is not mounted" >&2; exit 1; }
[[ -f /srv/webter/data/config/release.env ]] || exit 0
exec 9>/run/webter-operation.lock
flock -w 600 9 || { echo "Another deployment/backup is running" >&2; exit 1; }
source /opt/webter/stack.env
mkdir -p /srv/webter/data/backup-tmp
dump=$(mktemp /srv/webter/data/backup-tmp/postgres.XXXXXX)
trap 'rm -f "$dump"' EXIT

/usr/local/sbin/webter-compose exec -T db sh -ec \
  'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$dump"
/usr/local/sbin/webter-compose exec -T db pg_restore --list < "$dump" > /dev/null
key="postgres/$(date -u +%Y/%m/%d/%H%M%S).dump"
aws s3 cp "$dump" "s3://$BACKUP_BUCKET/$key" --region "$AWS_REGION" --sse AES256 --only-show-errors
echo "PostgreSQL backup uploaded: $key"
