#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"
archive="${1:-}"
if [[ -z "$archive" || ! -f "$archive" ]]; then
  printf 'Usage: BACKUP_PASSPHRASE=... %s /path/to/backup.dump.gz.gpg\n' "$0" >&2
  exit 2
fi
gpg --batch --quiet --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" --decrypt "$archive" | gunzip -c | pg_restore --list >/dev/null
printf 'backup archive verified: %s\n' "$archive"
