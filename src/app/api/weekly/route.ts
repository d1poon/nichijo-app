import { NextRequest, NextResponse } from "next/server";
import {
  getWeekMonday,
  getWeekDates,
  buildWeekSkeleton,
  parseMarkdown,
  buildCategoryRanking,
  type DayStats,
  type WeeklyData,
} from "@/lib/stats";

/** GitHub Contents API から 1 ファイルの内容を取得して base64 デコード */
async function fetchFileContent(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: string };
  if (!data.content) return null;
  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
}

/** BOM (U+FEFF) を除去して環境変数を取得 */
function getEnvClean(key: string): string | undefined {
  const val = process.env[key];
  if (!val) return undefined;
  return val.charCodeAt(0) === 0xfeff ? val.slice(1) : val;
}

export async function GET(request: NextRequest) {
  const token = getEnvClean("GITHUB_TOKEN");
  const owner = getEnvClean("GITHUB_OWNER");
  const repo = getEnvClean("GITHUB_REPO");
  const branch = getEnvClean("GITHUB_BRANCH") ?? "master";
  const vaultPath = getEnvClean("VAULT_DAILY_PATH") ?? "Daily";

  if (!token || !owner || !repo) {
    return NextResponse.json(
      { error: "環境変数が不足しています" },
      { status: 500 }
    );
  }

  // week パラメータ（YYYY-MM-DD）なければ今週の月曜
  const weekParam = request.nextUrl.searchParams.get("week") ?? undefined;
  const monday = getWeekMonday(weekParam);
  const dates = getWeekDates(monday);
  const skeleton = buildWeekSkeleton(monday);

  // 5日分を並列取得
  const results = await Promise.all(
    dates.map(async (date, i) => {
      const content = await fetchFileContent(
        token,
        owner,
        repo,
        branch,
        `${vaultPath}/${date}.md`
      );
      if (!content) return skeleton[i];

      const parsed = parseMarkdown(date, content);
      const day = skeleton[i];
      return {
        ...day,
        ...parsed,
        exists: true,
      } satisfies DayStats;
    })
  );

  const categoryRanking = buildCategoryRanking(results.filter((d) => d.exists));
  const totalWorkMinutes = results.reduce(
    (sum, d) => sum + (d.workMinutes ?? 0),
    0
  );

  const weekly: WeeklyData = {
    weekStart: monday,
    days: results,
    categoryRanking,
    totalWorkMinutes,
  };

  return NextResponse.json(weekly);
}
