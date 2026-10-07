"use client";

import { useRef, useState } from "react";
import { parseRubles } from "@/lib/money";

export default function IncomeForm({ date, online, onSaved, onDraftChange, onPendingChange }: {
  date: string;
  online: boolean;
  onSaved: () => Promise<boolean>;
  onDraftChange: (hasDraft: boolean) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const submitting = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !online) return;
    let amountKopecks: number;
    try { amountKopecks = parseRubles(amount); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Проверьте сумму"); return; }
    submitting.current = true;
    setPending(true); onPendingChange(true); setError(""); setMessage(""); setRefreshFailed(false);
    try {
      const response = await fetch("/api/income", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKopecks, source: "Работа", earnedAt: `${date}T00:00:00.000Z` }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(response.status === 400 && Array.isArray(body?.errors) ? "Проверьте сумму и повторите" : "Не удалось сохранить заработок. Попробуйте позже");
        return;
      }
      setAmount(""); onDraftChange(false);
      setMessage("Заработок записан. Доступный баланс не изменился. Можно добавить ещё один заработок.");
      const refreshed = await onSaved();
      setRefreshFailed(!refreshed);
    } catch {
      setError("Не удалось подтвердить сохранение. Проверьте обновлённые показатели перед повторной записью.");
      await onSaved(); // Read-only check: an unconfirmed POST must never be retried automatically.
    } finally {
      submitting.current = false; setPending(false); onPendingChange(false);
    }
  }

  const title = new Date(`${date}T00:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
  return <form onSubmit={submit} noValidate className="rounded-xl border border-[#334039] bg-[#172019] p-4">
    <h2 className="text-lg font-semibold">Заработок за {title}</h2>
    <label htmlFor="day-income" className="mt-4 block text-sm text-[#dce3d9]">Сумма, ₽</label>
    <input id="day-income" type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" value={amount}
      aria-invalid={!!error} aria-describedby={error ? "income-hint income-error" : "income-hint"}
      onChange={(event) => { setAmount(event.target.value); onDraftChange(!!event.target.value.trim()); setError(""); setMessage(""); }}
      className="mt-2 h-[52px] w-full rounded-lg border border-[#506055] bg-[#101513] px-4 text-base text-[#f4f0e7] outline-none focus-visible:border-[#d8c38d]" />
    <p id="income-hint" className="mt-2 text-[13px] leading-[18px] text-[#a9b2a9]">После сохранения — «В пути». Баланс не изменится.</p>
    {!online && <p role="alert" className="mt-2 text-sm text-[#ef8b80]">Нет подключения. Подключитесь, чтобы сохранить.</p>}
    {error && <p id="income-error" role="alert" className="mt-2 text-sm text-[#ef8b80]">{error}</p>}
    {message && <p role="status" className="mt-2 text-sm text-[#d8c38d]">{message}</p>}
    {refreshFailed && <p role="alert" className="mt-2 text-sm text-[#ef8b80]">Заработок сохранён, но сводку обновить не удалось. Обновите показатели ниже; повторять запись не нужно.</p>}
    <button type="submit" disabled={pending || !online} className="mt-4 min-h-12 w-full rounded-lg bg-[#d8c38d] px-4 font-semibold text-[#172018] active:scale-[.98] disabled:opacity-60">{pending ? "Сохраняем…" : "Записать заработок"}</button>
  </form>;
}
