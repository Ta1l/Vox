"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import AppIcon from "@/components/AppIcon";
import IncomeForm from "@/components/IncomeForm";
import type { DashboardSnapshot } from "@/lib/domain/dashboard/dashboardService";
import { calendarCells, calendarViewModel, compactMoney, dateKey, markerPriority, realizedNet, type CalendarCell, type CalendarEvent } from "@/lib/presentation/calendar";

type DayEvent = CalendarEvent;
const rubles = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const rublesWithKopecks = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amount = (kopecks: number) => (kopecks % 100 ? rublesWithKopecks : rubles).format(kopecks / 100);
const monthLabel = (year: number, month: number) => new Date(year, month - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

export default function HomePage() {
  const now = new Date();
  const todayKey = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [online, setOnline] = useState(true);
  const [draft, setDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadedMonth, setLoadedMonth] = useState("");
  const lastCalendarRequest = useRef(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dashboard", { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Не удалось загрузить сводку"); return response.json() as Promise<DashboardSnapshot>; })
      .then(setDashboard)
      .catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setDashboardError(reason instanceof Error ? reason.message : "Ошибка загрузки"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setMonthLoading(true);
    setEvents([]);
    setCalendarError(null);
    const requestId = ++lastCalendarRequest.current;
    fetch(`/api/calendar?year=${year}&month=${month}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Не удалось загрузить календарь"); return response.json() as Promise<{ events: DayEvent[] }>; })
      .then((data) => { if (requestId !== lastCalendarRequest.current) return; setEvents(data.events ?? []); setLoadedMonth(`${year}-${month}`); setCalendarError(null); })
      .catch((reason: unknown) => { if (controller.signal.aborted || requestId !== lastCalendarRequest.current) return; setCalendarError(reason instanceof Error ? reason.message : "Ошибка календаря"); })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setMonthLoading(false); } });
    return () => controller.abort();
  }, [year, month]);

  const currentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const eventMap = useMemo(() => calendarViewModel(events), [events]);
  const selectedEvent = selectedDate ? eventMap.get(selectedDate) : undefined;

  async function refreshData(): Promise<boolean> {
    const results = await Promise.allSettled([
      fetch(`/api/calendar?year=${year}&month=${month}`).then(async (response) => { if (!response.ok) throw new Error("Календарь не обновился"); return response.json() as Promise<{ events: DayEvent[] }>; }),
      fetch("/api/dashboard").then(async (response) => { if (!response.ok) throw new Error("Сводка не обновилась"); return response.json() as Promise<DashboardSnapshot>; }),
    ]);
    if (results[0].status === "fulfilled") { setEvents(results[0].value.events ?? []); setLoadedMonth(`${year}-${month}`); setCalendarError(null); }
    else setCalendarError("Не удалось обновить календарь. Показатели могут быть устаревшими.");
    if (results[1].status === "fulfilled") { setDashboard(results[1].value); setDashboardError(null); }
    else setDashboardError("Не удалось обновить сводку. Показатели могут быть устаревшими.");
    return results.every((result) => result.status === "fulfilled");
  }

  function selectDate(date: string | null) {
    if (submitting || date === selectedDate) return;
    if (draft && !window.confirm("Сбросить введённую сумму?")) return;
    setDraft(false);
    if (date) { setYear(Number(date.slice(0, 4))); setMonth(Number(date.slice(5, 7))); }
    else if (selectedDate) { const previous = selectedDate; requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-date="${previous}"]`)?.focus()); }
    setSelectedDate(date);
  }

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    if (next.getFullYear() < 2000 || next.getFullYear() > 2100) return;
    setYear(next.getFullYear()); setMonth(next.getMonth() + 1); setSelectedDate(null);
  }
  const shownAmount = (value: number) => privacy ? "••••" : amount(value);

  if (selectedDate) return <DayView date={selectedDate} event={selectedEvent} loading={!calendarError && (monthLoading || loadedMonth !== `${year}-${month}`)} error={calendarError} onRetry={refreshData} onBack={() => selectDate(null)} onSelectDate={selectDate} privacy={privacy} onPrivacy={() => setPrivacy((value) => !value)} online={online} onSaved={refreshData} onDraftChange={setDraft} onPendingChange={setSubmitting} submitting={submitting} />;

  return <div className="min-h-dvh overflow-x-hidden bg-[#101513] pb-[calc(5rem+env(safe-area-inset-bottom))] text-[#f4f0e7]">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))] sm:px-8">
      <div><p className="text-[11px] uppercase tracking-[.22em] text-[#9fa9a0]">Personal Finance OS</p><h1 className="mt-1 text-xl font-semibold capitalize">{monthLabel(now.getFullYear(), now.getMonth() + 1).split(" ")[0]}</h1></div>
      <div className="flex items-center gap-2"><Link aria-label="Уведомления" href="/notifications" className="icon-button"><AppIcon name="bell" size={19} /></Link><button aria-label={privacy ? "Показать суммы" : "Скрыть суммы"} aria-pressed={privacy} onClick={() => setPrivacy((value) => !value)} className="icon-button">{privacy ? <AppIcon name="eye-off" size={18} /> : <AppIcon name="eye" size={18} />}</button></div>
    </header>
    <main className="mx-auto max-w-5xl px-4 sm:px-8">
      <section aria-label="Текущее финансовое состояние" className="relative overflow-hidden border-y border-[#334039] py-4">{dashboard ? <><div className="flex items-end justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-[#9fa99f]">Доступно сейчас</p><p className="mt-1 text-[2.5rem] font-semibold leading-none tracking-tight tabular-nums">{shownAmount(dashboard.financial.availableCashKopecks)}</p></div><span className="mb-1 text-xs text-[#829087]">на {now.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span></div><div className="mt-4 flex h-1 overflow-hidden bg-[#28342d]" aria-hidden="true"><i className="bg-[#d8c38d]" style={{ width: `${dashboard.financial.availableCashKopecks > 0 ? Math.max(8, dashboard.financial.discretionaryAmountKopecks / dashboard.financial.availableCashKopecks * 100) : 0}%` }} /><i className="bg-[#65b8d0]" style={{ width: `${dashboard.financial.availableCashKopecks > 0 ? Math.max(4, dashboard.financial.incomeInTransitKopecks / dashboard.financial.availableCashKopecks * 100) : 0}%` }} /></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#a9b2a9]"><span><i aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#d8c38d]" />Свободно <b className="ml-1 text-[#f4f0e7]">{shownAmount(dashboard.financial.discretionaryAmountKopecks)}</b></span><span><i aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#a9b2a9]" />Защищено <b className="ml-1 text-[#f4f0e7]">{shownAmount(dashboard.financial.protectedAmountKopecks)}</b></span><span><i aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#65b8d0]" />В пути <b className="ml-1 text-[#f4f0e7]">{shownAmount(dashboard.financial.incomeInTransitKopecks)}</b></span></div></> : <div className="h-[6.5rem] animate-pulse bg-[linear-gradient(90deg,#141b17,#1e2a22,#141b17)] bg-[length:200%_100%]" aria-label="Загрузка сводки" />}</section>
      {(dashboardError || calendarError) && <div role="alert" className="mt-3 flex items-center justify-between gap-3 border border-[#a64d47] bg-[#321d1d] px-3 py-2 text-sm text-[#ffd0ca]"><span>{dashboardError ?? calendarError}</span><button className="min-h-9 rounded border border-[#a64d47] px-3" onClick={() => window.location.reload()}>Повторить</button></div>}
      {!online && <p className="mt-3 text-xs text-[#d8c38d">Нет подключения · данные могут быть неактуальны</p>}
      <section className="calendar-section mt-5" aria-labelledby="calendar-title"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#829087]">Ритм денег</p><span className="text-[10px] tabular-nums text-[#66756b]">{monthLoading ? "обновление" : `${events.length} событий`}</span></div><div className="flex items-center justify-between"><button onClick={() => shiftMonth(-1)} disabled={year === 2000 && month === 1} aria-label="Предыдущий месяц" className="month-arrow grid min-h-11 min-w-11 place-items-center text-2xl active:scale-90 disabled:opacity-40">‹</button><div className="text-center"><h2 id="calendar-title" className="text-lg font-semibold capitalize">{monthLabel(year, month)}</h2>{!currentMonth && <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }} className="mt-1 min-h-11 px-2 text-xs text-[#65b8d0]">Сегодня · {dashboard ? shownAmount(dashboard.financial.availableCashKopecks) : "загрузка"}</button>}</div><button onClick={() => shiftMonth(1)} disabled={year === 2100 && month === 12} aria-label="Следующий месяц" className="month-arrow grid min-h-11 min-w-11 place-items-center text-2xl active:scale-90 disabled:opacity-40">›</button></div><div className="mt-4 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-[.14em] text-[#7f8c82]">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}</div><div className={`calendar-grid mt-2 grid grid-cols-7 gap-x-1.5 gap-y-1.5 transition-opacity ${monthLoading ? "opacity-50" : "opacity-100"}`}>{calendarCells(year, month).map((cell, index) => <CalendarDay key={cell?.date ?? `empty-${index}`} cell={cell} event={cell ? eventMap.get(cell.date) : undefined} today={cell?.date === todayKey} selected={cell?.date === selectedDate} privacy={privacy} onClick={() => cell && selectDate(cell.date)} />)}</div><div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-[#829087]" aria-label="Обозначения календаря"><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#65b8d0]" />доход</span><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#f0b65b]" />платёж</span><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#ef665b]" />риск</span></div>{!loading && !calendarError && events.length === 0 && <p className="py-4 text-center text-sm text-[#8d998f]">В этом месяце нет событий</p>}</section>
    </main>
    <BottomNav onAdd={() => setActionsOpen(true)} />{actionsOpen && <ActionSheet onClose={() => setActionsOpen(false)} />}
  </div>;
}

function CalendarDay({ cell, event, today, selected, privacy, onClick }: { cell: CalendarCell; event?: DayEvent; today: boolean; selected: boolean; privacy: boolean; onClick: () => void }) {
  if (!cell) return <div aria-hidden="true" className="min-h-[clamp(42px,11vw,58px)]" />;
  const net = realizedNet(event); const marker = markerPriority(event); const signals = event ? [{ show: event.receivedIncome > 0 || event.expenses > 0, color: net < 0 ? "bg-[#ee806f]" : "bg-[#8bc6a1]", label: net < 0 ? "расход" : "доход" }, { show: event.inTransitIncome > 0 || event.expectedIncome > 0 || event.earnedIncome > 0, color: "bg-[#65b8d0]", label: "заработок или ожидание" }, { show: event.scheduledPayments.length > 0, color: marker === "risk" ? "bg-[#ef665b]" : "bg-[#f0b65b]", label: marker === "risk" ? "риск" : "платёж" }] : [];
  return <button data-date={cell.date} onClick={onClick} aria-label={`Открыть ${cell.date}`} aria-pressed={selected} className={`calendar-day group relative flex min-h-[clamp(46px,12vw,62px)] min-w-0 flex-col items-start justify-between p-1.5 text-left transition-[background,transform] duration-200 active:scale-95 motion-reduce:transition-none ${selected ? "is-selected" : today ? "is-today" : ""}`}><span className={`grid h-6 w-6 place-items-center text-sm tabular-nums ${today && !selected ? "today-number" : ""}`}>{cell.day}</span>{net !== 0 && <span className={`max-w-full truncate text-[clamp(9px,2.5vw,12px)] font-semibold tabular-nums ${net < 0 ? "text-[#ee968a]" : "text-[#9fc9b0]"}`}>{privacy ? "••••" : compactMoney(net)}</span>}<span className="flex min-h-2 items-center gap-1" aria-label={signals.filter((item) => item.show).map((item) => item.label).join(", ") || (marker === "risk" ? "Есть риск" : undefined)}>{signals.map((item) => item.show && <i key={item.label} aria-hidden="true" className={`h-1.5 w-2.5 rounded-full ${item.color}`} />)}</span></button>;
}

function DayView({ date, event, loading, error, onRetry, onBack, onSelectDate, privacy, onPrivacy, online, onSaved, onDraftChange, onPendingChange, submitting }: {
  date: string; event?: DayEvent; loading: boolean; error: string | null; onRetry: () => Promise<boolean>;
  onBack: () => void; onSelectDate: (date: string) => void; privacy: boolean; onPrivacy: () => void;
  online: boolean; onSaved: () => Promise<boolean>; onDraftChange: (draft: boolean) => void;
  onPendingChange: (pending: boolean) => void; submitting: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [date]);
  const parsed = new Date(`${date}T00:00:00Z`);
  const title = parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
  const weekday = parsed.toLocaleDateString("ru-RU", { weekday: "long", timeZone: "UTC" });
  const adjacent = [-2, -1, 0, 1, 2].map((offset) => {
    const day = new Date(parsed); day.setUTCDate(day.getUTCDate() + offset);
    return { label: day.getUTCDate(), date: day.toISOString().slice(0, 10) };
  });
  const display = (value: number) => privacy ? "••••" : amount(value);
  const net = realizedNet(event);
  const hasDetails = !!event && !!(event.earnedIncome || event.inTransitIncome || event.receivedIncome || event.expenses || event.expectedIncome || event.scheduledPayments.length);
  const future = date > dateKey(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  return <div className="min-h-dvh bg-[#101513] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[#f4f0e7]">
    <header className="mx-auto flex max-w-2xl items-center justify-between px-4 pb-2 pt-[calc(.75rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-2"><button onClick={onBack} disabled={submitting} className="icon-button" aria-label="Назад"><AppIcon name="arrow-left" /></button><span className="text-sm text-[#a9b2a9]">Календарь</span></div>
      <button onClick={onPrivacy} className="icon-button" aria-label={privacy ? "Показать суммы" : "Скрыть суммы"} aria-pressed={privacy}><AppIcon name={privacy ? "eye-off" : "eye"} /></button>
    </header>
    <main className="mx-auto max-w-2xl px-4">
      <nav aria-label="Соседние дни" className="flex items-center justify-between gap-2 overflow-x-auto border-y border-[#334039] py-2">
        {adjacent.map((item) => <button key={item.date} onClick={() => onSelectDate(item.date)} disabled={submitting || Number(item.date.slice(0,4)) < 2000 || Number(item.date.slice(0,4)) > 2100} aria-label={`Открыть ${item.date}`} aria-current={item.date === date ? "date" : undefined} className={`grid min-h-11 min-w-11 place-items-center rounded-full text-sm disabled:opacity-40 ${item.date === date ? "bg-[#d8c38d] font-semibold text-[#172018]" : "text-[#a9b2a9]"}`}>{item.label}</button>)}
      </nav>
      <section className="pt-5">
        <p className="text-sm capitalize text-[#a9b2a9]">{weekday} · {date.slice(0,4)}</p>
        <h1 ref={heading} tabIndex={-1} className="mt-1 text-[28px] font-semibold leading-[34px] capitalize outline-none">{title}</h1>
        {loading ? <div aria-busy="true" aria-label="Загрузка показателей дня" className="mt-5 h-40 animate-pulse rounded-lg bg-[#172019]" /> : error ? <div role="alert" className="mt-5 rounded-lg border border-[#a64d47] bg-[#321d1d] p-4 text-sm text-[#ffd0ca]">{error}<button onClick={() => void onRetry()} className="mt-3 block min-h-11 rounded border border-[#a64d47] px-4">Повторить загрузку</button></div> : <>
          <div className="day-metrics mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-[#334039] py-4">
            <Stat label="Заработано" value={display(event?.earnedIncome ?? 0)} />
            <Stat label="В пути" value={display(event?.inTransitIncome ?? 0)} accent="text-[#65b8d0]" />
            <Stat label="Получено" value={display(event?.receivedIncome ?? 0)} />
            <Stat label="Потрачено" value={display(event?.expenses ?? 0)} />
          </div>
          <div className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-[#a9b2a9]">Получено − потрачено</span><span className={`tabular-nums text-base ${net < 0 ? "text-[#ef8b80]" : "text-[#f4f0e7]"}`}>{display(net)}</span></div>
        </>}
        <details className="border-t border-[#334039] py-2 text-[13px] leading-5 text-[#a9b2a9]"><summary className="cursor-pointer py-2 text-[#d8c38d]">Как считаются показатели</summary><p className="pb-2">Заработано — по дате работы. В пути — заработанное за этот день в статусах EARNED и IN_TRANSIT. Получено — по дате поступления, в том числе за прошлую работу. Потрачено — фактические расходы. Задержанные выплаты остаются в ожидаемых, но не во «В пути».</p></details>
      </section>
      <div className="mt-4">{future ? <p className="rounded-xl border border-[#334039] bg-[#172019] p-4 text-sm">Заработок можно записать за сегодня или прошедший день.</p> : <IncomeForm key={date} date={date} online={online} onSaved={onSaved} onDraftChange={onDraftChange} onPendingChange={onPendingChange} />}</div>
      <section className="mt-6" aria-labelledby="day-details"><h2 id="day-details" className="text-sm font-semibold uppercase tracking-[.12em] text-[#a9b2a9]">Детали дня</h2>
        {loading ? <p className="mt-3 text-sm text-[#a9b2a9]">Загрузка записей…</p> : error ? <p className="mt-3 text-sm text-[#a9b2a9]">Детали недоступны до обновления.</p> : !hasDetails ? <p className="mt-3 text-sm text-[#a9b2a9]">Пока нет записей за этот день.</p> : <div className="mt-2 divide-y divide-[#334039]">
          {event!.earnedIncome > 0 && <EventRow title="Заработано за день" value={display(event!.earnedIncome)} />}
          {event!.inTransitIncome > 0 && <EventRow title="Из заработанного в пути" value={display(event!.inTransitIncome)} />}
          {event!.receivedIncome > 0 && <EventRow title="Получено" value={display(event!.receivedIncome)} />}
          {event!.expenses > 0 && <EventRow title="Потрачено" value={display(event!.expenses)} />}
          {event!.expectedIncome > 0 && <EventRow title="Ожидаемые выплаты по дате выплаты" value={display(event!.expectedIncome)} />}
          {event!.scheduledPayments.map((payment, index) => <EventRow key={`${payment.name}-${payment.amountKopecks}-${index}`} title={payment.name} subtitle={`${{ PENDING: "Запланировано", PAID: "Оплачено", OVERDUE: "Просрочено", SKIPPED: "Пропущено" }[payment.status] ?? payment.status} · ${{ HARD: "Защищено", NEGOTIABLE: "Согласуемо", FLEXIBLE: "Гибко" }[payment.protectionLevel] ?? payment.protectionLevel}`} value={display(payment.amountKopecks)} />)}
        </div>}
      </section>
      <section className="mt-6 rounded-xl border border-[#334039] bg-[#172019] p-4"><h2 className="font-semibold">Траты по скриншоту</h2><p className="mt-1 text-sm text-[#a9b2a9]">Пока недоступно. Добавление и распознавание скриншотов появятся позже.</p></section>
      <section className="mt-4 rounded-xl border border-[#334039] bg-[#172019] p-4"><h2 className="font-semibold">Инсайт дня</h2><p className="mt-1 text-sm text-[#a9b2a9]">Пока недоступно. Анализ заработка по дням появится позже.</p></section>
    </main>
  </div>;
}
function Stat({ label, value, accent = "text-[#f4f0e7]" }: { label: string; value: string; accent?: string }) { return <div className="min-w-0"><p className="text-sm text-[#a9b2a9]">{label}</p><p className={`mt-1 break-words text-[clamp(16px,5.5vw,24px)] leading-[30px] tabular-nums ${accent}`}>{value}</p></div>; }
function EventRow({ title, subtitle, value }: { title: string; subtitle?: string; value: string }) { return <div className="flex min-h-14 flex-wrap items-start justify-between gap-3 py-3 text-sm"><span className="min-w-0 flex-1 break-words"><span className="block font-medium">{title}</span>{subtitle && <span className="mt-1 block text-xs text-[#a9b2a9]">{subtitle}</span>}</span><span className="max-w-full break-words text-right tabular-nums">{value}</span></div>; }
function ActionSheet({ onClose }: { onClose: () => void }) { const actions = [{ label: "Расход", href: "/expenses" }, { label: "Доход", href: "/income" }, { label: "Обязательство", href: "/planning" }, { label: "Платёж по долгу", href: "/debts" }, { label: "Пополнение цели", href: "/goals" }]; return <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}><div role="dialog" aria-modal="true" aria-labelledby="add-title" className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl border-t border-[#334039] bg-[#18201c] p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]" onClick={(event) => event.stopPropagation()}><div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#526157]" /><div className="flex items-center justify-between"><h2 id="add-title" className="text-lg font-semibold">Добавить</h2><button onClick={onClose} className="min-h-11 min-w-11 text-xl" aria-label="Закрыть">×</button></div><div className="mt-3 grid gap-2">{actions.map((action) => <Link key={action.href} href={action.href} onClick={onClose} className="min-h-12 border-b border-[#334039] py-3 text-[#dfe5dc]">{action.label}<span aria-hidden="true" className="float-right text-[#7f8c82]">›</span></Link>)}</div></div></div>; }
