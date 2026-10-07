# Codex Agent Optimization Guide

Last updated: 2026-10-04

---

## Текущее состояние

**Ваш агент:** Primary implementation agent (вероятно Sonnet/Opus через Codex CLI)

**Текущие настройки:**
```json
{
  "model": "opus",
  "effortLevel": "medium",
  "defaultMode": "auto",
  "enabledPlugins": { "ponytail@ponytail": true }
}
```

**Установленные skills:**
- ✅ ponytail (активирован)
- ✅ planning-with-files (доступен)
- ✅ context7-mcp (доступен)
- ✅ code-review (доступен)
- ✅ simplify (доступен)

**Project agents:**
- ✅ financial-auditor (Opus, специализирован на финансовых инвариантах)

---

## Проблема: Экономия токенов при сохранении результата

### Текущие расходы токенов

**Ваша сессия (сейчас):**
- Использовано: ~124K / 200K tokens
- Осталось: ~76K tokens
- Основной расход: чтение документации, архитектурное проектирование

**Типичные расходы в AUTOPILOT workflow:**
- Чтение specs: 20-40K tokens/milestone
- Реализация: 15-30K tokens/milestone
- Тесты: 10-20K tokens/milestone
- Review loops: 20-50K tokens/milestone
- **Total per milestone: 65-140K tokens**

### Проблема с текущим подходом

❌ **Medium effort + Opus = дорого:**
- Opus: $15/1M input, $75/1M output
- Medium effort = подробное reasoning
- Каждый milestone = ~100K tokens = $1.50-$7.50

❌ **Auto mode без ограничений:**
- Нет жёсткого control над tool calls
- Может читать файлы многократно
- Может запускать избыточные тесты

❌ **Нет специализированных skills для экономии:**
- Нет skill для "minimal implementation"
- Нет skill для "test only essentials"
- Нет skill для "reuse existing patterns"

---

## Решение: Комбинированный подход

### 1. Правильное использование Ponytail

**Что делает Ponytail:**
- ✅ Минимизирует код (YAGNI)
- ✅ Переиспользует существующее
- ✅ Избегает over-engineering
- ✅ Stdlib/native first

**Как применить к реализации M20:**

```bash
# В начале milestone M20 скажите:
"Используй ponytail full mode для всей реализации M20.
Читай только необходимые файлы.
Переиспользуй encryption pattern из SECURITY.md без изменений.
Копируй структуру openaiProvider.ts для customOpenAIProvider.ts.
Тесты: только 4 essential (encryption, ownership, SSRF, integration)."
```

**Ponytail сократит:**
- ❌ Избыточные абстракции
- ❌ Defensive code "на будущее"
- ❌ Дублирование существующих patterns
- ❌ Большие test suites

**Результат:**
- 470 LOC вместо 1500+
- 4 теста вместо 15+
- Меньше file reads
- Меньше reasoning tokens

---

### 2. Используйте planning-with-files для больших tasks

**Когда использовать:**
```bash
# Для сложных milestones (M12, M15, M17, M20):
/planning-with-files
```

**Что это даёт:**
- Persistent task_plan.md на диске
- Persistent findings.md
- Persistent progress.md
- Меньше re-reading в контексте
- Recovery без full context reload

**Применение к M20:**
```bash
# Start milestone
/planning-with-files "Implement M20: AI provider configuration per AGENTS.md"

# Agent создаст:
.planning/2026-10-04-m20-ai-provider/
├── task_plan.md      # 8 steps из Quick Start
├── findings.md       # Issues по ходу
└── progress.md       # Что сделано
```

**Token savings:**
- Plan живёт на диске, не в context
- Progress не дублируется в conversation
- Findings не теряются между turns

---

### 3. Context7 только когда необходимо

**Когда НЕ использовать Context7:**
- ❌ Drizzle ORM — уже используется в проекте, есть примеры
- ❌ Next.js App Router — есть existing routes
- ❌ React hooks — стандартные patterns
- ❌ TypeScript — знакомая syntax

**Когда использовать Context7:**
- ✅ OpenAI Responses API — специфический endpoint
- ✅ Web Push API — если не знаете VAPID format
- ✅ pg-boss — если нужны advanced job patterns

**Для M20:**
```bash
# НЕ НУЖНО:
/context7 "Drizzle migrations"
/context7 "Next.js API routes"

# МОЖЕТ БЫТЬ НУЖНО:
/context7 "OpenAI Responses API structured output format"
# Но только если забыли формат из openaiProvider.ts
```

**Token savings:**
- Context7 = 5-15K tokens per query
- Переиспользуйте existing code = 0 tokens

---

### 4. Правильный model selection

**Текущая конфигурация: Opus**

**Рекомендация для экономии:**

```json
{
  "model": "sonnet",           // Вместо opus для большинства tasks
  "effortLevel": "low",        // Вместо medium для простых tasks
}
```

**Когда использовать Opus:**
- ✅ Architectural decisions (M0, major design)
- ✅ Financial audits (financial-auditor agent уже на Opus)
- ✅ Security reviews (M21)
- ✅ Debugging сложных race conditions

**Когда достаточно Sonnet:**
- ✅ Implementation по чёткой spec (M20 с AGENTS.md)
- ✅ Copy-paste existing patterns
- ✅ CRUD API endpoints
- ✅ Schema migrations
- ✅ Unit tests

**Cost comparison:**
| Model  | Input    | Output   | M20 estimate |
|--------|----------|----------|--------------|
| Opus   | $15/1M   | $75/1M   | ~$5-10       |
| Sonnet | $3/1M    | $15/1M   | ~$1-2        |

**Для M20: Sonnet достаточно**
- Spec готов в AGENTS.md
- Patterns известны (encryption, adapter)
- Implementation straightforward

---

### 5. Используйте code-review вместо manual review

**Вместо:**
```bash
# Прочитать все файлы вручную
# Проверить каждый файл отдельно
# Написать список findings
```

**Используйте:**
```bash
# После реализации M20:
/code-review --max-findings 5

# Agent автоматически:
# - Читает diff
# - Проверяет correctness
# - Находит simplification opportunities
# - Возвращает top 5 findings
```

**Token savings:**
- Специализированный workflow
- Фокусируется на diff, не на всём коде
- Возвращает structured output

---

### 6. Playwright только для critical flows

**Текущий подход (TASKS.md):**
- E2E test для каждого milestone

**Оптимизация:**
```bash
# M20: только один E2E test
test('configure and test AI provider', async ({ page }) => {
  await page.goto('/settings/ai-provider');
  await page.fill('input[type="url"]', 'https://api.example.com');
  await page.fill('input[type="password"]', 'test-key');
  await page.click('button:has-text("Test")');
  await expect(page.locator('text=Connected')).toBeVisible();
});
```

**НЕ добавлять:**
- ❌ E2E для каждого validation error
- ❌ E2E для UI edge cases
- ❌ E2E для mobile viewport variations

**Unit tests покрывают validation:**
```typescript
// Дешевле чем Playwright:
it('rejects private URLs', () => {
  expect(() => validateBaseUrl('https://localhost')).toThrow();
});
```

---

## Практическая стратегия для M20

### Phase 1: Planning (5K tokens)

```bash
# Start with plan file
/planning-with-files "M20: AI provider config per AGENTS.md and Quick Start"

# Ponytail от начала
"Use ponytail full mode. Follow AGENTS.md spec exactly.
Reuse encryption from SECURITY.md, adapter pattern from bankProvider.ts.
4 essential tests only."
```

### Phase 2: Implementation (30K tokens)

```bash
# Пошагово по Quick Start guide
# Агент читает:
1. AGENTS.md (уже прочитан вами)
2. Quick Start guide (создан вами)
3. openaiProvider.ts (copy pattern)
4. SECURITY.md encryption section (copy pattern)

# Агент НЕ читает:
❌ Весь AI_POLICY.md снова
❌ Весь ARCHITECTURE.md снова
❌ Context7 docs для известных APIs
```

### Phase 3: Tests (15K tokens)

```bash
# 4 essential tests из Quick Start:
1. Encryption test
2. Ownership test
3. SSRF test
4. Integration test (mocked fetch)

# 1 E2E test:
Configure → Test → Success

# Всё.
```

### Phase 4: Review (10K tokens)

```bash
# После реализации:
/code-review --max-findings 3

# Фиксы
# Commit
```

**Total estimate: ~60K tokens вместо 100-140K**

**Savings: 40-80K tokens (~40-60%)**

---

## Checklist для каждого milestone

### Перед началом

- [ ] Прочитать spec один раз (TASKS.md section)
- [ ] Если сложный — `/planning-with-files`
- [ ] Активировать `ponytail full`
- [ ] Определить какие patterns переиспользуются

### Во время реализации

- [ ] Copy existing patterns вместо Context7
- [ ] Read файл один раз, не перечитывать
- [ ] Minimal test coverage (essential only)
- [ ] Один E2E test (happy path)

### После реализации

- [ ] `/code-review --max-findings 5`
- [ ] Fix top findings
- [ ] `npm run typecheck && npm run lint && npm test`
- [ ] Git commit
- [ ] Update CURRENT_STATE.md (brief)

---

## Специальные skills для token optimization

### Уже установленные

✅ **ponytail** — минимизация кода
```bash
# Используй для КАЖДОЙ реализации
"Use ponytail full mode"
```

✅ **planning-with-files** — persistent planning
```bash
# Используй для milestones 5+ steps
/planning-with-files "Task description"
```

✅ **code-review** — focused review
```bash
# Используй после реализации
/code-review --max-findings 5
```

✅ **simplify** — refactoring without bugs
```bash
# Используй если код вышел сложным
/simplify
```

### Рекомендуется добавить

❌ **Нет специального "minimal-tests" skill**

**Workaround:** В prompt явно указывать
```bash
"Tests: only 4 essential per Quick Start guide.
No edge case tests, no exhaustive coverage.
Essential = encryption, ownership, SSRF, integration."
```

---

## Конфигурация для максимальной экономии

### Глобальная конфигурация (~/.claude/settings.json)

```json
{
  "model": "sonnet",              // Sonnet по умолчанию
  "effortLevel": "low",           // Low для простых tasks
  "permissions": {
    "defaultMode": "auto"         // Оставить auto
  },
  "enabledPlugins": {
    "ponytail@ponytail": true     // ✅ Уже включён
  }
}
```

### Project конфигурация (.claude/settings.local.json)

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run typecheck)",
      "Bash(npm run lint)",
      "Bash(npm test)",
      "Bash(npx drizzle-kit push)",
      "Read(/path/to/project/AGENTS.md)",
      "Read(/path/to/project/.planning/M20_AI_PROVIDER_QUICKSTART.md)"
    ]
  }
}
```

**Эффект:**
- Частые команды pre-approved
- Меньше permission prompts
- Быстрее execution

---

## Estimate: M20 с оптимизацией

### Без оптимизации (baseline)

| Phase          | Tokens | Cost (Opus) |
|----------------|--------|-------------|
| Reading docs   | 40K    | $0.60       |
| Planning       | 10K    | $0.15       |
| Implementation | 40K    | $0.60       |
| Tests          | 30K    | $0.45       |
| Review loops   | 20K    | $0.30       |
| **Total**      | 140K   | **$2.10**   |

### С оптимизацией (recommended)

| Phase                  | Tokens | Cost (Sonnet) |
|------------------------|--------|---------------|
| Reading (minimal)      | 10K    | $0.03         |
| Planning (persistent)  | 5K     | $0.015        |
| Implementation (copy)  | 30K    | $0.09         |
| Tests (essential)      | 15K    | $0.045        |
| Review (focused)       | 10K    | $0.03         |
| **Total**              | 70K    | **$0.21**     |

**Savings: 50% tokens, 90% cost**

---

## TL;DR: Что делать прямо сейчас

### 1. Переключиться на Sonnet для implementation

```bash
# В ~/.claude/settings.json:
"model": "sonnet"
```

### 2. Активировать ponytail для M20

```bash
# В начале M20:
"Use ponytail full mode for entire M20 implementation.
Follow AGENTS.md and Quick Start guide exactly.
Reuse existing patterns. 4 essential tests only."
```

### 3. Использовать planning-with-files

```bash
/planning-with-files "M20: AI provider configuration per AGENTS.md"
```

### 4. Не использовать Context7 для известного

```bash
# НЕ нужно:
/context7 "Drizzle"
/context7 "Next.js"

# Нужно только если забыли API format:
/context7 "OpenAI Responses API"
```

### 5. Code review вместо manual

```bash
# После implementation:
/code-review --max-findings 5
```

---

## Ожидаемый результат

✅ **M20 реализация: ~70K tokens вместо 140K**

✅ **Cost: ~$0.21 вместо $2.10 (Sonnet vs Opus)**

✅ **Время: ~2-3 часа вместо 5-6 часов**

✅ **Качество: сохранено**
- Те же financial invariants
- Те же security checks
- Те же acceptance criteria
- Просто меньше over-engineering

---

## Мониторинг

После M20 проверьте:

```bash
# Token usage в конце сессии
# Сравните с этим estimate

# Если вышло больше 70K:
# - Проверьте что ponytail был активен
# - Проверьте что не было лишних Context7 calls
# - Проверьте что не было duplicate file reads
```

---

## Следующие шаги

1. ✅ Установите Sonnet как default model
2. ✅ Начните M20 с `/planning-with-files`
3. ✅ Активируйте `ponytail full`
4. ✅ Следуйте Quick Start guide
5. ✅ 4 essential tests только
6. ✅ `/code-review` после implementation

**Результат: экономия 40-60% tokens при сохранении качества.**
