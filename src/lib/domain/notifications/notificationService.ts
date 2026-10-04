import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications, pushSubscriptions, notificationStatusEnum, notificationTypeEnum } from "@/lib/db/schema/notifications";
import { incomeEntries } from "@/lib/db/schema/income";
import { getDashboardSnapshot } from "@/lib/domain/dashboard/dashboardService";
import { getFinancialSnapshot } from "@/lib/domain/envelopes/envelopeService";

export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type NotificationStatus = (typeof notificationStatusEnum.enumValues)[number];
export interface NotificationCandidate { type: NotificationType; title: string; message: string; relatedEntityType?: string; relatedEntityId?: string; scheduledFor: Date; }

const dayStart = (value: string) => new Date(`${value}T00:00:00.000Z`);
const addDays = (value: string, days: number) => { const date = dayStart(value); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
const PUSH_ORIGINS = new Set(["https://fcm.googleapis.com", "https://updates.push.services.mozilla.com"]);
export function isAllowedPushEndpoint(endpoint: string) { try { return PUSH_ORIGINS.has(new URL(endpoint).origin); } catch { return false; } }

export async function listNotifications(userId: string, status?: NotificationStatus) {
  return db.select().from(notifications).where(status ? and(eq(notifications.userId, userId), eq(notifications.status, status)) : eq(notifications.userId, userId)).orderBy(asc(notifications.scheduledFor), asc(notifications.createdAt));
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const [updated] = await db.update(notifications).set({ status: "READ", readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), inArray(notifications.status, ["PENDING", "SENT"]))).returning();
  if (!updated) throw new Error("Notification not found");
  return updated;
}

export async function upsertNotification(userId: string, candidate: NotificationCandidate) {
  const [created] = await db.insert(notifications).values({ userId, ...candidate }).onConflictDoNothing({ target: [notifications.userId, notifications.type, notifications.relatedEntityId, notifications.scheduledFor] }).returning();
  if (created) return created;
  const [existing] = await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.type, candidate.type), candidate.relatedEntityId ? eq(notifications.relatedEntityId, candidate.relatedEntityId) : sql`${notifications.relatedEntityId} IS NULL`, eq(notifications.scheduledFor, candidate.scheduledFor))).limit(1);
  if (!existing) throw new Error("Unable to create notification");
  return existing;
}

export async function generateNotificationCandidates(userId: string, asOfDate: string) {
  const [dashboard, financial] = await Promise.all([getDashboardSnapshot(userId, asOfDate), getFinancialSnapshot(userId)]);
  const scheduledFor = dayStart(asOfDate);
  const candidates: NotificationCandidate[] = [];
  for (const payment of dashboard.nearestPayments) {
    if (payment.protectionLevel === "HARD" && payment.dueDate >= asOfDate && payment.dueDate <= addDays(asOfDate, 30)) candidates.push({ type: "PAYMENT_DUE", title: "Приближается обязательный платёж", message: "Проверьте обязательный платёж в календаре.", relatedEntityType: "PAYMENT_OCCURRENCE", relatedEntityId: payment.id, scheduledFor });
    if (payment.status === "OVERDUE") candidates.push({ type: "OVERDUE_PAYMENT", title: "Есть просроченный платёж", message: "Проверьте просроченный платёж и доступные варианты.", relatedEntityType: "PAYMENT_OCCURRENCE", relatedEntityId: payment.id, scheduledFor });
  }
  const incomeRows = await db.select({ id: incomeEntries.id, status: incomeEntries.status, expectedAt: incomeEntries.expectedAt }).from(incomeEntries).where(and(eq(incomeEntries.userId, userId), inArray(incomeEntries.status, ["IN_TRANSIT", "DELAYED"]), gte(incomeEntries.expectedAt, asOfDate), lte(incomeEntries.expectedAt, addDays(asOfDate, 7))));
  for (const income of incomeRows) {
    candidates.push({ type: income.status === "DELAYED" ? "INCOME_DELAYED" : "INCOME_EXPECTED", title: income.status === "DELAYED" ? "Ожидаемый доход задерживается" : "Ожидается поступление", message: income.status === "DELAYED" ? "Проверьте статус ожидаемого дохода." : "Проверьте календарь ожидаемых поступлений.", relatedEntityType: "INCOME_ENTRY", relatedEntityId: income.id, scheduledFor });
  }
  if (financial.discretionaryAmountKopecks <= 0) candidates.push({ type: "INSUFFICIENT_RESERVE", title: "Недостаточно свободного резерва", message: "Свободных денег для распределения сейчас нет.", relatedEntityType: "USER", relatedEntityId: userId, scheduledFor });
  if (dashboard.earnedIncome.weekly > 0 && dashboard.expenses.weekly > dashboard.earnedIncome.weekly) candidates.push({ type: "WEEKLY_BUDGET_WARNING", title: "Расходы выше дохода за неделю", message: "Проверьте недельный бюджет и необязательные расходы.", relatedEntityType: "USER", relatedEntityId: userId, scheduledFor });
  return candidates;
}

export async function scheduleNotifications(userId: string, asOfDate: string) {
  const candidates = await generateNotificationCandidates(userId, asOfDate);
  return Promise.all(candidates.map((candidate) => upsertNotification(userId, candidate)));
}

export async function claimDueNotifications(limit = 50, now = new Date()) {
  return db.transaction(async (tx) => tx.execute(sql`UPDATE notifications SET status = 'SENT', sent_at = ${now} WHERE id IN (SELECT id FROM notifications WHERE status = 'PENDING' AND scheduled_for <= ${now} ORDER BY scheduled_for FOR UPDATE SKIP LOCKED LIMIT ${limit}) RETURNING *`));
}

export async function savePushSubscription(userId: string, subscription: { endpoint: string; keys: { auth: string; p256dh: string }; userAgent?: string }) {
  if (!isAllowedPushEndpoint(subscription.endpoint)) throw new Error("Invalid push endpoint");
  if (!subscription.keys.auth || !subscription.keys.p256dh) throw new Error("Invalid push keys");
  const [saved] = await db.insert(pushSubscriptions).values({ userId, endpoint: subscription.endpoint, keysAuth: subscription.keys.auth, keysP256dh: subscription.keys.p256dh, userAgent: subscription.userAgent }).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, keysAuth: subscription.keys.auth, keysP256dh: subscription.keys.p256dh, userAgent: subscription.userAgent, isActive: true, updatedAt: new Date() } }).returning();
  return saved;
}

export async function deactivatePushSubscription(userId: string, endpoint: string) {
  const [updated] = await db.update(pushSubscriptions).set({ isActive: false, updatedAt: new Date() }).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint))).returning();
  if (!updated) throw new Error("Push subscription not found");
  return updated;
}
