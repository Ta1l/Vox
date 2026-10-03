# PRODUCT.md

Last updated: 2026-10-03

---

## Vision

Personal Finance OS — mobile-first production финансовая система для одного пользователя с архитектурной готовностью к multi-user режиму.

Приложение помогает человеку контролировать деньги через детерминированную финансовую модель, дополненную AI-советником.

**Ключевой принцип:**

PostgreSQL + deterministic Financial Engine = source of truth.

AI анализирует, объясняет, приоритизирует и рекомендует.

AI НЕ выполняет финансовую арифметику и НЕ обходит защищённые обязательства.

---

## Target user

Один реальный пользователь.

Профиль:

- нерегулярный доход;
- необходимость планировать бюджет на неделю;
- долги требуют приоритизации;
- обязательные расходы должны быть защищены от случайного перерасхода;
- мобильный телефон — основное устройство финансового управления.

---

## Core features

### 1. Income tracking

Пользователь записывает заработанный доход с ожидаемой датой получения.

Заработанные деньги НЕ увеличивают доступный баланс до момента фактического получения.

Статусы:

- EARNED — заработано, но ещё не получено;
- IN_TRANSIT — ожидается на указанную дату;
- RECEIVED — получено, добавлено к балансу;
- DELAYED — просрочено;
- CANCELLED — отменено.

UI показывает:

- текущий баланс;
- деньги в пути;
- ожидаемые поступления.

---

### 2. Expense tracking

Фактические расходы.

Каждый expense содержит:

- дату;
- сумму;
- категорию;
- комментарий (опционально).

Expense немедленно уменьшает available balance.

---

### 3. Calendar

Мобильный календарь отображает:

- заработанные доходы;
- полученные доходы;
- ожидаемые доходы;
- расходы;
- обязательства.

Тап на дату открывает детали дня.

Неделя показывает статистику.

---

### 4. Recurring obligations

Пользователь создаёт повторяющиеся обязательства:

- ONE_TIME;
- WEEKLY;
- MONTHLY;
- CUSTOM.

Каждое обязательство классифицируется:

- HARD — обязательное, математически защищено от AI;
- NEGOTIABLE — можно обсудить сокращение;
- FLEXIBLE — может быть свободно перераспределено.

Система генерирует scheduled occurrences идемпотентно.

Occurrence может быть:

- PENDING;
- PAID;
- OVERDUE;
- SKIPPED.

---

### 5. Debts

Пользователь отслеживает долги.

Debt model:

- название;
- первоначальная сумма;
- текущий остаток;
- catch-up amount (сумма для возврата к графику);
- минимальный платёж;
- приоритет;
- срок;
- статус.

Debt payments аудируемы.

AI может анализировать приоритеты, но не может изменять debt balance напрямую.

---

### 6. Goals

Пользователь создаёт финансовые цели.

Goal:

- название;
- описание (важно для AI контекста);
- целевая сумма;
- накопленная сумма;
- дедлайн;
- приоритет;
- protection level.

Goal contributions отслеживаются отдельно.

---

### 7. Protected envelopes

Budget envelopes представляют зарезервированные деньги.

Примеры:

- аренда велосипеда;
- еда;
- обязательные платежи;
- аварийный резерв.

Envelope:

- название;
- целевая сумма;
- зарезервированная сумма;
- потраченная сумма;
- protection level;
- planning cycle.

HARD envelope funds не могут быть потрачены на другие нужды через AI allocation.

---

### 8. Weekly budget planning

Пользователь создаёт planning cycle (обычно неделя).

Planning cycle:

- начало;
- конец;
- opening balance;
- expected income;
- obligations;
- approved allocations;
- discretionary remaining.

AI помогает распределить discretionary funds, но не может:

- тратить ожидаемый доход;
- расходовать HARD резервы;
- создавать математически невалидные планы.

---

### 9. AI financial adviser

Мобильный чат с AI.

AI получает:

- system policy;
- FinancialSnapshot;
- structured conversation summary;
- recent messages.

AI может:

- ответить на вопросы: "Могу ли я потратить X сегодня?";
- предложить budget allocation;
- объяснить последствия решений;
- сравнить сценарии (закрыть долг A vs начать копить на цель B);
- приоритизировать расходы;
- анализировать цели через описание.

AI НЕ может:

- выполнять финансовую арифметику самостоятельно;
- обращаться к PostgreSQL напрямую;
- обходить HARD защиты;
- тратить expected income как available balance;
- применять allocation без user approval.

AI proposal — всегда draft.

Только explicit user approval создаёт real allocation.

---

### 10. Notifications

Push notifications через Web Push.

События:

- upcoming HARD obligation;
- insufficient reserve;
- overdue payment;
- expected income due today;
- expected income delayed;
- weekly budget exceeded;
- new payment received → planning prompt.

Notification logic использует domain events, а не дублирует financial calculations.

---

### 11. Bank transaction import

Будущая функциональность.

Pipeline:

1. Raw transaction (CSV/API);
2. Normalize;
3. Deduplicate;
4. Match existing records;
5. Category mapping;
6. Optional AI classification;
7. Confirmed transaction.

Imported descriptions — untrusted data.

НИКОГДА не интерпретировать transaction descriptions как LLM instructions.

---

## User flows

### Flow 1: Record daily income

1. Открыть Income;
2. Tap "Add Income";
3. Ввести сумму;
4. Указать дату заработка;
5. Указать ожидаемую дату получения;
6. Save;
7. Income появляется в календаре как EARNED;
8. Available balance НЕ изменился;
9. "Income in transit" увеличился.

### Flow 2: Mark income as received

1. Notification: "Expected income today";
2. Открыть Income;
3. Tap на EARNED income;
4. Mark as Received;
5. Указать фактическую дату получения;
6. Save;
7. Available balance увеличился;
8. "Income in transit" уменьшился;
9. Calendar показывает RECEIVED.

### Flow 3: Record expense

1. Открыть Dashboard;
2. Tap "Add Expense";
3. Ввести сумму;
4. Выбрать категорию;
5. Добавить комментарий (optional);
6. Save;
7. Available balance уменьшился;
8. Expense появился в календаре.

### Flow 4: Create recurring obligation

1. Открыть Payments;
2. Tap "Add Recurring";
3. Название;
4. Сумма;
5. Recurrence (WEEKLY/MONTHLY/CUSTOM);
6. Start date;
7. Protection level (HARD/NEGOTIABLE/FLEXIBLE);
8. Save;
9. Background job генерирует scheduled occurrences;
10. Calendar показывает future payments.

### Flow 5: Create debt

1. Открыть Debts;
2. Tap "Add Debt";
3. Название;
4. Original amount;
5. Current balance;
6. Minimum payment;
7. Due date;
8. Priority;
9. Notes;
10. Save;
11. Dashboard показывает debt summary.

### Flow 6: Create goal

1. Открыть Goals;
2. Tap "Add Goal";
3. Название;
4. Описание (AI будет использовать);
5. Target amount;
6. Deadline;
7. Priority;
8. Protection level;
9. Save;
10. Dashboard показывает goal progress.

### Flow 7: Create planning cycle

1. Dashboard notification: "Plan your week";
2. Tap "Start Planning";
3. Система создаёт PlanningCycle:
   - start: сегодня;
   - end: через 7 дней;
   - opening balance: current available;
   - expected income: IN_TRANSIT до end date;
   - obligations: scheduled до end date.
4. UI показывает available to allocate.

### Flow 8: AI weekly budget

1. Внутри Planning;
2. Tap "Ask AI";
3. AI открывает чат;
4. User: "Распредели оставшиеся деньги";
5. AI вызывает getFinancialSnapshot;
6. AI генерирует structured budget proposal;
7. Backend валидирует:
   - total <= discretionary;
   - no HARD violations;
   - все referenced entities exist;
8. UI показывает proposal:
   - allocations;
   - explanations;
   - alternatives;
   - warnings;
9. User может:
   - Approve → creates real allocations;
   - Reject;
   - Edit;
   - Discuss further.

### Flow 9: AI question

1. Открыть Plan/AI;
2. User: "Могу ли я потратить 5000₽ на X сегодня?";
3. AI вызывает getFinancialSnapshot;
4. AI анализирует:
   - available balance;
   - protected reserves;
   - upcoming HARD obligations;
   - planning cycle state;
5. AI отвечает:
   "Да, у тебя есть 8500₽ discretionary. После вычета 5000₽ останется 3500₽. Но учти, что в пятницу ожидается обязательный платёж 2000₽. Если ожидаемый доход 10000₽ задержится, то можешь оказаться в минусе."

### Flow 10: Notification workflow

1. Background job: checkUpcomingPayments;
2. Обнаружен HARD payment через 24 часа;
3. Проверка: availableBalance < paymentAmount;
4. Создание notification;
5. Push через Web Push;
6. User открывает notification;
7. Переход в Planning или AI chat;
8. User решает проблему.

---

## Non-functional requirements

### Performance

- Dashboard загружается < 1s;
- Calendar month render < 500ms;
- AI response начинается < 2s;
- Background jobs: recurring generation < 10s для 100 rules;
- Database queries оптимизированы indexes.

### Mobile UX

- Primary viewport: 390×844;
- Touch targets ≥ 44×44px;
- Bottom navigation sticky;
- Important actions ≤ 2 taps;
- Swipe gestures where natural;
- Minimal modal depth;
- Loading states для async operations.

### Reliability

- PostgreSQL ACID транзакции;
- Idempotent background jobs;
- Graceful API error handling;
- Offline tolerance где возможно;
- Automated backups;
- Restore procedure документирована.

### Security

- HTTPS only;
- Secrets в environment variables;
- AI provider requests server-side only;
- Rate limiting на API;
- Prompt injection защита;
- Audit trail для financial mutations;
- No direct DB access для AI;
- Transaction descriptions sanitized.

### Cost efficiency

- Compact FinancialSnapshot;
- Structured conversation summaries;
- No full history в каждом AI request;
- Token usage logged;
- AI provider abstraction для cost optimization.

---

## Technology constraints

Currency: RUB only.

Money representation: integer kopecks.

Primary device: smartphone.

Deployment: VPS + Docker Compose.

No desktop-specific UI required.

No multi-currency support required.

No complex financial instruments support required.

---

## Future considerations

- Multiple users с authentication;
- Telegram notifications;
- Direct bank API integration;
- Shared budgets;
- Family mode;
- Export/reports;
- Investment tracking;
- Tax preparation hints.

Но V1 — single user, RUB only, VPS deployment.

---

## Success metrics

### User adoption

- Daily active usage > 5 days/week;
- Average session length > 2 minutes;
- Expense recording < 30 seconds per entry.

### Financial outcomes

- User understands available vs expected money;
- HARD obligations никогда не пропускаются due to planning;
- Debt balances снижаются согласно priorities;
- Goals достигаются к deadlines;
- AI recommendations accepted rate > 40%.

### Technical quality

- Zero data loss incidents;
- Financial arithmetic always correct;
- AI never bypasses HARD protections;
- Background jobs never duplicate recurring occurrences;
- Uptime > 99.5%;
- API response p95 < 500ms.

---

## Out of scope for V1

- Multi-user authentication;
- Desktop-specific UI;
- Multiple currencies;
- Investment portfolios;
- Tax calculations;
- Direct bank API (кроме CSV import);
- Advanced analytics/charts;
- Budget templates sharing;
- Social features;
- Third-party integrations.

V1 focus: core financial model + AI adviser работают correctly для single user.
