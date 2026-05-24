import * as HolidayJP from "@holiday-jp/holiday_jp";

/**
 * 指定日が日本の祝日かどうかチェックし、祝日名を返す
 * 祝日でなければ null
 */
export function getJapaneseHolidayName(dateStr: string): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr + "T00:00:00");
    if (!HolidayJP.isHoliday(date)) return null;
    const holidays = HolidayJP.between(date, date);
    return holidays[0]?.name ?? "祝日";
  } catch {
    return null;
  }
}
