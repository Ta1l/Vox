"use client";

import { useEffect, useState } from "react";
import Calendar from "@/components/Calendar";
import BottomNav from "@/components/BottomNav";

interface DayEvent {
  date: string;
  earnedIncome: number;
  receivedIncome: number;
  expectedIncome: number;
  expenses: number;
}

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []));
  }, [year, month]);

  const monthName = new Date(year, month - 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  const selectedEvent = selectedDate ? events.find((e) => e.date === selectedDate) : null;

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-3 border-b border-slate-700">
        <h1 className="text-lg font-semibold capitalize">{monthName}</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        <Calendar
          year={year}
          month={month}
          events={events}
          onDateClick={(date) => setSelectedDate(date === selectedDate ? null : date)}
        />

        {selectedEvent && (
          <div className="mt-4 p-4 bg-slate-800 rounded-lg space-y-2">
            <div className="text-sm font-medium text-slate-400">
              {new Date(selectedEvent.date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
            </div>
            {selectedEvent.receivedIncome > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Получено</span>
                <span>{(selectedEvent.receivedIncome / 100).toFixed(2)} ₽</span>
              </div>
            )}
            {selectedEvent.expectedIncome > 0 && (
              <div className="flex justify-between text-blue-400">
                <span>Ожидается</span>
                <span>{(selectedEvent.expectedIncome / 100).toFixed(2)} ₽</span>
              </div>
            )}
            {selectedEvent.expenses > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Расходы</span>
                <span>{(selectedEvent.expenses / 100).toFixed(2)} ₽</span>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
