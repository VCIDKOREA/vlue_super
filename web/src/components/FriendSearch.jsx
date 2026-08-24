import { useCallback, useEffect, useState } from "react";
import FamilyProtectionRegister from "./FamilyProtectionRegister.jsx";
import ContactFriendsPanel from "./ContactFriendsPanel.jsx";
import ScreenBackHeader from "./common/ScreenBackHeader";
import { fetchContactFriendRequests } from "../lib/contactFriendsApi.js";
import { EXPAND_FAMILY_KEY, OPEN_FAMILY_TAB_EVENT } from "../lib/posDashboardConstants.js";

function shouldOpenFamilyTab() {
  try {
    return sessionStorage.getItem(EXPAND_FAMILY_KEY) === "1";
  } catch {
    return false;
  }
}

function FriendSearch({
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
  onSendRequest
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(() => (shouldOpenFamilyTab() ? "family" : "friends"));
  const [notice, setNotice] = useState("");
  const [sentRequests, setSentRequests] = useState(() =>
    Array.isArray(requests) ? requests.filter((r) => r.status === "pending") : []
  );
  const [receivedRequests, setReceivedRequests] = useState(() =>
    Array.isArray(inboxRequests) ? inboxRequests : []
  );
  const [requestsLoading, setRequestsLoading] = useState(false);

  const reloadFriendRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res = await fetchContactFriendRequests();
      if (res.ok) {
        setSentRequests(res.sent || []);
        setReceivedRequests(res.received || []);
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
    const openFamilyTab = () => setTab("family");
    if (shouldOpenFamilyTab()) openFamilyTab();
    window.addEventListener(OPEN_FAMILY_TAB_EVENT, openFamilyTab);
    return () => window.removeEventListener(OPEN_FAMILY_TAB_EVENT, openFamilyTab);
  }, []);

  const tabs = [
    { id: "family", label: "가족 보호" },
    { id: "friends", label: "주소록 친구" },
    { id: "search", label: "검색" },
    { id: "inbox", label: `받은 요청 (${receivedRequests.length})` },
    { id: "sent", label: `보낸 요청 (${sentRequests.length})` }
  ];

  const listForTab = tab === "inbox" ? receivedRequests : sentRequests;

  return (
    <section className="mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden">
      <ScreenBackHeader title="친구" onBack={onGoMain} isDarkMode={isDarkMode} />
      <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
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

        {notice ? <p className="mt-2 text-center text-[11px] font-bold text-blue-600">{notice}</p> : null}

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
              onFriendAdded={(user) => {
                const name = user.displayName || user.contactName || "상대";
                setNotice(`${name}님에게 친구 신청을 보냈습니다.`);
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
                  `${name}님, VLUE에서 연결해요.`
                );
                void reloadFriendRequests();
              }}
            />
          </div>
        ) : null}

        {tab === "search" ? (
          <>
            <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[12px] text-gray-500">
                전화부 동기화 명단에서 검색합니다. VLUE 사용 중이면 <b>신청</b>, 아니면 <b>추천</b>(카톡·문자 공유)입니다.
              </p>
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름/아이디/번호로 검색"
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
                onFriendAdded={(user) => {
                  const name = user.displayName || user.contactName || "상대";
                  setNotice(`${name}님에게 친구 신청을 보냈습니다.`);
                  void reloadFriendRequests();
                }}
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
                          onClick={() => {
                            onApproveRequest?.(req.id);
                            setReceivedRequests((prev) => prev.filter((r) => r.id !== req.id));
                            setNotice("친구 요청을 수락했습니다.");
                          }}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white"
                        >
                          수락
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRejectRequest?.(req.id);
                            setReceivedRequests((prev) => prev.filter((r) => r.id !== req.id));
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600"
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
