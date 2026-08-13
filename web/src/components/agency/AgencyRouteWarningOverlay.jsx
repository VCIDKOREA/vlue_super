import AgencyDcpMiniPopup from "./AgencyDcpMiniPopup.jsx";

const DEFAULT_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";

export default function AgencyRouteWarningOverlay({
  open = false,
  warning = DEFAULT_WARNING,
  agencyName = "",
  officialWebsite = "",
  phone = "",
  logoUrl = "",
  card = null,
  onClose
}) {
  const built =
    card || {
      name: agencyName,
      organization: agencyName,
      phone,
      website: officialWebsite,
      logoUrl,
      dcp: {
        agencyName,
        shortNumber: phone,
        officialWebsite,
        logoUrl,
        routeStatus: "abnormal",
        warning: warning || DEFAULT_WARNING
      }
    };
  return (
    <AgencyDcpMiniPopup
      open={open}
      card={built}
      incomingNumber={phone}
      abnormal
      warning={warning || DEFAULT_WARNING}
      onClose={onClose}
    />
  );
}
