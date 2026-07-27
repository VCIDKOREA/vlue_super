import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminProductMetrics } from "../../lib/adminConsoleApi.js";

const CHARTS = [
  { key: "signups", title: "가입자 수", color: "#2563eb", unit: "명", totalKey: "signups" },
  { key: "activeUsers", title: "활성 사용자", color: "#0891b2", unit: "명", totalKey: "activeUsers" },
  { key: "showcaseCreates", title: "쇼케이스 생성 수", color: "#7c3aed", unit: "건", totalKey: "showcaseCreates" },
  { key: "callInterfaceUses", title: "통화 인터페이스 사용 수", color: "#db2777", unit: "회", totalKey: "callInterfaceUses" },
  { key: "paidPayments", title: "유료 결제 수", color: "#059669", unit: "건", totalKey: "paidPayments" },
  { key: "revisitRate", title: "재방문율", color: "#d97706", unit: "%", totalKey: "revisitRate", isRate: true },
  { key: "showcaseViews", title: "쇼케이스 조회 수", color: "#4f46e5", unit: "회", totalKey: "showcaseViews" }
];

function formatDayLabel(day) {
  const m = String(day || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return day;
  return `${Number(m[1])}/${Number(m[2])}`;
}

function MetricLineChart({ title, color, unit, points, total, definition, isRate }) {
  const w = 360;
  const h = 140;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const values = (points || []).map((p) => Number(p.value) || 0);
  const maxV = Math.max(1, ...values, isRate ? 100 : 0);
  const minV = 0;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = Math.max(1, values.length);

  const coords = values.map((v, i) => {
    const x = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = padT + innerH - ((v - minV) / (maxV - minV)) * innerH;
    return { x, y, v, day: points[i]?.day };
  });

  const lineD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaD =
    coords.length > 0
      ? `${lineD} L${coords[coords.length - 1].x.toFixed(1)},${(padT + innerH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padT + innerH).toFixed(1)} Z`
      : "";

  const tickIdx =
    n <= 6
      ? coords.map((_, i) => i)
      : [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-black text-slate-900">{title}</h3>
          {definition ? <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{definition}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-[18px] font-black tabular-nums" style={{ color }}>
            {isRate ? `${total}` : total.toLocaleString()}
            <span className="ml-0.5 text-[11px] font-bold text-slate-500">{unit}</span>
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            {isRate ? "기간 평균" : "기간 합계"}
          </p>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={title}>
        <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#e2e8f0" strokeWidth="1" />
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        {[0, 0.5, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          const label = Math.round(minV + (maxV - minV) * t);
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-slate-400" style={{ fontSize: 9 }}>
                {label}
              </text>
            </g>
          );
        })}
        {areaD ? <path d={areaD} fill={color} opacity="0.12" /> : null}
        {lineD ? <path d={lineD} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2.5" fill={color} />
        ))}
        {tickIdx.map((i) => (
          <text
            key={i}
            x={coords[i].x}
            y={h - 8}
            textAnchor="middle"
            className="fill-slate-400"
            style={{ fontSize: 9 }}
          >
            {formatDayLabel(coords[i].day)}
          </text>
        ))}
      </svg>
    </article>
  );
}

function defaultRangeDays(days = 30) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export default function AdminMetricsPanel({ onToast }) {
  const initial = useMemo(() => defaultRangeDays(30), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminProductMetrics({ from, to });
      setData(res);
    } catch (e) {
      onToast?.(e?.message || "지표 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [from, to, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="text-[11px] font-bold text-slate-600">
          시작
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
          />
        </label>
        <label className="text-[11px] font-bold text-slate-600">
          종료
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const r = defaultRangeDays(7);
            setFrom(r.from);
            setTo(r.to);
          }}
          className="rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-bold text-slate-700"
        >
          7일
        </button>
        <button
          type="button"
          onClick={() => {
            const r = defaultRangeDays(30);
            setFrom(r.from);
            setTo(r.to);
          }}
          className="rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-bold text-slate-700"
        >
          30일
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
        >
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
        {data?.range ? (
          <p className="ml-auto text-[11px] text-slate-500">
            {data.range.from} ~ {data.range.to}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CHARTS.map((c) => (
          <MetricLineChart
            key={c.key}
            title={c.title}
            color={c.color}
            unit={c.unit}
            isRate={c.isRate}
            points={data?.series?.[c.key] || []}
            total={data?.totals?.[c.totalKey] ?? 0}
            definition={data?.definitions?.[c.key]}
          />
        ))}
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        가입·활성·쇼케이스 생성·결제는 DB 집계입니다. 통화 인터페이스·쇼케이스 조회는 앱에서 수집한 이벤트이며,
        수집 시작 이전 구간은 0으로 표시될 수 있습니다. 재방문율은 당일 로그인 사용자 중 이전 세션이 있는
        비율입니다.
      </p>
    </div>
  );
}
