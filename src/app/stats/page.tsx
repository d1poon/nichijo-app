"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getWeekMonday,
  toDateString,
  formatMinutes,
  type WeeklyData,
  type DayStats,
} from "@/lib/stats";

// ---- ユーティリティ ----

function shiftWeek(monday: string, delta: number): string {
  const d = new Date(monday + "T00:00:00");
  d.setDate(d.getDate() + delta * 7);
  return toDateString(d);
}

function formatWeekRange(monday: string): string {
  const start = new Date(monday + "T00:00:00");
  const end = new Date(monday + "T00:00:00");
  end.setDate(end.getDate() + 4);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`;
  return `${start.getFullYear()}年 ${fmt(start)}〜${fmt(end)}`;
}

function workLevelColor(minutes: number | null): string {
  if (!minutes) return "text-gray-400";
  const h = minutes / 60;
  if (h >= 10) return "text-red-500 font-bold";
  if (h >= 9) return "text-orange-500 font-semibold";
  return "text-gray-700";
}

// ---- 日カード ----

function DayCard({ day }: { day: DayStats }) {
  const allCats = [...day.amCategories, ...day.pmCategories];
  return (
    <div
      className={`rounded-2xl border p-4 ${
        day.exists ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-base font-bold text-gray-800">
          {day.dayName}曜&nbsp;
          <span className="text-sm font-normal text-gray-400">
            {day.date.slice(5).replace("-", "/")}
          </span>
        </span>
        {day.exists && day.workMinutes ? (
          <span className={`text-sm ${workLevelColor(day.workMinutes)}`}>
            {day.startTime}〜{day.endTime}&nbsp;
            <span className="font-semibold">{formatMinutes(day.workMinutes)}</span>
          </span>
        ) : (
          <span className="text-xs text-gray-400">未入力</span>
        )}
      </div>

      {day.exists ? (
        <div className="flex flex-col gap-1 text-sm text-gray-600">
          {day.amCategories.length > 0 && (
            <div>
              <span className="mr-1 text-xs text-gray-400">午前</span>
              {day.amCategories.join("・")}
            </div>
          )}
          {day.pmCategories.length > 0 && (
            <div>
              <span className="mr-1 text-xs text-gray-400">午後</span>
              {day.pmCategories.join("・")}
            </div>
          )}
          {allCats.length === 0 && (
            <span className="text-gray-400">作業区分なし</span>
          )}
          {day.memo && (
            <p className="mt-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
              {day.memo}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">日報なし</p>
      )}
    </div>
  );
}

// ---- カテゴリランキング ----

function CategoryRanking({
  ranking,
}: {
  ranking: { name: string; count: number }[];
}) {
  if (ranking.length === 0) {
    return <p className="text-sm text-gray-400">データなし</p>;
  }
  const max = ranking[0].count;
  return (
    <div className="flex flex-col gap-2">
      {ranking.map((item, i) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className="w-4 text-xs text-gray-400">{i + 1}</span>
          <span className="w-28 shrink-0 truncate text-sm text-gray-700">
            {item.name}
          </span>
          <div className="flex flex-1 items-center gap-2">
            <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-3 rounded-full bg-blue-500 transition-all"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-sm font-semibold text-gray-700">
              {item.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- メインページ ----

export default function StatsPage() {
  const [monday, setMonday] = useState(() => getWeekMonday());
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (mon: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weekly?week=${mon}`);
      if (!res.ok) throw new Error("データ取得に失敗しました");
      setData((await res.json()) as WeeklyData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラー");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(monday);
  }, [monday, fetchData]);

  const isThisWeek = monday === getWeekMonday();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">

      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 active:bg-gray-50"
        >
          ← 日報入力
        </Link>
        <h1 className="text-lg font-bold">週次集計</h1>
        <div className="w-16" />
      </div>

      {/* 週ナビゲーション */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setMonday((m) => shiftWeek(m, -1))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 active:bg-gray-50"
        >
          ‹
        </button>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-sm font-semibold text-gray-800">
            {formatWeekRange(monday)}
          </span>
          {!isThisWeek && (
            <button
              onClick={() => setMonday(getWeekMonday())}
              className="mt-0.5 text-xs text-blue-500 underline"
            >
              今週に戻る
            </button>
          )}
        </div>
        <button
          onClick={() => setMonday((m) => shiftWeek(m, 1))}
          disabled={isThisWeek}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 active:bg-gray-50 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {/* エラー */}
      {!loading && error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* データ表示 */}
      {!loading && data && (
        <div className="flex flex-col gap-6">

          {/* 日別カード */}
          <section className="flex flex-col gap-3">
            {data.days.map((day) => (
              <DayCard key={day.date} day={day} />
            ))}
          </section>

          {/* 合計実働時間 */}
          {data.totalWorkMinutes > 0 && (
            <section className="rounded-2xl bg-blue-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                今週の合計実働時間
              </p>
              <p className="mt-1 text-3xl font-bold text-blue-700">
                {formatMinutes(data.totalWorkMinutes)}
              </p>
            </section>
          )}

          {/* 作業区分ランキング */}
          <section className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              作業区分ランキング
            </p>
            <CategoryRanking ranking={data.categoryRanking} />
          </section>
        </div>
      )}
    </main>
  );
}
