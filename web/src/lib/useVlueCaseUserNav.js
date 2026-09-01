import { useCallback, useEffect, useState } from "react";
import { getLocalVlueUserId } from "./showcase/resolveShowcaseOwnerUserId.js";
import { getMemberHandle } from "./memberCardStorage.js";
import { dispatchCloseShowcaseOverlays } from "./showcase/closeShowcaseOverlays.js";
import { COMMENT_CASE_USER_EVENT, COMMENT_MENTION_EVENT } from "./showcase/commentRichText.js";
import { lookupUserByHandle } from "./showcase/showcaseSocialApi.js";

function readMyHandle() {
  try {
    return String(getMemberHandle() || "")
      .replace(/^@+/, "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

/**
 * 좋아요·댓글 등에서 `vlue-open-case-user` 로 타인 케이스함 열기 (앱·웹 공통)
 * @param {{ onOpenSelf?: () => void, onToast?: (msg: string) => void }} opts
 */
export function useVlueCaseUserNav({ onOpenSelf, onToast } = {}) {
  const [caseArchiveUser, setCaseArchiveUser] = useState(null);

  const openAccountCase = useCallback(
    ({ userId = "", name = "", handle = "" } = {}) => {
      const id = String(userId || "").trim();
      const bareHandle = String(handle || "")
        .replace(/^@+/, "")
        .trim()
        .toLowerCase();
      const me = getLocalVlueUserId();
      const myHandle = readMyHandle();
      const isSelf =
        (id && me && id === me) || (bareHandle && myHandle && bareHandle === myHandle);

      dispatchCloseShowcaseOverlays();

      if (isSelf) {
        setCaseArchiveUser(null);
        onOpenSelf?.();
        return;
      }

      if (!id) return;
      setCaseArchiveUser({
        userId: id,
        name: String(name || handle || "").trim() || "케이스함",
        handle: String(handle || "")
          .replace(/^@+/, "")
          .trim()
      });
    },
    [onOpenSelf]
  );

  useEffect(() => {
    const onCaseUser = (e) => {
      openAccountCase({
        userId: e?.detail?.userId,
        name: e?.detail?.name,
        handle: e?.detail?.handle
      });
    };

    const onMention = async (e) => {
      const handle = String(e?.detail?.handle || "")
        .replace(/^@+/, "")
        .trim();
      if (!handle) return;
      const myHandle = readMyHandle();
      if (myHandle && handle.toLowerCase() === myHandle) {
        openAccountCase({ handle, name: handle });
        return;
      }
      try {
        const res = await lookupUserByHandle(handle);
        if (!res.ok || !res.user?.id) {
          onToast?.(`@${handle} 회원을 찾지 못했습니다.`);
          return;
        }
        openAccountCase({
          userId: res.user.id,
          name: String(res.user.displayName || res.user.name || handle).trim() || handle,
          handle
        });
      } catch {
        onToast?.("회원 조회에 실패했습니다.");
      }
    };

    window.addEventListener(COMMENT_CASE_USER_EVENT, onCaseUser);
    window.addEventListener(COMMENT_MENTION_EVENT, onMention);
    return () => {
      window.removeEventListener(COMMENT_CASE_USER_EVENT, onCaseUser);
      window.removeEventListener(COMMENT_MENTION_EVENT, onMention);
    };
  }, [openAccountCase, onToast]);

  const closeCaseArchive = useCallback(() => setCaseArchiveUser(null), []);

  return { caseArchiveUser, closeCaseArchive, openAccountCase };
}
