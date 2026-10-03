import BottomNav from "@/components/BottomNav";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-3 border-b border-slate-700">
        <h1 className="text-lg font-semibold">Финансы</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="space-y-6">
          <section>
            <h2 className="text-sm text-slate-400 mb-2">Баланс</h2>
            <div className="text-3xl font-bold">0 ₽</div>
          </section>

          <section>
            <h2 className="text-sm text-slate-400 mb-2">Доступно</h2>
            <div className="text-2xl">0 ₽</div>
          </section>

          <section>
            <h2 className="text-sm text-slate-400 mb-2">Защищено</h2>
            <div className="text-xl">0 ₽</div>
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
