import type { DailyReport } from "@/types/report";
import { generateMarkdown } from "@/lib/markdown";

/**
 * BOM（U+FEFF）を除去して環境変数を取得する。
 * PowerShell の pipe 経由で vercel env add した場合に BOM が混入し、
 * HTTP ヘッダーの ByteString 変換でエラーになるケースに対処。
 */
function getEnvClean(key: string): string | undefined {
  const val = process.env[key];
  if (!val) return undefined;
  // PowerShell pipe 経由で設定した場合に先頭に BOM (U+FEFF) が混入するケースに対処
  return val.charCodeAt(0) === 0xfeff ? val.slice(1) : val;
}

/** GitHub Contents API 経由でファイルを作成 or 上書き */
export async function saveReportToGitHub(report: DailyReport): Promise<void> {
  const token = getEnvClean("GITHUB_TOKEN");
  const owner = getEnvClean("GITHUB_OWNER");
  const repo = getEnvClean("GITHUB_REPO");
  const branch = getEnvClean("GITHUB_BRANCH") ?? "main";
  const vaultPath = getEnvClean("VAULT_DAILY_PATH") ?? "Daily";

  if (!token || !owner || !repo) {
    throw new Error(
      "環境変数が不足しています（GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO）"
    );
  }

  const filePath = `${vaultPath}/${report.date}.md`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const content = Buffer.from(generateMarkdown(report), "utf-8").toString("base64");

  // 既存ファイルの SHA を取得（上書きに必要）
  let sha: string | undefined;
  const existing = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (existing.ok) {
    const data = (await existing.json()) as { sha: string };
    sha = data.sha;
  }

  const body: Record<string, unknown> = {
    message: `Add daily report: ${report.date}`,
    content,
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub API エラー: ${JSON.stringify(err)}`);
  }
}
