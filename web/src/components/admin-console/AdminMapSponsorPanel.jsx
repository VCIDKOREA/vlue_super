import { useEffect, useState } from "react";
import {
  createAdminMapSponsor,
  deleteAdminMapSponsor,
  fetchAdminMapSponsors,
  patchAdminMapSponsor
} from "../../lib/adminConsoleApi.js";

const EMPTY = { title: "", body: "", imageUrl: "", linkUrl: "", active: true, startsAt: "", endsAt: "" };

export default function AdminMapSponsorPanel() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const load = () => {
    fetchAdminMapSponsors()
      .then((data) => setRows(data.banners || []))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await createAdminMapSponsor({
        ...form,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-black text-slate-900">지도 스폰서 배너</h2>
        <p className="text-[12px] text-slate-500">활성 광고가 있으면 가족위치·V-Map 하단에 노출하고, 없으면 AdMob 띠배너로 대체합니다.</p>
      </div>
      <form onSubmit={save} className="grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-2">
        <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="제목" className="rounded-lg border px-3 py-2 text-[13px]" />
        <input value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="문구" className="rounded-lg border px-3 py-2 text-[13px]" />
        <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="이미지 URL" className="rounded-lg border px-3 py-2 text-[13px]" />
        <input value={form.linkUrl} onChange={(event) => setForm({ ...form, linkUrl: event.target.value })} placeholder="딥링크 또는 웹 URL" className="rounded-lg border px-3 py-2 text-[13px]" />
        <input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="rounded-lg border px-3 py-2 text-[13px]" />
        <input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="rounded-lg border px-3 py-2 text-[13px]" />
        <label className="flex items-center gap-2 text-[13px] font-bold">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          노출
        </label>
        <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-[13px] font-black text-white">등록</button>
      </form>
      {error ? <p className="text-[12px] font-bold text-rose-600">{error}</p> : null}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-[12px]">
            <span>
              <b>{row.title}</b> {row.active ? "노출" : "중지"}
              <span className="block text-slate-500">{row.body}</span>
            </span>
            <span className="flex gap-2">
              <button type="button" className="font-bold text-blue-700" onClick={() => patchAdminMapSponsor(row.id, { active: !row.active }).then(load)}>
                {row.active ? "중지" : "켜기"}
              </button>
              <button type="button" className="font-bold text-rose-600" onClick={() => deleteAdminMapSponsor(row.id).then(load)}>삭제</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
