# DATABASE.md

Last updated: 2026-10-03

---

## Database technology

PostgreSQL 16+

ORM: Drizzle

Migrations: Drizzle Kit

---

## Schema design principles

1. **Multi-user ready:** Почти все таблицы содержат `user_id` даже при single-user V1;
2. **Integer kopecks:** Все денежные суммы — `integer` (kopecks);
3. **Explicit enums:** Используем PostgreSQL enums для type safety;
4. **Foreign keys:** Enforced на уровне БД;
5. **Indexes:** На все foreign keys и часто-запрашиваемые поля;
6. **Timestamps:** `created_at`, `updated_at` где уместно;
7. **Soft deletes:** Опционально через `deleted_at` для audit trail;
8. **Composite keys:** Для junction tables;
9. **Audit trail:** Append-only `audit_log` таблица.

---

## Core enums

```sql
-- Income status lifecycle
CREATE TYPE income_status AS ENUM (
  'EARNED',      -- заработано, но не получено
  'IN_TRANSIT',  -- ожидается
  'RECEIVED',    -- получено
  'DELAYED',     -- просрочено
  'CANCELLED'    -- отменено
);

-- Protection levels
CREATE TYPE protection_level AS ENUM (
  'HARD',        -- математически защищено
  'NEGOTIABLE',  -- можно обсудить сокращение
  'FLEXIBLE'     -- свободно перераспределяется
);

-- Recurrence patterns
CREATE TYPE recurrence_type AS ENUM (
  'ONE_TIME',
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'CUSTOM'
);

-- Payment occurrence status
CREATE TYPE occurrence_status AS ENUM (
  'PENDING',
  'PAID',
  'OVERDUE',
  'SKIPPED'
);

-- Debt status
CREATE TYPE debt_status AS ENUM (
  'ACTIVE',
  'ON_TRACK',
  'BEHIND',
  'CLOSED',
  'DEFAULTED'
);

-- Goal status
CREATE TYPE goal_status AS ENUM (
  'ACTIVE',
  'ON_TRACK',
  'AT_RISK',
  'ACHIEVED',
  'ABANDONED'
);

-- Planning cycle status
CREATE TYPE cycle_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'ARCHIVED'
);

-- Allocation target type
CREATE TYPE allocation_target_type AS ENUM (
  'DEBT',
  'GOAL',
  'ENVELOPE',
  'GENERAL'
);

-- Notification delivery status
CREATE TYPE notification_status AS ENUM (
  'PENDING',
  'SENT',
  'FAILED',
  'READ'
);

-- Bank transaction import status
CREATE TYPE import_status AS ENUM (
  'PENDING',
  'MATCHED',
  'REVIEW',
  'CONFIRMED',
  'REJECTED',
  'DUPLICATE'
);
```

---

## Schema tables

### users

Пользователи системы.

```typescript
Table: users
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── email: varchar(256) UNIQUE NOT NULL
├── name: varchar(256)
├── timezone: varchar(64) DEFAULT 'Europe/Moscow'
├── currency: varchar(3) DEFAULT 'RUB'
├── created_at: timestamp DEFAULT now()
└── updated_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX ON (email)
```

**Notes:**
- V1 может иметь только одного пользователя;
- `timezone` используется для calendar date calculations;
- `currency` пока всегда 'RUB'.

---

### accounts

Финансовые счета (опционально для V1, но заложено в схему).

```typescript
Table: accounts
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── name: varchar(256) NOT NULL
├── type: varchar(64) DEFAULT 'CASH'  -- 'CASH', 'BANK', 'SAVINGS'
├── is_default: boolean DEFAULT false
├── created_at: timestamp DEFAULT now()
└── updated_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id)
- INDEX ON (user_id, is_default)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Notes:**
- V1 может использовать один default account;
- `balance_kopecks` REMOVED - balance is COMPUTED from money_movements;
- В будущем можно добавить multiple accounts.

---

### income_entries

Записи о заработанном доходе.

```typescript
Table: income_entries
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── account_id: uuid REFERENCES accounts(id) ON DELETE SET NULL
├── amount_kopecks: bigint NOT NULL
├── status: income_status NOT NULL DEFAULT 'EARNED'
├── source: varchar(256)
├── description: text
├── earned_at: timestamptz NOT NULL
├── expected_at: date
├── received_at: timestamptz
├── version: integer NOT NULL DEFAULT 1
├── created_at: timestamptz DEFAULT now()
└── updated_at: timestamptz DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, status)
- INDEX ON (user_id, earned_at DESC)
- INDEX ON (user_id, expected_at)
- INDEX ON (user_id, received_at)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
- CHECK (amount_kopecks > 0)
- CHECK (status = 'RECEIVED' AND received_at IS NOT NULL OR status != 'RECEIVED')
```

**Notes:**
- `earned_at` — когда заработано (timestamptz для audit);
- `expected_at` — когда ожидается (date для планирования);
- `received_at` — когда фактически получено (timestamptz);
- `version` — optimistic locking для предотвращения race conditions при mark as received;
- Status transitions enforced на application level с version check;
- Changed to bigint (max ~92 quadrillion kopecks) и timestamptz (explicit timezone).

---

### expense_entries

Фактические расходы.

```typescript
Table: expense_entries
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── account_id: uuid REFERENCES accounts(id) ON DELETE SET NULL
├── amount_kopecks: bigint NOT NULL
├── category: varchar(128)
├── title: varchar(256)
├── description: text
├── spent_at: timestamptz NOT NULL
├── idempotency_key: varchar(256)
├── created_at: timestamptz DEFAULT now()
└── updated_at: timestamptz DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX ON (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
- INDEX ON (user_id, spent_at DESC)
- INDEX ON (user_id, category)
- INDEX ON (user_id, date(spent_at AT TIME ZONE 'Europe/Moscow'))

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
- CHECK (amount_kopecks > 0)
```

**Notes:**
- `spent_at` — timestamptz для audit trail;
- `idempotency_key` — для защиты от duplicate POST;
- Changed to bigint и timestamptz;
- Date index uses explicit timezone для calendar queries.

---

### recurring_obligations

Шаблоны повторяющихся обязательств.

```typescript
Table: recurring_obligations
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── name: varchar(256) NOT NULL
├── amount_kopecks: integer NOT NULL
├── recurrence_type: recurrence_type NOT NULL
├── recurrence_config: jsonb  -- кастомная конфигурация рекуррентности
├── protection_level: protection_level NOT NULL DEFAULT 'FLEXIBLE'
├── start_date: date NOT NULL
├── end_date: date  -- optional, null = indefinite
├── is_active: boolean DEFAULT true
├── created_at: timestamp DEFAULT now()
└── updated_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, is_active)
- INDEX ON (user_id, start_date)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (amount_kopecks > 0)
- CHECK (end_date IS NULL OR end_date >= start_date)
```

**Notes:**
- `recurrence_config` для CUSTOM patterns: `{dayOfWeek: 4, weekInterval: 1}`;
- Background job генерирует `payment_occurrences` из этих rules.

---

### payment_occurrences

Конкретные запланированные платежи, сгенерированные из recurring_obligations.

```typescript
Table: payment_occurrences
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── obligation_id: uuid REFERENCES recurring_obligations(id) ON DELETE CASCADE
├── amount_kopecks: integer NOT NULL
├── due_date: date NOT NULL
├── status: occurrence_status NOT NULL DEFAULT 'PENDING'
├── protection_level: protection_level NOT NULL
├── paid_at: timestamp
├── created_at: timestamp DEFAULT now()
└── updated_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX ON (obligation_id, due_date)  -- idempotency key
- INDEX ON (user_id, status)
- INDEX ON (user_id, due_date)
- INDEX ON (user_id, status, due_date)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (obligation_id) REFERENCES recurring_obligations(id) ON DELETE CASCADE
- CHECK (amount_kopecks > 0)
- CHECK (status = 'PAID' AND paid_at IS NOT NULL OR status != 'PAID')
```

**Notes:**
- UNIQUE constraint на `(obligation_id, due_date)` обеспечивает idempotency;
- `protection_level` копируется из obligation при создании.

---

### debts

Долги пользователя.

```typescript
Table: debts
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── name: varchar(256) NOT NULL
├── creditor: varchar(256)
├── original_amount_kopecks: bigint NOT NULL
├── current_balance_kopecks: bigint NOT NULL
├── minimum_payment_kopecks: bigint
├── due_date: date
├── interest_rate_percent: numeric(5,2) CHECK (interest_rate_percent >= 0)
├── priority: integer DEFAULT 0
├── status: debt_status DEFAULT 'ACTIVE'
├── notes: text
├── version: integer NOT NULL DEFAULT 1
├── created_at: timestamptz DEFAULT now()
└── updated_at: timestamptz DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, status)
- INDEX ON (user_id, priority DESC)
- INDEX ON (user_id, due_date)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (original_amount_kopecks > 0)
- CHECK (current_balance_kopecks >= 0)
- CHECK (minimum_payment_kopecks >= 0)
- CHECK (interest_rate_percent >= 0)
```

**Notes:**
- `catch_up_amount_kopecks` REMOVED — это вычисляемая метрика, не хранимая;
- `version` — optimistic locking для concurrent debt payments;
- `current_balance_kopecks` обновляется атомарно с debt_payment creation;
- Changed to bigint и добавлены CHECK constraints.

---

### debt_payments

История платежей по долгам.

```typescript
Table: debt_payments
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── debt_id: uuid NOT NULL REFERENCES debts(id) ON DELETE CASCADE
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT
├── expense_id: uuid REFERENCES expense_entries(id) ON DELETE SET NULL
├── amount_kopecks: bigint NOT NULL
├── previous_balance_kopecks: bigint NOT NULL
├── new_balance_kopecks: bigint NOT NULL
├── paid_at: timestamptz NOT NULL
├── notes: text
├── idempotency_key: varchar(256)
├── created_at: timestamptz DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX ON (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
- INDEX ON (debt_id, paid_at DESC)
- INDEX ON (user_id, paid_at DESC)

Constraints:
- FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
- FOREIGN KEY (expense_id) REFERENCES expense_entries(id) ON DELETE SET NULL
- CHECK (amount_kopecks > 0)
- CHECK (new_balance_kopecks >= 0)
- CHECK (new_balance_kopecks = previous_balance_kopecks - amount_kopecks)
```

**Notes:**
- Audit trail для debt balance changes;
- CHECK constraint enforces arithmetic correctness;
- `expense_id` — связь с фактическим cash movement;
- `idempotency_key` — защита от duplicate payments;
- Changed to bigint, timestamptz, RESTRICT for user deletion;
- ON DELETE RESTRICT для user_id — audit trail не удаляется.

---

### goals

Финансовые цели пользователя.

```typescript
Table: goals
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── name: varchar(256) NOT NULL
├── description: text  -- важно для AI context
├── target_amount_kopecks: integer NOT NULL
├── saved_amount_kopecks: integer DEFAULT 0
├── deadline: date
├── priority: integer DEFAULT 0
├── protection_level: protection_level DEFAULT 'FLEXIBLE'
├── status: goal_status DEFAULT 'ACTIVE'
├── created_at: timestamp DEFAULT now()
└── updated_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, status)
- INDEX ON (user_id, deadline)
- INDEX ON (user_id, priority DESC)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (target_amount_kopecks > 0)
- CHECK (saved_amount_kopecks >= 0)
```

**Notes:**
- `description` используется AI для understanding context and urgency;
- `saved_amount_kopecks` обновляется через goal_contributions.

---

### goal_contributions

История вкладов в цели.

```typescript
Table: goal_contributions
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── goal_id: uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── amount_kopecks: integer NOT NULL
├── contributed_at: timestamp NOT NULL
├── notes: text
├── created_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (goal_id, contributed_at DESC)
- INDEX ON (user_id, contributed_at DESC)

Constraints:
- FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (amount_kopecks > 0)
```

---

### budget_envelopes

Защищённые резервы / конверты.

```typescript
Table: budget_envelopes
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── name: varchar(256) NOT NULL
├── description: text
├── target_amount_kopecks: integer NOT NULL
├── funded_amount_kopecks: integer DEFAULT 0
├── spent_amount_kopecks: integer DEFAULT 0
├── protection_level: protection_level NOT NULL DEFAULT 'NEGOTIABLE'
├── is_active: boolean DEFAULT true
├── created_at: timestamp DEFAULT now()
└── updated_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, is_active)
- INDEX ON (user_id, protection_level)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (target_amount_kopecks >= 0)
- CHECK (funded_amount_kopecks >= 0)
- CHECK (spent_amount_kopecks >= 0)
```

**Notes:**
- `funded_amount_kopecks` — сколько зарезервировано;
- `spent_amount_kopecks` — сколько потрачено из резерва.

---

### planning_cycles

Циклы планирования (обычно неделя).

```typescript
Table: planning_cycles
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── start_date: date NOT NULL
├── end_date: date NOT NULL
├── opening_balance_kopecks: bigint NOT NULL
├── expected_income_kopecks: bigint DEFAULT 0
├── status: cycle_status DEFAULT 'DRAFT'
├── created_at: timestamptz DEFAULT now()
└── updated_at: timestamptz DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX ON (user_id) WHERE status = 'ACTIVE'
- INDEX ON (user_id, status)
- INDEX ON (user_id, start_date DESC)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (end_date > start_date)
```

**Notes:**
- UNIQUE constraint исправлен — только один ACTIVE cycle per user;
- `opening_balance_kopecks` — snapshot at cycle start;
- Changed to bigint и timestamptz.

---

### budget_allocations

Распределения бюджета внутри planning cycle.

```typescript
Table: budget_allocations
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── cycle_id: uuid NOT NULL REFERENCES planning_cycles(id) ON DELETE CASCADE
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── target_type: allocation_target_type NOT NULL
├── target_id: uuid  -- debt_id, goal_id, envelope_id или NULL для GENERAL
├── amount_kopecks: bigint NOT NULL
├── reason: text
├── is_ai_generated: boolean DEFAULT false
├── snapshot_version: varchar(64)
├── idempotency_key: varchar(256)
├── created_at: timestamptz DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX ON (cycle_id, idempotency_key) WHERE idempotency_key IS NOT NULL
- INDEX ON (cycle_id)
- INDEX ON (user_id, cycle_id)
- INDEX ON (target_type, target_id)

Constraints:
- FOREIGN KEY (cycle_id) REFERENCES planning_cycles(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (amount_kopecks > 0)
- CHECK (target_type = 'GENERAL' OR target_id IS NOT NULL)
```

**Notes:**
- `target_id` может быть NULL для GENERAL allocations;
- `is_ai_generated` помечает AI-created allocations для analytics;
- `snapshot_version` — для проверки stale AI approvals;
- `idempotency_key` — защита от duplicate approvals;
- CHECK constraint enforces target_id presence для typed allocations;
- Changed to bigint, timestamptz.

---

### ai_conversations

AI диалоги с пользователем.

```typescript
Table: ai_conversations
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── title: varchar(256)
├── started_at: timestamp DEFAULT now()
├── last_message_at: timestamp
├── is_active: boolean DEFAULT true
└── created_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, is_active)
- INDEX ON (user_id, last_message_at DESC)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

---

### ai_messages

Сообщения внутри AI conversations.

```typescript
Table: ai_messages
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── conversation_id: uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── role: varchar(32) NOT NULL  -- 'user', 'assistant', 'system'
├── content: text NOT NULL
├── metadata: jsonb  -- tool calls, structured outputs
├── created_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (conversation_id, created_at)
- INDEX ON (user_id, created_at DESC)

Constraints:
- FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (role IN ('user', 'assistant', 'system'))
```

**Notes:**
- `metadata` содержит tool calls, structured outputs для audit;
- Старые messages могут быть archived/compressed.

---

### ai_conversation_summaries

Структурированные summaries для conversation context compression.

```typescript
Table: ai_conversation_summaries
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── conversation_id: uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── summary_data: jsonb NOT NULL  -- structured durable decisions
├── messages_covered_until: timestamp NOT NULL
├── created_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (conversation_id, created_at DESC)

Constraints:
- FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Notes:**
- `summary_data` — structured JSON с durable decisions/preferences;
- Используется для уменьшения token usage.

---

### ai_usage_log

Лог использования AI providers для cost tracking.

```typescript
Table: ai_usage_log
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── conversation_id: uuid REFERENCES ai_conversations(id) ON DELETE SET NULL
├── provider: varchar(64) NOT NULL  -- 'openai', 'anthropic', etc
├── model: varchar(128) NOT NULL
├── prompt_tokens: integer
├── completion_tokens: integer
├── total_tokens: integer
├── estimated_cost_usd: numeric(10,6)
├── request_timestamp: timestamp DEFAULT now()
└── created_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, request_timestamp DESC)
- INDEX ON (provider, model)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
```

---

### notifications

Уведомления для пользователя.

```typescript
Table: notifications
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── type: varchar(64) NOT NULL  -- 'PAYMENT_DUE', 'INCOME_EXPECTED', etc
├── title: varchar(256) NOT NULL
├── message: text NOT NULL
├── related_entity_type: varchar(64)
├── related_entity_id: uuid
├── status: notification_status DEFAULT 'PENDING'
├── scheduled_for: timestamp NOT NULL
├── sent_at: timestamp
├── read_at: timestamp
├── created_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, status)
- INDEX ON (user_id, scheduled_for)
- INDEX ON (status, scheduled_for)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

---

### push_subscriptions

Web Push subscriptions для notifications.

```typescript
Table: push_subscriptions
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── endpoint: text NOT NULL UNIQUE
├── keys_auth: text NOT NULL
├── keys_p256dh: text NOT NULL
├── user_agent: text
├── is_active: boolean DEFAULT true
├── created_at: timestamp DEFAULT now()
└── updated_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX ON (endpoint)
- INDEX ON (user_id, is_active)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

---

### bank_connections

Соединения с банками (future).

```typescript
Table: bank_connections
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── provider_name: varchar(128) NOT NULL
├── bank_name: varchar(256)
├── account_number_masked: varchar(64)
├── connection_config: jsonb  -- credentials, tokens (encrypted)
├── last_sync_at: timestamp
├── is_active: boolean DEFAULT true
├── created_at: timestamp DEFAULT now()
└── updated_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, is_active)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Security:**
- `connection_config` должен быть encrypted at rest;
- Credentials НИКОГДА не экспонируются в API responses.

---

### bank_transactions

Импортированные банковские транзакции (staging).

```typescript
Table: bank_transactions
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── connection_id: uuid REFERENCES bank_connections(id) ON DELETE CASCADE
├── external_id: varchar(256)  -- bank's transaction ID
├── amount_kopecks: integer NOT NULL
├── transaction_date: date NOT NULL
├── description: text
├── category_hint: varchar(128)
├── matched_income_id: uuid REFERENCES income_entries(id) ON DELETE SET NULL
├── matched_expense_id: uuid REFERENCES expense_entries(id) ON DELETE SET NULL
├── import_status: import_status DEFAULT 'PENDING'
├── created_at: timestamp DEFAULT now()
└── updated_at: timestamp DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX ON (connection_id, external_id)  -- deduplication
- INDEX ON (user_id, import_status)
- INDEX ON (user_id, transaction_date DESC)

Constraints:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE
- FOREIGN KEY (matched_income_id) REFERENCES income_entries(id) ON DELETE SET NULL
- FOREIGN KEY (matched_expense_id) REFERENCES expense_entries(id) ON DELETE SET NULL
```

**Notes:**
- UNIQUE constraint на `(connection_id, external_id)` предотвращает duplicates;
- `description` — untrusted data, sanitize перед AI classification.

---

### audit_log

Append-only audit trail.

```typescript
Table: audit_log
├── id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id: uuid NOT NULL
├── action: varchar(128) NOT NULL
├── entity_type: varchar(64) NOT NULL
├── entity_id: uuid NOT NULL
├── previous_state: jsonb
├── new_state: jsonb
├── metadata: jsonb
├── occurred_at: timestamptz DEFAULT now()

Indexes:
- PRIMARY KEY (id)
- INDEX ON (user_id, occurred_at DESC)
- INDEX ON (entity_type, entity_id, occurred_at DESC)
- INDEX ON (action, occurred_at DESC)

Constraints:
- NO FOREIGN KEY to users (audit survives user deletion)
```

**Notes:**
- NO UPDATE, NO DELETE на audit_log — enforced by DB permissions;
- `previous_state` и `new_state` — full JSON snapshots для forensics;
- No FK to users — audit trail MUST survive user deletion;
- Application role should NOT have DELETE privilege on this table;
- Changed to timestamptz.

---

## Indexes strategy

### Foreign keys

Все foreign key columns автоматически получают indexes.

### Composite indexes

Для часто используемых query patterns:

```sql
-- Calendar queries
CREATE INDEX idx_income_user_date 
  ON income_entries(user_id, earned_at::date);

CREATE INDEX idx_expense_user_date 
  ON expense_entries(user_id, spent_at::date);

CREATE INDEX idx_occurrences_user_status_date 
  ON payment_occurrences(user_id, status, due_date);

-- Dashboard queries
CREATE INDEX idx_debts_user_status_priority 
  ON debts(user_id, status, priority DESC);

CREATE INDEX idx_goals_user_status_deadline 
  ON goals(user_id, status, deadline);

-- AI conversation queries
CREATE INDEX idx_messages_conversation_created 
  ON ai_messages(conversation_id, created_at);
```

### Partial indexes

Для частых filtered queries:

```sql
-- Только активные cycles
CREATE UNIQUE INDEX idx_active_cycle_per_user 
  ON planning_cycles(user_id, start_date, end_date) 
  WHERE status = 'ACTIVE';

-- Только активные debts
CREATE INDEX idx_active_debts 
  ON debts(user_id, priority DESC) 
  WHERE status = 'ACTIVE';
```

---

## Constraints summary

### Financial invariants

```sql
-- Money amounts must be positive
ALTER TABLE income_entries 
  ADD CONSTRAINT chk_income_positive 
  CHECK (amount_kopecks > 0);

ALTER TABLE expense_entries 
  ADD CONSTRAINT chk_expense_positive 
  CHECK (amount_kopecks > 0);

-- Debt payment arithmetic correctness
ALTER TABLE debt_payments 
  ADD CONSTRAINT chk_payment_arithmetic 
  CHECK (new_balance_kopecks = previous_balance_kopecks - amount_kopecks);

-- Goal saved amount <= target (optional, может быть exceeded)
ALTER TABLE goals 
  ADD CONSTRAINT chk_goal_saved_valid 
  CHECK (saved_amount_kopecks >= 0);

-- Planning cycle dates
ALTER TABLE planning_cycles 
  ADD CONSTRAINT chk_cycle_dates 
  CHECK (end_date > start_date);
```

### Status-dependent constraints

```sql
-- Received income must have received_at
ALTER TABLE income_entries 
  ADD CONSTRAINT chk_received_date 
  CHECK (
    (status = 'RECEIVED' AND received_at IS NOT NULL) 
    OR 
    (status != 'RECEIVED')
  );

-- Paid occurrence must have paid_at
ALTER TABLE payment_occurrences 
  ADD CONSTRAINT chk_paid_date 
  CHECK (
    (status = 'PAID' AND paid_at IS NOT NULL) 
    OR 
    (status != 'PAID')
  );
```

---

## Migrations workflow

Drizzle Kit:

```bash
# Generate migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Drop database (dev only)
npm run db:drop

# Push schema (dev only, skip migrations)
npm run db:push

# Studio (GUI)
npm run db:studio
```

Migration files:

```
drizzle/
├── 0000_initial_schema.sql
├── 0001_add_goals.sql
├── 0002_add_envelopes.sql
└── meta/
    └── _journal.json
```

---

## Transaction patterns

### Financial mutations

```typescript
await db.transaction(async (tx) => {
  // 1. Mark income as received
  await tx.update(incomeEntries)
    .set({ 
      status: 'RECEIVED', 
      receivedAt: new Date() 
    })
    .where(eq(incomeEntries.id, incomeId));

  // 2. Update account balance
  await tx.update(accounts)
    .set({ 
      balanceKopecks: sql`${accounts.balanceKopecks} + ${amount}` 
    })
    .where(eq(accounts.id, accountId));

  // 3. Create audit log
  await tx.insert(auditLog).values({
    userId,
    action: 'INCOME_RECEIVED',
    entityType: 'INCOME',
    entityId: incomeId,
    newState: { amount, status: 'RECEIVED' },
  });
});
```

### Debt payment

```typescript
await db.transaction(async (tx) => {
  const debt = await tx.query.debts.findFirst({
    where: eq(debts.id, debtId),
  });

  const newBalance = debt.currentBalanceKopecks - paymentAmount;

  // 1. Update debt balance
  await tx.update(debts)
    .set({ 
      currentBalanceKopecks: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(debts.id, debtId));

  // 2. Record payment
  await tx.insert(debtPayments).values({
    debtId,
    userId,
    amountKopecks: paymentAmount,
    previousBalanceKopecks: debt.currentBalanceKopecks,
    newBalanceKopecks: newBalance,
    paidAt: new Date(),
  });

  // 3. Audit trail
  await tx.insert(auditLog).values({
    userId,
    action: 'DEBT_PAYMENT',
    entityType: 'DEBT',
    entityId: debtId,
    previousState: { balance: debt.currentBalanceKopecks },
    newState: { balance: newBalance },
  });
});
```

---

## Query optimization notes

### Calendar month query

```typescript
// Эффективный запрос для календаря
const startDate = startOfMonth(date);
const endDate = endOfMonth(date);

const [income, expenses, occurrences] = await Promise.all([
  db.query.incomeEntries.findMany({
    where: and(
      eq(incomeEntries.userId, userId),
      gte(incomeEntries.earnedAt, startDate),
      lte(incomeEntries.earnedAt, endDate),
    ),
  }),
  db.query.expenseEntries.findMany({
    where: and(
      eq(expenseEntries.userId, userId),
      gte(expenseEntries.spentAt, startDate),
      lte(expenseEntries.spentAt, endDate),
    ),
  }),
  db.query.paymentOccurrences.findMany({
    where: and(
      eq(paymentOccurrences.userId, userId),
      gte(paymentOccurrences.dueDate, startDate),
      lte(paymentOccurrences.dueDate, endDate),
    ),
  }),
]);
```

### Dashboard summary

```typescript
// Используем aggregations для dashboard
const summary = await db
  .select({
    availableBalance: sql<number>`
      COALESCE(SUM(CASE WHEN status = 'RECEIVED' THEN amount_kopecks ELSE 0 END), 0)
    `,
    incomeInTransit: sql<number>`
      COALESCE(SUM(CASE WHEN status IN ('EARNED', 'IN_TRANSIT') THEN amount_kopecks ELSE 0 END), 0)
    `,
  })
  .from(incomeEntries)
  .where(eq(incomeEntries.userId, userId))
  .then(rows => rows[0]);
```

---

## Backup and restore

### Automated backups

```bash
# pg_dump daily backup
pg_dump -U postgres -h localhost finapp > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres -h localhost finapp < backup_YYYYMMDD.sql
```

### Point-in-time recovery

PostgreSQL WAL archiving для production:

```sql
-- Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

---

## Security considerations

1. **Connection strings:** Никогда в git, только environment variables;
2. **Row-level security (RLS):** Опционально для multi-user future;
3. **Encryption at rest:** Для `bank_connections.connection_config`;
4. **No direct exposure:** PostgreSQL доступен только через internal Docker network;
5. **Audit trail:** `audit_log` append-only для forensics;
6. **Prepared statements:** Drizzle автоматически использует parameterized queries.

### Database user permissions

```sql
-- Application user (minimal privileges)
CREATE USER finapp_app WITH PASSWORD '...';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE finapp TO finapp_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO finapp_app;
GRANT DELETE ON ALL TABLES IN SCHEMA public TO finapp_app;

-- CRITICAL: Revoke dangerous permissions on audit_log
REVOKE UPDATE, DELETE ON audit_log FROM finapp_app;
GRANT INSERT, SELECT ON audit_log TO finapp_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO finapp_app;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM finapp_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM finapp_app;

-- Migration user (elevated privileges)
CREATE USER finapp_admin WITH PASSWORD '...';
GRANT ALL PRIVILEGES ON DATABASE finapp TO finapp_admin;
```

**CRITICAL:** Application role НЕ ДОЛЖЕН иметь UPDATE/DELETE на `audit_log`.

---

## Schema evolution checklist

При добавлении новой таблицы:

1. ✅ Добавить `user_id` (если user-owned entity);
2. ✅ Добавить timestamps (`created_at`, `updated_at`);
3. ✅ Определить foreign keys с ON DELETE behaviour;
4. ✅ Создать indexes на foreign keys;
5. ✅ Добавить CHECK constraints для business rules;
6. ✅ Определить UNIQUE constraints где нужна deduplication;
7. ✅ Написать migration;
8. ✅ Обновить Drizzle schema;
9. ✅ Написать repository methods;
10. ✅ Написать integration tests.

---

## Performance targets

- Dashboard query < 100ms;
- Calendar month query < 200ms;
- Background job occurrence generation < 10s для 100 obligations;
- AI snapshot build < 50ms;
- Transaction commit < 50ms;
- Index rebuild < 1s для tables до 100K rows.

V1 не оптимизируется для миллионы записей, но schema должна scale разумно.
