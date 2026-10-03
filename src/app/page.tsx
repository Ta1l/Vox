"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import type { DashboardSnapshot } from "@/lib/domain/dashboard/dashboardService";

const rubles = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 });
const money = (kopecks: number) => rubles.format(kopecks / 100);

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then(async (response) => {
      if (!response.ok) throw new Error("Не удалось загрузить dashboard");
      return response.json() as Promise<DashboardSnapshot>;
    }).then(setDashboard).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Ошибка загрузки"));
  }, []);

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-3 border-b border-slate-700">
        <h1 className="text-lg font-semibold">Финансы</h1>
        <p className="text-xs text-slate-400">Сводка на сегодня</p>
      </header>

      <main className="flex-1 px-4 py-6">
        {error && <p role="alert" className="rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
        {!dashboard && !error && <p className="text-sm text-slate-400">Загрузка…</p>}
        <section aria-label="Баланс" className="rounded-xl border border-slate-700 p-4"><h2 className="mb-3 text-sm font-semibold">Баланс</h2><div className="grid grid-cols-2 gap-3"><Metric label="Доступно" value={dashboard ? money(dashboard.financial.availableCashKopecks) : "—"} prominent /><Metric label="Защищено" value={dashboard ? money(dashboard.financial.protectedAmountKopecks) : "—"} /><Metric label="Свободно" value={dashboard ? money(dashboard.financial.discretionaryAmountKopecks) : "—"} /><Metric label="В пути" value={dashboard ? money(dashboard.financial.incomeInTransitKopecks) : "—"} /></div></section>
        {dashboard && <div className="space-y-5">
          <section className="rounded-xl border border-slate-700 p-4"><h2 className="mb-3 text-sm font-semibold">Доходы и расходы</h2><div className="grid grid-cols-2 gap-3 text-sm"><Metric label="Доход за неделю" value={money(dashboard.earnedIncome.weekly)} /><Metric label="Расходы за неделю" value={money(dashboard.expenses.weekly)} /><Metric label="Доход за месяц" value={money(dashboard.earnedIncome.monthly)} /><Metric label="Расходы за месяц" value={money(dashboard.expenses.monthly)} /></div></section>
          {dashboard.alerts.length > 0 && <section aria-label="Оповещения" className="rounded-xl border border-amber-700/70 bg-amber-950/30 p-4"><h2 className="mb-2 text-sm font-semibold text-amber-200">Оповещения</h2><ul className="list-inside list-disc space-y-1 text-sm text-amber-100">{dashboard.alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul></section>}
          <ItemList title="Ближайшие платежи" empty="Нет ближайших платежей">{dashboard.nearestPayments.map((payment) => <li key={payment.id} className="flex items-center justify-between gap-3 border-b border-slate-800 py-2 last:border-0"><span><span className="block">{payment.name}</span><span className="text-xs text-slate-400">{payment.dueDate} · {payment.status === "OVERDUE" ? "просрочен" : "ожидается"}</span></span><strong>{money(payment.amountKopecks)}</strong></li>)}</ItemList>
          <ItemList title="Долги" empty="Активных долгов нет">{dashboard.debts.map((debt) => <li key={debt.id} className="flex items-center justify-between gap-3 border-b border-slate-800 py-2 last:border-0"><span>{debt.name}</span><strong>{money(debt.currentBalanceKopecks)}</strong></li>)}</ItemList>
          <ItemList title="Цели" empty="Активных целей нет">{dashboard.goals.map((goal) => <li key={goal.id} className="flex items-center justify-between gap-3 border-b border-slate-800 py-2 last:border-0"><span>{goal.name}</span><span className="text-sm">{money(goal.savedAmountKopecks)} / {money(goal.targetAmountKopecks)}</span></li>)}</ItemList>
        </div>}
      </main>

      <BottomNav />
    </div>
  );
}

function Metric({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return <div className="rounded-xl border border-slate-700 p-3"><p className="text-xs text-slate-400">{label}</p><p className={prominent ? "mt-1 text-xl font-bold" : "mt-1 text-base font-semibold"}>{value}</p></div>;
}

function ItemList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="rounded-xl border border-slate-700 p-4"><h2 className="mb-2 text-sm font-semibold">{title}</h2>{hasItems ? <ul>{children}</ul> : <p className="text-sm text-slate-400">{empty}</p>}</section>;
}
