# План реализации для GPT-5.6-sol

## Цель

Переработать только presentation layer главного экрана Personal Finance OS: текущие деньги -> календарь -> день -> финансовое событие. Сохранить доменную логику, API, PostgreSQL/Drizzle, auth, денежные инварианты и существующие mutation flows.

Исходная спецификация: [`promtui.md`](./promtui.md).

## Фактическая точка старта

- [`src/app/page.tsx`](./src/app/page.tsx) уже содержит dashboard, month switching, calendar projection, Day View, Quick Add и loading/error/offline состояния.
- [`src/app/api/dashboard/route.ts`](./src/app/api/dashboard/route.ts) и [`src/app/api/calendar/route.ts`](./src/app/api/calendar/route.ts) являются источниками данных.
- [`src/components/BottomNav.tsx`](./src/components/BottomNav.tsx) отвечает за нижнюю навигацию.
- [`src/components/Calendar.tsx`](./src/components/Calendar.tsx) и [`src/app/calendar/page.tsx`](./src/app/calendar/page.tsx) содержат второй календарный flow; перед изменениями решить, что переиспользовать.
- В рабочем дереве уже есть пользовательские изменения в `src/app/page.tsx`, `src/app/globals.css`, `src/components/BottomNav.tsx`. Не затирать их вслепую.

Первое действие модели: прочитать только эти entry points и непосредственные импорты, затем составить карту data flow. Не сканировать весь repository.

## Правила реализации

1. Не менять business logic, domain calculations, API contracts, schema, auth, permissions и формат денег.
2. Не создавать mock financial data. Использовать только API и существующие handlers.
3. Derived `CalendarViewModel` допустим как presentation model, но не как новая domain entity.
4. На mobile порядок: Header -> compact current-money dashboard -> calendar -> bottom navigation. Tap по дню открывает Day View; постоянный preview под календарём не нужен.
5. Dashboard всегда описывает текущий момент. Другой месяц не меняет смысл `Доступно сейчас`.
6. Net в ячейке = фактически получено минус фактически потрачено. `IN_TRANSIT`, planned и pending не включать в net.
7. Loading, partial/error, empty, offline, overdue, protected deficit и большие суммы не должны ломать layout.
8. Touch targets от 44px, keyboard/focus-visible, WCAG AA, `prefers-reduced-motion`, safe area и отсутствие горизонтального overflow обязательны.
9. Новые dependencies не добавлять без доказанной необходимости. CSS/Tailwind предпочтительнее motion-библиотек.

## Фазы

### 0. Подготовка

- Прочитать `AGENTS.md`, этот план и `promtui.md`.
- Выполнить `git status --short` и сохранить baseline.
- Запустить `npm run typecheck`, `npm test -- --pool=threads`, при доступной БД `npm run build`.
- Зафиксировать существующие ошибки отдельно, чтобы не принять их за регрессии.

### 1. Исследование текущего flow

- Проследить `src/app/page.tsx` -> API -> dashboard/calendar response -> navigation/forms.
- Проверить routes `/expenses`, `/income`, `/planning`, `/debts`, `/goals`.
- Переиспользовать существующие helpers и handlers; новые создавать только при отсутствии аналога.
- Сохранить карту data flow в `findings.md`.

### 2. View model и pure helpers

- Создать минимальные pure helpers только при отсутствии аналога: date-only normalization, `realizedNet`, marker priority, compact money formatter.
- Агрегировать данные один раз в `CalendarViewModel`: lookup `YYYY-MM-DD -> day`.
- Не фильтровать все события внутри каждой из 42 ячеек.
- Добавить небольшие unit tests для timezone/month boundary и сумм.

### 3. Основной mobile UI

- Пересобрать главный экран вокруг календаря, а не вокруг набора KPI cards.
- Использовать typography, borders, spacing и семантические цвета вместо gradient/glass/glow.
- Реализовать privacy mode для чувствительных сумм с локальным состоянием.
- Сохранить month arrows, Today, global `+`, существующие routes и Day View.
- Показывать события строками, не набором карточек.

### 4. Responsive и polish

- Проверить 320px, 375x667, 390x844, большой смартфон, tablet и desktop.
- Переиспользовать `DayDetails` для tablet/desktop, если это не требует изменения API.
- Desktop sidebar допустим только без routing rewrite.
- Добавить короткие CSS transitions; не добавлять GSAP ради финансового календаря.

### 5. Открытые источники и лицензии

Использовать открытые источники как reference и лицензированные primitives:

- Lucide icons (ISC) или уже установленный icon подход; не использовать emoji как icons.
- Radix/shadcn primitives только для Dialog/Sheet/Popover, если реально нужны; не превращать экран в набор стандартных Card.
- Официальные Next/React/Tailwind examples только как техническая reference.
- Фото/текстуры использовать только при ясной лицензии; dashboard может обойтись без изображений.

Перед добавлением внешнего asset: записать URL, автора, лицензию и дату проверки в `OPEN_SOURCE_ASSETS.md`; скачать локально в `public/`; проверить размер, alt text и performance; не копировать целую страницу или закрытый компонент.

### 6. Visual feedback loop

После каждого крупного UI изменения: `implement -> run -> screenshot -> inspect -> fix`.

- Запустить `npm run dev` на свободном порту.
- Playwright: 390x844, 375x667, 320px и desktop.
- Проверить 5/6 недель, длинные суммы, empty/error/offline/loading и `calendar -> day -> event -> back`.
- После первого рендера выполнить минимум одну polish iteration.

### 7. Quality gate

```bash
npm run typecheck
npm test -- --pool=threads
npm run lint
npm run build
npm run test:e2e
```

Если команда не поддерживается текущей версией инструмента, записать замену и причину. Не исправлять unrelated baseline failures.

## Когда применять skills

- `planning-with-files`: до начала и после каждой фазы; обновлять `task_plan.md`, `findings.md`, `progress.md`.
- `gpt-taste`: один раз на art direction для анти-AI критики. Не переносить его AIDA/GSAP/hero-правила, если они конфликтуют с финансовым workflow.
- `prototype`: только если первая композиция шаблонна; сравнить 2-3 варианта dashboard/calendar на уровне reasoning, реализовать один.
- `mobile-native`: после mobile реализации и перед финальным E2E; safe areas, 44px targets, viewport height, bottom nav, back gesture.
- `ui-ux-pro-max`: финальный a11y/responsive review: контраст, фокус, overflow, состояния, keyboard, длинный контент.
- `emil-design-eng`: финальный pass на spacing, hierarchy, transitions и feedback.
- `break-ui`: после первой рабочей версии; проверить худшие данные из спецификации и исправить найденное.
- `playwright-cli`: реальный запуск, screenshots и user flow; DOM-only проверка не считается visual verification.
- `context7-mcp`: точечно перед актуальным API Next.js/React/Tailwind/Playwright или новой библиотеки: сначала `resolve-library-id`, затем один `query-docs`.
- `design-system`/`ui-styling`: только при необходимости формализовать повторяющиеся tokens/primitives; не добавлять shadcn system поверх существующего стиля.
- `imagegen`: не нужен по умолчанию; подключать только для уникального локального bitmap asset после проверки открытых источников.

## Definition of Done

- Главный экран работает на реальных данных и сохраняет mutations.
- Календарь является главным визуальным объектом; 5/6 недель и 320px не ломаются.
- Day View, month switching, Today, privacy mode, Quick Add и Back сохраняют контекст.
- `IN_TRANSIT` и HARD protection отделены от available cash.
- Loading/error/empty/offline/disabled состояния локальны и понятны.
- Нет новых API/schema/domain изменений без отдельного обоснования.
- Нет нелицензированных внешних assets и незафиксированных UI-копий.
- Typecheck, tests, lint/build и E2E пройдены либо baseline failure записан.
- Выполнена visual polish iteration и обновлён `CURRENT_STATE.md`, если он существует.

## Запуск разработки

```bash
cd /path/to/project
export PLAN_ID=2026-10-06-gpt-5-6-sol-personal-finance-ui-redesign
npm install
npm run dev
```

В отдельном терминале:

```bash
cd /path/to/project
npm run typecheck
npm test -- --pool=threads
npm run test:e2e
```

Перед стартом GPT-5.6-sol передать ей этот файл и попросить выполнять фазы последовательно, обновляя planning files после каждой фазы. Для визуальной проверки открыть `http://localhost:3000` или порт, который сообщит Next.js.

## Формат отчёта фазы

```text
Фаза: <номер и название>
Изменено: <файлы>
Проверено: <команды и viewport>
Результат: <что работает>
Открытые риски: <если есть>
Следующий шаг: <одна конкретная команда/фаза>
```
