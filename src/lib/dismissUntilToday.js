/** 오늘 자정까지(같은 날짜) 숨김 처리 여부 */
export function isDismissedUntilToday(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const dismissed = new Date(raw);
    if (Number.isNaN(dismissed.getTime())) return false;
    return dismissed.toDateString() === new Date().toDateString();
  } catch {
    return false;
  }
}

export function dismissUntilToday(storageKey) {
  try {
    localStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    /* ignore */
  }
}
