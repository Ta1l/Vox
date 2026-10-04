"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    if (!response.ok) { setError("Не удалось войти"); return; }
    window.location.assign(new URLSearchParams(window.location.search).get("next") || "/");
  }
  return <main className="min-h-screen bg-slate-900 text-slate-100 p-4 flex items-center justify-center"><form onSubmit={submit} className="w-full max-w-sm space-y-4"><h1 className="text-2xl font-semibold">Personal Finance OS</h1><p className="text-sm text-slate-400">Введите токен доступа приложения.</p><input aria-label="Токен доступа" type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} className="w-full rounded-lg bg-slate-800 p-3" required /><button className="w-full rounded-lg bg-sky-600 p-3">Войти</button>{error && <p className="text-red-400">{error}</p>}</form></main>;
}
