import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveDccFeatureAccess } from "../lib/dccAccessPolicy.js";
import {
  persistDccAccessHintsFromSession,
  readStoredAuthPaidAt,
  readStoredBirthYmd,
  readStoredFamilyWardRole,
  writeStoredAuthPaidAt,
  writeStoredFamilyWardRole
} from "../lib/dccAccessSession.js";
import { readDigitalCardActive } from "../lib/bizcardAccountSync.js";
import { fetchDigitalCardMeta } from "../lib/digitalCardApi.js";
import { fetchFamilyProtection } from "../lib/familyProtectionApi.js";

function resolveHasOwnAuthPayment(extraPaid) {
  if (extraPaid) return true;
  if (readStoredAuthPaidAt()) return true;
  try {
    if (readDigitalCardActive() === true) return true;
  } catch {
    /* ignore */
  }
  try {
    if (localStorage.getItem("vlue_digital_card_active") === "true") return true;
    if (localStorage.getItem("digitalCardActive") === "true") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * 미성년자 DCC 전면 차단 · 가족 혜택(피보호) 계정은 본인 1인 인증결제 후에만 DCC
 */
export function useDccFeatureAccess() {
  const [birthYmd, setBirthYmd] = useState(() => readStoredBirthYmd());
  const [wardRole, setWardRole] = useState(() => readStoredFamilyWardRole());
  const [hasOwnAuthPayment, setHasOwnAuthPayment] = useState(() => resolveHasOwnAuthPayment(false));
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setBirthYmd(readStoredBirthYmd());
    setWardRole(readStoredFamilyWardRole());
    setHasOwnAuthPayment(resolveHasOwnAuthPayment(false));
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const onWard = (e) => {
      const role = e?.detail?.wardRole;
      writeStoredFamilyWardRole(role || "");
      setWardRole(String(role || "").trim().toLowerCase());
    };
    const onHint = (e) => {
      if (e?.detail) persistDccAccessHintsFromSession(e.detail);
      refresh();
    };
    window.addEventListener("vlue-family-ward-role", onWard);
    window.addEventListener("vlue-dcc-access-hints", onHint);
    window.addEventListener("vlue-family-protection-changed", refresh);
    return () => {
      window.removeEventListener("vlue-family-ward-role", onWard);
      window.removeEventListener("vlue-dcc-access-hints", onHint);
      window.removeEventListener("vlue-family-protection-changed", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await fetchFamilyProtection();
        if (cancelled) return;
        const role = d?.myActiveWardRole || null;
        writeStoredFamilyWardRole(role || "");
        setWardRole(String(role || "").trim().toLowerCase());
      } catch {
        /* ignore — demo/offline */
      }
      try {
        const meta = await fetchDigitalCardMeta({ lite: true });
        if (cancelled) return;
        const paidAt = meta?.subscription?.cycleStartAt || meta?.paidAt || "";
        if (paidAt) {
          writeStoredAuthPaidAt(paidAt);
          setHasOwnAuthPayment(true);
        } else {
          setHasOwnAuthPayment(resolveHasOwnAuthPayment(Boolean(meta?.issued || meta?.cardId)));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const access = useMemo(
    () =>
      resolveDccFeatureAccess({
        birthYmd,
        familyWardRole: wardRole,
        hasOwnAuthPayment
      }),
    [birthYmd, wardRole, hasOwnAuthPayment]
  );

  return { access, refresh, birthYmd, wardRole, hasOwnAuthPayment };
}
