"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppIcon from "@/components/AppIcon";

const navItems = [
  { href: "/", label: "Календарь", icon: "calendar" as const },
  { href: "/planning", label: "План", icon: "plan" as const },
  { href: "/chat", label: "AI", icon: "spark" as const },
  { href: "/notifications", label: "Ещё", icon: "more" as const },
];

export default function BottomNav({ onAdd }: { onAdd?: () => void } = {}) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111814]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_28px_#0b100d99] backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-2xl items-center justify-around gap-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
                className={`relative flex h-full w-full flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "text-[#d8c38d]"
                  : "text-[#9fa9a0] hover:text-[#f4f0e7]"
              }`}
            >
              {isActive && <span aria-hidden="true" className="absolute top-1 h-1 w-7 rounded-full bg-[#d8c38d]" />}
              <span className="leading-none"><AppIcon name={item.icon} size={18} /></span>
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button onClick={onAdd} aria-label="Добавить" className="-mt-7 grid h-14 w-14 shrink-0 place-items-center rounded-[1.25rem] bg-[#d8c38d] text-[#172018] shadow-[0_8px_22px_#0007] transition-transform active:scale-90"><AppIcon name="plus" size={25} strokeWidth={1.5} /></button>
      </div>
    </nav>
  );
}
