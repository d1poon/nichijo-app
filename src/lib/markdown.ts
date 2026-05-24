import type { DailyReport } from "@/types/report";
import { getJapaneseHolidayName } from "@/lib/holidays";

const DAYS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

/**
 * DailyReport → Markdown 文字列に変換
 * サーバー・クライアント両方から呼べる純粋関数
 */
export function generateMarkdown(report: DailyReport): string {
  const date = new Date(report.date + "T00:00:00");
  const dayJa = DAYS_JA[date.getDay()];
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  // --- 全休 ---
  if (report.isDayOff) {
    const holidayName = getJapaneseHolidayName(report.date);
    const reason = holidayName ? `祝日: ${holidayName}` : "有給休暇 / 振替休日等";
    return `---
date: ${report.date}
tags: [daily-report, 全休]
---
# 日報 ${mm}${dd}(${dayJa})

## 全休
${reason}
`;
  }

  // --- 通常 ---
  const amLines =
    report.amCategories.length > 0
      ? report.amCategories.map((c) => `- ${c}`).join("\n")
      : "- （なし）";
  const pmLines =
    report.pmCategories.length > 0
      ? report.pmCategories.map((c) => `- ${c}`).join("\n")
      : "- （なし）";

  const failureItems = report.failures.filter((f) => f !== "その他");
  if (report.failures.includes("その他") && report.failureMemo) {
    failureItems.push(`その他: ${report.failureMemo}`);
  }
  const failureLines =
    failureItems.length > 0
      ? failureItems.map((f) => `- ${f}`).join("\n")
      : "- 特になし";

  const improvementItems = report.improvements.filter((i) => i !== "その他");
  if (report.improvements.includes("その他") && report.improvementMemo) {
    improvementItems.push(`その他: ${report.improvementMemo}`);
  }
  const improvementLines =
    improvementItems.length > 0
      ? improvementItems.map((i) => `- ${i}`).join("\n")
      : "- 特になし";

  const memoSection = report.memo.trim()
    ? `\n## メモ\n${report.memo.trim()}\n`
    : "";

  // 自己学習セクション（何か入力がある場合のみ出力）
  const hasLearning =
    report.learningFields.length > 0 ||
    report.learningContent.trim() ||
    report.learningDuration;
  const learningSection = hasLearning
    ? `\n## 自己学習\n${report.learningFields.length > 0 ? `- 分野: ${report.learningFields.join("・")}\n` : ""}${report.learningContent.trim() ? `- 内容: ${report.learningContent.trim()}\n` : ""}${report.learningDuration ? `- 時間: ${report.learningDuration}\n` : ""}`
    : "";

  return `---
date: ${report.date}
tags: [daily-report]
---
# 日報 ${mm}${dd}(${dayJa})

## 勤務時間
${report.startTime} - ${report.endTime}

## 作業内容

### 午前
${amLines}

### 午後
${pmLines}

## 振り返り

### 失敗・課題
${failureLines}

### 改善すべき点
${improvementLines}
${memoSection}${learningSection}`;
}
