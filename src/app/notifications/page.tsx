"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

type Notification = { id: string; title: string; message: string; status: string; createdAt: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => { fetch("/api/notifications").then((r) => r.json()).then(setItems).catch(() => setItems([])); if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  async function markRead(id: string) { await fetch(`/api/notifications/${id}/read`, { method: "POST" }); setItems((current) => current.map((item) => item.id === id ? { ...item, status: "READ" } : item)); }
  return <main className="min-h-screen bg-slate-900 text-slate-100 p-4 pb-24"><h1 className="text-2xl font-semibold mb-4">Уведомления</h1>{items.length === 0 ? <p className="text-slate-400">Новых уведомлений нет.</p> : <div className="space-y-3">{items.map((item) => <button key={item.id} onClick={() => item.status !== "READ" && markRead(item.id)} className={`block w-full rounded-xl p-4 text-left ${item.status === "READ" ? "bg-slate-800/60" : "bg-slate-800"}`}><div className="font-medium">{item.title}</div><div className="text-sm text-slate-300 mt-1">{item.message}</div></button>)}</div>}<BottomNav /></main>;
}
