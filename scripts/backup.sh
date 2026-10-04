#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
mkdir -p "$BACKUP_DIR"
umask 077
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp_dump="$(mktemp "$BACKUP_DIR/.finapp-${timestamp}.XXXXXX.dump.gz")"
archive="$BACKUP_DIR/finapp_${timestamp}.dump.gz.gpg"
cleanup() { rm -f "$tmp_dump"; }
trap cleanup EXIT

pg_dump --dbname="$DATABASE_URL" --format=custom | gzip -c > "$tmp_dump"
gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" --symmetric --cipher-algo AES256 --output "$archive" "$tmp_dump"
chmod 600 "$archive"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'finapp_*.dump.gz.gpg' -mtime "+$RETENTION_DAYS" -delete
printf '%s\n' "$archive"
