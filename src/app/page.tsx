import Link from "next/link";
import DailyReportForm from "@/components/DailyReportForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">日報入力</h1>
        <Link
          href="/stats"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 active:bg-gray-50"
        >
          週次集計 →
        </Link>
      </div>
      <DailyReportForm />
    </main>
  );
}
