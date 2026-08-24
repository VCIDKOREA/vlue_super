import { useEffect, useState } from "react";
import { fetchFamilyCircle } from "../lib/familyProtectionApi.js";

function relationLabel(relation, wardRole) {
  if (relation === "guardian" || wardRole === "guardian") return "보호자";
  if (relation === "child" || wardRole === "child") return "자녀";
  if (relation === "relative" || wardRole === "observer") return "가족";
  return "부모(노부모)";
}

/** 가족 보호 구성원 확인 모달 */
export default function FamilyMembersCircleModal({ open, onClose, isDarkMode = false }) {
  const [loading, setLoading] = useState(false);
  const [networks, setNetworks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    fetchFamilyCircle()
      .then((d) => setNetworks(Array.isArray(d?.networks) ? d.networks : []))
      .catch((e) => setError(e?.message || "구성원 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const panel = isDarkMode ? "bg-[#151821] text-gray-100" : "bg-white text-gray-900";
  const sub = isDarkMode ? "text-gray-400" : "text-gray-500";
  const row = isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50/80";

  return (
    <div className="fixed inset-0 z-[270] flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={onClose}>
      <div className={`flex max-h-[min(88dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl ${panel}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between border-b px-4 py-3 ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
          <div>
            <p className="text-[15px] font-black">구성원 확인</p>
            <p className={`mt-0.5 text-[11px] ${sub}`}>같은 보호자 네트워크의 가족 연결을 확인합니다.</p>
          </div>
          <button type="button" className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${isDarkMode ? "bg-white/10" : "bg-gray-100"}`} onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? <p className={`text-center text-[12px] ${sub}`}>불러오는 중…</p> : null}
          {error ? <p className="text-center text-[12px] font-bold text-red-500">{error}</p> : null}
          {!loading && !error && networks.length === 0 ? (
            <p className={`text-center text-[12px] ${sub}`}>연결된 가족 구성원이 없습니다.</p>
          ) : null}
          {networks.map((net) => (
            <div key={net.guardianUserId} className="mb-3">
              <p className={`text-[12px] font-black ${isDarkMode ? "text-indigo-200" : "text-indigo-800"}`}>
                보호자 · {net.guardianName}
              </p>
              <div className="mt-1.5 space-y-1.5">
                {(net.members || []).map((m) => (
                  <div key={`${net.guardianUserId}-${m.userId}`} className={`rounded-xl border px-3 py-2 ${row}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-bold">
                        {m.name}
                        {m.isMe ? " (나)" : ""}
                      </p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isDarkMode ? "bg-indigo-500/20 text-indigo-200" : "bg-indigo-50 text-indigo-700"}`}>
                        {relationLabel(m.familyRelation, m.wardRole)}
                      </span>
                    </div>
                    <p className={`mt-0.5 text-[10px] ${sub}`}>
                      {m.protectionActive ? "보호 기능 활성" : m.wardRole === "observer" || m.familyRelation === "relative" ? "알림 수신만" : m.status === "pending" ? "승인 대기" : "연결됨"}
                      {m.publicHandle ? ` · @${String(m.publicHandle).replace(/^@+/, "")}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function familyRelationPickerLabel(relation) {
  if (relation === "child") return "자녀";
  if (relation === "relative") return "가족";
  return "부모";
}
