export function isOverseasMember(member) {
  if (!member) return false;
  if (member.isOverseas === true || member.is_overseas === true) return true;
  const code = String(member.countryCode || member.country_code || "").trim().toUpperCase();
  return Boolean(code) && code !== "KR";
}

export function overseasPlaceLabel(member) {
  if (!member) return "";
  return [member.cityName || member.city_name, member.countryName || member.country_name]
    .filter(Boolean)
    .join(", ");
}

export function formatLocalTime(timeZoneId, now = new Date()) {
  const tz = String(timeZoneId || "").trim();
  if (!tz) return "";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short"
    }).format(now);
  } catch {
    return "";
  }
}
