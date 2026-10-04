"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Главная", icon: "🏠" },
  { href: "/calendar", label: "Календарь", icon: "📅" },
  { href: "/income", label: "Доходы", icon: "💰" },
  { href: "/expenses", label: "Расходы", icon: "💸" },
  { href: "/debts", label: "Долги", icon: "📉" },
  { href: "/goals", label: "Цели", icon: "🎯" },
  { href: "/envelopes", label: "Резервы", icon: "🛡️" },
  { href: "/planning", label: "План", icon: "🗓️" },
  { href: "/chat", label: "Советник", icon: "💬" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive
                  ? "text-sky-400 bg-slate-700/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
