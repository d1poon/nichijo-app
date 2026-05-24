import { NextRequest, NextResponse } from "next/server";
import { saveReportToGitHub } from "@/lib/github";
import type { DailyReport } from "@/types/report";

export async function POST(request: NextRequest) {
  try {
    const report = (await request.json()) as DailyReport;

    if (!report.date || !report.startTime || !report.endTime) {
      return NextResponse.json(
        { error: "日付・勤務時間は必須です" },
        { status: 400 }
      );
    }
    // 全休でない場合のみ作業内容を必須チェック
    if (
      !report.isDayOff &&
      (!report.amCategories || report.amCategories.length === 0) &&
      (!report.pmCategories || report.pmCategories.length === 0)
    ) {
      return NextResponse.json(
        { error: "午前または午後の作業内容を選択してください" },
        { status: 400 }
      );
    }

    await saveReportToGitHub(report);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("[/api/save]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
