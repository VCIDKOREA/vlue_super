import { useEffect, useState } from "react";
import { reverseGeocodeLatLng } from "../../lib/activeRegion.js";
import { formatLocalTime, isOverseasMember, overseasPlaceLabel } from "../../lib/overseasLocation.js";
import { fetchFamilySafetyReport } from "../../lib/safetyPatch.js";

function addressLooksDetailed(label) {
  const text = String(label || "").trim();
  if (!text) return false;
  if (/\d/.test(text)) return true;
  return /(로|길|대로|street|avenue|blvd|drive|road|way|plaza|lane)\b/i.test(text);
}

export default function MemberSafetyDetail({ member, roomId = "", dark = false }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [localAddress, setLocalAddress] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const overseas = isOverseasMember(member);

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
    if (member?.lat == null || member?.lng == null) {
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
  }, [member?.userId, member?.lat, member?.lng]);

  useEffect(() => {
    if (!overseas || !member?.timeZoneId) return undefined;
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [overseas, member?.timeZoneId]);

  const place = overseasPlaceLabel(member);
  const stored = report?.addressLabel || member?.addressLabel || "";
  const address = addressLooksDetailed(localAddress)
    ? localAddress
    : addressLooksDetailed(stored)
      ? stored
      : localAddress || stored;
  const battery = report?.batteryPct ?? member?.batteryPct;
  const localTime = overseas ? formatLocalTime(member?.timeZoneId, new Date(clock)) : "";
  const muted = dark ? "text-white/75" : "text-slate-600";

  return (
    <div className="mt-2 space-y-2">
      {overseas ? (
        <p className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${dark ? "bg-violet-500/20 text-violet-200" : "bg-violet-50 text-violet-800"}`}>
          ✈️ 해외 접속자
        </p>
      ) : null}
      <p className={`text-[12px] font-medium leading-snug ${muted}`}>
        {address || "도로명 주소를 확인 중입니다."}
      </p>
      {overseas && place && address && !address.includes(place) ? (
        <p className={`text-[11px] font-semibold ${muted}`}>{place}</p>
      ) : null}
      {localTime ? (
        <p className="text-[12px] font-semibold">🕒 현지 시각 {localTime}</p>
      ) : null}
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
