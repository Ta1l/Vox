"use client";

import { useState } from "react";

export default function DebtForm() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [minimum, setMinimum] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        originalAmountKopecks: Math.round(Number(amount) * 100),
        minimumPaymentKopecks: minimum ? Math.round(Number(minimum) * 100) : undefined,
        dueDate: dueDate || undefined,
      }),
    });
    setMessage(response.ok ? "Долг добавлен" : (await response.json()).message ?? "Ошибка");
    if (response.ok) { setName(""); setAmount(""); setMinimum(""); setDueDate(""); }
  }

  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm">Название<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
    <label className="block text-sm">Сумма<input required min="0.01" step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
    <label className="block text-sm">Минимальный платёж<input min="0" step="0.01" type="number" value={minimum} onChange={(e) => setMinimum(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
    <label className="block text-sm">Срок<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
    <button className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white">Добавить долг</button>
    {message && <p role="status" className="text-sm text-slate-300">{message}</p>}
  </form>;
}
