import { useMemo, useState } from "react";
import FamilyProtectionRegister from "./FamilyProtectionRegister.jsx";
import ContactFriendsPanel from "./ContactFriendsPanel.jsx";
import ScreenBackHeader from "./common/ScreenBackHeader";
import ModalCloseButton from "./common/ModalCloseButton";

const DIRECTORY = [
  { id: "u-minsu", name: "민수", handle: "@minsu", region: "서울 강남" },
  { id: "u-kim", name: "KIM", handle: "@kim_global", region: "서울 송파" },
  { id: "u-jiyeon", name: "지연", handle: "@jiyeon", region: "부산 해운대" },
  { id: "u-aron", name: "ARON", handle: "@aron", region: "인천 연수" },
  { id: "u-hana", name: "하나", handle: "@hana", region: "대전 유성" }
];

function FriendSearch({
  approvedFriendIds = [],
  requests = [],
  inboxRequests = [],
  blockedUserIds = [],
  contactMatchData = null,
  isDarkMode = false,
  onSendRequest,
  onApproveRequest,
  onRejectRequest,
  onBlockUser,
  onGoMain,
  onFamilyToast,
  onContactMatchUpdate,
  onContactResyncRequest,
  onOpenContactChat
}) {
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [tab, setTab] = useState(contactMatchData ? "friends" : "search");
  const [notice, setNotice] = useState("");

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DIRECTORY;
    return DIRECTORY.filter((u) => [u.name, u.handle, u.region].join(" ").toLowerCase().includes(q));
  }, [query]);

  const statusByUserId = useMemo(() => {
    const out = {};
    requests.forEach((r) => {
      out[r.toUserId] = r.status;
    });
    approvedFriendIds.forEach((id) => {
      out[id] = "approved";
    });
    blockedUserIds.forEach((id) => {
      out[id] = "blocked";
    });
    return out;
  }, [requests, approvedFriendIds, blockedUserIds]);

  const tabs = [
    { id: "friends", label: "주소록 친구" },
    { id: "search", label: "검색" },
    { id: "inbox", label: `받은 요청 (${inboxRequests.length})` },
    { id: "sent", label: "보낸 요청" }
  ];

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

        {tab === "friends" ? (
          <div className="mt-3">
            <ContactFriendsPanel
              matchData={contactMatchData}
              onMatchUpdate={onContactMatchUpdate}
              onResyncRequest={onContactResyncRequest}
              onOpenChat={onOpenContactChat}
              onFriendAdded={(user) => {
                setNotice(`${user.displayName}님에게 친구 신청을 보냈습니다.`);
              }}
            />
          </div>
        ) : null}

        {tab === "search" ? (
          <>
            <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[12px] text-gray-500">
                검색 후 친구 신청을 보내고, 승인되면 대화를 시작할 수 있습니다.
              </p>
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름/아이디/지역으로 검색"
                  className="w-full bg-transparent text-[13px] outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <FamilyProtectionRegister isDarkMode={isDarkMode} onToast={onFamilyToast} />
            </div>

            <div className="mt-3 space-y-2">
              {users.map((user) => {
                const status = statusByUserId[user.id] || "none";
                return (
                  <div key={user.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-black text-gray-900">{user.name}</p>
                        <p className="text-[11px] text-gray-500">
                          {user.handle} · {user.region}
                        </p>
                      </div>
                      {status === "approved" ? (
                        <span className="text-[11px] font-bold text-emerald-600">친구</span>
                      ) : status === "pending" ? (
                        <span className="text-[11px] font-bold text-amber-600">대기</span>
                      ) : status === "blocked" ? (
                        <span className="text-[11px] font-bold text-rose-600">차단</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setRequestMessage("");
                          }}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white"
                        >
                          신청
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {tab === "inbox" || tab === "sent" ? (
          <div className="mt-3 space-y-2">
            {(tab === "inbox" ? inboxRequests : requests.filter((r) => r.status === "pending")).map((req) => (
              <div key={req.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <p className="text-[13px] font-bold text-gray-900">{req.fromName || req.toUserId}</p>
                {tab === "inbox" ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onApproveRequest?.(req.id);
                        setNotice("친구 요청을 수락했습니다.");
                      }}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white"
                    >
                      수락
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectRequest?.(req.id)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600"
                    >
                      거절
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {selectedUser ? (
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-3 pb-6"
            onMouseDown={() => setSelectedUser(null)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-white p-4 pt-12 shadow-xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <ModalCloseButton variant="default" onClick={() => setSelectedUser(null)} />
              <p className="text-[15px] font-black text-gray-900">{selectedUser.name}에게 친구 신청</p>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="메시지 (선택)"
                className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none"
                rows={3}
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSendRequest?.(selectedUser, requestMessage);
                    setSelectedUser(null);
                    setNotice("친구 신청을 보냈습니다.");
                  }}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
                >
                  보내기
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default FriendSearch;
