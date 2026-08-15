import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { activateDccAgentProfile, fetchDccAgentProfiles } from "../../lib/dccAgentProfilesApi.js";
import { agentOptionLabel, applyDccAgentToLocalCard } from "../../lib/dccAgentProfileState.js";
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
      const active = list.find((p) => p.id === (data.activeId || list.find((x) => x.isActive)?.id));
      if (active) applyDccAgentToLocalCard(active);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "담당자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onSelect = async (nextId) => {
    if (!nextId || nextId === activeId) return;
    setSwitching(true);
    try {
      const res = await activateDccAgentProfile(nextId);
      const profile = res.profile;
      setActiveId(profile.id);
      setProfiles((prev) => prev.map((p) => ({ ...p, isActive: p.id === profile.id })));
      applyDccAgentToLocalCard(profile);
      onToast?.(`${agentOptionLabel(profile)}(으)로 전환했습니다. 발·수신 시 이 정보가 노출됩니다.`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "담당자 전환에 실패했습니다.");
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
        aria-label="담당자 프로필"
        onChange={(e) => void onSelect(e.target.value)}
      >
        {profiles.length === 0 ? <option value="">담당자 없음</option> : null}
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {agentOptionLabel(p)}
            {p.isActive ? " · 사용 중" : ""}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="dcc-agent-bar__chevron" aria-hidden />
    </div>
  );

  const manageBtn = (
    <button type="button" className="dcc-agent-bar__manage" onClick={() => setManageOpen(true)}>
      <Settings2 size={13} />
      관리
    </button>
  );

  const modal = (
    <DccAgentManageModal
      open={manageOpen}
      profiles={profiles}
      maxCount={maxCount}
      onClose={() => setManageOpen(false)}
      onChanged={reload}
      onToast={onToast}
    />
  );

  if (variant === "card") {
    return (
      <div className="dcc-agent-bar dcc-agent-bar--card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="dcc-agent-bar__meta">
          <p className="dcc-agent-bar__label">번호 DCC 담당자</p>
          <p className="dcc-agent-bar__hint">
            대표·유선 번호에서 발·수신 시 노출될 담당자를 선택합니다. 바꾸면 디지털인증명함과 쇼케이스에 바로 반영됩니다.
          </p>
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
