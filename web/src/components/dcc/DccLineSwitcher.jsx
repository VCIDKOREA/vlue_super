import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { compressAndUploadMediaImageOrThrow } from "../../lib/mediaImageUpload.js";
import { writeLetteringBizcardEditable } from "../../lib/letteringBizcardStorage.js";
import {
  createDefaultShowcaseStyle,
  writeLiveShowcaseStyle,
  writeShowcaseStyle
} from "../../lib/showcase/showcaseStyleStorage.js";
import { writeLocalShowcaseStyleUpdatedAt } from "../../lib/showcase/showcaseStyleSync.js";
import { assignDccLineAgent, fetchDccLineBundle, fetchDccLines, putDccLineDcc } from "../../lib/dccLinesApi.js";
import { fetchDccAgentProfiles } from "../../lib/dccAgentProfilesApi.js";
import { agentOptionLabel, applyDccAgentToLocalCard } from "../../lib/dccAgentProfileState.js";
import { readSelectedDccLineId, writeSelectedDccLineId } from "../../lib/dccLineState.js";
import DccAgentManageModal from "./DccAgentManageModal.jsx";
import "./dcc-agent-switcher.css";

function applyLineToLocalPreview(bundle) {
  const line = bundle?.line;
  if (!line?.id) return;
  writeSelectedDccLineId(line.id);
  const empty = createDefaultShowcaseStyle();
  const editor = bundle.showcase?.editor || bundle.showcase?.live || empty;
  const live = bundle.showcase?.live || editor || empty;
  writeShowcaseStyle(editor, { replace: true, skipSync: true });
  writeLiveShowcaseStyle(live, { source: "editor", skipSync: true });
  if (bundle.showcase?.updatedAt) writeLocalShowcaseStyleUpdatedAt(bundle.showcase.updatedAt);
  const photo = String(line.photoUrl || bundle.dcc?.photoUrl || "").trim();
  writeLetteringBizcardEditable({
    photoDataUrl: photo,
    photoUrl: photo,
    photoFocus: line.photoFocus || "center",
    noProfilePhoto: !photo
  });
  if (bundle.agent) applyDccAgentToLocalCard(bundle.agent, { keepPhoto: true });
  try {
    window.dispatchEvent(new Event("vlue-showcase-style-changed"));
    window.dispatchEvent(new Event("vlue-showcase-live-style-changed"));
    window.dispatchEvent(new Event("vlue-lettering-bizcard-changed"));
  } catch {
    /* ignore */
  }
}

export default function DccLineSwitcher({ variant = "inline", onToast, compact = false }) {
  const [lines, setLines] = useState([]);
  const [lineId, setLineId] = useState(() => readSelectedDccLineId());
  const [profiles, setProfiles] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [maxCount, setMaxCount] = useState(20);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const loadAgents = useCallback(async (cardId) => {
    const data = await fetchDccAgentProfiles(cardId);
    const list = Array.isArray(data.profiles) ? data.profiles : [];
    setProfiles(list);
    setAgentId(data.activeId || list.find((p) => p.isActive)?.id || "");
    if (data.maxCount) setMaxCount(data.maxCount);
    return data;
  }, []);

  const selectLine = useCallback(
    async (nextId, { silent } = {}) => {
      if (!nextId) return;
      setBusy(true);
      try {
        const bundle = await fetchDccLineBundle(nextId);
        setLineId(bundle.line.id);
        setPhotoUrl(bundle.line.photoUrl || "");
        applyLineToLocalPreview(bundle);
        await loadAgents(bundle.line.id);
        if (!silent) {
          onToast?.(
            `${bundle.line.kindLabel} ${bundle.line.displayPhone} — 이 번호의 DCC·쇼케이스를 설정합니다. 담당자만 드롭다운으로 바꿉니다.`
          );
        }
      } catch (e) {
        onToast?.(e instanceof Error ? e.message : "번호를 불러오지 못했습니다.");
      } finally {
        setBusy(false);
        setLoading(false);
      }
    },
    [loadAgents, onToast]
  );

  const reload = useCallback(async () => {
    try {
      const data = await fetchDccLines();
      const list = Array.isArray(data.lines) ? data.lines : [];
      setLines(list);
      const preferred = readSelectedDccLineId() || list[0]?.id || "";
      if (preferred && list.some((l) => l.id === preferred)) {
        await selectLine(preferred, { silent: true });
      } else {
        writeSelectedDccLineId("");
        setLoading(false);
      }
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "번호 목록을 불러오지 못했습니다.");
      setLoading(false);
    }
  }, [onToast, selectLine]);

  useEffect(() => {
    void reload();
    // 최초 1회 — 번호 목록·선택 회선 DCC/쇼케이스 로드
  }, []);

  const onChangeLine = (nextId) => {
    if (!nextId || nextId === lineId) return;
    void selectLine(nextId);
  };

  const onChangeAgent = async (nextId) => {
    if (!nextId || !lineId || nextId === agentId) return;
    setBusy(true);
    try {
      const res = await assignDccLineAgent(lineId, nextId);
      setAgentId(res.agent?.id || nextId);
      setProfiles((prev) => prev.map((p) => ({ ...p, isActive: p.id === nextId })));
      if (res.agent) applyDccAgentToLocalCard(res.agent, { keepPhoto: true });
      onToast?.(`${agentOptionLabel(res.agent)}(으)로 이 번호 담당자를 바꿨습니다. 사진·쇼케이스는 이 번호 설정이 유지됩니다.`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "담당자 전환에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onPickPhoto = async (file) => {
    if (!file || !lineId) return;
    setBusy(true);
    try {
      const uploaded = await compressAndUploadMediaImageOrThrow(file, "photo");
      const url = String(uploaded?.url || "").trim();
      if (!url) throw new Error("사진 업로드에 실패했습니다.");
      const res = await putDccLineDcc(lineId, { photoUrl: url, noProfilePhoto: false });
      const next = res.line?.photoUrl || url;
      setPhotoUrl(next);
      writeLetteringBizcardEditable({ photoDataUrl: next, photoUrl: next, noProfilePhoto: false });
      onToast?.("이 번호의 프로필 사진을 저장했습니다.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "사진 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const lineSelect = (
    <div className="dcc-agent-bar__select-wrap">
      <select
        className="dcc-agent-bar__select"
        value={lineId}
        disabled={loading || busy || lines.length === 0}
        aria-label="내선·대표번호"
        onChange={(e) => onChangeLine(e.target.value)}
      >
        {lines.length === 0 ? <option value="">등록된 내선·대표번호 없음</option> : null}
        {lines.map((l) => (
          <option key={l.id} value={l.id}>
            {l.kindLabel} {l.displayPhone}
            {l.displayName ? ` · ${l.displayName}` : ""}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="dcc-agent-bar__chevron" aria-hidden />
    </div>
  );

  const agentSelect = (
    <div className="dcc-agent-bar__select-wrap">
      <select
        className="dcc-agent-bar__select"
        value={agentId}
        disabled={loading || busy || !lineId || profiles.length === 0}
        aria-label="이 번호 담당자"
        onChange={(e) => void onChangeAgent(e.target.value)}
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
      담당자 관리
    </button>
  );

  const modal = (
    <DccAgentManageModal
      open={manageOpen}
      profiles={profiles}
      maxCount={maxCount}
      onClose={() => setManageOpen(false)}
      onChanged={() => void loadAgents(lineId)}
      onToast={onToast}
    />
  );

  const photoRow = lineId ? (
    <div className="dcc-agent-form__photo">
      {photoUrl ? (
        <img className="dcc-agent-row__photo" src={photoUrl} alt="" />
      ) : (
        <div className="dcc-agent-row__photo dcc-agent-row__photo--empty">사진</div>
      )}
      <label>
        이 번호 프로필 사진
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void onPickPhoto(file);
          }}
        />
      </label>
    </div>
  ) : null;

  if (variant === "card") {
    return (
      <div className="dcc-agent-bar dcc-agent-bar--card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="dcc-agent-bar__meta">
          <p className="dcc-agent-bar__label">번호 DCC + 쇼케이스</p>
          <p className="dcc-agent-bar__hint">
            내선·대표번호마다 사진과 쇼케이스가 따로입니다. 번호를 바꾸면 그 번호 설정으로 전환되고, 담당자만 드롭다운으로 바꿉니다.
          </p>
        </div>
        <div className="dcc-line-grid">
          <label className="dcc-line-field">
            번호
            {lineSelect}
          </label>
          <label className="dcc-line-field">
            담당자
            <div className="dcc-agent-bar__controls">
              {agentSelect}
              {manageBtn}
            </div>
          </label>
        </div>
        {photoRow}
        {modal}
      </div>
    );
  }

  return (
    <div className={`dcc-agent-bar dcc-agent-bar--lines${compact ? " dcc-agent-bar--compact" : ""}`}>
      {lineSelect}
      {agentSelect}
      {manageBtn}
      {modal}
    </div>
  );
}
