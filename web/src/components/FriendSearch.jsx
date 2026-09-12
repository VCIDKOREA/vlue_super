import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import FamilyProtectionRegister from "./FamilyProtectionRegister.jsx";
import ContactFriendsPanel from "./ContactFriendsPanel.jsx";
import ScreenBackHeader from "./common/ScreenBackHeader";
import {
  fetchContactFriendRequests,
  respondContactFriendRequest
} from "../lib/contactFriendsApi.js";
import { saveContactMatchCache } from "../lib/contactSyncStorage.js";
import { EXPAND_FAMILY_KEY, OPEN_FAMILY_TAB_EVENT } from "../lib/posDashboardConstants.js";

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
  const [sentRequests, setSentRequests] = useState(() =>
    Array.isArray(requests) ? requests.filter((r) => r.status === "pending") : []
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
    () => sentRequests.map((r) => String(r.toUserId || "").trim()).filter(Boolean),
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
  }, [reloadFriendRequests]);

  useEffect(() => {
    if (tab === "sent" || tab === "inbox") void reloadFriendRequests();
  }, [tab, reloadFriendRequests]);

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
    const openFamilyTab = () => setTab("family");
    if (shouldOpenFamilyTab()) openFamilyTab();
    window.addEventListener(OPEN_FAMILY_TAB_EVENT, openFamilyTab);
    return () => window.removeEventListener(OPEN_FAMILY_TAB_EVENT, openFamilyTab);
  }, []);

  const tabs = [
    { id: "friends", label: "친구" },
    { id: "inbox", label: "받은 신청" },
    { id: "sent", label: "보낸 신청" },
    { id: "family", label: "가족 보호" }
  ];

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
            <FamilyProtectionRegister isDarkMode={isDarkMode} onToast={onFamilyToast} />
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
                전화부 동기화 명단에서 검색합니다. VLUÉ 사용 중이면 <b>신청</b>, 아니면 <b>추천</b>
                (카톡·문자 공유)입니다.
              </p>
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름/아이디/번호로 검색"
                  autoFocus
                  className="w-full bg-transparent text-[13px] outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <ContactFriendsPanel
                compact
                filterQuery={query}
                matchData={contactMatchData}
                onMatchUpdate={onContactMatchUpdate}
                onResyncRequest={onContactResyncRequest}
                onOpenChat={onOpenContactChat}
                onOpenShowcase={onOpenContactShowcase || onOpenContactChat}
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
              ? listForTab.map((req) => (
                  <div key={req.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <p className="text-[13px] font-bold text-gray-900">
                      {tab === "sent"
                        ? req.toUserName || req.peerName || req.toUserId
                        : req.fromName || req.fromUserName || req.peerName || req.fromUserId}
                    </p>
                    {req.message ? (
                      <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{req.message}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] font-semibold text-gray-400">
                      {tab === "sent" ? "대기 중" : "받은 신청"}
                      {req.createdAt
                        ? ` · ${new Date(req.createdAt).toLocaleDateString("ko-KR")}`
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
                ))
              : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default FriendSearch;
