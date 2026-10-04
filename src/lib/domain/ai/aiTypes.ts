import { getDashboardSnapshot, type DashboardSnapshot } from "@/lib/domain/dashboard/dashboardService";
import { createHash } from "node:crypto";

export interface FinancialSnapshot {
  snapshotVersion: string;
  generatedAt: string;
  availableCashKopecks: number;
  protectedAmountKopecks: number;
  hardProtectedAmountKopecks: number;
  discretionaryAmountKopecks: number;
  incomeInTransitKopecks: number;
  weeklyEarnedKopecks: number;
  monthlyEarnedKopecks: number;
  weeklyExpensesKopecks: number;
  monthlyExpensesKopecks: number;
  upcomingPayments: DashboardSnapshot["nearestPayments"];
  debts: DashboardSnapshot["debts"];
  goals: DashboardSnapshot["goals"];
  alerts: string[];
}

export interface AIUsage { provider: string; model: string; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostUsd: number | null; }
export interface AIProviderConfig { baseUrl: string; modelName: string; apiKey: string; }
export interface StructuredAIResult<T> { value: T; usage: AIUsage; requestId: string | null; }
export interface AIProvider {
  generateStructured<T>(params: { userId: string; system: string; userMessage: string; schemaName: string; schema: Record<string, unknown>; validate: (value: unknown) => T; }): Promise<StructuredAIResult<T>>;
}

export function buildFinancialSnapshot(dashboard: DashboardSnapshot): FinancialSnapshot {
  const financialData = { asOfDate: dashboard.asOfDate, financial: dashboard.financial, earnedIncome: dashboard.earnedIncome, expenses: dashboard.expenses, upcomingPayments: dashboard.nearestPayments, debts: dashboard.debts, goals: dashboard.goals };
  return { snapshotVersion: createHash("sha256").update(JSON.stringify(financialData)).digest("hex"), generatedAt: new Date().toISOString(), availableCashKopecks: dashboard.financial.availableCashKopecks, protectedAmountKopecks: dashboard.financial.protectedAmountKopecks, hardProtectedAmountKopecks: dashboard.financial.hardProtectedAmountKopecks, discretionaryAmountKopecks: dashboard.financial.discretionaryAmountKopecks, incomeInTransitKopecks: dashboard.financial.incomeInTransitKopecks, weeklyEarnedKopecks: dashboard.earnedIncome.weekly, monthlyEarnedKopecks: dashboard.earnedIncome.monthly, weeklyExpensesKopecks: dashboard.expenses.weekly, monthlyExpensesKopecks: dashboard.expenses.monthly, upcomingPayments: dashboard.nearestPayments, debts: dashboard.debts, goals: dashboard.goals, alerts: [...dashboard.alerts] };
}

export async function getFinancialSnapshotForAI(userId: string, asOfDate?: string) {
  return buildFinancialSnapshot(await getDashboardSnapshot(userId, asOfDate));
}
