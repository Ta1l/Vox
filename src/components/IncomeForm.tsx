"use client";

import { useState } from "react";
import * as money from "@/lib/money";

export default function IncomeForm() {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [earnedDate, setEarnedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedDate, setExpectedDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountKopecks = money.toKopecks(parseFloat(amount));

    const payload = {
      amountKopecks,
      source: source || undefined,
      description: description || undefined,
      earnedAt: new Date(earnedDate).toISOString(),
      expectedAt: expectedDate || undefined,
    };

    const response = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      // Reset form
      setAmount("");
      setSource("");
      setDescription("");
      setExpectedDate("");
      alert("Доход добавлен");
    } else {
      const error = await response.json();
      alert(`Ошибка: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="amount" className="block text-sm font-medium mb-1">
          Сумма (₽)
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="5000.00"
        />
      </div>

      <div>
        <label htmlFor="source" className="block text-sm font-medium mb-1">
          Источник
        </label>
        <input
          id="source"
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Зарплата, фриланс..."
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Описание
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Дополнительная информация..."
          rows={3}
        />
      </div>

      <div>
        <label htmlFor="earnedDate" className="block text-sm font-medium mb-1">
          Дата заработка
        </label>
        <input
          id="earnedDate"
          type="date"
          required
          value={earnedDate}
          onChange={(e) => setEarnedDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label htmlFor="expectedDate" className="block text-sm font-medium mb-1">
          Ожидаемая дата получения (опционально)
        </label>
        <input
          id="expectedDate"
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800"
      >
        Добавить доход
      </button>
    </form>
  );
}
