#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${APP_URL:-}}"
if [[ -z "$BASE_URL" ]]; then
  printf 'Usage: %s https://finance.example.com\n' "$0" >&2
  exit 2
fi
curl --fail --silent --show-error "$BASE_URL/api/health" >/dev/null
if [[ -n "${SMOKE_AUTH_TOKEN:-}" ]]; then
  cookie_file="$(mktemp)"
  trap 'rm -f "$cookie_file"' EXIT
  curl --fail --silent --show-error --cookie-jar "$cookie_file" -H 'content-type: application/json' -d "{\"token\":\"$SMOKE_AUTH_TOKEN\"}" "$BASE_URL/api/auth/login" >/dev/null
  curl --fail --silent --show-error --cookie "$cookie_file" "$BASE_URL/api/dashboard" >/dev/null
fi
printf 'production smoke checks passed: %s\n' "$BASE_URL"
