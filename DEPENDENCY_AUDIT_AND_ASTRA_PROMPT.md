# Зависимости и ошибки аудита — Fin

Срез: 2026-10-07, локальный `package-lock.json` и `npm audit`. Production на VPS собирается из того же lockfile. Аудит — снимок на эту дату; доступность исправлений и применимость CVE нужно перепроверить перед реализацией.

## Объём

- Прямые зависимости: 9 runtime и 18 dev. Установлено 27 прямых пакетов.
- Lockfile v3: 640 записей размещения в `node_modules`, 562 уникальных имени, 631 уникальная пара имя/версия. Флаги lockfile: 563 `dev`, 167 `optional` (флаги могут пересекаться). `npm ci` на сервере установил 488 пакетов: часть optional-записей не подходит платформе.
- `npm audit`: 15 затронутых узлов — 8 high, 7 moderate. `npm audit --omit=dev`: 2 узла — 1 high, 1 moderate. Это число узлов дерева, не число отдельных GHSA.
- Локально: Node v24.18.0, npm 11.16.0. Production Dockerfile: `node:22-alpine`; Compose: `postgres:16-alpine`, `caddy:2.8-alpine`. Версии образов заданы тегами, без digest pinning.
- `npm ls --all --json` не сообщил о missing/invalid пакетах. Typecheck, lint и production build прошли при развёртывании.

## Прямые зависимости

| Тип | Пакет | Диапазон в package.json | Установлено по lockfile |
|---|---|---|---|
| runtime | `@types/pg` | `^8.23.1` | `8.23.1` |
| runtime | `dotenv` | `^18.0.5` | `18.0.5` |
| runtime | `drizzle-orm` | `^0.45.3` | `0.45.3` |
| runtime | `next` | `^15.1.6` | `15.5.27` |
| runtime | `pg` | `^8.23.1` | `8.23.1` |
| runtime | `postgres` | `^3.4.9` | `3.4.9` |
| runtime | `react` | `^19.0.0` | `19.3.0` |
| runtime | `react-dom` | `^19.0.0` | `19.3.0` |
| runtime | `zod` | `^4.6.5` | `4.6.5` |
| dev | `@playwright/test` | `^1.63.0` | `1.63.0` |
| dev | `@testing-library/jest-dom` | `^7.0.1` | `7.0.1` |
| dev | `@testing-library/react` | `^16.3.3` | `16.3.3` |
| dev | `@types/node` | `^22.10.5` | `22.20.5` |
| dev | `@types/react` | `^19.0.6` | `19.3.0` |
| dev | `@types/react-dom` | `^19.0.2` | `19.3.0` |
| dev | `@vitejs/plugin-react` | `^6.1.1` | `6.1.1` |
| dev | `@vitest/ui` | `^5.0.3` | `5.0.3` |
| dev | `autoprefixer` | `^10.4.20` | `10.6.1` |
| dev | `drizzle-kit` | `^0.31.11` | `0.31.11` |
| dev | `eslint` | `^9.39.5` | `9.39.5` |
| dev | `eslint-config-next` | `^15.1.6` | `15.5.27` |
| dev | `jsdom` | `^30.1.1` | `30.1.1` |
| dev | `postcss` | `^8.5.28` | `8.5.28` |
| dev | `tailwindcss` | `^3.4.17` | `3.4.19` |
| dev | `tsx` | `^4.23.15` | `4.23.15` |
| dev | `typescript` | `^5.7.3` | `5.9.3` |
| dev | `vitest` | `^5.0.3` | `5.0.3` |

Примечание: `@types/pg` записан в `dependencies`, поэтому попадает в production-установку. Astra должна оценить, можно ли перенести его в `devDependencies` без нарушения сборки/миграций.

## Все 15 затронутых узлов

| Пакет | Установленная версия | Severity | Прямой | Цепочка `via` | Предложение npm audit |
|---|---|---|---|---|---|
| `@esbuild-kit/core-utils` | `3.3.2` | moderate | нет | esbuild | drizzle-kit 0.18.1; major-изменение |
| `@esbuild-kit/esm-loader` | `2.6.5` | moderate | нет | @esbuild-kit/core-utils | drizzle-kit 0.18.1; major-изменение |
| `@next/eslint-plugin-next` | `15.5.27` | high | нет | fast-glob | eslint-config-next 14.2.35; major-изменение |
| `braces` | `3.0.3` | high | нет | braces | tailwindcss 4.3.3; major-изменение |
| `chokidar` | `3.6.0` | high | нет | braces | tailwindcss 4.3.3; major-изменение |
| `drizzle-kit` | `0.31.11` | moderate | да | @esbuild-kit/esm-loader | drizzle-kit 0.18.1; major-изменение |
| `esbuild` | `0.18.20` | moderate | нет | esbuild | drizzle-kit 0.18.1; major-изменение |
| `eslint-config-next` | `15.5.27` | high | да | @next/eslint-plugin-next | eslint-config-next 14.2.35; major-изменение |
| `fast-glob` | `3.3.1, 3.3.3` | high | нет | micromatch | eslint-config-next 14.2.35; major-изменение |
| `micromatch` | `4.0.8` | high | нет | braces | tailwindcss 4.3.3; major-изменение |
| `next` | `15.5.27` | moderate | да | postcss | next 16.4.0; major-изменение |
| `postcss` | `8.4.31` | high | нет | postcss, postcss, postcss, postcss | next 16.4.0; major-изменение |
| `postcss-nested` | `6.2.0` | moderate | нет | postcss-selector-parser | доступно в диапазоне текущей зависимости |
| `postcss-selector-parser` | `6.1.4` | moderate | нет | postcss-selector-parser | tailwindcss 4.3.3; major-изменение |
| `tailwindcss` | `3.4.19` | high | да | chokidar, fast-glob, micromatch, postcss-nested, postcss-selector-parser | tailwindcss 4.3.3; major-изменение |

Точные уязвимые размещения: `next@15.5.27` содержит `postcss@8.4.31`, хотя прямой `postcss@8.5.28` актуален; `drizzle-kit@0.31.11` тянет `@esbuild-kit/core-utils → esbuild@0.18.20`, хотя другие установленные `esbuild@0.25.12` и `0.28.2` не затронуты этой записью аудита. Остальные строки выше могут быть уязвимыми через вложенный пакет, а не собственный advisory.

## Первичные advisory

| Пакет | Severity | GHSA / суть | Уязвимый диапазон |
|---|---|---|---|
| `braces` | high | [braces vulnerable to stack-exhaustion denial of service through deeply nested patterns](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `<=3.0.3` |
| `esbuild` | moderate | [esbuild enables any website to send any requests to the development server and read the response](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | `<=0.24.2` |
| `postcss` | moderate | [PostCSS has XSS via Unescaped </style> in its CSS Stringify Output](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | `<8.5.10` |
| `postcss` | high | [PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments](https://github.com/advisories/GHSA-6g55-p6wh-862q) | `<=8.5.11` |
| `postcss` | moderate | [PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | `<=8.5.22` |
| `postcss` | high | [PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure](https://github.com/advisories/GHSA-r28c-9q8g-f849) | `<=8.5.17` |
| `postcss-selector-parser` | moderate | [PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | `<7.1.6` |

## Предупреждения сборки и ограничения

- `npm ci` при развёртывании вывел `15 vulnerabilities (7 moderate, 8 high)` и deprecation для `@esbuild-kit/esm-loader@2.6.5`, `@esbuild-kit/core-utils@3.3.2` и `eslint@9.39.5`.
- `npm run lint` проходит, но Next.js предупреждает: `next lint` deprecated и будет удалён в Next.js 16; требуется переход на ESLint CLI при соответствующем обновлении.
- Автоматические `fixAvailable` для `drizzle-kit@0.18.1` и `eslint-config-next@14.2.35` означают downgrade major; для `next@16.4.0` и `tailwindcss@4.3.3` — major upgrade. Не запускать `npm audit fix --force` вслепую.
- Production-аудит содержит `postcss` high (4 GHSA) и `next` moderate как зависимый узел. Остальные 13 находок из полного аудита относятся к dev/tooling дереву, но могут влиять на CI и безопасность среды разработки.
- Текущий `Dockerfile` выполняет полный `npm ci` и копирует весь `node_modules` в runtime-образ. Поэтому `npm audit --omit=dev` показывает логическую production-цепочку, но **не полный набор пакетов, физически присутствующих в контейнере**; Astra должна отдельно оценить multi-stage установку только runtime-зависимостей после сборки и работу `drizzle-kit migrate`.
- Отчёт не доказывает эксплуатируемость в данном приложении. Для каждой ветки плана нужно проверить реальные пути обработки недоверенных данных и доступные безопасные версии.

## Полный инвентарь lockfile

Каждая строка — запись `packages` из `package-lock.json`; повторные имена с разными путями сохранены, чтобы были видны вложенные версии. `dev`/`optional` — флаги lockfile, `—` означает отсутствие этих флагов.

| Путь в node_modules | Версия | Флаги |
|---|---|---|
| `node_modules/@adobe/css-tools` | `4.5.0` | dev |
| `node_modules/@alloc/quick-lru` | `5.3.0` | dev |
| `node_modules/@asamuzakjp/css-color` | `7.1.3` | dev |
| `node_modules/@asamuzakjp/dom-selector` | `9.2.3` | dev |
| `node_modules/@babel/code-frame` | `7.29.7` | dev, peer |
| `node_modules/@babel/helper-validator-identifier` | `7.29.7` | dev, peer |
| `node_modules/@babel/runtime` | `7.29.7` | dev |
| `node_modules/@bramus/specificity` | `2.4.2` | dev |
| `node_modules/@csstools/color-helpers` | `6.1.2` | dev |
| `node_modules/@csstools/css-calc` | `3.4.3` | dev |
| `node_modules/@csstools/css-color-parser` | `4.2.6` | dev |
| `node_modules/@csstools/css-parser-algorithms` | `4.0.2` | dev |
| `node_modules/@csstools/css-syntax-patches-for-csstree` | `1.1.15` | dev |
| `node_modules/@csstools/css-tokenizer` | `4.0.2` | dev |
| `node_modules/@drizzle-team/brocli` | `0.10.2` | dev |
| `node_modules/@emnapi/core` | `1.10.0` | dev, optional |
| `node_modules/@emnapi/runtime` | `1.11.3` | optional |
| `node_modules/@emnapi/wasi-threads` | `1.2.1` | dev, optional |
| `node_modules/@esbuild-kit/core-utils` | `3.3.2` | dev |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/android-arm` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/android-arm64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/android-x64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/darwin-arm64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/darwin-x64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/freebsd-arm64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/freebsd-x64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-arm` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-arm64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-ia32` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-loong64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-mips64el` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-ppc64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-riscv64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-s390x` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-x64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/netbsd-x64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/openbsd-x64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/sunos-x64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/win32-arm64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/win32-ia32` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/win32-x64` | `0.18.20` | dev, optional |
| `node_modules/@esbuild-kit/core-utils/node_modules/esbuild` | `0.18.20` | dev |
| `node_modules/@esbuild-kit/esm-loader` | `2.6.5` | dev |
| `node_modules/@esbuild/aix-ppc64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/android-arm` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/android-arm64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/android-x64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/darwin-arm64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/darwin-x64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/freebsd-arm64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/freebsd-x64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/linux-arm` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/linux-arm64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/linux-ia32` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/linux-loong64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/linux-mips64el` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/linux-ppc64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/linux-riscv64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/linux-s390x` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/linux-x64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/netbsd-arm64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/netbsd-x64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/openbsd-arm64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/openbsd-x64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/openharmony-arm64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/sunos-x64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/win32-arm64` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/win32-ia32` | `0.28.2` | dev, optional |
| `node_modules/@esbuild/win32-x64` | `0.28.2` | dev, optional |
| `node_modules/@eslint-community/eslint-utils` | `4.10.1` | dev |
| `node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys` | `3.4.3` | dev |
| `node_modules/@eslint-community/regexpp` | `4.12.2` | dev |
| `node_modules/@eslint/config-array` | `0.21.2` | dev |
| `node_modules/@eslint/config-helpers` | `0.4.2` | dev |
| `node_modules/@eslint/core` | `0.17.0` | dev |
| `node_modules/@eslint/eslintrc` | `3.3.7` | dev |
| `node_modules/@eslint/eslintrc/node_modules/globals` | `14.0.0` | dev |
| `node_modules/@eslint/js` | `9.39.5` | dev |
| `node_modules/@eslint/object-schema` | `2.1.7` | dev |
| `node_modules/@eslint/plugin-kit` | `0.4.1` | dev |
| `node_modules/@exodus/bytes` | `1.16.0` | dev |
| `node_modules/@humanfs/core` | `0.19.2` | dev |
| `node_modules/@humanfs/node` | `0.16.8` | dev |
| `node_modules/@humanfs/types` | `0.15.0` | dev |
| `node_modules/@humanwhocodes/module-importer` | `1.0.1` | dev |
| `node_modules/@humanwhocodes/retry` | `0.4.3` | dev |
| `node_modules/@img/colour` | `1.1.0` | optional |
| `node_modules/@img/sharp-darwin-arm64` | `0.35.5` | optional |
| `node_modules/@img/sharp-darwin-x64` | `0.35.5` | optional |
| `node_modules/@img/sharp-freebsd-wasm32` | `0.35.5` | optional |
| `node_modules/@img/sharp-libvips-darwin-arm64` | `1.3.4` | optional |
| `node_modules/@img/sharp-libvips-darwin-x64` | `1.3.4` | optional |
| `node_modules/@img/sharp-libvips-linux-arm` | `1.3.4` | optional |
| `node_modules/@img/sharp-libvips-linux-arm64` | `1.3.4` | optional |
| `node_modules/@img/sharp-libvips-linux-ppc64` | `1.3.4` | optional |
| `node_modules/@img/sharp-libvips-linux-riscv64` | `1.3.4` | optional |
| `node_modules/@img/sharp-libvips-linux-s390x` | `1.3.4` | optional |
| `node_modules/@img/sharp-libvips-linux-x64` | `1.3.4` | optional |
| `node_modules/@img/sharp-libvips-linuxmusl-arm64` | `1.3.4` | optional |
| `node_modules/@img/sharp-libvips-linuxmusl-x64` | `1.3.4` | optional |
| `node_modules/@img/sharp-linux-arm` | `0.35.5` | optional |
| `node_modules/@img/sharp-linux-arm64` | `0.35.5` | optional |
| `node_modules/@img/sharp-linux-ppc64` | `0.35.5` | optional |
| `node_modules/@img/sharp-linux-riscv64` | `0.35.5` | optional |
| `node_modules/@img/sharp-linux-s390x` | `0.35.5` | optional |
| `node_modules/@img/sharp-linux-x64` | `0.35.5` | optional |
| `node_modules/@img/sharp-linuxmusl-arm64` | `0.35.5` | optional |
| `node_modules/@img/sharp-linuxmusl-x64` | `0.35.5` | optional |
| `node_modules/@img/sharp-wasm32` | `0.35.5` | optional |
| `node_modules/@img/sharp-webcontainers-wasm32` | `0.35.5` | optional |
| `node_modules/@img/sharp-win32-arm64` | `0.35.5` | optional |
| `node_modules/@img/sharp-win32-ia32` | `0.35.5` | optional |
| `node_modules/@img/sharp-win32-x64` | `0.35.5` | optional |
| `node_modules/@jridgewell/gen-mapping` | `0.3.13` | dev |
| `node_modules/@jridgewell/resolve-uri` | `3.1.2` | dev |
| `node_modules/@jridgewell/sourcemap-codec` | `1.6.0` | dev |
| `node_modules/@jridgewell/trace-mapping` | `0.3.31` | dev |
| `node_modules/@napi-rs/wasm-runtime` | `1.2.4` | dev, optional |
| `node_modules/@next/env` | `15.5.27` | — |
| `node_modules/@next/eslint-plugin-next` | `15.5.27` | dev |
| `node_modules/@next/swc-darwin-arm64` | `15.5.27` | optional |
| `node_modules/@next/swc-darwin-x64` | `15.5.27` | optional |
| `node_modules/@next/swc-linux-arm64-gnu` | `15.5.27` | optional |
| `node_modules/@next/swc-linux-arm64-musl` | `15.5.27` | optional |
| `node_modules/@next/swc-linux-x64-gnu` | `15.5.27` | optional |
| `node_modules/@next/swc-linux-x64-musl` | `15.5.27` | optional |
| `node_modules/@next/swc-win32-arm64-msvc` | `15.5.27` | optional |
| `node_modules/@next/swc-win32-x64-msvc` | `15.5.27` | optional |
| `node_modules/@nodelib/fs.scandir` | `2.1.5` | dev |
| `node_modules/@nodelib/fs.stat` | `2.0.5` | dev |
| `node_modules/@nodelib/fs.walk` | `1.2.8` | dev |
| `node_modules/@nolyfill/is-core-module` | `1.0.39` | dev |
| `node_modules/@oxc-project/types` | `0.152.0` | dev, peer |
| `node_modules/@playwright/test` | `1.63.0` | devOptional |
| `node_modules/@polka/url` | `1.0.0-next.29` | dev |
| `node_modules/@rolldown/binding-android-arm-eabi` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-android-arm64` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-darwin-arm64` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-darwin-x64` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-freebsd-x64` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-linux-arm-gnueabihf` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-linux-arm64-gnu` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-linux-arm64-musl` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-linux-ppc64-gnu` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-linux-s390x-gnu` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-linux-x64-gnu` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-linux-x64-musl` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-openharmony-arm64` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-win32-arm64-msvc` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/binding-win32-x64-msvc` | `1.2.12` | dev, optional, peer |
| `node_modules/@rolldown/pluginutils` | `1.0.1` | dev |
| `node_modules/@rtsao/scc` | `1.1.0` | dev |
| `node_modules/@rushstack/eslint-patch` | `1.16.1` | dev |
| `node_modules/@swc/helpers` | `0.5.15` | — |
| `node_modules/@testing-library/dom` | `10.4.2` | dev, peer |
| `node_modules/@testing-library/dom/node_modules/aria-query` | `5.3.0` | dev, peer |
| `node_modules/@testing-library/jest-dom` | `7.0.1` | dev |
| `node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api` | `0.6.3` | dev |
| `node_modules/@testing-library/react` | `16.3.3` | dev |
| `node_modules/@tybys/wasm-util` | `0.10.4` | dev, optional |
| `node_modules/@types/aria-query` | `5.0.4` | dev, peer |
| `node_modules/@types/chai` | `5.2.3` | dev |
| `node_modules/@types/deep-eql` | `4.0.2` | dev |
| `node_modules/@types/estree` | `1.0.9` | dev |
| `node_modules/@types/json-schema` | `7.0.15` | dev |
| `node_modules/@types/json5` | `0.0.29` | dev |
| `node_modules/@types/node` | `22.20.5` | — |
| `node_modules/@types/pg` | `8.23.1` | — |
| `node_modules/@types/react` | `19.3.0` | dev |
| `node_modules/@types/react-dom` | `19.3.0` | dev |
| `node_modules/@typescript-eslint/eslint-plugin` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/eslint-plugin/node_modules/ignore` | `7.0.12` | dev |
| `node_modules/@typescript-eslint/parser` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/project-service` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/scope-manager` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/tsconfig-utils` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/type-utils` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/types` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/typescript-estree` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/typescript-estree/node_modules/balanced-match` | `4.0.4` | dev |
| `node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion` | `5.0.12` | dev |
| `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch` | `10.2.6` | dev |
| `node_modules/@typescript-eslint/typescript-estree/node_modules/semver` | `7.8.5` | dev |
| `node_modules/@typescript-eslint/utils` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/visitor-keys` | `8.71.0` | dev |
| `node_modules/@typescript-eslint/visitor-keys/node_modules/eslint-visitor-keys` | `5.0.1` | dev |
| `node_modules/@unrs/resolver-binding-android-arm-eabi` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-android-arm64` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-darwin-arm64` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-darwin-x64` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-freebsd-x64` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-arm-gnueabihf` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-arm-musleabihf` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-arm64-gnu` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-arm64-musl` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-loong64-gnu` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-loong64-musl` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-ppc64-gnu` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-riscv64-gnu` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-riscv64-musl` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-s390x-gnu` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-x64-gnu` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-linux-x64-musl` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-openharmony-arm64` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-wasm32-wasi` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-wasm32-wasi/node_modules/@emnapi/runtime` | `1.10.0` | dev, optional |
| `node_modules/@unrs/resolver-binding-win32-arm64-msvc` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-win32-ia32-msvc` | `1.12.2` | dev, optional |
| `node_modules/@unrs/resolver-binding-win32-x64-msvc` | `1.12.2` | dev, optional |
| `node_modules/@vitejs/plugin-react` | `6.1.1` | dev |
| `node_modules/@vitest/mocker` | `5.0.3` | dev |
| `node_modules/@vitest/pretty-format` | `5.0.3` | dev |
| `node_modules/@vitest/spy` | `5.0.3` | dev |
| `node_modules/@vitest/ui` | `5.0.3` | dev |
| `node_modules/@vitest/utils` | `5.0.3` | dev |
| `node_modules/acorn` | `8.18.0` | dev |
| `node_modules/acorn-jsx` | `5.3.2` | dev |
| `node_modules/ajv` | `6.15.0` | dev |
| `node_modules/ansi-regex` | `5.0.1` | dev, peer |
| `node_modules/ansi-styles` | `4.3.0` | dev |
| `node_modules/any-promise` | `1.3.0` | dev |
| `node_modules/anymatch` | `3.1.3` | dev |
| `node_modules/arg` | `5.0.2` | dev |
| `node_modules/argparse` | `2.0.1` | dev |
| `node_modules/aria-query` | `5.3.2` | dev |
| `node_modules/array-buffer-byte-length` | `1.0.2` | dev |
| `node_modules/array-includes` | `3.2.0` | dev |
| `node_modules/array.prototype.findlast` | `1.2.5` | dev |
| `node_modules/array.prototype.findlastindex` | `1.2.6` | dev |
| `node_modules/array.prototype.flat` | `1.3.3` | dev |
| `node_modules/array.prototype.flatmap` | `1.3.3` | dev |
| `node_modules/array.prototype.tosorted` | `1.1.4` | dev |
| `node_modules/arraybuffer.prototype.slice` | `1.0.4` | dev |
| `node_modules/assertion-error` | `2.0.1` | dev |
| `node_modules/ast-types-flow` | `0.0.8` | dev |
| `node_modules/async-function` | `1.0.0` | dev |
| `node_modules/autoprefixer` | `10.6.1` | dev |
| `node_modules/available-typed-arrays` | `1.0.7` | dev |
| `node_modules/axe-core` | `4.13.0` | dev |
| `node_modules/axobject-query` | `4.1.0` | dev |
| `node_modules/balanced-match` | `1.0.2` | dev |
| `node_modules/baseline-browser-mapping` | `2.11.27` | dev |
| `node_modules/bidi-js` | `1.1.0` | dev |
| `node_modules/binary-extensions` | `2.3.0` | dev |
| `node_modules/brace-expansion` | `1.1.21` | dev |
| `node_modules/braces` | `3.0.3` | dev |
| `node_modules/browserslist` | `4.29.3` | dev |
| `node_modules/buffer-from` | `1.1.2` | dev |
| `node_modules/call-bind` | `1.0.9` | dev |
| `node_modules/call-bind-apply-helpers` | `1.0.2` | dev |
| `node_modules/call-bound` | `1.0.4` | dev |
| `node_modules/callsites` | `3.1.0` | dev |
| `node_modules/camelcase-css` | `2.0.1` | dev |
| `node_modules/caniuse-lite` | `1.0.30001814` | — |
| `node_modules/chai` | `6.3.0` | dev |
| `node_modules/chalk` | `4.1.2` | dev |
| `node_modules/chokidar` | `3.6.0` | dev |
| `node_modules/chokidar/node_modules/glob-parent` | `5.1.2` | dev |
| `node_modules/client-only` | `0.0.1` | — |
| `node_modules/color-convert` | `2.0.1` | dev |
| `node_modules/color-name` | `1.1.4` | dev |
| `node_modules/commander` | `4.1.1` | dev |
| `node_modules/concat-map` | `0.0.1` | dev |
| `node_modules/convert-source-map` | `2.0.0` | dev |
| `node_modules/cross-spawn` | `7.0.6` | dev |
| `node_modules/css-tree` | `3.2.1` | dev |
| `node_modules/css.escape` | `1.5.1` | dev |
| `node_modules/cssesc` | `3.0.0` | dev |
| `node_modules/csstype` | `3.2.3` | dev |
| `node_modules/damerau-levenshtein` | `1.0.8` | dev |
| `node_modules/data-urls` | `7.0.0` | dev |
| `node_modules/data-urls/node_modules/whatwg-url` | `16.0.1` | dev |
| `node_modules/data-view-buffer` | `1.0.2` | dev |
| `node_modules/data-view-byte-length` | `1.0.2` | dev |
| `node_modules/data-view-byte-offset` | `1.0.1` | dev |
| `node_modules/debug` | `4.4.3` | dev |
| `node_modules/decimal.js` | `10.6.0` | dev |
| `node_modules/deep-is` | `0.1.4` | dev |
| `node_modules/define-data-property` | `1.1.4` | dev |
| `node_modules/define-properties` | `1.2.1` | dev |
| `node_modules/dequal` | `2.0.3` | dev, peer |
| `node_modules/detect-libc` | `2.1.2` | devOptional |
| `node_modules/didyoumean` | `1.2.2` | dev |
| `node_modules/dlv` | `1.1.3` | dev |
| `node_modules/doctrine` | `2.1.0` | dev |
| `node_modules/dom-accessibility-api` | `0.5.16` | dev, peer |
| `node_modules/dotenv` | `18.0.5` | — |
| `node_modules/drizzle-kit` | `0.31.11` | dev |
| `node_modules/drizzle-kit/node_modules/@esbuild/aix-ppc64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/android-arm` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/android-arm64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/android-x64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/darwin-arm64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/darwin-x64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/freebsd-arm64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/freebsd-x64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/linux-arm` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/linux-arm64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/linux-ia32` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/linux-loong64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/linux-mips64el` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/linux-ppc64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/linux-riscv64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/linux-s390x` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/linux-x64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/netbsd-arm64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/netbsd-x64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/openbsd-arm64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/openbsd-x64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/openharmony-arm64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/sunos-x64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/win32-arm64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/win32-ia32` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/@esbuild/win32-x64` | `0.25.12` | dev, optional |
| `node_modules/drizzle-kit/node_modules/esbuild` | `0.25.12` | dev |
| `node_modules/drizzle-orm` | `0.45.3` | — |
| `node_modules/dunder-proto` | `1.0.1` | dev |
| `node_modules/electron-to-chromium` | `1.5.444` | dev |
| `node_modules/emoji-regex` | `9.2.2` | dev |
| `node_modules/entities` | `8.1.0` | dev |
| `node_modules/es-abstract` | `1.24.2` | dev |
| `node_modules/es-abstract-get` | `1.0.0` | dev |
| `node_modules/es-define-property` | `1.0.1` | dev |
| `node_modules/es-errors` | `1.3.0` | dev |
| `node_modules/es-iterator-helpers` | `1.4.0` | dev |
| `node_modules/es-module-lexer` | `2.3.2` | dev |
| `node_modules/es-object-atoms` | `1.1.2` | dev |
| `node_modules/es-set-tostringtag` | `2.1.0` | dev |
| `node_modules/es-shim-unscopables` | `1.1.0` | dev |
| `node_modules/es-to-primitive` | `1.3.4` | dev |
| `node_modules/esbuild` | `0.28.2` | dev |
| `node_modules/escalade` | `3.2.0` | dev |
| `node_modules/escape-string-regexp` | `4.0.0` | dev |
| `node_modules/eslint` | `9.39.5` | dev |
| `node_modules/eslint-config-next` | `15.5.27` | dev |
| `node_modules/eslint-import-resolver-node` | `0.3.10` | dev |
| `node_modules/eslint-import-resolver-node/node_modules/debug` | `3.2.7` | dev |
| `node_modules/eslint-import-resolver-typescript` | `3.10.1` | dev |
| `node_modules/eslint-module-utils` | `2.14.0` | dev |
| `node_modules/eslint-module-utils/node_modules/debug` | `3.2.7` | dev |
| `node_modules/eslint-plugin-import` | `2.32.0` | dev |
| `node_modules/eslint-plugin-import/node_modules/debug` | `3.2.7` | dev |
| `node_modules/eslint-plugin-jsx-a11y` | `6.10.2` | dev |
| `node_modules/eslint-plugin-react` | `7.37.5` | dev |
| `node_modules/eslint-plugin-react-hooks` | `5.2.0` | dev |
| `node_modules/eslint-scope` | `8.4.0` | dev |
| `node_modules/eslint-visitor-keys` | `4.2.1` | dev |
| `node_modules/espree` | `10.4.0` | dev |
| `node_modules/esquery` | `1.7.0` | dev |
| `node_modules/esrecurse` | `4.3.0` | dev |
| `node_modules/estraverse` | `5.3.0` | dev |
| `node_modules/estree-walker` | `3.0.3` | dev |
| `node_modules/esutils` | `2.0.3` | dev |
| `node_modules/expect-type` | `1.4.0` | dev |
| `node_modules/fast-deep-equal` | `3.1.3` | dev |
| `node_modules/fast-glob` | `3.3.1` | dev |
| `node_modules/fast-glob/node_modules/glob-parent` | `5.1.2` | dev |
| `node_modules/fast-json-stable-stringify` | `2.1.0` | dev |
| `node_modules/fast-levenshtein` | `2.0.6` | dev |
| `node_modules/fastq` | `1.20.3` | dev |
| `node_modules/fflate` | `0.8.3` | dev |
| `node_modules/file-entry-cache` | `8.0.0` | dev |
| `node_modules/fill-range` | `7.1.1` | dev |
| `node_modules/find-up` | `5.0.0` | dev |
| `node_modules/flat-cache` | `4.0.1` | dev |
| `node_modules/flatted` | `3.4.4` | dev |
| `node_modules/for-each` | `0.3.5` | dev |
| `node_modules/fraction.js` | `5.3.4` | dev |
| `node_modules/fsevents` | `2.3.3` | dev, optional |
| `node_modules/function-bind` | `1.1.2` | dev |
| `node_modules/function.prototype.name` | `1.2.0` | dev |
| `node_modules/functions-have-names` | `1.2.3` | dev |
| `node_modules/generator-function` | `2.0.1` | dev |
| `node_modules/get-intrinsic` | `1.3.0` | dev |
| `node_modules/get-proto` | `1.0.1` | dev |
| `node_modules/get-symbol-description` | `1.1.0` | dev |
| `node_modules/get-tsconfig` | `4.14.3` | dev |
| `node_modules/glob-parent` | `6.0.2` | dev |
| `node_modules/globalthis` | `1.0.4` | dev |
| `node_modules/gopd` | `1.2.0` | dev |
| `node_modules/has-bigints` | `1.1.0` | dev |
| `node_modules/has-flag` | `4.0.0` | dev |
| `node_modules/has-property-descriptors` | `1.0.2` | dev |
| `node_modules/has-proto` | `1.2.0` | dev |
| `node_modules/has-symbols` | `1.1.0` | dev |
| `node_modules/has-tostringtag` | `1.0.2` | dev |
| `node_modules/hasown` | `2.0.4` | dev |
| `node_modules/html-encoding-sniffer` | `7.0.0` | dev |
| `node_modules/ignore` | `5.3.2` | dev |
| `node_modules/import-fresh` | `3.3.1` | dev |
| `node_modules/imurmurhash` | `0.1.4` | dev |
| `node_modules/indent-string` | `4.0.0` | dev |
| `node_modules/internal-slot` | `1.1.0` | dev |
| `node_modules/is-array-buffer` | `3.0.5` | dev |
| `node_modules/is-async-function` | `2.1.1` | dev |
| `node_modules/is-bigint` | `1.1.0` | dev |
| `node_modules/is-binary-path` | `2.1.0` | dev |
| `node_modules/is-boolean-object` | `1.2.2` | dev |
| `node_modules/is-bun-module` | `2.0.0` | dev |
| `node_modules/is-bun-module/node_modules/semver` | `7.8.5` | dev |
| `node_modules/is-callable` | `1.2.7` | dev |
| `node_modules/is-core-module` | `2.17.0` | dev |
| `node_modules/is-data-view` | `1.0.2` | dev |
| `node_modules/is-date-object` | `1.1.0` | dev |
| `node_modules/is-document.all` | `1.0.0` | dev |
| `node_modules/is-extglob` | `2.1.1` | dev |
| `node_modules/is-finalizationregistry` | `1.1.1` | dev |
| `node_modules/is-generator-function` | `1.1.2` | dev |
| `node_modules/is-glob` | `4.0.3` | dev |
| `node_modules/is-map` | `2.0.3` | dev |
| `node_modules/is-negative-zero` | `2.0.3` | dev |
| `node_modules/is-number` | `7.0.0` | dev |
| `node_modules/is-number-object` | `1.1.1` | dev |
| `node_modules/is-potential-custom-element-name` | `1.0.1` | dev |
| `node_modules/is-regex` | `1.2.1` | dev |
| `node_modules/is-set` | `2.0.3` | dev |
| `node_modules/is-shared-array-buffer` | `1.0.4` | dev |
| `node_modules/is-string` | `1.1.1` | dev |
| `node_modules/is-symbol` | `1.1.1` | dev |
| `node_modules/is-typed-array` | `1.1.15` | dev |
| `node_modules/is-weakmap` | `2.0.2` | dev |
| `node_modules/is-weakref` | `1.1.1` | dev |
| `node_modules/is-weakset` | `2.0.4` | dev |
| `node_modules/isarray` | `2.0.5` | dev |
| `node_modules/isexe` | `2.0.0` | dev |
| `node_modules/iterator.prototype` | `1.1.5` | dev |
| `node_modules/jiti` | `1.21.7` | dev |
| `node_modules/js-tokens` | `4.0.0` | dev |
| `node_modules/js-yaml` | `4.3.2` | dev |
| `node_modules/jsdom` | `30.1.1` | dev |
| `node_modules/json-buffer` | `3.0.1` | dev |
| `node_modules/json-schema-traverse` | `0.4.1` | dev |
| `node_modules/json-stable-stringify-without-jsonify` | `1.0.1` | dev |
| `node_modules/jsx-ast-utils` | `3.3.5` | dev |
| `node_modules/keyv` | `4.5.4` | dev |
| `node_modules/language-subtag-registry` | `0.3.23` | dev |
| `node_modules/language-tags` | `1.0.9` | dev |
| `node_modules/levn` | `0.4.1` | dev |
| `node_modules/lightningcss` | `1.33.0` | dev, peer |
| `node_modules/lightningcss-android-arm64` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-darwin-arm64` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-darwin-x64` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-freebsd-x64` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-linux-arm-gnueabihf` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-linux-arm64-gnu` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-linux-arm64-musl` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-linux-x64-gnu` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-linux-x64-musl` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-win32-arm64-msvc` | `1.33.0` | dev, optional, peer |
| `node_modules/lightningcss-win32-x64-msvc` | `1.33.0` | dev, optional, peer |
| `node_modules/lilconfig` | `3.1.3` | dev |
| `node_modules/lines-and-columns` | `1.2.4` | dev |
| `node_modules/locate-path` | `6.0.0` | dev |
| `node_modules/lodash.merge` | `4.6.2` | dev |
| `node_modules/loose-envify` | `1.4.0` | dev |
| `node_modules/lru-cache` | `11.5.3` | dev |
| `node_modules/lz-string` | `1.5.0` | dev, peer |
| `node_modules/magic-string` | `1.4.2` | dev |
| `node_modules/math-intrinsics` | `1.1.0` | dev |
| `node_modules/mdn-data` | `2.27.1` | dev |
| `node_modules/merge2` | `1.4.1` | dev |
| `node_modules/micromatch` | `4.0.8` | dev |
| `node_modules/min-indent` | `1.0.1` | dev |
| `node_modules/minimatch` | `3.1.5` | dev |
| `node_modules/minimist` | `1.2.8` | dev |
| `node_modules/mrmime` | `2.0.1` | dev |
| `node_modules/ms` | `2.1.3` | dev |
| `node_modules/mz` | `2.7.0` | dev |
| `node_modules/nanoid` | `3.3.19` | — |
| `node_modules/napi-postinstall` | `0.3.4` | dev |
| `node_modules/natural-compare` | `1.4.0` | dev |
| `node_modules/next` | `15.5.27` | — |
| `node_modules/next/node_modules/postcss` | `8.4.31` | — |
| `node_modules/node-exports-info` | `1.6.2` | dev |
| `node_modules/node-releases` | `2.0.57` | dev |
| `node_modules/normalize-path` | `3.0.0` | dev |
| `node_modules/object-assign` | `4.1.1` | dev |
| `node_modules/object-hash` | `3.0.0` | dev |
| `node_modules/object-inspect` | `1.13.4` | dev |
| `node_modules/object-keys` | `1.1.1` | dev |
| `node_modules/object.assign` | `4.1.7` | dev |
| `node_modules/object.entries` | `1.1.9` | dev |
| `node_modules/object.fromentries` | `2.0.8` | dev |
| `node_modules/object.groupby` | `1.0.3` | dev |
| `node_modules/object.values` | `1.2.1` | dev |
| `node_modules/obug` | `2.2.1` | dev |
| `node_modules/optionator` | `0.9.4` | dev |
| `node_modules/own-keys` | `1.0.2` | dev |
| `node_modules/p-limit` | `3.1.0` | dev |
| `node_modules/p-locate` | `5.0.0` | dev |
| `node_modules/parent-module` | `1.0.1` | dev |
| `node_modules/parse5` | `8.0.1` | dev |
| `node_modules/path-exists` | `4.0.0` | dev |
| `node_modules/path-key` | `3.1.1` | dev |
| `node_modules/path-parse` | `1.0.7` | dev |
| `node_modules/pathe` | `2.0.3` | dev |
| `node_modules/pg` | `8.23.1` | — |
| `node_modules/pg-cloudflare` | `1.4.1` | optional |
| `node_modules/pg-connection-string` | `2.14.1` | — |
| `node_modules/pg-int8` | `1.0.1` | — |
| `node_modules/pg-pool` | `3.14.0` | — |
| `node_modules/pg-protocol` | `1.16.1` | — |
| `node_modules/pg-types` | `2.2.0` | — |
| `node_modules/pgpass` | `1.0.5` | — |
| `node_modules/picocolors` | `1.1.1` | — |
| `node_modules/picomatch` | `2.3.2` | dev |
| `node_modules/pirates` | `4.0.7` | dev |
| `node_modules/playwright` | `1.63.0` | devOptional |
| `node_modules/playwright-core` | `1.63.0` | devOptional |
| `node_modules/possible-typed-array-names` | `1.1.0` | dev |
| `node_modules/postcss` | `8.5.28` | dev |
| `node_modules/postcss-import` | `15.1.0` | dev |
| `node_modules/postcss-import/node_modules/resolve` | `1.22.12` | dev |
| `node_modules/postcss-js` | `4.1.0` | dev |
| `node_modules/postcss-load-config` | `6.0.1` | dev |
| `node_modules/postcss-nested` | `6.2.0` | dev |
| `node_modules/postcss-selector-parser` | `6.1.4` | dev |
| `node_modules/postcss-value-parser` | `4.2.0` | dev |
| `node_modules/postgres` | `3.4.9` | — |
| `node_modules/postgres-array` | `2.0.0` | — |
| `node_modules/postgres-bytea` | `1.0.1` | — |
| `node_modules/postgres-date` | `1.0.7` | — |
| `node_modules/postgres-interval` | `1.2.0` | — |
| `node_modules/prelude-ls` | `1.2.1` | dev |
| `node_modules/pretty-format` | `27.5.1` | dev, peer |
| `node_modules/pretty-format/node_modules/ansi-styles` | `5.2.0` | dev, peer |
| `node_modules/pretty-format/node_modules/react-is` | `17.0.2` | dev, peer |
| `node_modules/prop-types` | `15.8.1` | dev |
| `node_modules/punycode` | `2.3.1` | dev |
| `node_modules/queue-microtask` | `1.2.3` | dev |
| `node_modules/react` | `19.3.0` | — |
| `node_modules/react-dom` | `19.3.0` | — |
| `node_modules/react-is` | `16.13.1` | dev |
| `node_modules/read-cache` | `1.0.2` | dev |
| `node_modules/readdirp` | `3.6.0` | dev |
| `node_modules/redent` | `3.0.0` | dev |
| `node_modules/reflect.getprototypeof` | `1.0.10` | dev |
| `node_modules/regexp.prototype.flags` | `1.5.4` | dev |
| `node_modules/require-from-string` | `2.0.2` | dev |
| `node_modules/resolve` | `2.0.0-next.7` | dev |
| `node_modules/resolve-from` | `4.0.0` | dev |
| `node_modules/resolve-pkg-maps` | `1.0.0` | dev |
| `node_modules/reusify` | `1.1.0` | dev |
| `node_modules/rolldown` | `1.2.12` | dev, peer |
| `node_modules/run-parallel` | `1.2.0` | dev |
| `node_modules/safe-array-concat` | `1.1.4` | dev |
| `node_modules/safe-push-apply` | `1.0.0` | dev |
| `node_modules/safe-regex-test` | `1.1.0` | dev |
| `node_modules/saxes` | `6.0.0` | dev |
| `node_modules/scheduler` | `0.28.0` | — |
| `node_modules/semver` | `6.3.1` | dev |
| `node_modules/set-function-length` | `1.2.2` | dev |
| `node_modules/set-function-name` | `2.0.2` | dev |
| `node_modules/set-proto` | `1.0.0` | dev |
| `node_modules/sharp` | `0.35.5` | optional |
| `node_modules/sharp/node_modules/semver` | `7.8.5` | optional |
| `node_modules/shebang-command` | `2.0.0` | dev |
| `node_modules/shebang-regex` | `3.0.0` | dev |
| `node_modules/side-channel` | `1.1.1` | dev |
| `node_modules/side-channel-list` | `1.0.1` | dev |
| `node_modules/side-channel-map` | `1.0.1` | dev |
| `node_modules/side-channel-weakmap` | `1.0.2` | dev |
| `node_modules/sirv` | `3.0.2` | dev |
| `node_modules/source-map` | `0.6.1` | dev |
| `node_modules/source-map-js` | `1.2.2` | — |
| `node_modules/source-map-support` | `0.5.21` | dev |
| `node_modules/split2` | `4.2.0` | — |
| `node_modules/stable-hash` | `0.0.5` | dev |
| `node_modules/std-env` | `4.3.0` | dev |
| `node_modules/stop-iteration-iterator` | `1.1.0` | dev |
| `node_modules/string.prototype.includes` | `2.0.1` | dev |
| `node_modules/string.prototype.matchall` | `4.1.0` | dev |
| `node_modules/string.prototype.repeat` | `1.0.0` | dev |
| `node_modules/string.prototype.trim` | `1.2.11` | dev |
| `node_modules/string.prototype.trimend` | `1.0.10` | dev |
| `node_modules/string.prototype.trimstart` | `1.0.8` | dev |
| `node_modules/strip-bom` | `3.0.0` | dev |
| `node_modules/strip-indent` | `3.0.0` | dev |
| `node_modules/strip-json-comments` | `3.1.1` | dev |
| `node_modules/styled-jsx` | `5.1.6` | — |
| `node_modules/sucrase` | `3.35.1` | dev |
| `node_modules/supports-color` | `7.2.0` | dev |
| `node_modules/supports-preserve-symlinks-flag` | `1.0.0` | dev |
| `node_modules/tailwindcss` | `3.4.19` | dev |
| `node_modules/tailwindcss/node_modules/fast-glob` | `3.3.3` | dev |
| `node_modules/tailwindcss/node_modules/fast-glob/node_modules/glob-parent` | `5.1.2` | dev |
| `node_modules/tailwindcss/node_modules/resolve` | `1.22.12` | dev |
| `node_modules/thenify` | `3.3.1` | dev |
| `node_modules/thenify-all` | `1.6.0` | dev |
| `node_modules/tinybench` | `6.2.0` | dev |
| `node_modules/tinyexec` | `1.3.1` | dev |
| `node_modules/tinyglobby` | `0.2.17` | dev |
| `node_modules/tinyglobby/node_modules/fdir` | `6.5.0` | dev |
| `node_modules/tinyglobby/node_modules/picomatch` | `4.0.7` | dev |
| `node_modules/tinyrainbow` | `3.2.0` | dev |
| `node_modules/tldts` | `7.4.16` | dev |
| `node_modules/tldts-core` | `7.4.16` | dev |
| `node_modules/to-regex-range` | `5.0.1` | dev |
| `node_modules/totalist` | `3.0.1` | dev |
| `node_modules/tough-cookie` | `6.0.2` | dev |
| `node_modules/tr46` | `6.0.0` | dev |
| `node_modules/ts-api-utils` | `2.5.0` | dev |
| `node_modules/ts-interface-checker` | `0.1.13` | dev |
| `node_modules/tsconfig-paths` | `3.15.0` | dev |
| `node_modules/tsconfig-paths/node_modules/json5` | `1.0.2` | dev |
| `node_modules/tslib` | `2.8.1` | — |
| `node_modules/tsx` | `4.23.15` | dev |
| `node_modules/type-check` | `0.4.0` | dev |
| `node_modules/typed-array-buffer` | `1.0.3` | dev |
| `node_modules/typed-array-byte-length` | `1.0.3` | dev |
| `node_modules/typed-array-byte-offset` | `1.0.5` | dev |
| `node_modules/typed-array-length` | `1.0.8` | dev |
| `node_modules/typescript` | `5.9.3` | dev |
| `node_modules/unbox-primitive` | `1.1.0` | dev |
| `node_modules/undici` | `8.11.2` | dev |
| `node_modules/undici-types` | `6.21.0` | — |
| `node_modules/unrs-resolver` | `1.12.2` | dev |
| `node_modules/update-browserslist-db` | `1.3.3` | dev |
| `node_modules/uri-js` | `4.4.1` | dev |
| `node_modules/util-deprecate` | `1.0.2` | dev |
| `node_modules/vite` | `8.3.2` | dev, peer |
| `node_modules/vite/node_modules/picomatch` | `4.0.7` | dev, peer |
| `node_modules/vitest` | `5.0.3` | dev |
| `node_modules/vitest/node_modules/picomatch` | `4.0.7` | dev |
| `node_modules/w3c-xmlserializer` | `6.0.0` | dev |
| `node_modules/webidl-conversions` | `8.0.1` | dev |
| `node_modules/whatwg-mimetype` | `5.0.0` | dev |
| `node_modules/whatwg-url` | `17.1.2` | dev |
| `node_modules/which` | `2.0.2` | dev |
| `node_modules/which-boxed-primitive` | `1.1.1` | dev |
| `node_modules/which-builtin-type` | `1.2.1` | dev |
| `node_modules/which-collection` | `1.0.2` | dev |
| `node_modules/which-typed-array` | `1.1.24` | dev |
| `node_modules/why-is-node-running` | `3.2.1` | dev |
| `node_modules/word-wrap` | `1.2.5` | dev |
| `node_modules/xml-name-validator` | `5.0.0` | dev |
| `node_modules/xmlchars` | `2.2.0` | dev |
| `node_modules/xtend` | `4.0.2` | — |
| `node_modules/yocto-queue` | `0.1.0` | dev |
| `node_modules/zod` | `4.6.5` | — |

## Готовый промт для Astra

```text
Работай в /path/to/project. Прочитай AGENTS.md и DEPENDENCY_AUDIT_AND_ASTRA_PROMPT.md. Это задание на ПЛАН устранения проблем зависимостей; код и lockfile пока не меняй, в production ничего не развёртывай.

Составь приоритетный, проверяемый план обновлений с минимальным риском для уже работающего VPS 203.0.113.10. В плане раздели production и dev/tooling риски, объясни реальную экспозицию каждого advisory, совместимость версий и порядок работ. Для актуальных API/миграционных инструкций библиотек используй Context7 по AGENTS.md: resolve-library-id → query-docs. Не доверяй автоматически npm audit fixAvailable: он предлагает как major upgrade, так и опасные downgrade. Проверь версии/обновления на дату работы.

Текущее состояние: Next 15.5.27, React 19, Tailwind 3.4.19, Drizzle Kit 0.31.11; Node 22 в Docker, PostgreSQL 16 и Caddy 2.8. Lockfile v3 содержит 640 размещений, npm audit all: 15 узлов (8 high, 7 moderate), npm audit --omit=dev: 2 узла (1 high, 1 moderate). Прямой postcss 8.5.28 безопаснее, но Next держит собственный postcss 8.4.31. Ветка Drizzle держит esbuild 0.18.20. Dockerfile копирует ВСЕ node_modules (включая dev) в runtime-образ; оцени физическую экспозицию и минимальное безопасное сокращение образа без поломки миграций. npm ls не сообщает missing/invalid пакетов; typecheck, lint, build проходят.

Включи в план ВСЕ 15 результатов npm audit:
- @esbuild-kit/core-utils@3.3.2 — moderate; via esbuild; npm предлагает drizzle-kit 0.18.1; major-изменение.
- @esbuild-kit/esm-loader@2.6.5 — moderate; via @esbuild-kit/core-utils; npm предлагает drizzle-kit 0.18.1; major-изменение.
- @next/eslint-plugin-next@15.5.27 — high; via fast-glob; npm предлагает eslint-config-next 14.2.35; major-изменение.
- braces@3.0.3 — high; via braces; npm предлагает tailwindcss 4.3.3; major-изменение.
- chokidar@3.6.0 — high; via braces; npm предлагает tailwindcss 4.3.3; major-изменение.
- drizzle-kit@0.31.11 — moderate; via @esbuild-kit/esm-loader; npm предлагает drizzle-kit 0.18.1; major-изменение.
- esbuild@0.18.20 — moderate; via esbuild; npm предлагает drizzle-kit 0.18.1; major-изменение. Другие установленные версии 0.25.12 и 0.28.2 не затронуты этой записью.
- eslint-config-next@15.5.27 — high; via @next/eslint-plugin-next; npm предлагает eslint-config-next 14.2.35; major-изменение.
- fast-glob@3.3.1, 3.3.3 — high; via micromatch; npm предлагает eslint-config-next 14.2.35; major-изменение.
- micromatch@4.0.8 — high; via braces; npm предлагает tailwindcss 4.3.3; major-изменение.
- next@15.5.27 — moderate; via postcss; npm предлагает next 16.4.0; major-изменение.
- postcss@8.4.31 — high; via 4 GHSA ниже; npm предлагает next 16.4.0; major-изменение. Прямой postcss@8.5.28 не затронут.
- postcss-nested@6.2.0 — moderate; via postcss-selector-parser; npm предлагает доступно в диапазоне текущей зависимости.
- postcss-selector-parser@6.1.4 — moderate; via postcss-selector-parser; npm предлагает tailwindcss 4.3.3; major-изменение.
- tailwindcss@3.4.19 — high; via chokidar, fast-glob, micromatch, postcss-nested, postcss-selector-parser; npm предлагает tailwindcss 4.3.3; major-изменение.

Первичные advisory, которые обязательно разобрать:
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm — braces: braces vulnerable to stack-exhaustion denial of service through deeply nested patterns (затронуто <=3.0.3).
- https://github.com/advisories/GHSA-67mh-4wv8-2f99 — esbuild: esbuild enables any website to send any requests to the development server and read the response (затронуто <=0.24.2).
- https://github.com/advisories/GHSA-qx2v-qp2m-jg93 — postcss: PostCSS has XSS via Unescaped </style> in its CSS Stringify Output (затронуто <8.5.10).
- https://github.com/advisories/GHSA-6g55-p6wh-862q — postcss: PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments (затронуто <=8.5.11).
- https://github.com/advisories/GHSA-fxqj-rqcc-2cmp — postcss: PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset (затронуто <=8.5.22).
- https://github.com/advisories/GHSA-r28c-9q8g-f849 — postcss: PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure (затронуто <=8.5.17).
- https://github.com/advisories/GHSA-rj75-hqrm-r3gf — postcss-selector-parser: PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion (затронуто <7.1.6).

Дополнительные предупреждения: deprecated @esbuild-kit/core-utils@3.3.2 и @esbuild-kit/esm-loader@2.6.5; eslint@9.39.5 unsupported; команда next lint deprecated и исчезнет в Next 16. Проверь, не нужен ли @types/pg в devDependencies вместо dependencies. Проанализируй docker build/runtime и все транзитивные версии из полного инвентаря выше.

Для каждой группы исправлений укажи точное изменение package.json/lockfile и затронутых файлов, требуемые изменения Next/Tailwind/ESLint/Drizzle API и конфигурации, способ проверки и критерий завершения. Предусмотри typecheck, lint, unit/integration, E2E мобильного интерфейса, production build, Docker build, миграции на тестовой БД, повторный npm audit all и --omit=dev, затем отдельный безопасный план выкладки с backup/rollback и smoke на VPS. Сохрани финансовые инварианты, ownership/auth и текущий UI. Оставшиеся уязвимости документируй явно с обоснованием; не маскируй их overrides без подтверждения совместимости.

Итог: создай конкретный план по этапам с приоритетами, зависимостями между этапами, рисками и критериями приёмки. Не ограничивайся общими советами и не реализуй изменения сейчас.
```
