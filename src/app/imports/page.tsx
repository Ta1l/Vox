"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

type Imported = { id: string; amountKopecks: number; transactionDate: string; description: string | null; categoryHint: string | null; importStatus: string };

export default function ImportsPage() {
  const [csv, setCsv] = useState("externalId,date,amount,description\n");
  const [items, setItems] = useState<Imported[]>([]);
  const [message, setMessage] = useState("");
  async function refresh() { const response = await fetch("/api/imports/transactions"); setItems(await response.json()); }
  useEffect(() => { refresh().catch(() => undefined); }, []);
  async function importFile() { const response = await fetch("/api/imports/transactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csv }) }); const body = await response.json(); setMessage(response.ok ? `Импортировано строк: ${body.length}` : body.message); if (response.ok) refresh(); }
  async function decide(id: string, action: "confirm" | "reject") { await fetch(`/api/imports/transactions/${id}/${action}`, { method: "POST" }); refresh(); }
  return <main className="min-h-screen bg-slate-900 text-slate-100 p-4 pb-24"><h1 className="text-2xl font-semibold mb-3">Импорт операций</h1><p className="text-sm text-slate-400 mb-3">CSV: externalId,date,amount,description. Сумма в рублях; расход указывается со знаком минус.</p><textarea value={csv} onChange={(event) => setCsv(event.target.value)} className="w-full h-32 rounded-lg bg-slate-800 p-3 text-sm" aria-label="CSV" /><button onClick={importFile} className="mt-3 rounded-lg bg-sky-600 px-4 py-2">Импортировать</button>{message && <p className="mt-2 text-sm text-slate-300">{message}</p>}<div className="mt-5 space-y-3">{items.map((item) => <div key={item.id} className="rounded-xl bg-slate-800 p-3"><div className="flex justify-between"><span>{item.description || "Без описания"}</span><span>{item.amountKopecks} коп.</span></div><div className="text-xs text-slate-400">{item.transactionDate} · {item.importStatus} · {item.categoryHint}</div>{["REVIEW", "MATCHED", "PENDING"].includes(item.importStatus) && <div className="mt-2 flex gap-2"><button onClick={() => decide(item.id, "confirm")} className="rounded bg-emerald-700 px-3 py-1 text-sm">Подтвердить</button><button onClick={() => decide(item.id, "reject")} className="rounded bg-slate-700 px-3 py-1 text-sm">Отклонить</button></div>}</div>)}</div><BottomNav /></main>;
}
