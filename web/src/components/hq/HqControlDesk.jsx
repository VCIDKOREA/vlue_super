import { useCallback, useEffect, useState } from "react";
import { DEFAULT_HOME_LAYOUT, mergeHomeLayout, writeCachedHomeLayout } from "../../lib/homeLayoutConfig.js";
import { clearHqSession, fetchHqHomeLayout, readHqSession, saveHqHomeLayout } from "../../lib/hqAdminApi.js";
import HqHomeEditor from "./HqHomeEditor.jsx";
import HomeDesktopMirror from "./HomeDesktopMirror.jsx";

export default function HqControlDesk({ user, onLogout }) {
  const [layout, setLayout] = useState(() => structuredClone(DEFAULT_HOME_LAYOUT));
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");

  useEffect(() => {
    fetchHqHomeLayout()
      .then((data) => setLayout(mergeHomeLayout(data.layout)))
      .catch(() => setLayout(structuredClone(DEFAULT_HOME_LAYOUT)));
  }, []);

  const publish = useCallback(async () => {
    setPublishing(true);
    setPublishMsg("");
    try {
      await saveHqHomeLayout(layout);
      writeCachedHomeLayout(layout);
      setPublishMsg("실서비스 홈에 배포되었습니다.");
    } catch (e) {
      setPublishMsg(e?.message || "배포 실패");
    } finally {
      setPublishing(false);
    }
  }, [layout]);

  const session = readHqSession();

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-blue-600">VLUE HQ Control</p>
          <h1 className="text-[24px] font-black text-slate-900">본사 PC 웹 관제 데스크</h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-[14px] font-semibold text-slate-600">
            {user?.legalName || session?.legalName || "SUPER_ADMIN"}
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-slate-200 px-4 py-2 text-[14px] font-bold text-slate-700"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[2fr_3fr]">
        <div className="min-h-0 overflow-y-auto border-r border-slate-200 bg-[#f8fafc] px-6 py-6">
          <HqHomeEditor
            layout={layout}
            onChange={setLayout}
            onPublish={publish}
            publishing={publishing}
            publishMsg={publishMsg}
          />
        </div>
        <div className="flex min-h-0 flex-col bg-[#eef2f8]">
          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-3">
            <p className="text-[15px] font-black text-slate-900">Real-time Desktop Mirror</p>
            <p className="text-[13px] font-semibold text-slate-500">1920px PC 웹 메인 · 1:1 실시간 동기화</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <HomeDesktopMirror layout={layout} />
          </div>
        </div>
      </div>
    </div>
  );
}
