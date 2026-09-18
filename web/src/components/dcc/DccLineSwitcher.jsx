import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Settings2 } from "lucide-react";
import { compressAndUploadMediaImageOrThrow } from "../../lib/mediaImageUpload.js";
import { DCC_PROFILE_PHOTO_IMAGE_GUIDE } from "../../lib/fitImageFile.js";
import { agentOptionLabel } from "../../lib/dccAgentProfileState.js";
import {
  readDccLinePreview,
  readSelectedDccLineId,
  writeDccLinePreview,
  writeDccLinePreviewFromBundle,
  writeSelectedDccLineId
} from "../../lib/dccLineState.js";
import {
  writeLiveShowcaseStyle,
  writeShowcaseStyle
} from "../../lib/showcase/showcaseStyleStorage.js";
import { showcaseStyleHasContent, writeLocalShowcaseStyleUpdatedAt } from "../../lib/showcase/showcaseStyleSync.js";
import { assignDccLineAgent, fetchDccLineBundle, fetchDccLines, putDccLineDcc } from "../../lib/dccLinesApi.js";
import { fetchDccAgentProfiles } from "../../lib/dccAgentProfilesApi.js";
import { dccLineOptionLabel } from "../../lib/dccLineLabel.js";
import { switchToMultiDccProfile } from "../../lib/multiDccSwitch.js";
import DccAgentManageModal from "./DccAgentManageModal.jsx";
import "./dcc-agent-switcher.css";

const LOAD_TIMEOUT_MS = 12_000;
const LINES_TIMEOUT_MS = 18_000;
const AGENTS_CACHE_KEY = "vlue_dcc_agents_cache_v1";
const LINES_CACHE_KEY = "vlue_dcc_lines_cache_v1";

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => {
      if (timer) window.clearTimeout(timer);
    }),
    new Promise((_, reject) => {
      timer = window.setTimeout(() => {
        reject(new Error(`${label} 응답이 너무 늦습니다. 다시 시도해 주세요.`));
      }, ms);
    })
  ]);
}

async function fetchWithRetry(fn, label, attempts = 2, timeoutMs = LOAD_TIMEOUT_MS) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label}에 실패했습니다.`);
}

function readAgentsCache() {
  try {
    const raw = sessionStorage.getItem(AGENTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.profiles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAgentsCache(data) {
  try {
    sessionStorage.setItem(
      AGENTS_CACHE_KEY,
      JSON.stringify({
        profiles: Array.isArray(data?.profiles) ? data.profiles : [],
        activeId: data?.activeId || "",
        maxCount: data?.maxCount || 20,
        at: Date.now()
      })
    );
  } catch {
    /* ignore */
  }
}

function readLinesCache() {
  try {
    const raw = sessionStorage.getItem(LINES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLinesCache(data) {
  try {
    sessionStorage.setItem(
      LINES_CACHE_KEY,
      JSON.stringify({
        lines: Array.isArray(data?.lines) ? data.lines : [],
        at: Date.now()
      })
    );
  } catch {
    /* ignore */
  }
}

function applyLineToLocalPreview(bundle) {
  const line = bundle?.line;
  if (!line?.id) return;
  const dcc = bundle?.dcc && typeof bundle.dcc === "object" ? bundle.dcc : null;
  const dccHasFields = Boolean(
    dcc &&
      Object.values(dcc).some((v) => {
        if (v == null) return false;
        if (typeof v === "string") return Boolean(v.trim());
        if (typeof v === "object") return Object.keys(v).length > 0;
        return true;
      })
  );
  /* 빈 DCC 스냅으로 미리보기/설정 필드를 덮어쓰지 않음 */
  if (dccHasFields || bundle?.agent) {
    writeDccLinePreviewFromBundle(bundle);
  }
  writeSelectedDccLineId(line.id);
  const editor = bundle.showcase?.editor || bundle.showcase?.live || null;
  const live = bundle.showcase?.live || editor;
  const has = showcaseStyleHasContent(editor) || showcaseStyleHasContent(live);
  if (has) {
    writeShowcaseStyle(editor || live, { replace: true, skipSync: true });
    writeLiveShowcaseStyle(live || editor, { source: "editor", skipSync: true });
    if (bundle.showcase?.updatedAt) writeLocalShowcaseStyleUpdatedAt(bundle.showcase.updatedAt);
  }
  try {
    window.dispatchEvent(new Event("vlue-showcase-style-changed"));
    window.dispatchEvent(new Event("vlue-showcase-live-style-changed"));
    window.dispatchEvent(new Event("vlue-lettering-bizcard-changed"));
  } catch {
    /* ignore */
  }
}

export default function DccLineSwitcher({
  variant = "inline",
  layout = "stack",
  onToast,
  compact = false,
  onBusyChange
}) {
  const [lines, setLines] = useState([]);
  const [lineId, setLineId] = useState(() => readSelectedDccLineId());
  const [profiles, setProfiles] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [maxCount, setMaxCount] = useState(20);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const switching = loading || busy;
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;

  useEffect(() => {
    onBusyChange?.(switching);
  }, [switching, onBusyChange]);

  const applyAgents = useCallback((data) => {
    const list = Array.isArray(data?.profiles) ? data.profiles : [];
    setProfiles(list);
    setAgentId(data?.activeId || list.find((p) => p.isActive)?.id || "");
    if (data?.maxCount) setMaxCount(data.maxCount);
    if (list.length) writeAgentsCache(data);
    return data;
  }, []);

  const loadAgents = useCallback(
    async (cardId, { allowCache } = {}) => {
      try {
        const data = await fetchWithRetry(() => fetchDccAgentProfiles(cardId), "담당자 목록");
        return applyAgents(data);
      } catch (e) {
        if (allowCache) {
          const cached = readAgentsCache();
          if (cached?.profiles?.length) {
            applyAgents(cached);
            onToastRef.current?.("서버가 느려 저장된 담당자 목록을 표시합니다.");
            return cached;
          }
        }
        throw e;
      }
    },
    [applyAgents]
  );

  const selectLine = useCallback(
    async (nextId, { silent, skipAgents } = {}) => {
      if (!nextId) return;
      setBusy(true);
      try {
        const bundle = await fetchWithRetry(() => fetchDccLineBundle(nextId), "번호 DCC");
        setLineId(bundle.line.id);
        setPhotoUrl(bundle.line.photoUrl || "");
        applyLineToLocalPreview(bundle);
        if (bundle.agent?.id) setAgentId(bundle.agent.id);
        if (!skipAgents) {
          try {
            await loadAgents(bundle.line.id, { allowCache: true });
          } catch (agentErr) {
            onToastRef.current?.(
              agentErr instanceof Error ? agentErr.message : "담당자를 불러오지 못했습니다."
            );
          }
        }
        if (!silent) {
          onToastRef.current?.(
            `${bundle.line.kindLabel} ${bundle.line.displayPhone} — 이 번호의 DCC·쇼케이스를 설정합니다. 담당자만 드롭다운으로 바꿉니다.`
          );
        }
      } catch (e) {
        onToastRef.current?.(e instanceof Error ? e.message : "번호를 불러오지 못했습니다.");
      } finally {
        setBusy(false);
        setLoading(false);
      }
    },
    [loadAgents]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const agentsPromise = loadAgents(undefined, { allowCache: true });
      const linesPromise = (async () => {
        try {
          const data = await fetchWithRetry(() => fetchDccLines(), "번호 목록", 2, LINES_TIMEOUT_MS);
          if (Array.isArray(data?.lines) && data.lines.length) writeLinesCache(data);
          return data;
        } catch (e) {
          const cached = readLinesCache();
          if (cached?.lines?.length) {
            onToastRef.current?.("서버가 느려 저장된 번호 목록을 표시합니다.");
            return cached;
          }
          throw e;
        }
      })();

      const [agentsResult, linesResult] = await Promise.allSettled([agentsPromise, linesPromise]);

      if (agentsResult.status === "rejected") {
        const msg =
          agentsResult.reason instanceof Error
            ? agentsResult.reason.message
            : "담당자를 불러오지 못했습니다.";
        setLoadError(msg);
        onToastRef.current?.(msg);
      }

      if (linesResult.status === "fulfilled") {
        const data = linesResult.value;
        const list = Array.isArray(data.lines) ? data.lines : [];
        setLines(list);
        const preferred = readSelectedDccLineId() || list[0]?.id || "";
        if (preferred && list.some((l) => l.id === preferred)) {
          /* 초기 진입: 무거운 회선 번들 GET 생략 — 로컬 쇼케이스·담당자 유지 */
          setLineId(preferred);
          writeSelectedDccLineId(preferred);
          const row = list.find((l) => l.id === preferred);
          if (row?.photoUrl) setPhotoUrl(row.photoUrl);
          if (row?.agentId) setAgentId(row.agentId);
          return;
        }
        writeSelectedDccLineId("");
      } else {
        const msg =
          linesResult.reason instanceof Error
            ? linesResult.reason.message
            : "번호 목록을 불러오지 못했습니다.";
        setLoadError((prev) => prev || msg);
        onToastRef.current?.(msg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "담당자·번호를 불러오지 못했습니다.";
      setLoadError(msg);
      onToastRef.current?.(msg);
    } finally {
      setLoading(false);
    }
  }, [loadAgents]);

  useEffect(() => {
    /* 캐시 즉시 표시 — 서버 왕복 전에 드롭다운이 비어 보이지 않게 */
    const cachedAgents = readAgentsCache();
    if (cachedAgents?.profiles?.length) {
      applyAgents(cachedAgents);
      setLoading(false);
    }
    const cachedLines = readLinesCache();
    if (cachedLines?.lines?.length) {
      setLines(cachedLines.lines);
      const preferred = readSelectedDccLineId() || cachedLines.lines[0]?.id || "";
      if (preferred) {
        setLineId(preferred);
        const row = cachedLines.lines.find((l) => l.id === preferred);
        if (row?.photoUrl) setPhotoUrl(row.photoUrl);
        if (row?.agentId) setAgentId(row.agentId);
      }
      setLoading(false);
    }
    void reload();
  }, []);

  const onChangeLine = (nextId) => {
    if (!nextId || nextId === lineId) return;
    void selectLine(nextId);
  };

  const onChangeAgentForLine = async (targetLineId, nextId) => {
    if (!nextId || !targetLineId) return;
    const current = lines.find((l) => l.id === targetLineId);
    if (current?.agentId === nextId && targetLineId === lineId && nextId === agentId) return;
    setBusy(true);
    try {
      const res = await assignDccLineAgent(targetLineId, nextId);
      const nextLine = res.line;
      if (nextLine?.id) {
        setLines((prev) => prev.map((l) => (l.id === nextLine.id ? { ...l, ...nextLine } : l)));
      }
      if (targetLineId === lineId) {
        setAgentId(res.agent?.id || nextId);
        setProfiles((prev) => prev.map((p) => ({ ...p, isActive: p.id === nextId })));
        writeDccLinePreviewFromBundle(res);
      }
      onToast?.(
        `${dccLineOptionLabel(nextLine || current)} — 담당자를 바꿨습니다. 사진·쇼케이스는 이 번호 설정이 유지됩니다.`
      );
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "담당자 전환에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onChangeAgent = async (nextId) => {
    if (!nextId || !lineId) return;
    await onChangeAgentForLine(lineId, nextId);
  };

  const refreshAfterManage = async () => {
    const data = await fetchDccLines();
    const list = Array.isArray(data.lines) ? data.lines : [];
    setLines(list);
    if (lineId) await loadAgents(lineId);
    else await loadAgents();
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
      writeDccLinePreview({ ...(readDccLinePreview() || {}), id: lineId, photoUrl: next });
      onToast?.("이 번호의 프로필 사진을 저장했습니다.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "사진 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const retryBtn = loadError && !switching ? (
    <button type="button" className="dcc-agent-bar__manage" onClick={() => void reload()}>
      다시 불러오기
    </button>
  ) : null;

  const lineSelect = (
    <div className="dcc-agent-bar__select-wrap">
      <select
        className="dcc-agent-bar__select"
        value={lineId}
        disabled={switching || lines.length === 0}
        aria-label="번호"
        onChange={(e) => onChangeLine(e.target.value)}
      >
        {lines.length === 0 ? <option value="">등록된 번호 없음</option> : null}
        {lines.map((l) => (
          <option key={l.id} value={l.id}>
            {dccLineOptionLabel(l)}
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
        disabled={switching || !lineId || profiles.length === 0}
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
    <button type="button" className="dcc-agent-bar__manage" disabled={switching} onClick={() => setManageOpen(true)}>
      <Settings2 size={13} />
        계정 전환
    </button>
  );

  const loadingChip = switching ? (
    <span className="dcc-agent-bar__status" role="status" aria-live="polite">
      <Loader2 size={14} className="dcc-agent-bar__status-spin" aria-hidden />
      불러오는 중…
    </span>
  ) : loadError ? (
    <span className="dcc-agent-bar__status" role="status">
      {loadError}
    </span>
  ) : null;

  const modal = (
    <DccAgentManageModal
      open={manageOpen}
      lines={lines}
      selectedLineId={lineId}
      profiles={profiles}
      maxCount={maxCount}
      onClose={() => setManageOpen(false)}
      onChanged={() => void refreshAfterManage()}
      onToast={onToast}
      onSwitchProfile={(profile) =>
        void switchToMultiDccProfile(profile, { lines, preferredLineId: lineId })
          .then(() => {
            onToast?.(`「${profile.label || profile.displayName || "프로필"}」로 전환했습니다.`);
            setManageOpen(false);
            return refreshAfterManage();
          })
          .catch((e) => onToast?.(e instanceof Error ? e.message : "프로필 전환에 실패했습니다."))
      }
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
      <p className="dcc-agent-form__photo-hint">{DCC_PROFILE_PHOTO_IMAGE_GUIDE.uploadHint}</p>
    </div>
  ) : null;

  if (variant === "card") {
    return (
      <div className="dcc-agent-bar dcc-agent-bar--card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="dcc-agent-bar__meta">
          <p className="dcc-agent-bar__label">번호 DCC + 쇼케이스</p>
          <p className="dcc-agent-bar__hint">
            번호마다 사진과 쇼케이스가 따로입니다. 번호를 고르면 그 번호 설정으로 전환되고, 담당자만 드롭다운으로 바꿉니다.
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
              {loadingChip}
              {manageBtn}
              {retryBtn}
            </div>
          </label>
        </div>
        {photoRow}
        {modal}
      </div>
    );
  }

  if (layout === "row") {
    return (
      <div className="dcc-agent-bar dcc-agent-bar--row">
        {lineSelect}
        {agentSelect}
        {manageBtn}
        {retryBtn}
        {loadingChip}
        {modal}
      </div>
    );
  }

  return (
    <div className={`dcc-agent-bar dcc-agent-bar--lines${compact ? " dcc-agent-bar--compact" : ""}`}>
      {compact ? (
        <>
          <label className="dcc-line-field">
            번호
            {lineSelect}
          </label>
          <label className="dcc-line-field">
            담당자
            <div className="dcc-agent-bar__controls">
              {agentSelect}
              {loadingChip}
              {manageBtn}
              {retryBtn}
            </div>
          </label>
          {photoRow}
        </>
      ) : (
        <>
          {lineSelect}
          {agentSelect}
          {loadingChip}
          {manageBtn}
          {retryBtn}
          {photoRow}
        </>
      )}
      {modal}
    </div>
  );
}
