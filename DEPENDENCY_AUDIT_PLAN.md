# План устранения аудита зависимостей Fin

Статус: локальные этапы выполнены в ветке `dependency-audit-remediation`; production не менялся. Результаты, ограничения и остаточные dev advisory — в `DEPENDENCY_AUDIT_REPORT.md`.

## Приоритеты и экспозиция

- **P0 production:** `next@15.5.27` содержит вложенный `postcss@8.4.31`; прямой `postcss@8.5.28` эту копию не исправляет. В production-образ физически попадает весь `node_modules`, поэтому build/tooling-зависимости присутствуют в runtime.
- **P1 dev/tooling:** `braces`, `chokidar`, `micromatch`, Tailwind, `fast-glob` и Next ESLint plugin используются сборкой CSS или lint. `esbuild@0.18.20` и deprecated `@esbuild-kit/*` используются Drizzle Kit. Их production-достижимость ниже, но они физически попадают в текущий контейнер.
- 15 строк `npm audit` — это узлы дерева, а не 15 независимых уязвимостей. Обязательные advisory: `braces` GHSA-vfj7-8cjw-p6xm; `esbuild` GHSA-67mh-4wv8-2f99; четыре PostCSS GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849; selector parser GHSA-rj75-hqrm-r3gf.

## Этапы

### 1. Зафиксировать baseline

В отдельной ветке сохранить lockfile и выполнить:

```sh
npm audit
npm audit --omit=dev
npm ls --all
npm run typecheck
npm run lint
npm test
npm run build
```

Зафиксировать версии Node 22 в Docker, PostgreSQL 16, размер образов, все 15 audit-узлов и реальные `via`-цепочки. `npm audit fix --force` не запускать.

**Приёмка:** воспроизводимый отчёт, конкретные target-версии и подтверждённые peer dependencies.

### 2. Устранить production PostCSS/Next риск

1. Проверить последний совместимый patch-релиз Next 15.
2. Обновить Next только в пределах major 15, если он разрешает исправленную вложенную PostCSS.
3. Проверить lockfile и `npm audit --omit=dev`.
4. Если Next 15 не закрывает риск, сделать отдельную ветку Next 16: проверить React 19, middleware, route handlers, `next.config`, build и runtime.
5. Для Next 16 заменить `next lint`: Context7 указывает на миграцию ESLint CLI; убрать устаревшую опцию `eslint` из Next config, если она есть.

**Приёмка:** нет production advisory для `next`/`postcss`, production build и smoke проходы успешны.

### 3. Обновить dev/tooling цепочки

- Tailwind: сначала последний совместимый patch в v3. Не переходить на v4 только из-за `audit fix`: v4 требует отдельной миграции конфигурации и PostCSS plugin (`@tailwindcss/postcss`), проверки всех экранов и визуальных регрессий.
- Drizzle Kit: обновить поддерживаемым путём, убрать deprecated `@esbuild-kit/core-utils` и `@esbuild-kit/esm-loader`; проверить `generate`, `migrate`, повторный запуск миграций и тестовую PostgreSQL.
- `eslint-config-next`: держать версию, согласованную с Next; предложенный downgrade до 14.2.35 не принимать.
- `postcss`, `postcss-nested`, `postcss-selector-parser`: целиться в подтверждённые исправленные версии (для PostCSS не ниже актуальной безопасной ветки, для selector parser — `7.1.6+` при подтверждённой совместимости).
- `@types/pg`: перенести из `dependencies` в `devDependencies`; типы не нужны runtime.

**Приёмка:** затронутые dev-узлы исчезли или имеют безопасные версии; lint, typecheck и Drizzle CLI проходят.

### 4. Разделить build/runtime Docker

Текущий Dockerfile копирует полный `node_modules`. После обновлений:

- web/worker runtime собирать с `npm ci --omit=dev` и копировать только production output;
- migrate target оставить с Drizzle Kit и `drizzle.config.ts`, пока не подтверждён отдельный runtime migration runner;
- не удалять миграции и конфигурацию из migrate target;
- сравнить размер образов и выполнить аудит фактически установленного runtime слоя.

**Приёмка:** web/worker запускаются без dev-пакетов, migrate target успешно применяет миграции к тестовой PostgreSQL 16, runtime audit отражает только необходимые зависимости.

### 5. Полная проверка

Для каждой ветки изменений выполнить typecheck, ESLint CLI, unit/integration, Playwright E2E мобильного интерфейса, production build, Docker build, миграцию на одноразовой PostgreSQL 16 и повторную миграцию. Затем повторить `npm audit` и `npm audit --omit=dev`; остатки записать с узлом, достижимостью, причиной и датой пересмотра.

**Критерий:** финансовые инварианты, auth/ownership, AI provider flow и текущий UI проходят прежние проверки.

### 6. Безопасная выкладка на VPS

1. Снять и проверить backup БД.
2. Зафиксировать текущий image tag и git revision; сохранить предыдущий image для rollback.
3. Развернуть и проверить migrate target.
4. Запустить web/worker и выполнить smoke: health, вход, финансовая операция, AI provider settings, worker.
5. При сбое остановить rollout и вернуть предыдущие образы. Миграции должны быть обратно совместимыми или иметь документированное восстановление из backup.

Деплой в рамках этого задания не выполняется.

## Запрещённые shortcuts

- Не использовать `npm audit fix --force`.
- Не маскировать advisory через `overrides` без доказанной совместимости и теста.
- Не принимать major downgrade, предложенный audit, для `drizzle-kit` или `eslint-config-next`.
- Не считать высокий severity доказательством exploitable runtime path без трассировки входных данных.

## Источники актуальных процедур

- Next.js Context7: Next 16 удаляет `next lint`; рекомендован codemod/ESLint CLI migration.
- Tailwind Context7: v4 использует отдельный `@tailwindcss/postcss` и требует миграции конфигурации.
- Drizzle ORM Context7: миграции запускаются через Drizzle migrator/CLI; текущий проект должен сохранить отдельный migrate target.
- ESLint Context7: ESLint 9 использует flat config и CLI; конфигурацию нужно проверить перед заменой команды lint.

## Матрица всех 15 узлов

| Узел | Ветка | Плановое действие | Проверка |
|---|---|---|---|
| `@esbuild-kit/core-utils@3.3.2` | dev | Устранить через поддерживаемое обновление Drizzle Kit; не downgrade до 0.18.1 | `npm ls @esbuild-kit/core-utils`, `db:generate`, `db:migrate` |
| `@esbuild-kit/esm-loader@2.6.5` | dev | То же; deprecated loader не должен остаться | `npm ls @esbuild-kit/esm-loader` |
| `@next/eslint-plugin-next@15.5.27` | dev | Обновлять вместе с согласованным `eslint-config-next`/Next; не принимать downgrade 14.x | ESLint CLI + Next build |
| `braces@3.0.3` | dev | Сначала последний Tailwind v3 patch и транзитивный lock refresh | `npm ls braces`, CSS build |
| `chokidar@3.6.0` | dev | Проверить исчезновение/безопасную версию через Tailwind update | `npm ls chokidar` |
| `drizzle-kit@0.31.11` | dev | Проверить актуальный совместимый release; сохранить CLI и миграционный формат | generate/migrate/repeat migrate |
| `esbuild@0.18.20` | dev | Убрать старую ветку через Drizzle Kit update; не считать безопасные 0.25/0.28 доказательством исправления этой ветки | `npm ls esbuild`, no dev server in production |
| `eslint-config-next@15.5.27` | dev | Оставить major согласованным с Next; audit downgrade отклонить | `npx eslint .`, Next build |
| `fast-glob@3.3.1, 3.3.3` | dev | Разрешить через ESLint/Tailwind updates; проверить обе nested paths | `npm ls fast-glob` |
| `micromatch@4.0.8` | dev | Разрешить через Tailwind/fast-glob branch | `npm ls micromatch` |
| `next@15.5.27` | production | Patch update в major 15 first; Next 16 only isolated migration | `npm audit --omit=dev`, build, smoke |
| `postcss@8.4.31` | production via Next | Исправить владельца (`next` nested dependency); прямой 8.5.28 недостаточен | `npm ls postcss`, audit omit dev |
| `postcss-nested@6.2.0` | dev | Update only within compatible Tailwind/PostCSS path | CSS build, `npm ls` |
| `postcss-selector-parser@6.1.4` | dev | Target safe `7.1.6+` only after compatibility check; no blind override | Tailwind CSS output + unit/UI checks |
| `tailwindcss@3.4.19` | dev | Latest v3 patch first; v4 is separate migration with `postcss.config.mjs`, `tailwind.config.ts`, `globals.css` changes | visual/E2E regression and CSS build |

## Точные файлы для будущих изменений

- `package.json`, `package-lock.json`: dependency ranges, `lint` script, `@types/pg` move.
- `next.config.ts`: inspect/remove obsolete `eslint` option only if Next 16 migration requires it.
- `postcss.config.mjs`: remains v3 plugin config; for Tailwind 4 migrate to `@tailwindcss/postcss` and remove `autoprefixer` only with dedicated v4 change.
- `tailwind.config.ts`, `src/app/globals.css`: verify v3 compatibility; v4 migration changes theme/content/directives.
- `Dockerfile`: split web/worker runtime dependency installation from migrate target; current `COPY --from=dependencies ... node_modules` copies every dev package.
- `docker-compose.production.yml`: assign web/worker runtime target and migrate target; preserve `depends_on: service_completed_successfully`.
- `drizzle.config.ts`, `drizzle/`: verify generation and migration application; do not rewrite existing SQL as part of dependency-only update.
- `tests/**`, `playwright.config.ts`: add/adjust only verification needed for upgrade; preserve financial and ownership coverage.

## Dependency order and rollback

1. Baseline and advisory/version confirmation.
2. Next/PostCSS patch branch.
3. Tailwind v3, ESLint CLI/config, Drizzle Kit branches separately so failures are attributable.
4. Docker target split after dependency graph is stable.
5. Full tests and test-DB migrations.
6. Backup, staged VPS rollout, smoke, rollback.

Rollback means revert the dependency commit/image before applying any incompatible migration. For schema changes, restore the verified database backup; dependency-only rollout must not generate schema changes.
