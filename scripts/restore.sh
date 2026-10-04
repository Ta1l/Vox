#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"
archive="${1:-}"
if [[ -z "$archive" || ! -f "$archive" ]]; then
  printf 'Usage: BACKUP_PASSPHRASE=... DATABASE_URL=... %s /path/to/backup.dump.gz.gpg\n' "$0" >&2
  exit 2
fi
gpg --batch --quiet --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" --decrypt "$archive" | gunzip -c | pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner --exit-on-error
