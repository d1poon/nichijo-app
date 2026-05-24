# nichijo-app

iPhone から日報を入力し、Obsidian vault（GitHub リポジトリ）に Markdown ファイルとして保存する Vercel アプリ。

## セットアップ

### 1. 環境変数を設定

`.env.local.example` をコピーして `.env.local` を作成し、値を埋める。

```bash
cp .env.local.example .env.local
```

| 変数名 | 説明 |
|---|---|
| `GITHUB_TOKEN` | Personal Access Token（`Contents` 書き込み権限が必要） |
| `GITHUB_OWNER` | GitHub ユーザー名 |
| `GITHUB_REPO` | vault のリポジトリ名 |
| `GITHUB_BRANCH` | ブランチ名（デフォルト: `main`） |
| `VAULT_DAILY_PATH` | vault 内の保存先フォルダ（デフォルト: `Daily`） |

### 2. 依存インストール

```bash
npm install
```

### 3. ローカル起動

```bash
npm run dev
```

## Vercel へのデプロイ

1. GitHub にリポジトリを作成してプッシュ
2. Vercel でプロジェクトをインポート
3. Vercel の Environment Variables に `.env.local` の内容を登録

## 出力ファイル形式

`{VAULT_DAILY_PATH}/YYYY-MM-DD.md` として保存される。

```markdown
---
date: 2026-05-25
tags: [daily-report]
---
# 日報 0525(月)

## 勤務時間
09:30 - 18:15

## 作業内容
| 作業区分 | 工数 | メモ |
|---|---|---|
| 基本設計書作成 | 3h | |
| 製造 | 2h | |
```
