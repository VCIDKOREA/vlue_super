const OUTCOME_LABEL = {
  observed: "관찰 있음",
  unsupported: "미지원",
  unlinked: "미연동",
  locked: "권한 잠금",
  unmeasurable: "측정 불가",
  unknown: "확인 불가"
};

function Lines({ title, items, empty }) {
  return (
    <section className="border border-white/15 p-3">
      <h3 className="text-[11px] font-semibold tracking-[0.12em] text-white/50">{title}</h3>
      {items?.length ? (
        <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-white/75">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item.label ? <><span className="font-semibold text-white">{item.label}. </span>{item.value}</> : item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12px] leading-snug text-white/40">{empty}</p>
      )}
    </section>
  );
}

export default function SpaceResultView({ result }) {
  if (!result) return null;
  const when = result.at ? new Date(result.at).toLocaleString("ko-KR") : "";
  const outcome = OUTCOME_LABEL[result.outcome];
  return (
    <div className="space-y-2">
      {outcome ? <p className="text-[12px] font-semibold tracking-wide text-white">{outcome}</p> : null}
      {result.item ? (
        <section className="border border-white/15 p-3">
          <h3 className="text-[11px] font-semibold tracking-[0.12em] text-white/50">점검 항목</h3>
          <p className="mt-2 text-[12px] leading-snug text-white/75">{result.item}</p>
        </section>
      ) : null}
      <p className="text-[11px] text-white/40">점검 일시 {when}</p>
      <Lines title="실제 관찰" items={result.observed} empty="이번 실행에서 관찰로 남길 측정값이 없습니다." />
      <Lines title="추가 확인이 필요한 사항" items={result.review} empty="추가로 적어 둔 확인 항목이 없습니다." />
      <Lines title="확인하지 못한 제한" items={result.limits} empty="보고할 기술적 제한이 없습니다." />
      <Lines title="권장 조치" items={result.actions} empty="별도 조치 문장이 없습니다." />
    </div>
  );
}
