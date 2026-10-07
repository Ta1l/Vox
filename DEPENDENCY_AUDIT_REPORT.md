# Dependency audit execution — 2026-10-08

Branch: `dependency-audit-remediation`. The plan excluded VPS deployment; a later explicit user request authorized it.

## Baseline

- Host Node.js 24.18.0/npm 11.16.0; Docker uses Node.js 22 Alpine and PostgreSQL 16 Alpine.
- `npm audit`: 15 nodes (8 high, 7 moderate). `npm audit --omit=dev`: 2 nodes (`next`, nested `postcss`).
- Installed versions: Next 15.5.27 with PostCSS 8.4.31; Tailwind 3.4.19; Drizzle Kit 0.31.11 with `@esbuild-kit/esm-loader` and esbuild 0.18.20.
- Existing runner image `finapp-m23-smoke:latest`: 816 MB. Original Dockerfile copied the complete 596 MB `node_modules` into runtime.
- Exact baseline dependency tree and audit JSON were captured locally in `/tmp/fin-npm-ls-baseline.json`, `/tmp/fin-audit-baseline.json`, and `/tmp/fin-audit-production-baseline.json`.
- Baseline lint passed. Concurrent baseline typecheck raced with regeneration of `.next/types`; baseline tests and build were interrupted under host load. Final checks below were run against the updated tree.

## Changes

- Upgraded Next and matching ESLint config to 16.4.0. Migrated `next lint` to ESLint CLI and `middleware.ts` to `proxy.ts`.
- Upgraded Tailwind to 4.3.3 with `@tailwindcss/postcss`; removed v3-only config and Autoprefixer. Moved `@types/pg` to development dependencies.
- Docker runner now receives dependencies from `npm ci --omit=dev`; the separate migrate target retains Drizzle Kit, source schema, config, and migrations. Next 16 production smoke also exposed that a root-level `proxy.ts` was ignored with `src/app`; moving it to `src/proxy.ts` restored the authentication boundary.
- Tested Drizzle Kit 1.0.0-rc.4. `db:generate` failed with `ERR_PACKAGE_PATH_NOT_EXPORTED` (`drizzle-orm/_relations`) against the current Drizzle ORM 0.45.3, so stable Drizzle Kit 0.31.11 was restored.

## Remaining advisories

`npm audit --omit=dev` is clean. Full `npm audit` reports 9 dev-only nodes, absent from the web/worker runtime target:

| Advisory path | Nodes | Exposure and decision | Review |
| --- | --- | --- | --- |
| `eslint-config-next@16.4.0 → @next/eslint-plugin-next → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3` | 5 high | Lint-time glob parsing only. No compatible upstream fixed version; audit suggests an invalid Next 14 downgrade. Keep matching Next/ESLint versions. | 2026-11-08 or upstream release |
| `drizzle-kit@0.31.11 → @esbuild-kit/esm-loader@2.6.5 → @esbuild-kit/core-utils@3.3.2 → esbuild@0.18.20` | 4 moderate | Migration/generation CLI in build/migrate target only. Stable Drizzle Kit has no newer release; RC requires an ORM migration. The esbuild advisory concerns its dev server, which this project does not expose. | 2026-11-08 or compatible stable release |

No `npm audit fix --force`, major downgrade, or unverified override was used.

## Verification

- `npm run typecheck`: passed after dependency updates.
- `npm run lint`: passed with four existing warnings.
- `npm run db:generate`: no schema changes; migration applied and reapplied on disposable PostgreSQL 16.
- `npm run build`: passed on Next 16.4.0/Turbopack.
- The final Docker build lists `ƒ Proxy (Middleware)`, confirming Next discovered `src/proxy.ts`.
- Full Vitest run: 168 passed, 3 failed because a test used a fixed 2026-10-04 snapshot while validation used the current date. The test was corrected; its 3 cases then passed on rerun.
- Docker runner built on Node 22: 602,103,781 bytes versus previous 816,208,869 bytes (26.2% smaller). Only production packages are physically installed; in-image `npm audit --omit=dev` reports 0 advisories. The migrate target applied migrations to disposable PostgreSQL 16.
- Production smoke: health 200, unauthenticated AI config 401, login 200, authenticated dashboard/settings/AI config 200, income POST 201, worker heartbeat observed.
- Added a proxy security test; all four cases in its file pass.
- Mobile Playwright: 12 tests passed in the initial run. Two ambiguous selectors were corrected; the cold-start homepage test now uses fixed API responses for its UI assertion. All 3 affected tests passed on targeted rerun, covering all 15 scenarios across the two runs. A separate rerun was interrupted by a stale Turbopack dev cache after moving the proxy; restarting with a fresh cache resolved it.

## VPS deployment verification

- Before deployment, unauthenticated `GET /api/ai-provider/config` returned 200 on the old release. After deploying commit `7b3bfb6`, it returns 401; unauthenticated dashboard also returns 401.
- Encrypted and verified a pre-deployment PostgreSQL backup outside the repository; tagged previous web, worker, and migrate images for rollback.
- Built release images with Node 22, ran production migrations successfully, and restarted web and worker. PostgreSQL and Caddy remained running.
- Web is healthy with zero restarts; HTTPS health returns 200; authenticated login/dashboard smoke passes. Worker heartbeat is present with zero restarts. No application errors appeared in the checked startup logs.
- No production financial records were created during verification.
