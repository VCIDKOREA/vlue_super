export const MYCASE_FEED_MUTATED = "vlue-mycase-feed-mutated";

export function notifyMycaseFeedMutated() {
  try {
    window.dispatchEvent(new Event(MYCASE_FEED_MUTATED));
  } catch {
    /* ignore */
  }
}
