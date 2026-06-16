import { useCallback, useEffect, useState } from "react";
import { fetchEmailForwardingMapping } from "../lib/vlueEmailMappingsApi.js";
import VlueEmailSettingsSection from "./settings/VlueEmailSettingsSection.jsx";

export default function VlueEmailMappingPanel({
  membershipTier = "free",
  onToast,
  isDarkMode = false,
  onOpenUpgrade
}) {
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapping, setMapping] = useState(null);

  const companyName =
    String(localStorage.getItem("vlue_company_locked") || "").trim() || "";

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchEmailForwardingMapping();
    setMapping(data.mapping || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const box = isDarkMode
    ? "border-white/10 bg-[#151821] text-gray-100"
    : "border-blue-100 bg-white text-gray-900";
  const sub = isDarkMode ? "text-gray-400" : "text-gray-500";

  if (loading) {
    return (
      <div className={`mt-4 rounded-2xl border p-4 text-[12px] ${sub} ${box}`}>
        VLUE 메일 설정을 불러오는 중…
      </div>
    );
  }

  return (
    <>
      <div className={`mt-4 rounded-2xl border p-4 shadow-sm ${box}`}>
        <p className="text-[14px] font-black">VLUE 가상 메일 포워딩</p>
        <p className={`mt-1 text-[11px] leading-relaxed ${sub}`}>
          서버에 저장 없이 외부 메일(네이버·구글 등)로 즉시 전달됩니다.
        </p>
        <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[12px] ${isDarkMode ? "border-white/10 bg-white/[0.03]" : "border-gray-100 bg-gray-50"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${sub}`}>가상 주소</p>
          <p className="mt-0.5 font-bold">{mapping?.fullVirtualEmail || "(미설정)"}</p>
          <p className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${sub}`}>마스터 메일</p>
          <p className="mt-0.5 font-semibold">{mapping?.targetMasterEmail || "(미연동)"}</p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white"
        >
          메일 주소 · 포워딩 설정
        </button>
      </div>

      {settingsOpen ? (
        <div className="fixed inset-0 z-[120] flex flex-col bg-white dark:bg-[#0f1118]">
          <VlueEmailSettingsSection
            isDarkMode={isDarkMode}
            membershipTier={membershipTier}
            companyName={companyName}
            onOpenUpgrade={() => {
              setSettingsOpen(false);
              onOpenUpgrade?.();
            }}
            showSettingNotice={onToast}
            onBack={() => {
              setSettingsOpen(false);
              refresh();
            }}
          />
        </div>
      ) : null}
    </>
  );
}
