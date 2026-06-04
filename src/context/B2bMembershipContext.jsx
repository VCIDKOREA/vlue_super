import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchB2bMembershipUiContext } from "../lib/b2bEnterpriseApi.js";
import { applyCorporateBrandingToCard } from "../lib/b2bCorporateBranding.js";
import { fetchVluerMe } from "../lib/vluerApi.js";
import { isVluerFeatureLocked } from "../lib/vluerCompliance.js";
import { B2B_BRANDING_CHANGED_EVENT } from "../lib/b2bBrandingEvents.js";

const B2bMembershipContext = createContext(null);

function readUserId() {
  try {
    return localStorage.getItem("vlue_server_user_id")?.trim() || "";
  } catch {
    return "";
  }
}

export function B2bMembershipProvider({ children, enabled = true }) {
  const [membershipCtx, setMembershipCtx] = useState(null);
  const [vluerMe, setVluerMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const uid = readUserId();
    if (!enabled || !uid) {
      setMembershipCtx(null);
      setVluerMe(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [ctx, vm] = await Promise.all([
        fetchB2bMembershipUiContext().catch(() => null),
        fetchVluerMe().catch(() => null)
      ]);
      setMembershipCtx(ctx);
      setVluerMe(vm);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onBranding = () => refresh();
    window.addEventListener(B2B_BRANDING_CHANGED_EVENT, onBranding);
    return () => window.removeEventListener(B2B_BRANDING_CHANGED_EVENT, onBranding);
  }, [refresh]);

  const vluerLocked = useMemo(
    () => isVluerFeatureLocked(membershipCtx, vluerMe),
    [membershipCtx, vluerMe]
  );

  const shouldOverrideBranding = Boolean(
    membershipCtx?.override_by_company ||
      membershipCtx?.applies_account_wide
  );

  const resolveDisplayCard = useCallback(
    (personalCard) => {
      if (!shouldOverrideBranding || !membershipCtx?.company?.branding) {
        return { card: personalCard, corporateOverride: false };
      }
      return {
        card: applyCorporateBrandingToCard(
          personalCard,
          membershipCtx.company.branding,
          membershipCtx.company
        ),
        corporateOverride: true
      };
    },
    [membershipCtx, shouldOverrideBranding]
  );

  const value = useMemo(
    () => ({
      membershipCtx,
      vluerMe,
      loading,
      error,
      refresh,
      vluerLocked,
      overrideByCompany: shouldOverrideBranding,
      appliesAccountWide: Boolean(membershipCtx?.applies_account_wide),
      personalDataPreserved: membershipCtx?.personal_data_preserved !== false,
      resolveDisplayCard
    }),
    [membershipCtx, vluerMe, loading, error, refresh, vluerLocked, resolveDisplayCard]
  );

  return (
    <B2bMembershipContext.Provider value={value}>{children}</B2bMembershipContext.Provider>
  );
}

export function useB2bMembership() {
  const ctx = useContext(B2bMembershipContext);
  if (!ctx) {
    return {
      membershipCtx: null,
      vluerMe: null,
      loading: false,
      error: "",
      refresh: async () => {},
      vluerLocked: false,
      overrideByCompany: false,
      personalDataPreserved: true,
      resolveDisplayCard: (card) => ({ card, corporateOverride: false })
    };
  }
  return ctx;
}
