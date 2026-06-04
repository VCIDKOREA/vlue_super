import { useCallback, useEffect, useRef, useState } from "react";
import { VlueOfficialChannelAvatar } from "./VlueOfficialChannelAvatar.jsx";
import { FAMILY_MEMBER_DISPLAY_LABEL } from "../lib/familyProtectionDemo.js";

const BASE_MENU = [
  { id: "pin", label: "상단고정" },
  { id: "rename", label: "채팅방 이름수정" },
  { id: "delete", label: "채팅방삭제" },
  { id: "toggleNotify", label: "알림켜기&끄기" },
  { id: "markRead", label: "읽음처리" },
  { id: "leave", label: "채팅방나가기" }
];

const FLOAT_MENU = { id: "toggleFloat", label: "플로팅띄우기&접기" };

function ChatList({ rooms, selectedRoomId, onSelect, onOpenProfile, onRoomAction, isDesktopPd = false, floatingRoomIds }) {
  const [menu, setMenu] = useState(null);
  const longPressRef = useRef(null);
  const suppressClickRef = useRef(false);

  const closeMenu = useCallback(() => setMenu(null), []);

  const openMenuAt = useCallback((room, clientX, clientY) => {
    const x = Math.min(Math.max(12, clientX), window.innerWidth - 200);
    const y = Math.min(Math.max(12, clientY), window.innerHeight - 280);
    setMenu({ room, x, y });
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 400);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const startLongPress = useCallback(
    (room, clientX, clientY) => {
      clearLongPress();
      longPressRef.current = setTimeout(() => {
        openMenuAt(room, clientX, clientY);
        longPressRef.current = null;
      }, 520);
    },
    [clearLongPress, openMenuAt]
  );

  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, closeMenu]);

  const menuItems = isDesktopPd
    ? [...BASE_MENU.slice(0, 5), FLOAT_MENU, BASE_MENU[5]]
    : BASE_MENU;

  const isFloating = (roomId) => floatingRoomIds?.has?.(roomId);

  return (
    <>
      <section className="chat-list-surface min-h-0 w-full flex-1 overflow-y-auto bg-transparent pb-[calc(54px+env(safe-area-inset-bottom,0px)+12px)]">
        <div className="pt-0">
          <div className="flex flex-col gap-0">
            {rooms.map((room) => {
              const isSelected = selectedRoomId === room.roomId;
              const isOfficial = Boolean(room.isOfficial);
              const isMemo = Boolean(room.isMemo);
              const familyLabel = room.isFamilyMember ? FAMILY_MEMBER_DISPLAY_LABEL : null;
              const familyBadgeClass =
                room.familyRelation === "parent"
                  ? "family-avatar-badge family-avatar-badge--parent"
                  : room.familyRelation === "child"
                    ? "family-avatar-badge family-avatar-badge--child"
                    : "family-avatar-badge";

              return (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    onSelect(room.roomId);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMenuAt(room, e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    if (t) startLongPress(room, t.clientX, t.clientY);
                  }}
                  onTouchEnd={clearLongPress}
                  onTouchMove={clearLongPress}
                  onTouchCancel={clearLongPress}
                  aria-current={isSelected ? "true" : undefined}
                  className={`chat-item cursor-pointer flex items-center gap-4 border-b border-gray-50 w-full min-h-[64px] py-2.5 text-left transition-colors ${
                    isSelected ? "bg-blue-50/70" : ""
                  } ${isOfficial ? "-translate-y-[3px]" : ""} ${isMemo ? "bg-violet-50/30 dark:bg-violet-950/20" : ""} ${room.isPinned && !isMemo ? "bg-amber-50/40" : ""}`}
                >
                  {isOfficial ? (
                    <VlueOfficialChannelAvatar variant="list" />
                  ) : isMemo ? (
                    <span
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 text-xl dark:border-violet-800 dark:from-violet-950 dark:to-blue-950"
                      aria-hidden
                    >
                      📝
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile?.(room.roomId);
                      }}
                      className="relative w-11 h-11 rounded-[14px] bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 overflow-visible"
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-gray-400 p-1.5 overflow-hidden rounded-[12px]">
                        <path
                          d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                          fill="currentColor"
                        />
                        <path
                          d="M18 19C18 16.7909 15.3137 15 12 15C8.68629 15 6 16.7909 6 19"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      {room.isFamilyMember ? (
                        <span className={familyBadgeClass} title={familyLabel ? "가족 보호 · FAMILY" : "가족 보호 등록"}>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </span>
                      ) : null}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        {room.isPinned && !isMemo ? (
                          <span className="shrink-0 text-[10px] font-black text-amber-600" title="상단 고정">
                            📌
                          </span>
                        ) : null}
                        <span
                          className={`chat-room-name truncate text-[15px] font-normal leading-tight ${
                            isSelected ? "text-blue-800" : "text-[#111318]"
                          }`}
                        >
                          {room.name}
                        </span>
                        {room.notificationsMuted ? (
                          <span className="shrink-0 text-[10px] text-gray-400" title="알림 끔">
                            🔕
                          </span>
                        ) : null}
                        {isFloating(room.roomId) ? (
                          <span className="shrink-0 text-[10px] text-indigo-600" title="플로팅">
                            ⧉
                          </span>
                        ) : null}
                        {familyLabel ? (
                          <span className="family-relation-pill family-relation-pill--family">{familyLabel}</span>
                        ) : null}
                        {!isOfficial && room.membershipTier === "premium" && (
                          <span className="premium-verified-icon" title="프리미엄">
                            <span className="text-[9px] font-medium leading-none">V</span>
                          </span>
                        )}
                      </span>
                      <div className="relative shrink-0 pl-1">
                        <span className={`chat-room-time text-[11px] font-normal ${isSelected ? "text-blue-500" : "text-gray-400"}`}>
                          {room.time}
                        </span>
                        {(room.unreadCount || 0) > 0 && (
                          <span className="unread-badge unread-badge-time">{room.unreadCount > 99 ? "99+" : room.unreadCount}</span>
                        )}
                      </div>
                    </div>
                    <p
                      className={`chat-room-last mt-0.5 truncate text-[14px] font-normal leading-snug ${
                        isSelected ? "text-blue-600/90" : "text-[#65676b]"
                      }`}
                    >
                      {room.lastMsg}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {menu ? (
        <>
          <button type="button" className="fixed inset-0 z-[90] cursor-default bg-black/20" aria-label="메뉴 닫기" onClick={closeMenu} />
          <div
            className="fixed z-[91] min-w-[168px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
            style={{ left: menu.x, top: menu.y }}
            role="menu"
          >
            {menuItems.map((item) => {
              let label = item.label;
              if (item.id === "pin" && menu.room.isPinned) label = "상단고정 해제";
              if (item.id === "toggleNotify" && menu.room.notificationsMuted) label = "알림 켜기";
              if (item.id === "toggleFloat" && isFloating(menu.room.roomId)) label = "플로팅 접기";
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-gray-800 active:bg-gray-100"
                  onClick={() => {
                    onRoomAction?.(menu.room.roomId, item.id, menu.room);
                    closeMenu();
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </>
  );
}

export default ChatList;
