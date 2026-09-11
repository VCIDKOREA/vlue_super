import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { fetchDccAgentProfiles } from "../../lib/dccAgentProfilesApi.js";
import { agentOptionLabel } from "../../lib/dccAgentProfileState.js";
import { switchToMultiDccProfile } from "../../lib/multiDccSwitch.js";
import DccAgentManageModal from "./DccAgentManageModal.jsx";
import "./dcc-agent-switcher.css";

export default function DccAgentSwitcher({
  variant = "inline",
  onToast,
  compact = false
}) {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [maxCount, setMaxCount] = useState(20);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await fetchDccAgentProfiles();
      const list = Array.isArray(data.profiles) ? data.profiles : [];
      setProfiles(list);
      setActiveId(data.activeId || list.find((p) => p.isActive)?.id || "");
      if (data.maxCount) setMaxCount(data.maxCount);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "계정 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onSelect = async (nextId) => {
    if (!nextId || nextId === activeId) return;
    const profile = profiles.find((p) => p.id === nextId);
    if (!profile) return;
    setSwitching(true);
    try {
      await switchToMultiDccProfile(profile);
      setActiveId(profile.id);
      setProfiles((prev) => prev.map((p) => ({ ...p, isActive: p.id === profile.id })));
      onToast?.(`「${agentOptionLabel(profile)}」로 전환했습니다.`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "계정 전환에 실패했습니다.");
    } finally {
      setSwitching(false);
    }
  };

  const selectEl = (
    <div className="dcc-agent-bar__select-wrap">
      <select
        className="dcc-agent-bar__select"
        value={activeId}
        disabled={loading || switching || profiles.length === 0}
        aria-label="멀티 프로필"
        onChange={(e) => void onSelect(e.target.value)}
      >
        {profiles.length === 0 ? <option value="">프로필 없음</option> : null}
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {agentOptionLabel(p)}
            {p.isActive ? " · 사용 중" : ""}
            {p.isRepresentative ? " · 대표" : ""}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="dcc-agent-bar__chevron" aria-hidden />
    </div>
  );

  const manageBtn = (
    <button type="button" className="dcc-agent-bar__manage" onClick={() => setManageOpen(true)}>
      <Settings2 size={13} />
      계정 전환
    </button>
  );

  const modal = (
    <DccAgentManageModal
      open={manageOpen}
      profiles={profiles}
      maxCount={maxCount}
      allowedSlots={maxCount}
      onClose={() => setManageOpen(false)}
      onChanged={reload}
      onToast={onToast}
      onSwitchProfile={(profile) => void onSelect(profile.id).then(() => setManageOpen(false))}
    />
  );

  if (variant === "card") {
    return (
      <div className="dcc-agent-bar dcc-agent-bar--card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="dcc-agent-bar__meta">
          <p className="dcc-agent-bar__label">멀티프로필</p>
          <p className="dcc-agent-bar__hint">탭하면 앱 전체가 해당 계정으로 전환됩니다.</p>
        </div>
        <div className="dcc-agent-bar__controls">
          {selectEl}
          {manageBtn}
        </div>
        {modal}
      </div>
    );
  }

  return (
    <div className={`dcc-agent-bar${compact ? " dcc-agent-bar--compact" : ""}`}>
      {selectEl}
      {manageBtn}
      {modal}
    </div>
  );
}
