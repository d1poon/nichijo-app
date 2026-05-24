import type { DailyReport } from "@/types/report";
import { generateMarkdown } from "@/lib/markdown";

/** GitHub Contents API 経由でファイルを作成 or 上書き */
export async function saveReportToGitHub(report: DailyReport): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const vaultPath = process.env.VAULT_DAILY_PATH ?? "Daily";

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
