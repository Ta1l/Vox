# AI_POLICY.md

Last updated: 2026-10-03

---

## Core principle

**AI is NOT the source of financial truth.**

PostgreSQL + deterministic Financial Engine = source of truth.

AI анализирует, объясняет, приоритизирует, рекомендует.

AI НЕ выполняет финансовую арифметику и НЕ обходит защищённые обязательства.

---

## AI responsibilities

### What AI CAN do

1. **Analyze financial snapshot:**
   - Interpret current available balance vs protected reserves;
   - Identify upcoming obligations and deadlines;
   - Detect financial warnings (insufficient funds, overdue debts);
   - Compare current state to user's stated goals.

2. **Explain consequences:**
   - "If you spend X today, you'll have Y left for mandatory payment Z";
   - "Skipping this NEGOTIABLE payment means [consequence]";
   - "This goal's deadline is at risk because [reason]".

3. **Prioritize and recommend:**
   - "Pay debt A before debt B because [rationale]";
   - "Allocate X to goal Y to meet deadline";
   - "Reduce NEGOTIABLE expense Z to free up funds".

4. **Generate budget proposals:**
   - Structured allocation plans for planning cycle;
   - Multiple alternative scenarios;
   - Explanations for each allocation decision.

5. **Answer financial questions:**
   - "Can I afford X today?" → analyze discretionary balance;
   - "When should I pay this?" → analyze due dates and priorities;
   - "Which goal should I fund?" → compare deadlines and importance.

6. **Discuss tradeoffs:**
   - "Funding goal A means delaying goal B";
   - "Partial debt payment vs full minimum payment";
   - "Immediate expense vs future obligation".

7. **Classify imported transactions:**
   - Suggest expense categories based on description;
   - Match imported transactions to existing records;
   - Detect anomalies in spending patterns.

### What AI CANNOT do

1. **Execute financial arithmetic:**
   - ❌ Calculate available balance;
   - ❌ Compute debt payment schedules;
   - ❌ Determine allocation totals;
   - ❌ Validate that allocations sum correctly.
   
   ✅ AI MUST call deterministic tools for all calculations.

2. **Bypass HARD protections:**
   - ❌ Reallocate HARD envelope funds;
   - ❌ Suggest skipping HARD obligations;
   - ❌ Spend money protected by HARD rules.
   
   ✅ AI can only inform about HARD constraints, not modify them.

3. **Spend expected income:**
   - ❌ Treat IN_TRANSIT income as available balance;
   - ❌ Create allocations based on future income;
   - ❌ Assume expected payment will arrive on time.
   
   ✅ AI shows expected income separately as context.

4. **Apply allocations directly:**
   - ❌ Write to database;
   - ❌ Create allocations without user approval;
   - ❌ Modify financial records.
   
   ✅ AI generates proposals; user approval triggers deterministic application.

5. **Access database directly:**
   - ❌ Execute SQL queries;
   - ❌ Read raw transaction history;
   - ❌ Modify any table.
   
   ✅ AI uses typed application tools only.

6. **Override user decisions:**
   - ❌ Force a budget plan;
   - ❌ Automatically reallocate rejected proposals;
   - ❌ Change user-defined priorities without permission.

---

## AI architecture

### Provider abstraction

```typescript
interface AIProvider {
  generateAdvice(
    snapshot: FinancialSnapshot,
    conversation: ConversationContext,
    userMessage: string
  ): Promise<AIResponse>;

  generateBudgetPlan(
    snapshot: FinancialSnapshot,
    cycle: PlanningCycle,
    instructions: string
  ): Promise<BudgetProposal>;

  classifyTransaction(
    transaction: BankTransaction
  ): Promise<TransactionClassification>;

  summarizeConversation(
    messages: AIMessage[]
  ): Promise<ConversationSummary>;
}
```

Initial implementation: **OpenAI GPT-4o** или **Anthropic Claude Sonnet 3.5**.

Provider может быть заменён без изменения domain logic.

---

## FinancialSnapshot structure

Compact, purpose-built context для AI.

```typescript
interface FinancialSnapshot {
  timestamp: Date;
  userId: string;
  
  // Current balances
  availableBalanceKopecks: number;
  protectedBalanceKopecks: number;
  discretionaryBalanceKopecks: number;
  
  // Expected income
  incomeInTransitKopecks: number;
  nextExpectedIncome: {
    amountKopecks: number;
    expectedAt: string; // ISO date
    source: string;
  } | null;
  
  // Current planning cycle
  currentCycle: {
    id: string;
    startDate: string;
    endDate: string;
    openingBalanceKopecks: number;
    expectedIncomeKopecks: number;
    allocatedKopecks: number;
    remainingKopecks: number;
  } | null;
  
  // Obligations
  upcomingObligations: {
    hard: ObligationSummary[];
    negotiable: ObligationSummary[];
    flexible: ObligationSummary[];
  };
  
  // Debts
  activeDebts: DebtSummary[];
  totalDebtBalanceKopecks: number;
  overdueDebtsCount: number;
  
  // Goals
  activeGoals: GoalSummary[];
  goalsAtRiskCount: number;
  
  // Protected envelopes
  protectedEnvelopes: EnvelopeSummary[];
  
  // Recent spending (last 7 days)
  recentSpending: {
    totalKopecks: number;
    byCategory: Record<string, number>;
    largestExpenses: ExpenseSummary[];
  };
  
  // Warnings
  warnings: Warning[];
}

interface ObligationSummary {
  id: string;
  name: string;
  amountKopecks: number;
  dueDate: string;
  status: 'PENDING' | 'OVERDUE';
  protectionLevel: 'HARD' | 'NEGOTIABLE' | 'FLEXIBLE';
}

interface DebtSummary {
  id: string;
  name: string;
  currentBalanceKopecks: number;
  catchUpAmountKopecks: number;
  minimumPaymentKopecks: number;
  dueDateNext: string | null;
  priority: number;
  daysOverdue: number | null;
}

interface GoalSummary {
  id: string;
  name: string;
  description: string; // IMPORTANT for AI context
  targetAmountKopecks: number;
  savedAmountKopecks: number;
  remainingKopecks: number;
  deadline: string | null;
  daysUntilDeadline: number | null;
  percentComplete: number;
  protectionLevel: 'HARD' | 'NEGOTIABLE' | 'FLEXIBLE';
}

interface EnvelopeSummary {
  id: string;
  name: string;
  fundedAmountKopecks: number;
  protectionLevel: 'HARD' | 'NEGOTIABLE' | 'FLEXIBLE';
}

interface Warning {
  type: 'INSUFFICIENT_FUNDS' | 'OVERDUE_DEBT' | 'GOAL_AT_RISK' | 'EXPECTED_INCOME_DELAYED';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  entityId: string | null;
}
```

### Snapshot construction rules

1. **NO full transaction history** — только aggregated summaries;
2. **Time-bounded** — upcoming obligations: next 30 days, recent spending: last 7 days;
3. **Deterministically calculated** — все суммы вычислены Financial Engine;
4. **Compact** — target size < 5KB JSON для token efficiency;
5. **Read-only** — snapshot никогда не мутирует database state.

---

## AI tools

AI использует **typed application tools** вместо direct database access.

### Available tools

```typescript
// 1. Get current financial state
getFinancialSnapshot(): Promise<FinancialSnapshot>

// 2. Simulate allocation
simulateAllocation(params: {
  allocations: Array<{
    targetType: 'DEBT' | 'GOAL' | 'ENVELOPE' | 'GENERAL';
    targetId: string | null;
    amountKopecks: number;
  }>;
}): Promise<{
  isValid: boolean;
  totalKopecks: number;
  remainingDiscretionaryKopecks: number;
  violations: string[];
  projectedState: ProjectedState;
}>

// 3. Get debt details
getDebtDetails(debtId: string): Promise<{
  debt: DebtSummary;
  paymentHistory: DebtPayment[];
  projectedPayoffDate: string | null;
  interestAccrued: number | null;
}>

// 4. Get goal details
getGoalDetails(goalId: string): Promise<{
  goal: GoalSummary;
  contributionHistory: GoalContribution[];
  projectedCompletionDate: string | null;
  requiredMonthlyContribution: number | null;
}>

// 5. Compare allocation scenarios
compareAllocations(params: {
  scenarioA: Allocation[];
  scenarioB: Allocation[];
}): Promise<{
  scenarioAResult: SimulationResult;
  scenarioBResult: SimulationResult;
  comparison: {
    debtReductionDiff: number;
    goalProgressDiff: number;
    discretionaryDiff: number;
  };
}>

// 6. Get obligation details
getObligationDetails(obligationId: string): Promise<{
  obligation: RecurringObligation;
  upcomingOccurrences: PaymentOccurrence[];
  missedPayments: number;
  totalPaidThisYear: number;
}>
```

### Tool calling rules

1. **Always call tools for calculations** — never compute in prompt;
2. **Handle tool errors gracefully** — inform user if tool fails;
3. **Cache tool results** — don't re-call for same data in same turn;
4. **Validate tool inputs** — ensure IDs exist before calling;
5. **Respect tool contracts** — follow TypeScript interfaces exactly.

---

## AI budget proposal structure

AI generates **structured output** для budget proposals:

```typescript
interface BudgetProposal {
  snapshotVersion: string; // snapshot ID/timestamp for TOCTOU prevention
  summary: string; // 2-3 sentences explaining the plan
  
  allocations: Array<{
    targetType: 'DEBT' | 'GOAL' | 'ENVELOPE' | 'GENERAL';
    targetId: string | null; // required for DEBT/GOAL/ENVELOPE, null for GENERAL
    targetName: string;
    amountKopecks: number; // must be positive
    reason: string; // why this allocation
    priority: number;
  }>;
  
  totalAllocatedKopecks: number; // computed by server, not trusted from AI
  remainingDiscretionaryKopecks: number; // computed by server
  
  alternatives: Array<{
    name: string;
    description: string;
    tradeoffs: string;
  }>;
  
  warnings: string[];
  
  protectionsRespected: { // computed by server
    hardObligationsCovered: boolean;
    hardEnvelopesFunded: boolean;
    expectedIncomeNotSpent: boolean;
  };
}
```

### Validation pipeline

Перед показом proposal пользователю:

```typescript
async function validateAIProposal(
  proposal: BudgetProposal,
  userId: string,
  tx?: Transaction // optional transaction for re-validation
): Promise<ValidationResult> {
  // 1. Schema validation
  const schemaValidation = BudgetProposalSchema.safeParse(proposal);
  if (!schemaValidation.success) {
    return { isValid: false, errors: schemaValidation.error.errors };
  }
  
  // 2. Amount validation
  for (const allocation of proposal.allocations) {
    if (allocation.amountKopecks <= 0) {
      return { isValid: false, errors: ['Allocation amount must be positive'] };
    }
    
    if (allocation.amountKopecks > MAX_ALLOCATION_KOPECKS) {
      return { isValid: false, errors: ['Allocation amount exceeds maximum'] };
    }
  }
  
  // 3. Target validation
  for (const allocation of proposal.allocations) {
    // GENERAL type must NOT have targetId
    if (allocation.targetType === 'GENERAL' && allocation.targetId !== null) {
      return { isValid: false, errors: ['GENERAL allocation cannot have targetId'] };
    }
    
    // Typed allocations MUST have targetId
    if (allocation.targetType !== 'GENERAL' && !allocation.targetId) {
      return { isValid: false, errors: [`${allocation.targetType} allocation requires targetId`] };
    }
    
    // Check entity exists and belongs to user
    if (allocation.targetId) {
      const exists = await checkEntityExists(
        allocation.targetType,
        allocation.targetId,
        userId,
        tx
      );
      if (!exists) {
        return { 
          isValid: false, 
          errors: [`Target ${allocation.targetType} ${allocation.targetId} not found`] 
        };
      }
      
      // Check entity is not closed/archived
      const isActive = await checkEntityActive(
        allocation.targetType,
        allocation.targetId,
        tx
      );
      if (!isActive) {
        return {
          isValid: false,
          errors: [`Target ${allocation.targetType} ${allocation.targetId} is closed`]
        };
      }
    }
  }
  
  // 4. Recalculate totals (don't trust AI)
  const calculatedTotal = proposal.allocations.reduce(
    (sum, a) => sum + a.amountKopecks, 
    0
  );
  
  // 5. Financial invariants
  const snapshot = await getFinancialSnapshot(userId, tx);
  
  if (calculatedTotal > snapshot.discretionaryBalanceKopecks) {
    return { 
      isValid: false, 
      errors: [`Total allocation ${calculatedTotal} exceeds discretionary balance ${snapshot.discretionaryBalanceKopecks}`] 
    };
  }
  
  // 6. HARD protection check
  const hardViolations = await checkHardProtections(proposal, userId, tx);
  if (hardViolations.length > 0) {
    return { 
      isValid: false, 
      errors: hardViolations 
    };
  }
  
  return { isValid: true, errors: [], recalculatedTotal: calculatedTotal };
}
```

**CRITICAL:** Только после успешной validation proposal показывается как valid.

---

## Conversation management

### Context construction

```typescript
interface ConversationContext {
  systemPolicy: string; // AI policy and financial rules
  snapshot: FinancialSnapshot;
  summary: ConversationSummary | null;
  recentMessages: AIMessage[]; // last 10 messages
}
```

### System policy (prompt)

```
You are a financial adviser for a personal finance application.

Your role:
- Analyze the user's FinancialSnapshot
- Answer questions about spending decisions
- Recommend budget allocations
- Explain financial consequences
- Prioritize debts and goals

Critical rules:
1. NEVER perform financial arithmetic yourself
   - Use getFinancialSnapshot() for current state
   - Use simulateAllocation() for what-if scenarios
   - All calculations are deterministic

2. RESPECT HARD protections
   - HARD envelopes cannot be reallocated
   - HARD obligations cannot be skipped
   - You can INFORM about HARD constraints, not modify them

3. Expected income is NOT spendable
   - IN_TRANSIT income is shown separately
   - Never include it in available balance
   - Warn if user wants to spend expected money

4. Your proposals are DRAFTS
   - Generate structured BudgetProposal
   - User must approve before application
   - Never directly modify database

5. Use typed tools only
   - NO SQL queries
   - NO direct database access
   - Call application tools for all data

6. Be concise and action-oriented
   - Focus on specific decisions
   - Explain tradeoffs clearly
   - Provide 2-3 alternatives when relevant

7. Prioritize correctly
   - HARD obligations first
   - Overdue debts next
   - Goals with near deadlines
   - Then NEGOTIABLE/FLEXIBLE items

Format money as: "1 250,50 ₽" (Russian format)
Dates as: "15 октября" or "через 3 дня"
```

### Conversation summary structure

```typescript
interface ConversationSummary {
  durableDecisions: Array<{
    decision: string;
    context: string;
    validUntil: string | null; // ISO date or null for indefinite
  }>;
  
  userPreferences: {
    avoidCategories: string[];
    priorityDebts: string[];
    priorityGoals: string[];
    minimumDiscretionary: number | null;
  };
  
  activeConstraints: string[];
  
  summarizedAt: Date;
  messagesCoveredCount: number;
}
```

### Summary generation rules

1. **Compress old messages** after 20+ messages in conversation;
2. **Extract only durable facts:**
   - "User wants food budget ≥ 5000₽ during this cycle";
   - "Debt 'Credit Card' is temporarily lower priority";
   - "Goal 'Vacation' must be funded by deadline";
3. **DO NOT summarize:**
   - Historical arithmetic facts (stored in DB);
   - Transient reasoning;
   - One-time questions;
4. **Invalidate outdated decisions:**
   - Remove constraints when planning cycle completes;
   - Clear temporary priorities after resolution;
5. **Token target:** summary + recent messages < 2000 tokens.

---

## AI response patterns

### Question: "Can I spend X today?"

```
AI workflow:
1. Call getFinancialSnapshot()
2. Check discretionaryBalanceKopecks >= X
3. Check upcoming HARD obligations within 7 days
4. Calculate remaining after X
5. Respond with analysis

Response format:
"Да, у тебя есть [discretionary] discretionary. 
После траты [X] останется [remaining].

⚠️ Но учти: [upcoming HARD obligation] через [days] дней.
Если ожидаемый доход [expected income] задержится, 
может не хватить на обязательный платёж."
```

### Question: "What should I pay this week?"

```
AI workflow:
1. Call getFinancialSnapshot()
2. Identify obligations due within 7 days
3. Separate HARD / NEGOTIABLE / FLEXIBLE
4. Call simulateAllocation() for each scenario
5. Recommend priority order

Response format:
"Обязательные платежи:
• [HARD 1]: [amount] — [due date]
• [HARD 2]: [amount] — [due date]
Итого HARD: [total]

После этого у тебя останется [remaining].

Рекомендую также:
• [NEGOTIABLE 1]: [amount] — [reason]

Можно отложить:
• [FLEXIBLE 1]: [amount] — [consequence if skipped]"
```

### Command: "Generate budget for this week"

```
AI workflow:
1. Call getFinancialSnapshot()
2. Identify discretionaryBalanceKopecks
3. List all competing targets (debts, goals, envelopes)
4. Generate structured BudgetProposal
5. Call simulateAllocation() to validate
6. Return structured proposal

Backend:
1. Receive BudgetProposal
2. Validate with validateAIProposal()
3. If valid: show to user
4. If invalid: return error, AI retries

User sees:
• Summary explanation
• Allocations with reasons
• Alternatives
• Approve / Reject / Discuss buttons
```

---

## Prompt injection protection

### Untrusted data sources

1. **Imported bank transactions:**
   - `description` field — untrusted;
   - Sanitize before including in AI context;
   - Never treat as instructions.

2. **User-entered comments/notes:**
   - Expense comments;
   - Debt notes;
   - Goal descriptions;
   - Treat as DATA, not instructions.

### Sanitization strategy

```typescript
function sanitizeForAI(text: string): string {
  // 1. Remove potential injection patterns
  const sanitized = text
    .replace(/```/g, '') // code blocks
    .replace(/\[INST\]/gi, '') // instruction markers
    .replace(/system:/gi, '') // role markers
    .replace(/assistant:/gi, '')
    .replace(/user:/gi, '');
  
  // 2. Truncate to reasonable length
  const maxLength = 500;
  return sanitized.slice(0, maxLength);
}

// In FinancialSnapshot construction
goalSummary.description = sanitizeForAI(goal.description);
```

### Context structure

Always structure untrusted data clearly:

```typescript
// GOOD
const snapshot = {
  goals: [{
    id: '...',
    name: '...',
    description: sanitize(goal.description), // clearly marked as data
  }]
};

// BAD
const prompt = `Goal description: ${goal.description}`; // can inject instructions
```

---

## Token optimization

### Hard limits

```typescript
const AI_LIMITS = {
  MAX_USER_MESSAGE_LENGTH: 4000,        // chars
  MAX_SNAPSHOT_SIZE: 5120,              // bytes
  MAX_TOOL_HISTORY_ITEMS: 50,
  MAX_CONVERSATION_MESSAGES: 50,         // before compression
  MAX_TOOL_CALLS_PER_REQUEST: 10,
  MAX_RETRIES_PER_REQUEST: 3,
  RATE_LIMIT_PER_MINUTE: 10,
  RATE_LIMIT_PER_HOUR: 100,
  MONTHLY_BUDGET_USD: 10,                // hard cap
  MONTHLY_WARNING_USD: 5,
};
```

### Snapshot size budget

Target: FinancialSnapshot < 5KB JSON (~1200 tokens)

Strategies:

1. **Limit list sizes:**
   - Upcoming obligations: max 20;
   - Active debts: max 10;
   - Active goals: max 10;
   - Recent expenses: top 5;

2. **Omit verbose fields:**
   - No full transaction history;
   - No old completed items;
   - Summaries over details;

3. **Aggregate where possible:**
   - Total debt balance instead of all debts;
   - Category totals instead of all expenses;

### Conversation compression

Trigger compression when:

- Total conversation > 15K tokens;
- OR 20+ messages exchanged;
- OR planning cycle completes (start fresh);

Compression result:

- System policy: ~800 tokens;
- FinancialSnapshot: ~1200 tokens;
- Conversation summary: ~500 tokens;
- Recent 10 messages: ~3000 tokens;
- **Total: ~5500 tokens** (vs 15K+ uncompressed).

---

## Cost tracking

### Log every AI request

```typescript
interface AIUsageLog {
  userId: string;
  conversationId: string | null;
  provider: 'openai' | 'anthropic';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  requestTimestamp: Date;
}
```

### Cost calculation

```typescript
const PRICING = {
  'gpt-4o': {
    prompt: 0.0025 / 1000,    // $2.50 per 1M tokens
    completion: 0.01 / 1000,  // $10 per 1M tokens
  },
  'claude-3-5-sonnet': {
    prompt: 0.003 / 1000,     // $3 per 1M tokens
    completion: 0.015 / 1000, // $15 per 1M tokens
  },
};

function calculateCost(
  model: string, 
  promptTokens: number, 
  completionTokens: number
): number {
  const pricing = PRICING[model];
  return (
    promptTokens * pricing.prompt +
    completionTokens * pricing.completion
  );
}
```

### Request budget validation

```typescript
async function validateAIRequest(
  userId: string,
  messageLength: number
): Promise<void> {
  // 1. Message length
  if (messageLength > AI_LIMITS.MAX_USER_MESSAGE_LENGTH) {
    throw new Error('Message too long');
  }
  
  // 2. Rate limiting (use Redis or similar, NOT in-memory)
  const rateLimiter = await getDistributedRateLimiter();
  const minuteKey = `ai:rate:${userId}:${getCurrentMinute()}`;
  const hourKey = `ai:rate:${userId}:${getCurrentHour()}`;
  
  const minuteCount = await rateLimiter.incr(minuteKey);
  await rateLimiter.expire(minuteKey, 60);
  
  if (minuteCount > AI_LIMITS.RATE_LIMIT_PER_MINUTE) {
    throw new RateLimitError('Too many requests per minute');
  }
  
  const hourCount = await rateLimiter.incr(hourKey);
  await rateLimiter.expire(hourKey, 3600);
  
  if (hourCount > AI_LIMITS.RATE_LIMIT_PER_HOUR) {
    throw new RateLimitError('Too many requests per hour');
  }
  
  // 3. Monthly budget (hard cap)
  const currentMonthCost = await getMonthlyAICost(userId);
  
  if (currentMonthCost >= AI_LIMITS.MONTHLY_BUDGET_USD) {
    throw new BudgetExceededError(
      `Monthly AI budget exhausted: $${currentMonthCost.toFixed(2)} / $${AI_LIMITS.MONTHLY_BUDGET_USD}`
    );
  }
  
  // 4. Warning at 50%
  if (currentMonthCost >= AI_LIMITS.MONTHLY_WARNING_USD) {
    await createNotification(userId, {
      type: 'AI_BUDGET_WARNING',
      title: 'AI usage warning',
      message: `AI costs this month: $${currentMonthCost.toFixed(2)} / $${AI_LIMITS.MONTHLY_BUDGET_USD}`,
    });
  }
}
```

### Circuit breaker

```typescript
// Prevent cascading failures
const aiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,        // consecutive failures
  failureWindow: 60_000,       // 1 minute
  openDuration: 300_000,       // 5 minutes circuit open
  halfOpenRequests: 3,         // test requests in half-open state
});

async function callAI(request: AIRequest): Promise<AIResponse> {
  return aiCircuitBreaker.execute(async () => {
    return await provider.chat(request);
  });
}
```

### Monthly budget alert

Hard cap: $10/month.

Target: < $5/month для single active user.

V1 не реализует payment/billing — это administrative limit для cost control.

---

## Model selection

### Primary model

**OpenAI GPT-4o** или **Anthropic Claude Sonnet 3.5**

Reasons:

- Structured output support;
- Function calling;
- Large context window (128K+);
- Good instruction following;
- Reasonable cost.

### Model switching logic

```typescript
async function selectModel(
  taskType: 'ADVICE' | 'BUDGET' | 'CLASSIFY' | 'SUMMARIZE'
): Promise<string> {
  switch (taskType) {
    case 'BUDGET':
      // Critical task — use best model
      return 'gpt-4o';
    
    case 'ADVICE':
      // Regular conversation
      return 'gpt-4o';
    
    case 'CLASSIFY':
      // Simple task — can use cheaper model
      return 'gpt-4o-mini';
    
    case 'SUMMARIZE':
      // Compression task
      return 'gpt-4o-mini';
  }
}
```

---

## Error handling

### AI provider failures

```typescript
try {
  const response = await aiProvider.generateAdvice(snapshot, context, message);
  return response;
} catch (error) {
  if (error instanceof AIProviderError) {
    // Log error
    logger.error('AI provider failed', { error, userId });
    
    // Return fallback response
    return {
      message: 'Извини, сейчас не могу проанализировать твою ситуацию. ' +
               'Попробуй чуть позже или задай более простой вопрос.',
      requiresRetry: true,
    };
  }
  throw error;
}
```

### Invalid proposal handling

```typescript
const validation = await validateAIProposal(proposal, userId);

if (!validation.isValid) {
  // Ask AI to fix
  return await aiProvider.generateBudgetPlan(snapshot, cycle, 
    `Previous proposal was invalid: ${validation.errors.join(', ')}. ` +
    `Generate a corrected proposal that respects all constraints.`
  );
}
```

### Retry strategy

- Max 2 retries for invalid proposals;
- Exponential backoff for provider failures;
- После 2 failures — fallback to manual mode;
- Log all failures для monitoring.

---

## Testing AI behavior

### Unit tests

Test deterministic validation logic:

```typescript
describe('validateAIProposal', () => {
  it('should reject proposal exceeding discretionary balance', async () => {
    const proposal = {
      totalAllocatedKopecks: 100000,
      allocations: [{ amountKopecks: 100000, ... }],
      ...
    };
    
    const snapshot = { discretionaryBalanceKopecks: 50000, ... };
    
    const result = await validateAIProposal(proposal, userId);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('exceeds discretionary balance');
  });
});
```

### Integration tests

Test tool calling:

```typescript
describe('AI tools', () => {
  it('getFinancialSnapshot should return valid snapshot', async () => {
    const snapshot = await getFinancialSnapshot(userId);
    
    expect(snapshot).toBeDefined();
    expect(snapshot.availableBalanceKopecks).toBeGreaterThanOrEqual(0);
    expect(snapshot.discretionaryBalanceKopecks).toBeLessThanOrEqual(
      snapshot.availableBalanceKopecks
    );
  });
});
```

### AI evaluation suite

Separate eval suite (see TEST_PLAN.md) с realistic scenarios:

- HARD protection scenarios;
- Insufficient funds scenarios;
- Competing deadline scenarios;
- Expected income scenarios;
- Debt prioritization scenarios.

Run eval suite після каждого AI policy change.

---

## Security boundaries

1. **AI cannot write to database** — only deterministic code;
2. **AI cannot access credentials** — bank connections encrypted;
3. **AI output is untrusted** — always validated;
4. **Prompt injection protected** — sanitize untrusted data;
5. **Rate limiting** — prevent AI abuse;
6. **Audit trail** — log all AI-generated proposals;
7. **User approval required** — AI never auto-applies allocations.

---

## Future improvements

- **Multi-model comparison:** Test multiple providers for quality;
- **Fine-tuning:** Train on user's historical preferences;
- **Proactive insights:** AI surfaces warnings without being asked;
- **Voice interface:** Natural language budget planning;
- **Embedding search:** Semantic search over financial history;
- **Agent-based workflow:** Multi-step autonomous planning.

But V1: simple, safe, deterministic-first AI integration.
