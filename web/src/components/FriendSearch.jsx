import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import FamilyProtectionRegister from "./FamilyProtectionRegister.jsx";
import ContactFriendsPanel from "./ContactFriendsPanel.jsx";
import ScreenBackHeader from "./common/ScreenBackHeader";
import {
  fetchContactFriendRequests,
  respondContactFriendRequest,
  sendContactFriendRequest
} from "../lib/contactFriendsApi.js";
import { saveContactMatchCache } from "../lib/contactSyncStorage.js";
import { EXPAND_FAMILY_KEY, OPEN_FAMILY_TAB_EVENT } from "../lib/posDashboardConstants.js";
import {
  detectShowcaseSearchMode,
  searchShowcaseByTag
} from "../lib/showcase/showcaseTagsApi.js";

function shouldOpenFamilyTab() {
  try {
    return sessionStorage.getItem(EXPAND_FAMILY_KEY) === "1";
  } catch {
    return false;
  }
}

function patchMatchRelations(matchData, { friendIds = [], pendingSent = [], pendingReceived = [] } = {}) {
  if (!matchData || !Array.isArray(matchData.registered)) return matchData;
  const friends = new Set((friendIds || []).map((id) => String(id || "").trim()).filter(Boolean));
  const sent = new Set((pendingSent || []).map((id) => String(id || "").trim()).filter(Boolean));
  const received = new Set((pendingReceived || []).map((id) => String(id || "").trim()).filter(Boolean));
  let changed = false;
  const registered = matchData.registered.map((row) => {
    const uid = String(row?.userId || "").trim();
    if (!uid) return row;
    const isFriend = Boolean(row.isFriend) || friends.has(uid);
    let friendRequestPending = null;
    if (isFriend) friendRequestPending = null;
    else if (sent.has(uid)) friendRequestPending = "sent";
    else if (received.has(uid)) friendRequestPending = "received";
    if (row.isFriend === isFriend && row.friendRequestPending === friendRequestPending) return row;
    changed = true;
    return { ...row, isFriend, friendRequestPending };
  });
  return changed ? { ...matchData, registered } : matchData;
}

function FriendSearch({
  approvedFriendIds = [],
  inboxRequests = [],
  requests = [],
  contactMatchData = null,
  isDarkMode = false,
  onApproveRequest,
  onRejectRequest,
  onGoMain,
  onFamilyToast,
  onContactMatchUpdate,
  onContactResyncRequest,
  onOpenContactChat,
  onOpenContactShowcase,
  onSendRequest,
  onFriendEstablished
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(() => (shouldOpenFamilyTab() ? "family" : "friends"));
  const [notice, setNotice] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");
  const [familyPrefill, setFamilyPrefill] = useState("");
  const [searchHits, setSearchHits] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchActionBusy, setSearchActionBusy] = useState("");
  const [sentRequests, setSentRequests] = useState(() =>
    Array.isArray(requests) ? requests : []
  );
  const [receivedRequests, setReceivedRequests] = useState(() =>
    Array.isArray(inboxRequests) ? inboxRequests : []
  );
  const [serverFriendIds, setServerFriendIds] = useState([]);
  const [relationsReady, setRelationsReady] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const matchDataRef = useRef(contactMatchData);
  const approvedIdsRef = useRef(approvedFriendIds);
  const onMatchUpdateRef = useRef(onContactMatchUpdate);
  matchDataRef.current = contactMatchData;
  approvedIdsRef.current = approvedFriendIds;
  onMatchUpdateRef.current = onContactMatchUpdate;

  const pendingSentIds = useMemo(
    () =>
      sentRequests
        .filter((r) => r.status === "pending")
        .map((r) => String(r.toUserId || "").trim())
        .filter(Boolean),
    [sentRequests]
  );
  const pendingReceivedIds = useMemo(
    () => receivedRequests.map((r) => String(r.fromUserId || "").trim()).filter(Boolean),
    [receivedRequests]
  );
  const mergedFriendIds = useMemo(() => {
    const set = new Set([
      ...(approvedFriendIds || []).map((id) => String(id || "").trim()).filter(Boolean),
      ...(serverFriendIds || []).map((id) => String(id || "").trim()).filter(Boolean)
    ]);
    return [...set];
  }, [approvedFriendIds, serverFriendIds]);

  const reloadFriendRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res = await fetchContactFriendRequests();
      if (res.ok) {
        const sent = res.sent || [];
        const received = res.received || [];
        const accepted = res.acceptedFriendIds || [];
        setSentRequests(sent);
        setReceivedRequests(received);
        setServerFriendIds(accepted);
        setRelationsReady(true);
        const sentIds = sent.map((r) => String(r.toUserId || "").trim()).filter(Boolean);
        const receivedIds = received.map((r) => String(r.fromUserId || "").trim()).filter(Boolean);
        const friends = [
          ...new Set([
            ...(approvedIdsRef.current || []).map((id) => String(id || "").trim()).filter(Boolean),
            ...accepted
          ])
        ];
        const current = matchDataRef.current;
        const update = onMatchUpdateRef.current;
        if (current && update) {
          const patched = patchMatchRelations(current, {
            friendIds: friends,
            pendingSent: sentIds,
            pendingReceived: receivedIds
          });
          if (patched !== current) {
            saveContactMatchCache(patched);
            update(patched);
          }
        }
      }
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadFriendRequests();
    const timer = window.setInterval(() => {
      void reloadFriendRequests();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [reloadFriendRequests]);

  useEffect(() => {
    if (tab === "sent" || tab === "inbox") void reloadFriendRequests();
  }, [tab, reloadFriendRequests]);

  useEffect(() => {
    const openFamily = (event) => {
      const handle = String(event?.detail?.handle || "").replace(/^@+/, "");
      if (handle) setFamilyPrefill(handle);
      setTab("family");
    };
    window.addEventListener("vlue-open-family-register", openFamily);
    window.addEventListener(OPEN_FAMILY_TAB_EVENT, openFamily);
    return () => {
      window.removeEventListener("vlue-open-family-register", openFamily);
      window.removeEventListener(OPEN_FAMILY_TAB_EVENT, openFamily);
    };
  }, []);

  useEffect(() => {
    if (tab !== "search") return undefined;
    const q = String(query || "").trim();
    if (q.length < 2) {
      setSearchHits([]);
      setSearchError("");
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchBusy(true);
      setSearchError("");
      const mode = detectShowcaseSearchMode(q) || "name";
      void searchShowcaseByTag(q, { mode }).then((res) => {
        if (cancelled) return;
        setSearchBusy(false);
        if (!res.ok) {
          setSearchHits([]);
          setSearchError(res.error || "검색에 실패했습니다.");
          return;
        }
        setSearchHits(Array.isArray(res.items) ? res.items : []);
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tab, query]);

  useEffect(() => {
    if (!relationsReady || !contactMatchData?.registered?.length) return;
    const patched = patchMatchRelations(contactMatchData, {
      friendIds: mergedFriendIds,
      pendingSent: pendingSentIds,
      pendingReceived: pendingReceivedIds
    });
    if (patched !== contactMatchData) {
      saveContactMatchCache(patched);
      onContactMatchUpdate?.(patched);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 서버 관계 로드 후 id 합집합만 반영
  }, [
    relationsReady,
    mergedFriendIds.join("|"),
    pendingSentIds.join("|"),
    pendingReceivedIds.join("|"),
    contactMatchData?.registered?.length
  ]);

  useEffect(() => {
    if (shouldOpenFamilyTab()) setTab("family");
  }, []);

  const tabs = [
    { id: "friends", label: "친구" },
    { id: "inbox", label: "받은 신청" },
    { id: "sent", label: "보낸 신청" },
    { id: "family", label: "가족 보호" }
  ];

  const openFamilyForUser = (user) => {
    const handle = String(user?.publicHandle || user?.handle || "").replace(/^@+/, "");
    setFamilyPrefill(handle || String(user?.displayName || user?.name || "").trim());
    setTab("family");
    setNotice("가족 보호 등록 화면으로 이동했습니다. 대상을 확인한 뒤 초대해 주세요.");
  };

  const friendStatusForUser = (userId) => {
    const uid = String(userId || "").trim();
    if (!uid) return "none";
    if (mergedFriendIds.includes(uid)) return "accepted";
    if (pendingSentIds.includes(uid)) return "pending";
    if (pendingReceivedIds.includes(uid)) return "received";
    return "none";
  };

  const handleSearchFriendRequest = async (hit) => {
    const uid = String(hit?.userId || hit?.id || "").trim();
    if (!uid || searchActionBusy) return;
    const status = friendStatusForUser(uid);
    if (status === "accepted") {
      setNotice("이미 친구입니다.");
      return;
    }
    if (status === "pending") {
      setNotice("이미 신청했습니다. 「보낸 신청」에서 대기 상태를 확인하세요.");
      return;
    }
    if (status === "received") {
      setNotice("상대가 보낸 신청이 있습니다. 「받은 신청」에서 수락해 주세요.");
      return;
    }
    setSearchActionBusy(uid);
    try {
      const name = hit.displayName || hit.name || hit.handle || "상대";
      const res = await sendContactFriendRequest(uid, `${name}님, VLUÉ에서 연결해요.`);
      if (res.ok) {
        handleFriendAdded({
          userId: uid,
          displayName: name,
          requestId: res.id,
          status: res.status || "pending",
          autoAccepted: Boolean(res.autoAccepted) || res.status === "accepted"
        });
      }
    } catch (e) {
      setNotice(e?.message || "친구 신청에 실패했습니다.");
    } finally {
      setSearchActionBusy("");
    }
  };

  const handleFriendAdded = (user) => {
    const uid = String(user.userId || "").trim();
    const name = user.displayName || user.contactName || "상대";
    if (user.status === "accepted" || user.autoAccepted) {
      setNotice(`${name}님과 친구가 되었습니다.`);
      if (uid) {
        setServerFriendIds((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
        onFriendEstablished?.(uid, name);
      }
    } else {
      setNotice(`${name}님에게 친구 신청을 보냈습니다. 「보낸 신청」에서 확인할 수 있습니다.`);
      const entry = {
        id: user.requestId || `fr-${user.userId || Date.now()}`,
        status: "pending",
        direction: "sent",
        toUserId: user.userId,
        toUserName: name,
        peerName: name,
        fromName: name,
        createdAt: new Date().toISOString()
      };
      setSentRequests((prev) => {
        if (prev.some((r) => r.id === entry.id || r.toUserId === user.userId)) return prev;
        return [entry, ...prev];
      });
      onSendRequest?.(
        { id: user.userId, name },
        `${name}님, VLUÉ에서 연결해요.`
      );
    }
    void reloadFriendRequests();
  };

  const listForTab = tab === "inbox" ? receivedRequests : sentRequests;

  const handleRespond = async (req, action) => {
    if (!req?.id || busyRequestId) return;
    setBusyRequestId(req.id);
    try {
      await respondContactFriendRequest(req.id, action);
      setReceivedRequests((prev) => prev.filter((r) => r.id !== req.id));
      if (action === "accept") {
        const peerId = String(req.fromUserId || "").trim();
        const peerName = req.fromName || req.fromUserName || req.peerName || "친구";
        setNotice(`${peerName}님과 친구가 되었습니다.`);
        if (peerId) {
          setServerFriendIds((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
          onFriendEstablished?.(peerId, peerName);
        }
        onApproveRequest?.(req.id, req);
      } else {
        setNotice("친구 요청을 거절했습니다.");
        onRejectRequest?.(req.id, req);
      }
      void reloadFriendRequests();
    } catch (e) {
      setNotice(String(e?.message || "처리에 실패했습니다."));
      void reloadFriendRequests();
    } finally {
      setBusyRequestId("");
    }
  };

  const searchHeaderBtn = (
    <button
      type="button"
      aria-label="친구 검색"
      aria-pressed={tab === "search"}
      title="검색"
      onClick={() => setTab((prev) => (prev === "search" ? "friends" : "search"))}
      className={`flex h-9 w-9 items-center justify-center rounded-full ${
        tab === "search"
          ? "bg-blue-600 text-white"
          : isDarkMode
            ? "text-white/80 hover:bg-white/10"
            : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Search className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
    </button>
  );

  return (
    <section className="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden pt-[max(12px,var(--vlue-safe-top,env(safe-area-inset-top,0px)))]">
      <ScreenBackHeader
        title="친구"
        onBack={onGoMain}
        isDarkMode={isDarkMode}
        right={searchHeaderBtn}
        className="!pt-2"
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-[calc(54px+env(safe-area-inset-bottom,0px)+12px)]">
        <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${
                tab === t.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {notice ? (
          <p
            role="status"
            className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center text-[12px] font-bold text-blue-700"
          >
            {notice}
          </p>
        ) : null}

        {tab === "family" ? (
          <div className="mt-3">
            <FamilyProtectionRegister
              key={familyPrefill || "family"}
              isDarkMode={isDarkMode}
              prefillHandle={familyPrefill}
              onToast={onFamilyToast}
            />
          </div>
        ) : null}

        {tab === "friends" ? (
          <div className="mt-3">
            <ContactFriendsPanel
              matchData={contactMatchData}
              onMatchUpdate={onContactMatchUpdate}
              onResyncRequest={onContactResyncRequest}
              onOpenChat={onOpenContactChat}
              onOpenShowcase={onOpenContactShowcase || onOpenContactChat}
              onRegisterFamily={openFamilyForUser}
              approvedFriendIds={mergedFriendIds}
              pendingSentIds={pendingSentIds}
              pendingReceivedIds={pendingReceivedIds}
              onFriendAdded={handleFriendAdded}
            />
          </div>
        ) : null}

        {tab === "search" ? (
          <>
            <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[12px] text-gray-500">
                닉네임·아이디(@)·전화번호로 VLUE 회원을 검색합니다. 결과에서 바로 친구 신청·가족 등록이
                가능합니다.
              </p>
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="닉네임 / @아이디 / 010번호"
                  autoFocus
                  className="w-full bg-transparent text-[13px] outline-none"
                />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {searchBusy ? (
                <p className="rounded-xl bg-gray-50 px-3 py-4 text-center text-[12px] text-gray-500">
                  회원 검색 중…
                </p>
              ) : null}
              {searchError ? (
                <p className="rounded-xl bg-rose-50 px-3 py-3 text-center text-[12px] font-bold text-rose-600">
                  {searchError}
                </p>
              ) : null}
              {!searchBusy && query.trim().length >= 2 && !searchHits.length && !searchError ? (
                <p className="rounded-xl bg-gray-50 px-3 py-4 text-center text-[12px] text-gray-500">
                  일치하는 VLUE 회원이 없습니다.
                </p>
              ) : null}
              {searchHits.map((hit) => {
                const uid = String(hit.userId || hit.id || "").trim();
                const status = friendStatusForUser(uid);
                const title =
                  hit.displayName || hit.name || hit.handle || hit.publicHandle || "회원";
                const sub = [hit.handle || hit.publicHandle, hit.maskedPhone || hit.phone]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={uid || title}
                    className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-black text-gray-900">{title}</p>
                      <p className="truncate text-[11px] text-gray-500">{sub || "VLUE 회원"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {status === "accepted" ? (
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center text-[11px] font-black text-emerald-700">
                          수락됨
                        </span>
                      ) : status === "pending" ? (
                        <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-[11px] font-black text-amber-700">
                          신청 완료 (대기 중)
                        </span>
                      ) : status === "received" ? (
                        <span className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-center text-[11px] font-black text-violet-700">
                          받은 신청
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={searchActionBusy === uid}
                          onClick={() => void handleSearchFriendRequest(hit)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
                        >
                          {searchActionBusy === uid ? "신청 중…" : "친구 신청"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          openFamilyForUser({
                            publicHandle: hit.handle || hit.publicHandle,
                            displayName: title,
                            userId: uid
                          })
                        }
                        className="rounded-lg border border-gray-200 px-3 py-1 text-[10px] font-bold text-gray-700"
                      >
                        가족 등록
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <p className="mb-2 px-1 text-[11px] font-black text-gray-500">전화부 동기화 명단에서도 찾기</p>
              <ContactFriendsPanel
                compact
                filterQuery={query}
                matchData={contactMatchData}
                onMatchUpdate={onContactMatchUpdate}
                onResyncRequest={onContactResyncRequest}
                onOpenChat={onOpenContactChat}
                onOpenShowcase={onOpenContactShowcase || onOpenContactChat}
                onRegisterFamily={openFamilyForUser}
                approvedFriendIds={mergedFriendIds}
                pendingSentIds={pendingSentIds}
                pendingReceivedIds={pendingReceivedIds}
                onFriendAdded={handleFriendAdded}
              />
            </div>
          </>
        ) : null}

        {tab === "inbox" || tab === "sent" ? (
          <div className="mt-3 space-y-2">
            {requestsLoading ? (
              <p className="rounded-xl bg-gray-50 px-3 py-6 text-center text-[12px] text-gray-500">
                불러오는 중…
              </p>
            ) : null}
            {!requestsLoading && listForTab.length === 0 ? (
              <p className="rounded-xl bg-gray-50 px-3 py-6 text-center text-[12px] text-gray-500">
                {tab === "sent" ? "보낸 요청이 없습니다." : "받은 요청이 없습니다."}
              </p>
            ) : null}
            {!requestsLoading
              ? listForTab.map((req) => {
                  const status = String(req.status || "pending");
                  const statusLabel =
                    req.statusLabel ||
                    (status === "accepted"
                      ? "수락됨"
                      : status === "rejected"
                        ? "거절됨"
                        : "신청 완료 (대기 중)");
                  const statusClass =
                    status === "accepted"
                      ? "text-emerald-700"
                      : status === "rejected"
                        ? "text-rose-600"
                        : "text-amber-700";
                  return (
                  <div key={req.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <p className="text-[13px] font-bold text-gray-900">
                      {tab === "sent"
                        ? req.toUserName || req.peerName || req.toUserId
                        : req.fromName || req.fromUserName || req.peerName || req.fromUserId}
                    </p>
                    {req.message ? (
                      <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{req.message}</p>
                    ) : null}
                    <p className={`mt-1 text-[11px] font-black ${tab === "sent" ? statusClass : "text-violet-700"}`}>
                      {tab === "sent" ? statusLabel : "받은 신청"}
                      {req.updatedAt || req.createdAt
                        ? ` · ${new Date(req.updatedAt || req.createdAt).toLocaleDateString("ko-KR")}`
                        : ""}
                    </p>
                    {tab === "inbox" ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={busyRequestId === req.id}
                          onClick={() => void handleRespond(req, "accept")}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
                        >
                          {busyRequestId === req.id ? "처리 중…" : "수락"}
                        </button>
                        <button
                          type="button"
                          disabled={busyRequestId === req.id}
                          onClick={() => void handleRespond(req, "reject")}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 disabled:opacity-60"
                        >
                          거절
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
                })
              : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default FriendSearch;
