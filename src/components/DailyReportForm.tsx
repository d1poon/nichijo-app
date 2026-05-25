"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  WORK_CATEGORIES,
  FAILURE_OPTIONS,
  IMPROVEMENT_OPTIONS,
  QUICK_END_TIMES,
  LEARNING_FIELDS,
  LEARNING_DURATIONS,
  type WorkCategory,
  type DailyReport,
} from "@/types/report";
import { saveDraft, loadDraft, clearDraft, hasMeaningfulDraft } from "@/lib/draft";
import { getJapaneseHolidayName } from "@/lib/holidays";

// ---- 曜日テーマ（B2） ----
// Tailwind クラスは完全な文字列として列挙（パージ対策）
const DAY_THEMES = [
  // 日
  { submit: "bg-red-500",     tab: "bg-red-500",     chipBorder: "border-red-500",     chipBg: "bg-red-50",     chipText: "text-red-700"     },
  // 月
  { submit: "bg-blue-600",    tab: "bg-blue-600",    chipBorder: "border-blue-600",    chipBg: "bg-blue-50",    chipText: "text-blue-700"    },
  // 火
  { submit: "bg-rose-500",    tab: "bg-rose-500",    chipBorder: "border-rose-500",    chipBg: "bg-rose-50",    chipText: "text-rose-700"    },
  // 水
  { submit: "bg-emerald-600", tab: "bg-emerald-600", chipBorder: "border-emerald-600", chipBg: "bg-emerald-50", chipText: "text-emerald-700" },
  // 木
  { submit: "bg-orange-500",  tab: "bg-orange-500",  chipBorder: "border-orange-500",  chipBg: "bg-orange-50",  chipText: "text-orange-700"  },
  // 金
  { submit: "bg-violet-600",  tab: "bg-violet-600",  chipBorder: "border-violet-600",  chipBg: "bg-violet-50",  chipText: "text-violet-700"  },
  // 土
  { submit: "bg-sky-500",     tab: "bg-sky-500",     chipBorder: "border-sky-500",     chipBg: "bg-sky-50",     chipText: "text-sky-700"     },
] as const;

// ---- ユーティリティ ----

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAYS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;
const DAY_BADGE_COLORS: Record<number, string> = {
  0: "bg-red-100 text-red-600",
  6: "bg-blue-100 text-blue-600",
};

function getDayInfo(dateStr: string) {
  if (!dateStr) return { label: "", badgeClass: "", dayIndex: 1 };
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return {
    label: `${DAYS_JA[day]}曜日`,
    badgeClass: DAY_BADGE_COLORS[day] ?? "bg-gray-100 text-gray-600",
    dayIndex: day,
  };
}

const BREAK_MINUTES = 60; // 昼休憩

/** 実働時間を計算（A1）：総拘束時間 - 昼休憩1時間 */
function calcWorkDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const raw = eh * 60 + em - (sh * 60 + sm);
  const actual = raw - BREAK_MINUTES;
  if (actual <= 0) return null;
  const endHour = eh + em / 60;
  return {
    text: `${Math.floor(actual / 60)}h${actual % 60 > 0 ? `${actual % 60}m` : ""}`,
    level: endHour >= 21 ? "danger" : endHour >= 19 ? "warn" : "ok",
  };
}

function toggleChip(selected: string[], value: string): string[] {
  if (value === "特になし") {
    return selected.includes("特になし") ? [] : ["特になし"];
  }
  const without = selected.filter((v) => v !== "特になし");
  return without.includes(value)
    ? without.filter((v) => v !== value)
    : [...without, value];
}

function toggleCategory(selected: WorkCategory[], value: WorkCategory): WorkCategory[] {
  return selected.includes(value)
    ? selected.filter((c) => c !== value)
    : [...selected, value];
}

// ---- サブコンポーネント ----

function ChipGroup({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(toggleChip(selected, opt))}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors active:opacity-70 ${
              active
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function WorkChips({
  selected,
  onChange,
  theme,
}: {
  selected: WorkCategory[];
  onChange: (next: WorkCategory[]) => void;
  theme: (typeof DAY_THEMES)[number];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {WORK_CATEGORIES.map((cat) => {
        const active = selected.includes(cat);
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(toggleCategory(selected, cat))}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors active:opacity-70 ${
              active
                ? `border-2 ${theme.chipBorder} ${theme.chipBg} ${theme.chipText}`
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            {active && <span className="mr-0.5 text-xs">✓</span>}
            {cat}
          </button>
        );
      })}
    </div>
  );
}

// ---- メインフォーム ----

type Status = "idle" | "loading" | "success" | "error";
type Tab = "am" | "pm";

export default function DailyReportForm() {
  const [date, setDate] = useState(todayString());
  const [isDayOff, setIsDayOff] = useState(false);
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("18:15");
  const [activeTab, setActiveTab] = useState<Tab>("am");
  const [amCategories, setAmCategories] = useState<WorkCategory[]>([]);
  const [pmCategories, setPmCategories] = useState<WorkCategory[]>([]);
  const [failures, setFailures] = useState<string[]>([]);
  const [failureMemo, setFailureMemo] = useState("");
  const [improvements, setImprovements] = useState<string[]>([]);
  const [improvementMemo, setImprovementMemo] = useState("");
  const [memo, setMemo] = useState("");
  const [learningFields, setLearningFields] = useState<string[]>([]);
  const [learningContent, setLearningContent] = useState("");
  const [learningDuration, setLearningDuration] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [savedDate, setSavedDate] = useState("");
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const draftLoadedRef = useRef(false);

  // ---- 曜日テーマ（B2） ----
  const theme = useMemo(() => {
    const { dayIndex } = getDayInfo(date);
    return DAY_THEMES[dayIndex];
  }, [date]);

  // ---- 祝日検出 ----
  const holidayName = useMemo(() => getJapaneseHolidayName(date), [date]);

  // ---- 実働時間（A1） ----
  const workDuration = useMemo(
    () => calcWorkDuration(startTime, endTime),
    [startTime, endTime]
  );

  // ---- 下書き復元 ----
  useEffect(() => {
    const draft = loadDraft();
    if (draft && hasMeaningfulDraft(draft)) {
      setIsDayOff(draft.isDayOff ?? false);
      setStartTime(draft.startTime);
      setEndTime(draft.endTime);
      setAmCategories(draft.amCategories);
      setPmCategories(draft.pmCategories);
      setFailures(draft.failures);
      setFailureMemo(draft.failureMemo);
      setImprovements(draft.improvements);
      setImprovementMemo(draft.improvementMemo);
      setMemo(draft.memo ?? "");
      setLearningFields(draft.learningFields ?? []);
      setLearningContent(draft.learningContent ?? "");
      setLearningDuration(draft.learningDuration ?? "");
      setShowDraftBanner(true);
    }
    draftLoadedRef.current = true;
  }, []);

  // ---- 自動保存 ----
  useEffect(() => {
    if (!draftLoadedRef.current) return;
    saveDraft({
      isDayOff, startTime, endTime, amCategories, pmCategories,
      failures, failureMemo, improvements, improvementMemo, memo,
      learningFields, learningContent, learningDuration,
    });
  }, [isDayOff, startTime, endTime, amCategories, pmCategories, failures, failureMemo, improvements, improvementMemo, memo, learningFields, learningContent, learningDuration]);

  const dayInfo = getDayInfo(date);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDayOff && amCategories.length === 0 && pmCategories.length === 0) {
      setErrorMessage("午前または午後の作業内容を選択してください");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMessage("");

    const report: DailyReport = {
      date, isDayOff, startTime, endTime,
      amCategories, pmCategories,
      failures, failureMemo,
      improvements, improvementMemo,
      memo,
      learningFields, learningContent, learningDuration,
    };

    try {
      // iOS Chrome (WKWebView) では string body が ByteString 変換され日本語でエラーになるため
      // Blob で送信してバイナリとして扱わせる
      const bodyBlob = new Blob([JSON.stringify(report)], {
        type: "application/json",
      });
      const res = await fetch("/api/save", {
        method: "POST",
        body: bodyBlob,
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "送信失敗");

      clearDraft();
      setSavedDate(date);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "送信に失敗しました");
      setStatus("error");
    }
  }

  function handleReset() {
    setStatus("idle");
    setDate(todayString());
    setIsDayOff(false);
    setStartTime("09:30");
    setEndTime("18:15");
    setActiveTab("am");
    setAmCategories([]);
    setPmCategories([]);
    setFailures([]);
    setFailureMemo("");
    setImprovements([]);
    setImprovementMemo("");
    setMemo("");
    setLearningFields([]);
    setLearningContent("");
    setLearningDuration("");
    setErrorMessage("");
    setShowDraftBanner(false);
  }

  // ---- 送信成功 ----
  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-6xl">✅</div>
        <p className="text-xl font-bold text-green-700">保存しました</p>
        <p className="text-sm text-gray-500">{savedDate} の日報を GitHub に保存しました</p>
        <a
          href="/stats"
          className="flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-bold text-white shadow active:opacity-80"
        >
          📊 週次集計を見る
        </a>
        <button
          onClick={handleReset}
          className="rounded-2xl border border-gray-300 bg-white px-8 py-3 text-gray-700 active:opacity-70"
        >
          新しい日報を入力
        </button>
      </div>
    );
  }

  // ---- フォーム ----
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">

      {/* 下書き復元バナー */}
      {showDraftBanner && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>前回の下書きを復元しました</span>
          <button
            type="button"
            onClick={() => { clearDraft(); handleReset(); }}
            className="font-semibold text-amber-600 underline"
          >
            クリア
          </button>
        </div>
      )}

      {/* 日付 + 曜日 + 全休 */}
      <section className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">日付</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-12 flex-1 rounded-xl border border-gray-300 px-4 text-base focus:border-blue-500 focus:outline-none"
          />
          {dayInfo.label && (
            <span className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${dayInfo.badgeClass}`}>
              {dayInfo.label}
            </span>
          )}
          {/* 全休ピル */}
          <button
            type="button"
            onClick={() => setIsDayOff((v) => !v)}
            className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition-colors active:opacity-70 ${
              isDayOff
                ? "border-amber-400 bg-amber-400 text-white"
                : "border-amber-300 bg-white text-amber-600"
            }`}
          >
            {isDayOff ? "✓ 全休" : "全休"}
          </button>
        </div>

        {/* 祝日バッジ（小さく） */}
        {holidayName && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-sm">🎌</span>
            <span className="text-sm text-amber-600">{holidayName}</span>
          </div>
        )}
      </section>

      {/* 以下は全休のとき非表示 */}
      {!isDayOff && <>

      {/* 勤務時間 + 実働時間（A1） */}
      <section className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">勤務時間</label>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="h-12 flex-1 rounded-xl border border-gray-300 px-4 text-base focus:border-blue-500 focus:outline-none"
          />
          <span className="text-gray-400">〜</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="h-12 flex-1 rounded-xl border border-gray-300 px-4 text-base focus:border-blue-500 focus:outline-none"
          />
        </div>
        {/* 実働時間バッジ */}
        {workDuration && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">実働</span>
            <span
              className={`text-sm font-semibold ${
                workDuration.level === "danger"
                  ? "text-red-500"
                  : workDuration.level === "warn"
                  ? "text-orange-500"
                  : "text-gray-700"
              }`}
            >
              {workDuration.text}
            </span>
            {workDuration.level === "danger" && (
              <span className="text-xs text-red-400">⚠ 10時間超</span>
            )}
            {workDuration.level === "warn" && (
              <span className="text-xs text-orange-400">残業</span>
            )}
          </div>
        )}
        {/* 終了時刻プリセット */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_END_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEndTime(t)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors active:opacity-70 ${
                endTime === t
                  ? `${theme.tab} border-transparent text-white`
                  : "border-gray-300 bg-white text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* 作業内容 */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">作業内容</label>
        <div className="flex overflow-hidden rounded-xl border border-gray-200">
          {(["am", "pm"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === "am" ? amCategories.length : pmCategories.length;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
                  isActive ? `${theme.tab} text-white` : "bg-white text-gray-600"
                }`}
              >
                {tab === "am" ? "午前" : "午後"}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive ? "bg-white text-gray-700" : `${theme.tab} text-white`}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {activeTab === "am" ? (
          <WorkChips selected={amCategories} onChange={setAmCategories} theme={theme} />
        ) : (
          <WorkChips selected={pmCategories} onChange={setPmCategories} theme={theme} />
        )}
      </section>

      {/* 失敗したこと */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">失敗したこと</label>
        <ChipGroup options={FAILURE_OPTIONS} selected={failures} onChange={setFailures} />
        {failures.includes("その他") && (
          <textarea
            value={failureMemo}
            onChange={(e) => setFailureMemo(e.target.value)}
            placeholder="具体的に（任意）"
            rows={2}
            className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          />
        )}
      </section>

      {/* 改善すべき点 */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">改善すべき点</label>
        <ChipGroup options={IMPROVEMENT_OPTIONS} selected={improvements} onChange={setImprovements} />
        {improvements.includes("その他") && (
          <textarea
            value={improvementMemo}
            onChange={(e) => setImprovementMemo(e.target.value)}
            placeholder="具体的に（任意）"
            rows={2}
            className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          />
        )}
      </section>

      {/* メモ（A4） */}
      <section className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          メモ <span className="font-normal normal-case text-gray-400">（任意）</span>
        </label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="その他、自由に記録しておきたいこと"
          rows={3}
          className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
        />
      </section>

      {/* 全休フラグ非表示ここまで */}
      </>}

      {/* 自己学習（全休でも表示） */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          自己学習 <span className="font-normal normal-case text-gray-400">（任意）</span>
        </label>

        {/* 分野 */}
        <div className="flex flex-wrap gap-2">
          {LEARNING_FIELDS.map((field) => {
            const active = learningFields.includes(field);
            return (
              <button
                key={field}
                type="button"
                onClick={() =>
                  setLearningFields((prev) =>
                    prev.includes(field)
                      ? prev.filter((f) => f !== field)
                      : [...prev, field]
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors active:opacity-70 ${
                  active
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {active && <span className="mr-0.5 text-xs">✓</span>}
                {field}
              </button>
            );
          })}
        </div>

        {/* 内容（フリーテキスト） */}
        <input
          type="text"
          value={learningContent}
          onChange={(e) => setLearningContent(e.target.value)}
          placeholder="例：基本情報技術者試験 午前問題、AWS SAA、TypeScript入門"
          className="h-11 rounded-xl border border-gray-300 px-4 text-base focus:border-teal-500 focus:outline-none"
        />

        {/* 時間 */}
        <div className="flex gap-2 flex-wrap">
          {LEARNING_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setLearningDuration((prev) => (prev === d ? "" : d))}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors active:opacity-70 ${
                learningDuration === d
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      {/* エラー */}
      {status === "error" && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMessage}</p>
      )}

      {/* 送信 */}
      <button
        type="submit"
        disabled={status === "loading"}
        className={`h-14 rounded-2xl text-lg font-bold text-white shadow transition-colors active:opacity-80 disabled:opacity-50 ${theme.submit}`}
      >
        {status === "loading" ? "保存中..." : "日報を保存"}
      </button>
    </form>
  );
}
