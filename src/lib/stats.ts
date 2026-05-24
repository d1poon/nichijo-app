/** 週次集計ロジック */

export type DayStats = {
  date: string;        // YYYY-MM-DD
  dayName: string;     // 月火水木金
  exists: boolean;
  isDayOff: boolean;
  startTime: string | null;
  endTime: string | null;
  workMinutes: number | null;
  amCategories: string[];
  pmCategories: string[];
  memo: string | null;
};

export type WeeklyData = {
  weekStart: string;   // Monday YYYY-MM-DD
  days: DayStats[];
  categoryRanking: { name: string; count: number }[];
  totalWorkMinutes: number;
};

const DAYS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** ある日付の週の月曜日を YYYY-MM-DD で返す */
export function getWeekMonday(dateStr?: string): string {
  const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  return toDateString(base);
}

/** Date → YYYY-MM-DD */
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 月曜から5日分（月〜金）の日付文字列を返す */
export function getWeekDates(monday: string): string[] {
  const base = new Date(monday + "T00:00:00");
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return toDateString(d);
  });
}

const BREAK_MINUTES = 60; // 昼休憩

/** HH:MM × 2 → 実働分数（総拘束時間 - 昼休憩1時間） */
export function calcWorkMinutes(
  startTime: string,
  endTime: string
): number | null {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const actual = eh * 60 + em - (sh * 60 + sm) - BREAK_MINUTES;
  return actual > 0 ? actual : null;
}

/** 分数 → "Xh Ym" 形式 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

/** Markdown 本文から DayStats を抽出するパーサー */
export function parseMarkdown(
  date: string,
  content: string
): Omit<DayStats, "dayName" | "exists"> {
  // 勤務時間
  const timeMatch = content.match(
    /## 勤務時間\r?\n(\d{2}:\d{2}) - (\d{2}:\d{2})/
  );
  const startTime = timeMatch?.[1] ?? null;
  const endTime = timeMatch?.[2] ?? null;
  const workMinutes =
    startTime && endTime ? calcWorkMinutes(startTime, endTime) : null;

  // 作業内容（新フォーマット：午前/午後あり）
  const amMatch = content.match(/### 午前\r?\n((?:- .+\r?\n?)*)/);
  const pmMatch = content.match(/### 午後\r?\n((?:- .+\r?\n?)*)/);

  const parseItems = (block: string | undefined): string[] =>
    (block ?? "")
      .split("\n")
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).trim())
      .filter((c) => c !== "（なし）" && c !== "");

  let amCategories = parseItems(amMatch?.[1]);
  let pmCategories = parseItems(pmMatch?.[1]);

  // 旧フォーマット対応（午前/午後なし、作業内容が直接リスト）
  if (amCategories.length === 0 && pmCategories.length === 0) {
    const oldMatch = content.match(/## 作業内容\r?\n((?:- .+\r?\n?)*)/);
    amCategories = parseItems(oldMatch?.[1]);
  }

  // メモ
  const memoMatch = content.match(/## メモ\r?\n([\s\S]*?)(?:\n##|$)/);
  const memo = memoMatch?.[1]?.trim() ?? null;

  const isDayOff = /## 全休/.test(content);

  return { date, startTime, endTime, workMinutes, amCategories, pmCategories, memo, isDayOff };
}

/** DayStats[] から作業区分ランキングを生成 */
export function buildCategoryRanking(
  days: DayStats[]
): { name: string; count: number }[] {
  const counter = new Map<string, number>();
  for (const day of days) {
    for (const cat of [...day.amCategories, ...day.pmCategories]) {
      counter.set(cat, (counter.get(cat) ?? 0) + 1);
    }
  }
  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** monday からその週の WeeklyData（中身は API で埋める）のスケルトンを生成 */
export function buildWeekSkeleton(monday: string): DayStats[] {
  return getWeekDates(monday).map((date) => {
    const d = new Date(date + "T00:00:00");
    return {
      date,
      dayName: DAYS_JA[d.getDay()],
      exists: false,
      isDayOff: false,
      startTime: null,
      endTime: null,
      workMinutes: null,
      amCategories: [],
      pmCategories: [],
      memo: null,
    };
  });
}
