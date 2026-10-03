"use client";

import { useState } from "react";
import * as money from "@/lib/money";

const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Health",
  "Other",
];

export default function ExpenseForm() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountKopecks = money.toKopecks(parseFloat(amount));

    const payload = {
      amountKopecks,
      category,
      title,
      comment: comment || undefined,
      expenseDate: new Date(expenseDate).toISOString(),
    };

    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      setAmount("");
      setTitle("");
      setComment("");
      alert("Расход добавлен");
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
          placeholder="500.00"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1">
          Категория
        </label>
        <select
          id="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          {DEFAULT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Название
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Покупка продуктов..."
        />
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium mb-1">
          Комментарий
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Дополнительная информация..."
          rows={3}
        />
      </div>

      <div>
        <label htmlFor="expenseDate" className="block text-sm font-medium mb-1">
          Дата расхода
        </label>
        <input
          id="expenseDate"
          type="date"
          required
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800"
      >
        Добавить расход
      </button>
    </form>
  );
}
