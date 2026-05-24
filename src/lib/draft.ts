import type { WorkCategory } from "@/types/report";

export type FormDraft = {
  isDayOff: boolean;
  startTime: string;
  endTime: string;
  amCategories: WorkCategory[];
  pmCategories: WorkCategory[];
  failures: string[];
  failureMemo: string;
  improvements: string[];
  improvementMemo: string;
  memo: string;
  learningFields: string[];
  learningContent: string;
  learningDuration: string;
};

const DRAFT_KEY = "nichijo-draft";

export function saveDraft(draft: FormDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // プライベートモード等は無視
  }
}

export function loadDraft(): FormDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as FormDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function hasMeaningfulDraft(draft: FormDraft): boolean {
  return (
    (draft.isDayOff ?? false) ||
    draft.amCategories.length > 0 ||
    draft.pmCategories.length > 0 ||
    draft.failures.length > 0 ||
    draft.improvements.length > 0 ||
    (draft.memo ?? "").trim().length > 0 ||
    (draft.learningFields ?? []).length > 0 ||
    (draft.learningContent ?? "").trim().length > 0
  );
}
