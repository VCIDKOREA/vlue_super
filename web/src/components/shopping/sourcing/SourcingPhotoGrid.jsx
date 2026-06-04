import { useRef, useState } from "react";
import { MAX_SOURCING_PHOTOS } from "../../../lib/sourcingProductFormUtils.js";

export default function SourcingPhotoGrid({ previews, onChange, onPickFiles, isDarkMode = false, max = MAX_SOURCING_PHOTOS }) {
  const fileRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);

  const move = (from, to) => {
    if (from === to || from == null || to == null) return;
    const next = [...previews];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {previews.map((url, i) => (
          <div
            key={`${url.slice(0, 32)}-${i}`}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              move(dragIdx, i);
              setDragIdx(null);
            }}
            onDragEnd={() => setDragIdx(null)}
            className={`relative aspect-square overflow-hidden rounded-lg ring-1 ${
              isDarkMode ? "ring-white/10 bg-slate-800" : "bg-slate-100 ring-slate-200"
            } ${dragIdx === i ? "opacity-60" : ""}`}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 ? (
              <span className="absolute left-1 top-1 rounded bg-violet-600 px-1 py-0.5 text-[8px] font-black text-white">
                대표
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onChange(previews.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 rounded bg-black/65 px-1.5 text-[10px] font-bold text-white"
            >
              ×
            </button>
          </div>
        ))}
        {previews.length < max ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`flex aspect-square items-center justify-center rounded-lg border border-dashed text-[22px] ${
              isDarkMode ? "border-white/20 text-gray-500" : "border-slate-300 text-slate-400"
            }`}
          >
            +
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onPickFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className={`mt-2 text-[10px] ${isDarkMode ? "text-gray-500" : "text-slate-500"}`}>
        드래그로 순서 변경 · 1MB 이하 자동 압축 · 최대 {max}장
      </p>
    </div>
  );
}
