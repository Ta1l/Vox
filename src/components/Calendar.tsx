"use client";

import { useState } from "react";
import * as money from "@/lib/money";

interface DayEvent {
  date: string;
  earnedIncome: number;
  receivedIncome: number;
  expectedIncome: number;
  expenses: number;
}

interface CalendarProps {
  year: number;
  month: number;
  events: DayEvent[];
  onDateClick: (date: string) => void;
}

export default function Calendar({ year, month, events, onDateClick }: CalendarProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

  const eventsMap = new Map(events.map((e) => [e.date, e]));

  const weeks = [];
  let currentWeek = new Array(7).fill(null);
  let dayIndex = 0;

  for (let i = 0; i < adjustedFirstDay; i++) {
    currentWeek[i] = null;
    dayIndex++;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = dayIndex % 7;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    currentWeek[weekday] = { day, dateStr, event: eventsMap.get(dateStr) };
    dayIndex++;

    if (weekday === 6) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }

  if (currentWeek.some((d) => d !== null)) {
    weeks.push(currentWeek);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-xs text-slate-400 mb-2">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <div key={d} className="text-center font-medium">
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((cell, ci) => {
            if (!cell) {
              return <div key={ci} className="aspect-square" />;
            }

            const { day, dateStr, event } = cell;
            const hasActivity = event && (event.earnedIncome > 0 || event.expenses > 0);

            return (
              <button
                key={ci}
                onClick={() => onDateClick(dateStr)}
                className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center p-1 ${
                  hasActivity
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="font-medium">{day}</div>
                {event && (
                  <div className="flex gap-1 text-[8px] mt-1">
                    {event.receivedIncome > 0 && (
                      <span className="text-green-400">↓</span>
                    )}
                    {event.expenses > 0 && (
                      <span className="text-red-400">↑</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
