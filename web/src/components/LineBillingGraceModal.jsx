import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  cancelLineSubscription,
  chargeLineSubscription,
  fetchLineBillingStatus
} from "../lib/lineBillingApi.js";
import { syncOwnerInboxFromServer } from "../lib/ownerInboxSync.js";
import "../styles/showcase-call-glass.css";

const DISMISS_KEY = "vlue_line_grace_popup_dismissed_v1";

function readDismissed() {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "{}");
  } catch {
    return {};
  }
}

function markDismissed(lineId) {
  try {
    const prev = readDismissed();
    prev[lineId] = Date.now();
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(prev));
  } catch {
    /* ignore */
  }
}

export default function LineBillingGraceModal({ enabled = false }) {
  const [line, setLine] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await fetchLineBillingStatus();
      const grace = Array.isArray(data.graceLines) ? data.graceLines : [];
      const dismissed = readDismissed();
      const next = grace.find((item) => !dismissed[item.id]) || null;
      setLine(next);
      setOpen(Boolean(next));
    } catch {
      setLine(null);
      setOpen(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!open || !line || typeof document === "undefined") return null;

  const close = () => {
    markDismissed(line.id);
    setOpen(false);
  };

  const onCancel = async () => {
    setBusy("cancel");
    setError("");
    try {
      await cancelLineSubscription(line.id, "user_cancel");
      await syncOwnerInboxFromServer();
      setOpen(false);
      setLine(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "해지에 실패했습니다.");
    } finally {
      setBusy("");
    }
  };

  const onPay = async () => {
    setBusy("pay");
    setError("");
    try {
      await chargeLineSubscription(line.id);
      await syncOwnerInboxFromServer();
      setOpen(false);
      setLine(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제에 실패했습니다.");
    } finally {
      setBusy("");
    }
  };

  const graceLabel = line.graceEndsAt
    ? new Date(line.graceEndsAt).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : "";

  return createPortal(
    <div className="agency-dcp-mini-layer" data-dcp-popup="expired" role="dialog" aria-modal="true">
      <article className="agency-dcp-card is-expired" style={{ maxWidth: 320, padding: 20 }}>
        <p className="agency-dcp-card__badge">인증기간 만료</p>
        <p className="agency-dcp-card__warn">
          {line.phoneDisplay} 회선의 인증기간이 만료되었습니다. 유예 기간 안에 결제하면 즉시 복구됩니다.
        </p>
        {graceLabel ? (
          <p className="agency-dcp-card__web-empty">유예 마감 {graceLabel}</p>
        ) : null}
        {line.graceDaysLeft != null ? (
          <p className="agency-dcp-card__name" style={{ fontSize: 16 }}>
            남은 유예 {line.graceDaysLeft}일
          </p>
        ) : null}
        {error ? <p className="agency-dcp-card__warn">{error}</p> : null}
        <button
          type="button"
          className="agency-dcp-card__close is-danger"
          disabled={Boolean(busy)}
          onClick={onCancel}
        >
          {busy === "cancel" ? "해지 중…" : "구독 해지하기"}
        </button>
        <button
          type="button"
          className="agency-dcp-card__close"
          style={{ marginTop: 8 }}
          disabled={Boolean(busy)}
          onClick={onPay}
        >
          {busy === "pay" ? "결제 중…" : "결제하러 가기"}
        </button>
        <button
          type="button"
          className="agency-dcp-card__close"
          style={{ marginTop: 8, background: "transparent", color: "#cbd5e1", border: "1px solid #475569" }}
          disabled={Boolean(busy)}
          onClick={close}
        >
          닫기
        </button>
      </article>
    </div>,
    document.body
  );
}
