import { useCallback, useEffect, useMemo, useState } from "react";
import MailTalkRoomView from "./MailTalkRoomView.jsx";
import MailTalkLongFormViewer from "./MailTalkLongFormViewer.jsx";
import { fetchMagneticSide, subscribeMagneticSide } from "../../lib/electronBridge.js";
import { fetchMailTalkRooms } from "../../lib/mailTalkApi.js";

/**
 * 메일톡 Electron 독립 창 — 채팅(좌/우) + 비즈니스 사이드바, 자석 레이아웃
 */
export default function MailTalkElectronShell({
  roomId,
  counterpartyEmail = "",
  isDarkMode = false
}) {
  const [magneticSide, setMagneticSide] = useState("left");
  const [viewerMessage, setViewerMessage] = useState(null);
  const [sseVersion, setSseVersion] = useState(0);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    fetchMagneticSide().then(setMagneticSide);
    return subscribeMagneticSide(({ side }) => setMagneticSide(side === "right" ? "right" : "left"));
  }, []);

  useEffect(() => {
    fetchMailTalkRooms()
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [sseVersion]);

  const layoutReverse = magneticSide === "right";

  const sidebar = useMemo(
    () => (
      <aside
        className={`flex min-h-0 w-[320px] shrink-0 flex-col border-l ${
          isDarkMode ? "border-white/10 bg-[#0f172a]" : "border-gray-200 bg-gray-50"
        } ${layoutReverse ? "border-l-0 border-r" : ""}`}
      >
        <div className={`border-b px-4 py-3 ${isDarkMode ? "border-white/10" : "border-gray-200"}`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">비즈니스 패널</p>
          <p className="mt-1 truncate text-[14px] font-black">{counterpartyEmail || "메일톡"}</p>
          <p className="text-[11px] text-gray-500">거래처 · 메일톡 하이브리드 창</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed text-gray-600">
          <p className="mb-3 font-bold text-gray-800">💼 메일톡 안내</p>
          <ul className="list-disc space-y-2 pl-4">
            <li>채팅 탭 메시지는 실제 이메일로 발송됩니다.</li>
            <li>장문 수신 메일은 말풍선 클릭 → 인앱 전용 뷰어에서 열람.</li>
            <li>답장·전달 시 디지털 인증명함이 자동 첨부됩니다.</li>
          </ul>
          {rooms.length > 1 ? (
            <div className="mt-4">
              <p className="mb-2 text-[12px] font-bold text-gray-700">다른 메일톡방</p>
              <div className="flex flex-col gap-1">
                {rooms
                  .filter((r) => r.id !== roomId)
                  .slice(0, 5)
                  .map((r) => (
                    <div
                      key={r.id}
                      className={`truncate rounded-lg px-2 py-1.5 text-[12px] ${
                        isDarkMode ? "bg-white/5 text-gray-300" : "bg-white text-gray-700 shadow-sm"
                      }`}
                    >
                      {r.counterpartyEmail}
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className={`border-t px-4 py-2 text-[10px] text-gray-400 ${isDarkMode ? "border-white/10" : ""}`}>
          창 위치: {magneticSide === "left" ? "좌측 · 채팅|사이드바" : "우측 · 사이드바|채팅"}
        </div>
      </aside>
    ),
    [counterpartyEmail, isDarkMode, layoutReverse, magneticSide, roomId, rooms]
  );

  const chatPane = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <MailTalkRoomView
        roomId={roomId}
        counterpartyEmail={counterpartyEmail}
        onBack={() => window.close()}
        isDarkMode={isDarkMode}
        sseVersion={sseVersion}
        electronMode
        onOpenLongForm={setViewerMessage}
        onMailActivity={() => setSseVersion((v) => v + 1)}
      />
    </div>
  );

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden ${isDarkMode ? "bg-[#0b1220]" : "bg-white"}`}>
      <div className={`flex h-full w-full ${layoutReverse ? "flex-row-reverse" : "flex-row"}`}>
        {chatPane}
        {sidebar}
      </div>
      {viewerMessage ? (
        <MailTalkLongFormViewer
          message={viewerMessage}
          roomId={roomId}
          counterpartyEmail={counterpartyEmail}
          rooms={rooms}
          isDarkMode={isDarkMode}
          onClose={() => setViewerMessage(null)}
          onSent={() => {
            setViewerMessage(null);
            setSseVersion((v) => v + 1);
          }}
        />
      ) : null}
    </div>
  );
}
