/** 作業区分 */
export const WORK_CATEGORIES = [
  "要件定義",
  "基本設計書作成",
  "詳細設計書作成",
  "プログラム一覧作成",
  "製造",
  "単体テスト",
  "結合テスト",
  "総合試験",
  "レビュー",
  "打ち合わせ・MTG",
  "検証リリース作業",
  "本番リリース作業",
  "メンテナンス作業",
  "環境構築",
  "その他",
] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

/** 失敗・課題の選択肢 */
export const FAILURE_OPTIONS = [
  "特になし",
  "仕様確認漏れ",
  "コミュニケーション不足",
  "見積もりミス",
  "テスト不足",
  "手戻り発生",
  "確認待ちで停滞",
  "その他",
] as const;

/** 改善すべき点の選択肢 */
export const IMPROVEMENT_OPTIONS = [
  "特になし",
  "早めに確認・相談",
  "ドキュメント確認を徹底",
  "テストケースを増やす",
  "見積もりに余裕を持つ",
  "こまめな進捗共有",
  "その他",
] as const;

/** 自己学習の分野 */
export const LEARNING_FIELDS = [
  "資格勉強",
  "プログラミング",
  "業務知識",
  "読書",
  "語学",
  "その他",
] as const;

/** 自己学習の時間プリセット */
export const LEARNING_DURATIONS = [
  "30分",
  "1時間",
  "1.5時間",
  "2時間",
  "3時間以上",
] as const;

/** 終了時刻プリセット */
export const QUICK_END_TIMES = [
  "18:15",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
] as const;

/** 日報全体 */
export type DailyReport = {
  /** true のとき全休（作業内容・振り返りは不要） */
  isDayOff: boolean;
  /** YYYY-MM-DD */
  date: string;
  startTime: string;
  endTime: string;
  /** 午前の作業（複数選択可） */
  amCategories: WorkCategory[];
  /** 午後の作業（複数選択可） */
  pmCategories: WorkCategory[];
  /** 失敗・課題（複数選択可） */
  failures: string[];
  /** 失敗「その他」のフリーテキスト */
  failureMemo: string;
  /** 改善すべき点（複数選択可） */
  improvements: string[];
  /** 改善「その他」のフリーテキスト */
  improvementMemo: string;
  /** 自由メモ */
  memo: string;
  /** 自己学習の分野（複数選択可） */
  learningFields: string[];
  /** 何を勉強したか */
  learningContent: string;
  /** 勉強時間 */
  learningDuration: string;
};
