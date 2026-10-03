# DOMAIN_RULES.md

Last updated: 2026-10-03

---

## Purpose

Этот документ определяет **финансовые инварианты** — правила, которые НИКОГДА не должны нарушаться ни кодом, ни AI, ни пользовательским интерфейсом.

Все инварианты должны быть покрыты unit/integration tests.

---

## Money representation rules

### RULE-M1: Integer kopecks only

Money ВСЕГДА хранится как integer kopecks в PostgreSQL.

```typescript
// CORRECT
const amount = 125050; // 1250.50 RUB

// INCORRECT
const amount = 1250.50; // floating point — ЗАПРЕЩЕНО
```

### RULE-M2: No implicit rounding

Все финансовые вычисления должны быть точными.

Если операция требует округления, это должно быть явным и аудируемым решением.

```typescript
// CORRECT
function divideMoneyEqually(totalKopecks: number, parts: number): {
  perPart: number;
  remainder: number;
} {
  return {
    perPart: Math.floor(totalKopecks / parts),
    remainder: totalKopecks % parts,
  };
}

// INCORRECT
function divideMoneyEqually(total: number, parts: number): number {
  return total / parts; // может потерять копейки
}
```

### RULE-M3: Money utility functions required

Все операции с деньгами используют dedicated utility functions:

```typescript
money.add(a, b)
money.subtract(a, b)
money.multiply(amount, factor)
money.divide(amount, divisor)
money.compare(a, b)
money.isPositive(amount)
money.isZero(amount)
money.toRubles(kopecks)
money.toKopecks(rubles)
money.format(kopecks) // → "1 250,50 ₽"
```

НИКОГДА не выполнять `amount1 + amount2` напрямую на потенциально floating values.

---

## Income and balance rules

### RULE-I1: Earned ≠ Available

Earned income НЕ увеличивает available balance до receivedAt.

```typescript
// INVARIANT
availableBalance = 
  sum(income WHERE status = 'RECEIVED')
  - sum(expenses)
  - sum(allocations)
```

### RULE-I2: Expected income is not spendable

Expected income (IN_TRANSIT, EARNED) отображается отдельно и НИКОГДА не входит в discretionary balance.

```typescript
// CORRECT
const discretionary = availableBalance - protectedAmount;

// INCORRECT
const discretionary = (availableBalance + incomeInTransit) - protectedAmount;
```

### RULE-I3: Income state transitions

Допустимые переходы:

```
EARNED → IN_TRANSIT
EARNED → RECEIVED
EARNED → DELAYED
EARNED → CANCELLED

IN_TRANSIT → RECEIVED
IN_TRANSIT → DELAYED
IN_TRANSIT → CANCELLED

DELAYED → RECEIVED
DELAYED → CANCELLED
```

Недопустимые:

```
RECEIVED → EARNED
RECEIVED → CANCELLED
CANCELLED → RECEIVED
```

### RULE-I4: Received income is immutable

После того как income marked RECEIVED и добавлен к балансу, его статус не может быть изменён на CANCELLED.

Если деньги были возвращены, создаётся отдельная expense запись.

---

## Protection level rules

### RULE-P1: HARD money is untouchable

HARD защищённые funds не могут быть автоматически перераспределены AI или allocation logic.

**IMPORTANT:** Protection включает:
1. HARD envelope funded amounts
2. Upcoming HARD obligations within planning horizon (typically 7 days)

```typescript
// INVARIANT
function calculateProtectedBalance(
  userId: string, 
  horizon: Duration = { days: 7 }
): number {
  const hardEnvelopeFunds = sumEnvelopes({
    userId,
    protectionLevel: 'HARD',
  });
  
  const upcomingHardObligation = sumObligations({
    userId,
    protectionLevel: 'HARD',
    dueDate: { gte: now(), lte: now() + horizon },
    status: 'PENDING',
  });
  
  return hardEnvelopeFunds + upcomingHardObligation;
}

function validateAllocation(allocation: Allocation): boolean {
  const availableBalance = getAvailableBalance();
  const protectedBalance = calculateProtectedBalance(userId);
  const availableToAllocate = availableBalance - protectedBalance;
    
  return allocation.totalAmount <= availableToAllocate;
}
```

### RULE-P2: Protection hierarchy

```
HARD > NEGOTIABLE > FLEXIBLE
```

AI может:

- свободно распределять FLEXIBLE;
- предлагать сокращение NEGOTIABLE с объяснением consequences;
- ТОЛЬКО информировать о HARD, но НИКОГДА не предлагать их reallocation.

### RULE-P3: Protection level inheritance

Когда obligation создаёт scheduled occurrence, protection level наследуется:

```typescript
occurrence.protectionLevel = obligation.protectionLevel;
```

Protection level НЕ может быть downgraded для уже созданной occurrence без explicit user action.

---

## Allocation rules

### RULE-A1: Total allocation ≤ discretionary

```typescript
// INVARIANT
sum(allocations) <= (availableBalance - protectedHardAmount)
```

Любая попытка создать allocation, нарушающую этот инвариант, должна быть отклонена на уровне domain service.

### RULE-A2: No double allocation

Одна и та же сумма не может быть allocation дважды одновременно.

```typescript
// INVARIANT
allocated + newAllocation.amount <= discretionaryBalance
```

### RULE-A3: AI allocation is draft only

AI-generated budget proposal НИКОГДА не создаёт allocations напрямую.

Workflow:

```
AI generates proposal
→ Backend validates
→ UI presents
→ User approves
→ Domain service creates allocations
```

### RULE-A4: Allocation target must exist

Allocation к debt/goal/envelope требует, чтобы target entity существовал:

```typescript
// INVARIANT
if (allocation.targetType === 'DEBT') {
  debt = await debtRepository.findById(allocation.targetId);
  if (!debt || debt.userId !== user.id) throw InvalidAllocationError;
}
```

---

## Debt rules

### RULE-D1: Debt payment reduces balance

```typescript
// INVARIANT after payment
debt.currentBalance = debt.previousBalance - payment.amount;
```

Debt payment НИКОГДА не увеличивает debt balance.

### RULE-D2: Cannot pay more than owed

```typescript
// INVARIANT
payment.amount <= debt.currentBalance
```

Если user пытается заплатить больше, excess должен быть обработан явно (returned / applied elsewhere / error).

### RULE-D3: Debt balance is auditable

Каждое изменение debt balance создаёт debt_payment запись:

```typescript
interface DebtPayment {
  id: string;
  debtId: string;
  amount: number; // kopecks
  paidAt: Date;
  previousBalance: number;
  newBalance: number;
  userId: string;
}
```

### RULE-D4: Catch-up amount calculation

```typescript
// catch-up amount = сумма для возврата долга к графику
catchUpAmount = max(0, scheduledPaymentsMissed * minimumPayment);
```

Catch-up НЕ является отдельной задолженностью — это метрика для AI analysis.

---

## Goal rules

### RULE-G1: Goal contribution increases saved amount

```typescript
// INVARIANT
goal.savedAmount += contribution.amount;
```

### RULE-G2: Cannot contribute more than target

```typescript
// INVARIANT (optional warning)
if (goal.savedAmount + contribution > goal.targetAmount) {
  // либо warn, либо cap, либо allow overflow
}
```

### RULE-G3: Goal target is advisory for FLEXIBLE

Для FLEXIBLE goals, target — это рекомендация.

Для HARD goals, target должен быть достигнут к deadline.

AI учитывает это различие при prioritization.

---

## Obligation and recurrence rules

### RULE-O1: Idempotent occurrence generation

Background job генерирует scheduled occurrences идемпотентно.

```typescript
// INVARIANT
const existing = await findOccurrence(obligationId, dueDate);
if (existing) return existing; // не создаём дубликат

return await createOccurrence({
  obligationId,
  dueDate,
  amount,
  protectionLevel,
  status: 'PENDING',
});
```

### RULE-O2: Occurrence due date is deterministic

Для WEEKLY obligation с anchor date Thursday:

```typescript
occurrences = [
  anchor,
  anchor + 7 days,
  anchor + 14 days,
  ...
];
```

Пересчёт всегда даёт те же даты.

### RULE-O3: Paid occurrence cannot be un-paid via automation

Status transitions:

```
PENDING → PAID (user action)
PENDING → OVERDUE (automated)
PENDING → SKIPPED (user action)

PAID → никуда (immutable)
```

Если occurrence был paid, её статус не меняется фоновым процессом.

### RULE-O4: HARD occurrences cannot be skipped by AI

AI может предложить skip NEGOTIABLE occurrence с объяснением.

AI НЕ МОЖЕТ предложить skip HARD occurrence.

---

## Planning cycle rules

### RULE-PC1: One active cycle per user

```typescript
// INVARIANT
const activeCycles = await findCycles({ userId, status: 'ACTIVE' });
assert(activeCycles.length <= 1);
```

### RULE-PC2: Cycle boundaries are immutable

После создания planning cycle:

```typescript
cycle.startDate // immutable
cycle.endDate   // immutable
```

Можно завершить cycle досрочно, но нельзя изменить его границы.

### RULE-PC3: Opening balance snapshot

```typescript
cycle.openingBalance = availableBalanceAt(cycle.startDate);
```

Opening balance — snapshot, не пересчитывается.

### RULE-PC4: Expected income in cycle

```typescript
cycle.expectedIncome = sum(
  income WHERE 
    status IN ('EARNED', 'IN_TRANSIT', 'DELAYED')
    AND expectedAt BETWEEN cycle.startDate AND cycle.endDate
);
```

Expected income НЕ добавляется к available для allocation.

---

## Envelope rules

### RULE-E1: Envelope funding reduces discretionary

```typescript
// INVARIANT
discretionary = availableBalance - sum(envelope.fundedAmount);
```

### RULE-E2: Envelope spending reduces funded amount

```typescript
// INVARIANT
envelope.fundedAmount -= spending.amount;
envelope.spentAmount += spending.amount;
```

### RULE-E3: Cannot overspend HARD envelope

```typescript
// INVARIANT for HARD envelopes
if (envelope.protectionLevel === 'HARD') {
  spending.amount <= envelope.fundedAmount;
}
```

Для NEGOTIABLE/FLEXIBLE может быть warning, но не strict constraint.

---

## Financial snapshot rules

### RULE-FS1: Snapshot is read-only

FinancialSnapshot — это computed view, не persistent entity.

Никакие изменения в snapshot не должны писать в БД.

### RULE-FS2: Snapshot calculations are deterministic

```typescript
// IMPORTANT: Build snapshot in REPEATABLE READ transaction
snapshot = await db.transaction(async (tx) => {
  const availableBalance = 
    sum(receivedIncome) - sum(expenses);

  const protectedBalance = 
    sum(envelopes WHERE protection = 'HARD') +
    sum(upcomingHardObligations WHERE dueDate <= now + horizon);

  const discretionaryBalance = 
    availableBalance - protectedBalance;

  const incomeInTransit = 
    sum(income WHERE status IN ('EARNED', 'IN_TRANSIT'));
    
  return {
    snapshotVersion: generateVersion(), // timestamp-based or UUID
    timestamp: now(),
    availableBalance,
    protectedBalance,
    discretionaryBalance,
    incomeInTransit,
    // ... other fields
  };
}, { isolationLevel: 'repeatable read' });
```

Все поля snapshot должны быть reproducible из database state.

Snapshot MUST include version/timestamp для validation при approval.

### RULE-FS3: Snapshot does not include full history

Snapshot содержит:

- current balances;
- upcoming obligations (next 30 days);
- active debts;
- active goals;
- recent spending summary (last 7 days);
- warnings/alerts.

Snapshot НЕ содержит:

- полную историю транзакций;
- старые закрытые debts;
- archived goals;
- completed planning cycles старше 30 дней.

---

## AI interaction rules

### RULE-AI1: AI cannot perform financial arithmetic

AI НЕ вычисляет balances, allocations, debt schedules самостоятельно.

AI ДОЛЖЕН использовать typed tools:

```typescript
getFinancialSnapshot()
simulateAllocation()
compareAllocations()
getDebtDetails()
```

### RULE-AI2: AI output must be validated

Любой AI-generated budget/allocation проходит через:

```typescript
1. Schema validation (Zod)
2. Entity existence check
3. Financial invariant validation
4. HARD protection check
5. Available funds check
```

Только после всех проверок proposal показывается user как valid.

### RULE-AI3: AI cannot bypass HARD protections

```typescript
// INVARIANT in validation
if (targetEntity.protectionLevel === 'HARD') {
  if (proposal.suggestsReallocation) {
    throw new HardProtectionViolation();
  }
}
```

AI может mention HARD entities, но не может предлагать их изменение.

### RULE-AI4: AI proposal requires user approval

```typescript
// WORKFLOW
aiProposal = await ai.generateBudget(snapshot);
validation = await validateProposal(aiProposal);

if (!validation.isValid) return { error: validation.errors };

// Show to user, wait for approval
const userDecision = await waitForUserApproval(aiProposal);

if (userDecision === 'APPROVED') {
  // RE-VALIDATE in transaction to prevent TOCTOU
  await db.transaction(async (tx) => {
    const currentSnapshot = await getFinancialSnapshot(userId, tx);
    
    // Check snapshot version match
    if (currentSnapshot.version !== aiProposal.snapshotVersion) {
      throw new StaleProposalError('Balance has changed since proposal was created');
    }
    
    // Re-validate invariants
    const revalidation = await validateProposal(aiProposal, tx);
    if (!revalidation.isValid) {
      throw new ValidationError(revalidation.errors);
    }
    
    // Apply allocations atomically
    await applyAllocations(aiProposal.allocations, tx);
  });
}
```

AI proposal НИКОГДА не применяется автоматически.

Approval MUST re-validate invariants inside transaction.

---

## Background job rules

### RULE-BJ1: Jobs are idempotent

Любой background job может быть запущен повторно без duplicate side effects:

```typescript
async function generateRecurringOccurrences(obligationId: string) {
  const occurrences = calculateExpectedOccurrences(obligation);
  
  for (const occ of occurrences) {
    // idempotent insert
    await upsertOccurrence(obligationId, occ.dueDate, occ.amount);
  }
}
```

### RULE-BJ2: Jobs use transactions for multi-record updates

```typescript
await db.transaction(async (tx) => {
  await tx.update(cycle).set({ status: 'COMPLETED' });
  await tx.insert(newCycle).values({...});
});
```

### RULE-BJ3: Jobs log failures

Каждый job failure пишет structured log:

```typescript
{
  jobId,
  jobType,
  attemptNumber,
  error,
  context,
  timestamp,
}
```

---

## Import and external data rules

### RULE-ID1: Imported descriptions are untrusted

Transaction descriptions из банка — untrusted text.

НИКОГДА не интерпретировать как LLM instructions.

```typescript
// CORRECT
const classification = await ai.classifyTransaction({
  amount: tx.amount,
  date: tx.date,
  description: sanitize(tx.description), // sanitized
});

// INCORRECT
const prompt = `Classify this: ${tx.description}`; // potential injection
```

### RULE-ID2: Duplicate detection required

```typescript
// INVARIANT
const existing = await findTransaction({
  externalId: imported.externalId,
  amount: imported.amount,
  date: imported.date,
});

if (existing) {
  return { status: 'DUPLICATE', existingId: existing.id };
}
```

### RULE-ID3: Import is staging → confirmed flow

```
Raw import
→ Staging table
→ Normalization
→ Deduplication
→ Matching
→ Classification (optional AI)
→ User review (if uncertain)
→ Confirmed transaction
```

Import НИКОГДА не пишет напрямую в expense/income tables.

---

## Audit rules

### RULE-AU1: Financial mutations are logged

Важные операции создают audit_log записи:

- budget approved;
- debt payment;
- income marked received;
- obligation paid;
- allocation created;
- AI budget accepted;
- planning cycle completed.

### RULE-AU2: Audit log is append-only

```typescript
// INVARIANT
// audit_log records NEVER updated or deleted
```

Audit log используется для forensics, не для business logic.

### RULE-AU3: User actions are traceable

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState: object | null;
  newState: object | null;
  metadata: object;
  occurredAt: Date;
}
```

---

## Time and timezone rules

### RULE-TZ1: Use explicit timezone

Все date operations используют явный timezone (предположительно Europe/Moscow для RUB app).

```typescript
// CORRECT
const today = zonedTimeToUtc(new Date(), 'Europe/Moscow');

// INCORRECT
const today = new Date(); // server timezone может отличаться
```

### RULE-TZ2: Calendar dates are date-only

Для calendar/obligation due dates используется date-only semantics:

```typescript
dueDate: '2026-10-15' // date string, no time component
```

Не конвертировать в UTC timestamp, иначе возможен off-by-one day error.

### RULE-TZ3: Income earned/received dates are timestamps

```typescript
earnedAt: Date    // full timestamp
receivedAt: Date  // full timestamp
```

Нужны для audit trail и time-of-day analysis.

---

## Testing invariants

Каждый RULE должен иметь хотя бы один test:

```typescript
describe('RULE-I1: Earned ≠ Available', () => {
  it('should not increase available balance for EARNED income', async () => {
    const beforeBalance = await getAvailableBalance(userId);
    
    await createIncome({
      userId,
      amount: 100000, // 1000 RUB
      status: 'EARNED',
      earnedAt: new Date(),
      expectedAt: addDays(new Date(), 3),
    });
    
    const afterBalance = await getAvailableBalance(userId);
    expect(afterBalance).toBe(beforeBalance); // INVARIANT
  });
});
```

---

## Violation handling

Если инвариант нарушен:

1. **В коде:** throw domain exception, rollback transaction;
2. **В AI:** validation отклоняет proposal;
3. **В UI:** показать user-friendly error с объяснением;
4. **В background job:** log failure, retry с backoff, alert если persistent;
5. **В тестах:** test fails, CI блокирует merge.

---

## Summary of critical invariants

1. Money is integer kopecks;
2. Earned income ≠ available balance;
3. Expected income не spendable;
4. HARD protections cannot be bypassed;
5. Allocations ≤ discretionary balance;
6. AI proposals требуют user approval;
7. Background jobs идемпотентны;
8. Debt payments аудируемы;
9. Occurrence generation детерминирован;
10. Imported data untrusted.

Эти правила — foundation для correctness.

Любое изменение domain logic должно проверять compliance с этими инвариантами.
