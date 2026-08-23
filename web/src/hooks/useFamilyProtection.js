import { useCallback, useEffect, useState } from "react";
import {
  acceptFamilyProtectionLink,
  createFamilyProtectionLink,
  fetchFamilyProtection,
  requestBankConsent,
  respondBankConsent,
  revokeFamilyProtectionLink,
  updateFamilyProtectionSettings
} from "../lib/familyProtectionApi.js";
import { familyPeersFromProtectionData } from "../lib/familyProtectionPeers.js";
import {
  buildDemoFamilyProtectionApiFallback,
  getDemoFamilyGuardianLinks,
  mergeFamilyPeers
} from "../lib/familyProtectionDemo.js";
import { writeStoredFamilyWardRole } from "../lib/dccAccessSession.js";

export function displayFamilyUser(u) {
  if (!u) return "회원";
  return u.legalName || u.nickFeed || u.publicHandle || "회원";
}

function applySettingsFromRow(s, setters) {
  setters.setNoAppEnabled(s.alertNoAppEnabled !== false);
  setters.setNoAppHours(Number(s.alertNoAppHours) || 24);
  setters.setMissedCallEnabled(s.alertMissedCallEnabled !== false);
  setters.setMissedCallThreshold(Number(s.alertMissedCallThreshold) || 3);
  setters.setChildSiteEnabled(s.alertChildSiteEnabled !== false);
  setters.setElderLongCallEnabled(s.alertElderLongCallEnabled !== false);
  setters.setElderLongCallMinutes(Number(s.alertElderLongCallMinutes) || 10);
  setters.setElderRemoteAppEnabled(s.alertElderRemoteAppEnabled !== false);
  setters.setElderGovCallEnabled(s.alertElderGovCallEnabled !== false);
  setters.setChildBankEnabled(s.alertChildBankEnabled !== false);
  setters.setChildBankAllTx(Boolean(s.alertChildBankAllTx));
  setters.setChildBankThresholdKrw(Number(s.alertChildBankThresholdKrw) || 10000);
  setters.setChildUnknownPayeeEnabled(s.alertChildUnknownPayeeEnabled !== false);
}

export function useFamilyProtection() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [noAppEnabled, setNoAppEnabled] = useState(true);
  const [noAppHours, setNoAppHours] = useState(24);
  const [missedCallEnabled, setMissedCallEnabled] = useState(true);
  const [missedCallThreshold, setMissedCallThreshold] = useState(3);
  const [childSiteEnabled, setChildSiteEnabled] = useState(true);
  const [elderLongCallEnabled, setElderLongCallEnabled] = useState(true);
  const [elderLongCallMinutes, setElderLongCallMinutes] = useState(10);
  const [elderRemoteAppEnabled, setElderRemoteAppEnabled] = useState(true);
  const [elderGovCallEnabled, setElderGovCallEnabled] = useState(true);
  const [childBankEnabled, setChildBankEnabled] = useState(true);
  const [childBankAllTx, setChildBankAllTx] = useState(false);
  const [childBankThresholdKrw, setChildBankThresholdKrw] = useState(10000);
  const [childUnknownPayeeEnabled, setChildUnknownPayeeEnabled] = useState(true);

  const setters = {
    setNoAppEnabled,
    setNoAppHours,
    setMissedCallEnabled,
    setMissedCallThreshold,
    setChildSiteEnabled,
    setElderLongCallEnabled,
    setElderLongCallMinutes,
    setElderRemoteAppEnabled,
    setElderGovCallEnabled,
    setChildBankEnabled,
    setChildBankAllTx,
    setChildBankThresholdKrw,
    setChildUnknownPayeeEnabled
  };

  const applyData = useCallback((d) => {
    setData(d);
    applySettingsFromRow(d.settings || {}, setters);
    writeStoredFamilyWardRole(d.myActiveWardRole || "");
    window.dispatchEvent(
      new CustomEvent("vlue-family-ward-role", {
        detail: { wardRole: d.myActiveWardRole, familyRelation: d.myActiveFamilyRelation }
      })
    );
    window.dispatchEvent(
      new CustomEvent("vlue-family-peers-updated", {
        detail: mergeFamilyPeers(familyPeersFromProtectionData(d))
      })
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchFamilyProtection();
      applyData({ ...d, offlineDemo: false });
      setMsg("");
    } catch (e) {
      const fallback = buildDemoFamilyProtectionApiFallback();
      applyData(fallback);
      const hint =
        e?.status === 503
          ? "서버 DB 준비 중입니다. 아래는 데모 가족(엄마·동생) 표시입니다."
          : "서버 연결에 문제가 있어 데모 가족(엄마·동생)을 표시합니다.";
      setMsg(hint);
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener("vlue-family-protection-changed", onChanged);
    return () => window.removeEventListener("vlue-family-protection-changed", onChanged);
  }, [load]);

  const notifyChanged = () => {
    window.dispatchEvent(new CustomEvent("vlue-family-protection-changed"));
  };

  const apiGuardian = data?.asGuardian || [];
  const demoGuardian = getDemoFamilyGuardianLinks();
  const demoIds = new Set(demoGuardian.map((l) => l.id));
  const asGuardian = [...demoGuardian, ...apiGuardian.filter((l) => !demoIds.has(l.id))];
  const asWard = data?.asWard || [];
  const alerts = data?.alerts || [];
  const bankConsentsWard = data?.bankConsents?.asWard || [];

  return {
    loading,
    data,
    busy,
    setBusy,
    msg,
    setMsg,
    load,
    notifyChanged,
    asGuardian,
    asWard,
    alerts,
    bankConsentsWard,
    guide: data?.usageGuide,
    noAppEnabled,
    setNoAppEnabled,
    noAppHours,
    setNoAppHours,
    missedCallEnabled,
    setMissedCallEnabled,
    missedCallThreshold,
    setMissedCallThreshold,
    childSiteEnabled,
    setChildSiteEnabled,
    elderLongCallEnabled,
    setElderLongCallEnabled,
    elderLongCallMinutes,
    setElderLongCallMinutes,
    elderRemoteAppEnabled,
    setElderRemoteAppEnabled,
    elderGovCallEnabled,
    setElderGovCallEnabled,
    childBankEnabled,
    setChildBankEnabled,
    childBankAllTx,
    setChildBankAllTx,
    childBankThresholdKrw,
    setChildBankThresholdKrw,
    childUnknownPayeeEnabled,
    setChildUnknownPayeeEnabled,
    async saveSettings() {
      setBusy(true);
      try {
        await updateFamilyProtectionSettings({
          alertNoAppEnabled: noAppEnabled,
          alertNoAppHours: Number(noAppHours),
          alertMissedCallEnabled: missedCallEnabled,
          alertMissedCallThreshold: Number(missedCallThreshold),
          alertChildSiteEnabled: childSiteEnabled,
          alertElderLongCallEnabled: elderLongCallEnabled,
          alertElderLongCallMinutes: Number(elderLongCallMinutes),
          alertElderRemoteAppEnabled: elderRemoteAppEnabled,
          alertElderGovCallEnabled: elderGovCallEnabled,
          alertChildBankEnabled: childBankEnabled,
          alertChildBankAllTx: childBankAllTx,
          alertChildBankThresholdKrw: Number(childBankThresholdKrw),
          alertChildUnknownPayeeEnabled: childUnknownPayeeEnabled
        });
        await load();
        return "알림 설정이 저장되었습니다.";
      } finally {
        setBusy(false);
      }
    },
    async addLink(wardHandle, familyRelation, guardianImpUid) {
      if (!data?.canInviteFamily) {
        const err = new Error(data?.inviteBlockReason || "유료 회원만 가족을 등록할 수 있습니다.");
        err.code = data?.inviteBlockCode;
        err.needsExtension = data?.memberSlots?.needsExtension;
        throw err;
      }
      setBusy(true);
      try {
        await createFamilyProtectionLink(wardHandle.trim(), familyRelation, guardianImpUid);
        await load();
        notifyChanged();
        return "가족에게 승인 요청 메시지를 보냈습니다. 수락 후 보호가 시작됩니다.";
      } catch (e) {
        if (e?.code === "FAMILY_SLOT_LIMIT" || e?.code === "FAMILY_SLOT_NEEDS_EXTENSION") {
          const err = new Error(e.message);
          err.code = e.code;
          err.needsExtension = true;
          throw err;
        }
        throw e;
      } finally {
        setBusy(false);
      }
    },
    async acceptLink(linkId) {
      setBusy(true);
      try {
        await acceptFamilyProtectionLink(linkId);
        await load();
        notifyChanged();
        return "수락했습니다. 가족 보호가 시작됩니다.";
      } finally {
        setBusy(false);
      }
    },
    async revokeLink(linkId) {
      if (String(linkId).startsWith("demo-family")) {
        throw new Error("데모 가족(엄마·동생)은 연습용으로 항상 보호 중입니다.");
      }
      setBusy(true);
      try {
        await revokeFamilyProtectionLink(linkId);
        await load();
        notifyChanged();
        return "가족 보호 연결을 해지했습니다.";
      } finally {
        setBusy(false);
      }
    },
    async requestBankConsentForLink(linkId, accountLabel) {
      setBusy(true);
      try {
        await requestBankConsent(linkId, { accountLabel: accountLabel || "자녀 계좌" });
        await load();
        return "자녀에게 계좌 모니터링 동의 요청을 보냈습니다.";
      } finally {
        setBusy(false);
      }
    },
    async respondBankConsent(linkId, accept) {
      setBusy(true);
      try {
        await respondBankConsent(linkId, accept);
        await load();
        return accept ? "계좌 모니터링에 동의했습니다." : "계좌 모니터링을 거절했습니다.";
      } finally {
        setBusy(false);
      }
    }
  };
}
