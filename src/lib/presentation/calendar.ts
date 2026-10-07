export type CalendarEvent = {
  date: string;
  earnedIncome: number;
  inTransitIncome: number;
  receivedIncome: number;
  expectedIncome: number;
  expenses: number;
  scheduledPayments: Array<{ name: string; amountKopecks: number; status: string; protectionLevel: string }>;
};

export type CalendarCell = { day: number; date: string } | null;

export const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function calendarCells(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const cells: CalendarCell[] = Array(offset).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, date: dateKey(year, month, day) });
  while (cells.length % 7) cells.push(null);
  return cells;
}

export const realizedNet = (event?: Pick<CalendarEvent, "receivedIncome" | "expenses">) =>
  (event?.receivedIncome ?? 0) - (event?.expenses ?? 0);

export function markerPriority(event?: CalendarEvent) {
  if (!event) return "none" as const;
  if (event.scheduledPayments.some((payment) => payment.status === "OVERDUE" || payment.protectionLevel === "HARD")) return "risk" as const;
  if (event.scheduledPayments.length) return "scheduled" as const;
  if (event.expectedIncome > 0 || event.inTransitIncome > 0) return "incoming" as const;
  return "none" as const;
}

export function compactMoney(kopecks: number) {
  const sign = kopecks < 0 ? "−" : kopecks > 0 ? "+" : "";
  const value = Math.abs(kopecks) / 100;
  if (value >= 1_000_000) return `${sign}${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${sign}${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}k`;
  return `${sign}${Math.round(value)}`;
}

export function calendarViewModel(events: CalendarEvent[]) {
  return new Map(events.map((event) => [event.date, event]));
}
