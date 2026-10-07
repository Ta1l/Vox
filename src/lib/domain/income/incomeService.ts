import { db } from "@/lib/db/client";
import { incomeEntries, IncomeStatus, type NewIncomeEntry } from "@/lib/db/schema/income";
import { eq, and, inArray } from "drizzle-orm";
import * as money from "@/lib/money";

/**
 * Income domain service
 *
 * RULE-I1: Earned income does not increase available balance until RECEIVED
 * RULE-I2: Expected income is not spendable
 * RULE-I3: Income state transitions
 */

export interface CreateIncomeParams {
  userId: string;
  amountKopecks: money.Money;
  source?: string;
  description?: string;
  earnedAt: Date;
  expectedAt?: string; // Date string YYYY-MM-DD
}

export interface UpdateIncomeStatusParams {
  incomeId: string;
  userId: string;
  newStatus: IncomeStatus;
  receivedAt?: Date;
}

/**
 * Create new income entry
 * Initial status is EARNED
 */
export async function createIncome(params: CreateIncomeParams) {
  money.validate(params.amountKopecks);

  if (!money.isPositive(params.amountKopecks)) {
    throw new Error("Income amount must be positive");
  }

  const entry: NewIncomeEntry = {
    userId: params.userId,
    amountKopecks: params.amountKopecks,
    status: "EARNED",
    source: params.source,
    description: params.description,
    earnedAt: params.earnedAt,
    expectedAt: params.expectedAt,
  };

  const [created] = await db.insert(incomeEntries).values(entry).returning();
  return created;
}

/**
 * Update income status
 * Validates state transitions according to RULE-I3
 */
export async function updateIncomeStatus(params: UpdateIncomeStatusParams) {
  const income = await db.query.incomeEntries.findFirst({
    where: and(
      eq(incomeEntries.id, params.incomeId),
      eq(incomeEntries.userId, params.userId)
    ),
  });

  if (!income) {
    throw new Error("Income not found");
  }

  validateStatusTransition(income.status, params.newStatus);

  const updates: Partial<typeof incomeEntries.$inferInsert> = {
    status: params.newStatus,
    updatedAt: new Date(),
  };

  if (params.newStatus === "RECEIVED") {
    if (!params.receivedAt) {
      throw new Error("receivedAt is required when marking income as RECEIVED");
    }
    updates.receivedAt = params.receivedAt;
  }

  const [updated] = await db
    .update(incomeEntries)
    .set(updates)
    .where(and(
      eq(incomeEntries.id, params.incomeId),
      eq(incomeEntries.userId, params.userId)
    ))
    .returning();

  return updated;
}

/**
 * Get income entries for user
 */
export async function getIncomeByUser(userId: string, status?: IncomeStatus) {
  const conditions = [eq(incomeEntries.userId, userId)];

  if (status) {
    conditions.push(eq(incomeEntries.status, status));
  }

  return db.query.incomeEntries.findMany({
    where: and(...conditions),
    orderBy: (income, { desc }) => [desc(income.earnedAt)],
  });
}

/**
 * Calculate received income total (RULE-I1)
 * Only RECEIVED income counts toward available balance
 */
export async function getReceivedIncomeTotal(userId: string): Promise<money.Money> {
  const received = await db.query.incomeEntries.findMany({
    where: and(
      eq(incomeEntries.userId, userId),
      eq(incomeEntries.status, "RECEIVED")
    ),
  });

  return received.reduce((total, entry) => money.add(total, entry.amountKopecks), 0);
}

/**
 * Calculate income in transit (RULE-I2)
 * Earned or in transit income that is not yet received (RULE-FS2)
 */
export async function getIncomeInTransit(userId: string): Promise<money.Money> {
  const inTransit = await db.query.incomeEntries.findMany({
    where: and(
      eq(incomeEntries.userId, userId),
      inArray(incomeEntries.status, ["EARNED", "IN_TRANSIT"])
    ),
  });

  return inTransit.reduce((total, entry) => money.add(total, entry.amountKopecks), 0);
}

/**
 * Validate state transition according to RULE-I3
 */
function validateStatusTransition(from: string, to: IncomeStatus): void {
  const validTransitions: Record<string, IncomeStatus[]> = {
    EARNED: ["IN_TRANSIT", "RECEIVED", "DELAYED", "CANCELLED"],
    IN_TRANSIT: ["RECEIVED", "DELAYED", "CANCELLED"],
    DELAYED: ["RECEIVED", "CANCELLED"],
    RECEIVED: [], // RECEIVED is terminal
    CANCELLED: [], // CANCELLED is terminal
  };

  const allowed = validTransitions[from] || [];

  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid status transition: ${from} -> ${to}. Allowed: ${allowed.join(", ") || "none"}`
    );
  }
}
