import { MEMBERSHIP_BENEFIT_ROWS } from '../data/membershipPlansContent';

export default function MembershipBenefitsTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 font-bold text-slate-600">혜택</th>
            <th className="px-4 py-3 font-bold text-slate-700">일반 (무료)</th>
            <th className="px-4 py-3 font-bold text-primary-700">유료</th>
            <th className="px-4 py-3 font-bold text-indigo-800">기업 (B2B)</th>
          </tr>
        </thead>
        <tbody>
          {MEMBERSHIP_BENEFIT_ROWS.map((row) => (
            <tr key={row.label} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80">
              <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{row.label}</td>
              <td className="px-4 py-2.5 text-slate-600">{row.free}</td>
              <td className="px-4 py-2.5 text-slate-700">{row.paid}</td>
              <td className="px-4 py-2.5 text-slate-700">{row.b2b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
