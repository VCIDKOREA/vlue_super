import { useEffect, useMemo, useState } from "react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import LetteringIncomingNotification from "../LetteringIncomingNotification.jsx";
import { readMembershipTier } from "../../lib/bizcardAccountSync.js";
import {
  createDefaultShowcaseStyle,
  readShowcaseStyle
} from "../../lib/showcase/showcaseStyleStorage.js";
import { applyShowcaseStyleToCard } from "../../lib/showcase/applyShowcaseStyleToCard.js";
import "./my-case-detail.css";

function readPreviewIdentity() {
  let name = "";
  let phone = "";
  let handle = "";
  let org = "";
  try {
    name = String(localStorage.getItem("vlue_legal_name") || "").trim();
    phone = String(localStorage.getItem("myCardPhone") || localStorage.getItem("vlue_phone_e164") || "").trim();
    handle = String(localStorage.getItem("vlue_member_handle") || "")
      .replace(/^@/, "")
      .trim();
    org = String(localStorage.getItem("vlue_company_locked") || "").trim();
  } catch {
    /* ignore */
  }
  return { name: name || handle || "VLUE", phone, handle, org };
}

/**
 * ????? ?? ? ? ???? ????? (?? ??? ??)
 */
export default function MyCaseDetailModal({
  open,
  item,
  detail,
  isOwner = false,
  onClose,
  onToast
}) {
  const [expanded, setExpanded] = useState(true);
  const owner = Boolean(isOwner || detail?.isOwner);
  const identity = useMemo(() => readPreviewIdentity(), [open]);
  const membershipTier = useMemo(() => readMembershipTier(), [open]);

  const style = useMemo(() => {
    const payload = detail?.item?.payloadJson || item?.payloadJson || {};
    const fromStyle = payload?.style;
    if (fromStyle && typeof fromStyle === "object") {
      return { ...createDefaultShowcaseStyle(), ...fromStyle };
    }
    if (owner) {
      try {
        return readShowcaseStyle();
      } catch {
        /* ignore */
      }
    }
    return createDefaultShowcaseStyle();
  }, [detail, item, owner]);

  const previewCard = useMemo(() => {
    let userId = "";
    try {
      userId = String(localStorage.getItem("vlue_server_user_id") || "").trim();
    } catch {
      /* ignore */
    }
    const base = {
      name: identity.name,
      displayName: identity.name,
      phone: identity.phone,
      organization: identity.org,
      membershipTier,
      showcaseStyle: style,
      photoUrl: "",
      image_url: "",
      logoUrl: "",
      userId
    };
    /* ?? = ?????. ?? ???? ?? ?? */
    return applyShowcaseStyleToCard(base, membershipTier, {
      style,
      digitalCardActive: false
    });
  }, [identity, membershipTier, style]);

  useEffect(() => {
    if (open) setExpanded(true);
  }, [open, item?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <AppFullScreenView
      open={open}
      onClose={onClose}
      title=""
      hideHeader
      showFloatingClose
      coverBottomNav
      className="my-case-detail my-case-detail--broadcast bg-[#0B101B]"
    >
      <div className="my-case-detail__broadcast-shell lettering-showcase-fs lettering-showcase-fs--history-embed">
        <div className="lettering-showcase-fs__shell">
          <LetteringIncomingNotification
            className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--mycase-feed"
            verified
            previewMode
            showOwnerSettings={false}
            hideUnverifiedFooter
            callPhase="connected"
            platform="android"
            isRecording={false}
            callDurationSec={0}
            recordingDurationSec={0}
            incomingNumber={identity.phone}
            savedContactName={identity.name}
            isKnownContact
            card={previewCard}
            includeDigitalCard={false}
            expanded={expanded}
            onExpandedChange={(next) => {
              setExpanded(next);
              if (!next) onClose?.();
            }}
            onEndCall={onClose}
            onToast={onToast}
          />
        </div>
      </div>
    </AppFullScreenView>
  );
}
