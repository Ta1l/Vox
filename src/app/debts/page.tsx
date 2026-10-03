"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import DebtForm from "@/components/DebtForm";

type Debt = { id: string; name: string; currentBalanceKopecks: number; minimumPaymentKopecks: number | null; dueDate: string | null; status: string };

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const load = () => fetch("/api/debts").then((response) => response.json()).then(setDebts);
  useEffect(() => { load(); }, []);
  return <div className="flex min-h-screen flex-col pb-16">
    <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3"><h1 className="text-lg font-semibold">Долги</h1><button onClick={() => setShowForm((value) => !value)} className="min-h-11 rounded-lg bg-blue-600 px-4">{showForm ? "Закрыть" : "Добавить"}</button></header>
    <main className="flex-1 space-y-4 px-4 py-6">
      {showForm && <DebtForm />}
      {debts.map((debt) => <article key={debt.id} className="rounded-lg bg-slate-800 p-4"><div className="flex justify-between"><h2 className="font-medium">{debt.name}</h2><span className="text-slate-300">{(debt.currentBalanceKopecks / 100).toFixed(2)} ₽</span></div><p className="mt-1 text-sm text-slate-400">{debt.status === "CLOSED" ? "Закрыт" : debt.dueDate ? `Срок: ${debt.dueDate}` : "Активен"}</p></article>)}
      {!debts.length && !showForm && <p className="text-slate-400">Долгов пока нет.</p>}
    </main>
    <BottomNav />
  </div>;
}
