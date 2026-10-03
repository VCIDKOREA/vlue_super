import { useEffect, useState } from "react";
import { reverseGeocodeLatLng } from "../../lib/activeRegion.js";
import { fetchFamilySafetyReport } from "../../lib/safetyPatch.js";

export default function MemberSafetyDetail({ member, roomId = "", dark = false }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [localAddress, setLocalAddress] = useState("");

  useEffect(() => {
    if (!member?.userId) {
      setReport(null);
      setLocalAddress("");
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setReport(null);
    fetchFamilySafetyReport(member.userId, roomId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) setReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member?.userId, roomId]);

  useEffect(() => {
    const known = report?.addressLabel || member?.addressLabel;
    if (known || member?.lat == null || member?.lng == null) {
      setLocalAddress("");
      return undefined;
    }
    let cancelled = false;
    reverseGeocodeLatLng(member.lat, member.lng)
      .then((region) => {
        if (!cancelled) setLocalAddress(region.detailedAddress || region.displayName || region.label || "");
      })
      .catch(() => {
        if (!cancelled) setLocalAddress("");
      });
    return () => {
      cancelled = true;
    };
  }, [member?.userId, member?.lat, member?.lng, member?.addressLabel, report?.addressLabel]);

  const address = report?.addressLabel || member?.addressLabel || localAddress;
  const battery = report?.batteryPct ?? member?.batteryPct;
  const muted = dark ? "text-white/75" : "text-slate-600";

  return (
    <div className="mt-2 space-y-2">
      <p className={`text-[12px] font-medium leading-snug ${muted}`}>
        {address || "도로명 주소를 확인 중입니다."}
      </p>
      <p className="text-[12px] font-semibold">🔋 {battery == null ? "—" : `${battery}%`}</p>
      <div className={`rounded-2xl px-3 py-2 ${dark ? "bg-[#00D2FF]/10" : "bg-cyan-50"}`}>
        <p className={`text-[11px] font-black ${dark ? "text-[#00D2FF]" : "text-cyan-800"}`}>Gemini AI 안심패치 리포트</p>
        {loading ? (
          <p className={`mt-1 text-[12px] ${muted}`}>오늘의 안심 요약을 불러오는 중입니다.</p>
        ) : report?.summary ? (
          <>
            <p className="mt-1 whitespace-pre-line text-[12px] font-medium leading-relaxed">{report.summary}</p>
            <p className="mt-1 text-[12px] font-black">안심지수 {report.safetyIndex}</p>
          </>
        ) : (
          <p className={`mt-1 text-[12px] ${muted}`}>안심 요약을 아직 받지 못했습니다.</p>
        )}
      </div>
    </div>
  );
}
