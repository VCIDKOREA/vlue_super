import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../lib/apiBase.js";
import { vlueAuthHeaders, vlueAuthFetch } from "../lib/vlueAuthHeaders.js";
import { resolveWalletProfile, partitionCardWallet } from "../lib/cardWalletStorage.js";
import { saveProfileToDeviceContacts } from "../lib/contactVcfSave.js";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import B2BLineCartPanel from "./B2BLineCartPanel.jsx";
import VaultSavedFileRow from "./VaultSavedFileRow.jsx";
import VaultSavedShowcaseRow from "./VaultSavedShowcaseRow.jsx";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import { useHorizontalScrollStrip } from "../lib/useHorizontalScrollStrip.js";
import { fetchOfficeFiles } from "../lib/vlueOfficeApi.js";
import { ASSET_FILES_CHANGED, mapOfficeFilesForUi } from "../lib/vlueAssetFilesStorage.js";
import {
  PERSONAL_CASE_NOTES_CHANGED,
  readPersonalCaseNotes,
  removePersonalCaseNote
} from "../lib/personalCaseNotesStorage.js";
import { useSensitiveScreenSecure } from "../hooks/useSensitiveScreenSecure.js";
import { v1AppShell } from "../lib/v1ReleaseScope.js";
import "../styles/wallet-hub-push.css";
import "../styles/showcase-call-glass.css";

const FULL_TABS = [
  { id: "received", label: "받은 명함" },
  { id: "mine", label: "내 명함" },
  { id: "mydocs", label: "내 문서" },
  { id: "b2b", label: "B2B" },
  { id: "members", label: "멤버" }
];

const V1_VAULT_TABS = [
  { id: "received", label: "명함저장" },
  { id: "showcases", label: "저장된케이스" },
  { id: "mydocs", label: "내문서" }
];

function resolveVaultTabs() {
  return v1AppShell.vaultTabsMinimal ? V1_VAULT_TABS : FULL_TABS;
}

function readUserId() {
  try {
    return localStorage.getItem("vlue_server_user_id")?.trim() || "";
  } catch {
    return "";
  }
}

async function runSaveToContacts(saveFn, profile, showToast) {
  const r = await saveFn(profile);
  if (r?.cancelled) return;
  if (r?.ok) {
    showToast(
      r.method === "share"
        ? "공유 메뉴에서 연락처 앱을 선택하세요."
        : r.method === "native"
          ? "연락처 앱으로 전달했습니다."
          : "vCard를 받았습니다. 열어 주소록에 추가하세요."
    );
  } else {
    showToast(r?.error || "연락처 저장에 실패했습니다.");
  }
}

function ReceivedCardRow({
  item,
  profile,
  onSave,
  onRemove,
  onShare,
  onClose,
  isDarkMode = false
}) {
  const [expanded, setExpanded] = useState(false);
  const phone = String(profile.phone || "").trim();
  const phoneDisplay = phone ? formatLetteringPhoneDisplay(phone) : "";

  return (
    <li className="wallet-hub-push">
      <div className="lettering-home-push-embed">
        <LetteringIncomingNotification
          verified
          previewMode
          showOwnerSettings={false}
          callPhase="connected"
          platform="android"
          isRecording={false}
          callDurationSec={0}
          recordingDurationSec={0}
          incomingNumber={phone}
          card={{
            ...profile,
            membershipTier: profile.membershipTier || "premium"
          }}
          includeDigitalCard={false}
          expandContent={false}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onEndCall={() => setExpanded(false)}
          className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--home-glass wallet-hub-push__notification"
        />
      </div>
      {expanded ? (
        <div className={`wallet-hub-push__footer${isDarkMode ? " is-dark" : ""}`}>
          <button type="button" className="wallet-hub-push__footer-btn" onClick={() => onSave?.(profile)}>
            휴대폰에 저장
          </button>
          {typeof onShare === "function" ? (
            <button
              type="button"
              className="wallet-hub-push__footer-btn"
              onClick={() => {
                onShare(profile);
                onClose?.();
              }}
            >
              채팅에 공유
            </button>
          ) : null}
          <button
            type="button"
            className="wallet-hub-push__footer-btn wallet-hub-push__footer-btn--danger"
            onClick={() => onRemove?.(item.userId)}
          >
            삭제
          </button>
        </div>
      ) : null}
      <span className="sr-only">{phoneDisplay || "저장된 명함"}</span>
    </li>
  );
}

export default function WalletHubModal({
  open,
  onClose,
  walletCards = [],
  profileByRoomId = {},
  onRemoveCardFromWallet,
  onShareCardToChat,
  onShareMyCardToChat,
  onSaveToContacts,
  digitalCardActive = true,
  membershipTier = "free",
  storageFiles = [],
  defaultTab = "received",
  onPickDocument,
  isDarkMode = false
}) {
  const tabs = useMemo(() => resolveVaultTabs(), [open]);
  const [tab, setTab] = useState(defaultTab);
  const [toast, setToast] = useState("");
  const [memberLoginId, setMemberLoginId] = useState("");
  const [memberRole, setMemberRole] = useState("STAFF");
  const [ownedCards, setOwnedCards] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showAdvancedMine, setShowAdvancedMine] = useState(false);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [caseNotes, setCaseNotes] = useState(() => readPersonalCaseNotes());
  const tabButtonRefs = useRef({});
  const tabStrip = useHorizontalScrollStrip(open);
  useSensitiveScreenSecure(open && tab === "mydocs");

  const saveContactsFn = onSaveToContacts || saveProfileToDeviceContacts;

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const sync = () => setCaseNotes(readPersonalCaseNotes());
    sync();
    window.addEventListener(PERSONAL_CASE_NOTES_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PERSONAL_CASE_NOTES_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, [open]);

  const refreshOwned = useCallback(async () => {
    const uid = readUserId();
    if (!uid) {
      setOwnedCards([]);
      return;
    }
    try {
      const res = await vlueAuthFetch(apiUrl("/api/cards/me-context"), { headers: vlueAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.owned)) setOwnedCards(data.owned);
      else setOwnedCards([]);
    } catch {
      setOwnedCards([]);
    }
  }, []);

  const refreshVaultFiles = useCallback(async () => {
    setVaultLoading(true);
    try {
      const data = await fetchOfficeFiles();
      setVaultFiles(mapOfficeFilesForUi(data.files || []));
    } catch {
      setVaultFiles([]);
    } finally {
      setVaultLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      const nextTab = tabs.some((t) => t.id === defaultTab) ? defaultTab : tabs[0]?.id || "received";
      setTab(nextTab);
      refreshOwned();
      refreshVaultFiles();
    }
  }, [open, defaultTab, refreshOwned, refreshVaultFiles, tabs]);

  useEffect(() => {
    if (!open) return undefined;
    const onFilesChanged = () => refreshVaultFiles();
    window.addEventListener(ASSET_FILES_CHANGED, onFilesChanged);
    return () => window.removeEventListener(ASSET_FILES_CHANGED, onFilesChanged);
  }, [open, refreshVaultFiles]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      tabButtonRefs.current[tab]?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    });
    return () => cancelAnimationFrame(id);
  }, [tab, open]);

  const mockApprove = async (cardId) => {
    const uid = readUserId();
    if (!uid) return;
    setBusy(true);
    try {
      const res = await vlueAuthFetch(apiUrl(`/api/cards/${cardId}/mock-approve`), {
        method: "POST",
        headers: vlueAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `오류 ${res.status}`);
      showToast("승인 처리되었습니다.");
      refreshOwned();
    } catch (e) {
      showToast(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const inviteMember = async () => {
    const cardId = ownedCards[0]?.id;
    if (!cardId) return showToast("소유 명함이 없습니다.");
    setBusy(true);
    try {
      const res = await vlueAuthFetch(apiUrl(`/api/cards/${cardId}/members`), {
        method: "POST",
        headers: vlueAuthHeaders(),
        body: JSON.stringify({ loginId: memberLoginId.trim(), role: memberRole })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `오류 ${res.status}`);
      showToast("멤버가 반영되었습니다.");
      setMemberLoginId("");
    } catch (e) {
      showToast(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const myCardLine = useMemo(() => {
    try {
      return {
        name: localStorage.getItem("myCardDisplayName") || localStorage.getItem("vlue_legal_name") || "",
        phone: localStorage.getItem("myCardPhone") || ""
      };
    } catch {
      return { name: "", phone: "" };
    }
  }, [open]);

  const { showcases: showcaseCards, received: receivedCards } = useMemo(
    () => partitionCardWallet(walletCards),
    [walletCards]
  );
  const receivedCount = receivedCards.length;
  const showcaseCount = showcaseCards.length;
  const activeTabLabel = tabs.find((t) => t.id === tab)?.label || "";
  const mergedStorageFiles = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const f of [...vaultFiles, ...storageFiles]) {
      const key = f.id || f.name;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
    return out;
  }, [vaultFiles, storageFiles]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[120] box-border flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4"
        onMouseDown={onClose}
      >
        <div
          className={`box-border flex h-[min(72vh,640px)] w-full min-w-0 max-w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl ${
            isDarkMode ? "bg-[#111827] text-gray-100" : "bg-slate-50"
          }`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="box-border min-w-0 shrink-0 pt-5 pb-3">
            <div className="px-4 sm:px-5">
              <div
                className={`mx-auto mb-3 h-1 w-10 rounded-full sm:hidden ${isDarkMode ? "bg-white/20" : "bg-slate-200"}`}
              />
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className={`truncate text-[18px] font-black tracking-tight ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
                    개인케이스
                  </h4>
                  <p className={`mt-0.5 truncate text-[12px] ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
                    {activeTabLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-bold ring-1 ${
                    isDarkMode
                      ? "bg-white/10 text-gray-300 ring-white/15"
                      : "bg-white text-slate-500 ring-slate-200"
                  }`}
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="mt-3 min-w-0 border-b border-slate-200/80 pb-0">
              <div
                ref={tabStrip.ref}
                role="tablist"
                aria-label="개인케이스 메뉴"
                onMouseDown={tabStrip.onMouseDown}
                className={`wallet-tab-strip flex overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-proximity touch-pan-x scroll-px-4 px-4 py-2 sm:scroll-px-5 sm:px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${tabStrip.stripClassName}`}
              >
                <div className="vlue-tab-strip w-max flex-nowrap gap-2 pr-4">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      ref={(el) => {
                        if (el) tabButtonRefs.current[t.id] = el;
                        else delete tabButtonRefs.current[t.id];
                      }}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.id}
                      onClick={tabStrip.wrapClick(() => setTab(t.id))}
                      className={`snap-center shrink-0 whitespace-nowrap rounded-full border font-black transition-colors ${
                        tab === t.id
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : isDarkMode
                            ? "border-white/20 bg-white/10 text-gray-100"
                            : "border-slate-300 bg-white text-slate-800"
                      }`}
                    >
                      {t.label}
                      {t.id === "received" && receivedCount > 0 ? (
                        <span className="vlue-tab-strip__badge ml-1.5 rounded-full bg-blue-500 font-bold text-white">
                          {receivedCount}
                        </span>
                      ) : null}
                      {t.id === "showcases" && showcaseCount > 0 ? (
                        <span className="vlue-tab-strip__badge ml-1.5 rounded-full bg-indigo-500 font-bold text-white">
                          {showcaseCount}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="vlue-scroll-pad-bottom-nav box-border min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5">
            {tab === "received" && (
              <div className="space-y-4">
                {receivedCount === 0 ? (
                  <div
                    className={`rounded-2xl py-14 text-center ring-1 ${
                      isDarkMode ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100"
                    }`}
                  >
                    <p className={`text-[14px] font-bold ${isDarkMode ? "text-gray-300" : "text-slate-500"}`}>
                      받은 명함이 없습니다
                    </p>
                  </div>
                ) : (
                  <ul className="wallet-hub-push-list space-y-3">
                    {receivedCards.map((item) => {
                      const profile = resolveWalletProfile(item, profileByRoomId);
                      return (
                        <ReceivedCardRow
                          key={item.id}
                          item={item}
                          profile={profile}
                          onSave={(p) => runSaveToContacts(saveContactsFn, p, showToast)}
                          onRemove={(userId) => {
                            onRemoveCardFromWallet?.(userId);
                            showToast("삭제했습니다.");
                          }}
                          onShare={onShareCardToChat}
                          onClose={onClose}
                          isDarkMode={isDarkMode}
                        />
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {tab === "showcases" && (
              <div className="space-y-4">
                {showcaseCount === 0 ? (
                  <div
                    className={`rounded-2xl py-14 text-center ring-1 ${
                      isDarkMode ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100"
                    }`}
                  >
                    <p className={`text-[14px] font-bold ${isDarkMode ? "text-gray-300" : "text-slate-500"}`}>
                      저장된 케이스가 없습니다
                    </p>
                    <p className={`mt-2 px-6 text-[12px] leading-relaxed ${isDarkMode ? "text-gray-500" : "text-slate-400"}`}>
                      통화 목록에서 쇼케이스를 다시 본 뒤 「업체 저장하기」를 누르면 여기에 모입니다.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {showcaseCards.map((item) => (
                      <VaultSavedShowcaseRow
                        key={item.userId || item.savedAt}
                        item={item}
                        isDarkMode={isDarkMode}
                        onRemove={(userId) => {
                          onRemoveCardFromWallet?.(userId);
                          showToast("삭제했습니다.");
                        }}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "mine" && (
              <div className="space-y-4">
                <div
                  className={`rounded-2xl p-5 ring-1 ${
                    isDarkMode ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100"
                  }`}
                >
                  <p className={`text-[12px] font-semibold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>내 인증명함</p>
                  <p className={`mt-1 text-[18px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
                    {myCardLine.name || "이름 미등록"}
                  </p>
                  {myCardLine.phone ? (
                    <p className={`mt-1 text-[14px] ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>{myCardLine.phone}</p>
                  ) : null}
                </div>

                {typeof onShareMyCardToChat === "function" ? (
                  <button
                    type="button"
                    disabled={!digitalCardActive}
                    onClick={() => {
                      if (!digitalCardActive) {
                        showToast("인증명함이 활성화되지 않았습니다.");
                        return;
                      }
                      onShareMyCardToChat();
                      onClose?.();
                    }}
                    className="w-full rounded-xl bg-blue-600 py-3.5 text-[14px] font-black text-white disabled:opacity-45"
                  >
                    채팅에 내 명함 보내기
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowAdvancedMine((v) => !v)}
                  className={`w-full text-center text-[12px] font-bold ${isDarkMode ? "text-gray-500" : "text-slate-400"}`}
                >
                  {showAdvancedMine ? "고급 설정 접기" : "회선·승인 관리 보기"}
                </button>

                {showAdvancedMine && (
                  <div
                    className={`space-y-2 rounded-2xl p-4 ring-1 ${
                      isDarkMode ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100"
                    }`}
                  >
                    {ownedCards.length === 0 ? (
                      <p className={`text-[12px] ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>등록된 회선 명함이 없습니다.</p>
                    ) : (
                      ownedCards.map((c) => (
                        <div
                          key={c.id}
                          className={`flex items-center justify-between gap-2 border-b py-2 last:border-0 text-[12px] ${
                            isDarkMode ? "border-white/10" : "border-slate-50"
                          }`}
                        >
                          <span className={`font-bold ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>
                            {c.kind} · {formatLetteringPhoneDisplay(c.phoneE164) || c.phoneE164}
                          </span>
                          {c.verificationStatus === "pending" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => mockApprove(c.id)}
                              className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-white"
                            >
                              승인
                            </button>
                          ) : (
                            <span className={`text-[10px] ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                              {c.verificationStatus}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === "b2b" && (
              <div
                className={`box-border min-w-0 max-w-full overflow-hidden rounded-2xl p-3 ring-1 ${
                  isDarkMode ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100"
                }`}
              >
                <B2BLineCartPanel onToast={showToast} onActivated={() => refreshOwned()} />
              </div>
            )}

            {tab === "mydocs" && (
              <div className="min-w-0 space-y-4 pb-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <p className={`text-[13px] font-black ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>
                      키패드 저장
                    </p>
                    <span className={`text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-slate-400"}`}>
                      {caseNotes.length}건
                    </span>
                  </div>
                  {caseNotes.length === 0 ? (
                    <p
                      className={`rounded-xl px-4 py-6 text-center text-[12px] ring-1 ${
                        isDarkMode
                          ? "bg-white/5 text-gray-400 ring-white/10"
                          : "bg-white text-slate-500 ring-slate-100"
                      }`}
                    >
                      통화 키패드에서 저장한 번호·메모가 여기에 모입니다.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {caseNotes.map((note) => (
                        <li
                          key={note.id}
                          className={`rounded-2xl p-4 ring-1 ${
                            isDarkMode ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-[15px] font-black leading-snug ${
                                  isDarkMode ? "text-gray-100" : "text-slate-900"
                                }`}
                              >
                                {note.name}
                              </p>
                              {note.digits ? (
                                <p
                                  className={`mt-1 text-[14px] font-semibold tabular-nums ${
                                    isDarkMode ? "text-sky-300" : "text-sky-700"
                                  }`}
                                >
                                  {note.digits}
                                </p>
                              ) : null}
                              {note.content ? (
                                <p
                                  className={`mt-1 whitespace-pre-wrap text-[12px] font-medium leading-relaxed ${
                                    isDarkMode ? "text-gray-400" : "text-slate-600"
                                  }`}
                                >
                                  {note.content}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${
                                isDarkMode ? "text-rose-300" : "text-rose-600"
                              }`}
                              onClick={() => {
                                removePersonalCaseNote(note.id);
                                showToast("삭제했습니다.");
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <p className={`text-[13px] font-black ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>
                      저장된 파일
                    </p>
                    <button
                      type="button"
                      onClick={refreshVaultFiles}
                      disabled={vaultLoading}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold disabled:opacity-50 ${
                        isDarkMode ? "text-blue-300" : "text-blue-600"
                      }`}
                    >
                      {vaultLoading ? "…" : "새로고침"}
                    </button>
                  </div>
                  {mergedStorageFiles.length === 0 ? (
                    <p
                      className={`rounded-xl px-4 py-8 text-center text-[12px] ring-1 ${
                        isDarkMode
                          ? "bg-white/5 text-gray-400 ring-white/10"
                          : "bg-white text-slate-500 ring-slate-100"
                      }`}
                    >
                      PDF · 엑셀 · 스캔 문서가 여기에 모입니다.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {mergedStorageFiles.map((f) => (
                        <VaultSavedFileRow
                          key={f.id || f.name}
                          file={f}
                          isDarkMode={isDarkMode}
                          onToast={showToast}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {tab === "members" && (
              <div
                className={`space-y-3 rounded-2xl p-4 ring-1 ${
                  isDarkMode ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100"
                }`}
              >
                <input
                  value={memberLoginId}
                  onChange={(e) => setMemberLoginId(e.target.value)}
                  placeholder="초대할 회원 ID"
                  className={`w-full rounded-xl border-0 px-4 py-3 text-[14px] ring-1 ${
                    isDarkMode ? "bg-white/10 text-gray-100 ring-white/15 placeholder:text-gray-500" : "bg-slate-50 ring-slate-100"
                  }`}
                />
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className={`w-full rounded-xl border-0 px-3 py-3 text-[13px] font-bold ring-1 ${
                    isDarkMode ? "bg-white/10 text-gray-100 ring-white/15" : "bg-slate-50 ring-slate-100"
                  }`}
                >
                  <option value="STAFF">STAFF</option>
                  <option value="MANAGER">MANAGER</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={inviteMember}
                  className="w-full rounded-xl bg-slate-900 py-3 text-[14px] font-black text-white disabled:opacity-50"
                >
                  멤버 초대
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-[130] w-[88%] max-w-sm -translate-x-1/2 rounded-2xl bg-slate-900/90 px-4 py-3 text-center text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
