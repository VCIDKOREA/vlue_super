import { useCallback } from "react";

export function useNavigation(onBack?: () => void) {
  const goBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  }, [onBack]);

  return { goBack };
}
