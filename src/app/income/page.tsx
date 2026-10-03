import BottomNav from "@/components/BottomNav";

export default function IncomePage() {
  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="px-4 py-3 border-b border-slate-700">
        <h1 className="text-lg font-semibold">Доходы</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <p className="text-slate-400">Заработанные и ожидаемые доходы</p>
      </main>

      <BottomNav />
    </div>
  );
}
