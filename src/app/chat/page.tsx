"use client";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

type Conversation = { id: string; createdAt: string };
type Message = { id: string; role: "user" | "assistant"; content: string };
export default function ChatPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null); const [messages, setMessages] = useState<Message[]>([]); const [content, setContent] = useState(""); const [status, setStatus] = useState("");
  async function openConversation(item: Conversation) { setConversation(item); const response = await fetch(`/api/ai/conversations/${item.id}`); const body = await response.json(); setMessages(body.messages ?? []); }
  useEffect(() => {
    void fetch("/api/ai/conversations").then((response) => response.json()).then(async (items: Conversation[]) => {
      if (!items[0]) return;
      const response = await fetch(`/api/ai/conversations/${items[0].id}`);
      const body = await response.json();
      setConversation(items[0]); setMessages(body.messages ?? []);
    });
  }, []);
  async function create() { const response = await fetch("/api/ai/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const body = await response.json(); if (!response.ok) { setStatus(body.message ?? "Не удалось создать чат"); return; } await openConversation(body as Conversation); }
  async function send(event: React.FormEvent) { event.preventDefault(); if (!conversation || !content.trim()) return; setStatus("Отправка…"); const response = await fetch(`/api/ai/conversations/${conversation.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) }); const body = await response.json(); if (!response.ok) { setStatus(body.message ?? "Ошибка"); return; } setMessages((current) => [...current, body.userMessage, body.assistantMessage]); setContent(""); setStatus(""); }
  return <div className="flex min-h-screen flex-col pb-16"><header className="flex items-center justify-between border-b border-slate-700 px-4 py-3"><h1 className="text-lg font-semibold">Финансовый советник</h1><button onClick={create} className="rounded-lg bg-blue-600 px-3 py-2 text-sm">Новый чат</button></header><main className="flex flex-1 flex-col gap-3 px-4 py-4">{!conversation ? <button onClick={create} className="rounded-xl border border-slate-700 p-4 text-left">Начать разговор</button> : <><div className="flex-1 space-y-3">{messages.length === 0 && <p className="rounded-xl bg-slate-800 p-3 text-sm text-slate-300">Задайте вопрос о расходах, платежах или долгах.</p>}{messages.map((item) => <div key={item.id} className={`max-w-[90%] rounded-xl p-3 text-sm ${item.role === "user" ? "ml-auto bg-blue-600" : "bg-slate-800"}`}>{item.content}</div>)}</div><form onSubmit={send} className="flex gap-2"><input aria-label="Сообщение советнику" value={content} maxLength={4000} onChange={(event) => setContent(event.target.value)} placeholder="Например: что оплатить на этой неделе?" className="min-w-0 flex-1 rounded-lg border px-3 py-3" /><button className="rounded-lg bg-blue-600 px-4" disabled={!content.trim()}>Отправить</button></form>{status && <p role="status" className="text-sm text-slate-300">{status}</p>}</>}</main><BottomNav /></div>;
}
