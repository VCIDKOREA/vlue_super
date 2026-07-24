import { useEffect, useState } from "react";
import {
  isPageCreated,
  markPageCreated,
  PAGE_PROFILE_CHANGED_EVENT,
  readPageManagerConfig,
  savePageManagerConfig
} from "../lib/pageProfileStorage.js";
import { isPaidMembershipKind } from "../lib/membershipBm.js";
import { isStoreApproved } from "../lib/vlueStoreStorage.js";
import { generatePostDescription } from "../lib/vmingApi.js";
import VlueStoreApplicationPanel from "./VlueStoreApplicationPanel.jsx";
import VlueStoreProductManager from "./VlueStoreProductManager.jsx";
import ScreenBackHeader from "./common/ScreenBackHeader";
import { fitImageFileOrThrow, IMAGE_FIT_AVATAR } from "../lib/fitImageFile.js";

function FeedManager({ membershipTier = "free", onGoMain }) {
  const [feedName, setFeedName] = useState("");
  const [feedIntro, setFeedIntro] = useState("");
  const [notice, setNotice] = useState("");
  const [homepage, setHomepage] = useState("");
  const [pageContact, setPageContact] = useState("");
  const [saveToast, setSaveToast] = useState("");
  const [pageProfileImageDataUrl, setPageProfileImageDataUrl] = useState("");
  const [profilePickInfo, setProfilePickInfo] = useState("");
  const [isPageCreatedFlag, setIsPageCreatedFlag] = useState(() => isPageCreated());
  const [storeTick, setStoreTick] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);

  const isPaid = isPaidMembershipKind(membershipTier);
  const storeApproved = isPaid && isStoreApproved();

  const hydrateFromStorage = () => {
    const saved = readPageManagerConfig();
    setFeedName(saved.feedName || saved.title || "");
    setFeedIntro(saved.feedIntro || saved.intro || "");
    setNotice(saved.notice || "");
    setHomepage(saved.homepage || "");
    setPageContact(saved.storeContact || saved.pageContact || "");
    if (saved.pageProfileImageDataUrl) setPageProfileImageDataUrl(saved.pageProfileImageDataUrl);
    setIsPageCreatedFlag(isPageCreated());
    setStoreTick((n) => n + 1);
  };

  useEffect(() => {
    hydrateFromStorage();
    const onChanged = () => hydrateFromStorage();
    window.addEventListener(PAGE_PROFILE_CHANGED_EVENT, onChanged);
    window.addEventListener("vlue-store-changed", onChanged);
    return () => {
      window.removeEventListener(PAGE_PROFILE_CHANGED_EVENT, onChanged);
      window.removeEventListener("vlue-store-changed", onChanged);
    };
  }, []);

  const onPickPageProfile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfilePickInfo("이미지 파일만 선택할 수 있습니다.");
      return;
    }
    try {
      const { dataUrl } = await fitImageFileOrThrow(file, IMAGE_FIT_AVATAR);
      setPageProfileImageDataUrl(dataUrl);
      setProfilePickInfo("프로필 사진 선택됨. 저장하면 MY VLUE PAGE에 반영됩니다.");
    } catch (e) {
      setProfilePickInfo(e instanceof Error ? e.message : "이미지를 처리하지 못했습니다.");
    }
  };

  const saveConfig = (markCreated = false) => {
    savePageManagerConfig(
      {
        pageKind: storeApproved ? "store" : "vlue_page",
        feedName,
        feedIntro,
        notice,
        homepage,
        storeContact: pageContact,
        pageProfileImageDataUrl: pageProfileImageDataUrl || "",
        membershipTier,
        storeApproved
      },
      { markCreated }
    );
    if (markCreated) {
      markPageCreated();
      setIsPageCreatedFlag(true);
    }
    setSaveToast(
      markCreated
        ? "VLUE PAGE가 생성되었습니다."
        : "VLUE PAGE 설정이 저장되었습니다."
    );
    setTimeout(() => setSaveToast(""), 2200);
  };

  const generateAiFeedIntro = async () => {
    const seed = `페이지 이름: ${feedName || "미입력"}\n공지: ${notice || "없음"}\n홈페이지: ${homepage || "없음"}`;
    try {
      setAiBusy(true);
      const result = await generatePostDescription({ message: seed });
      const text = String(result?.reply || "").trim();
      if (text) {
        setFeedIntro(text);
        setSaveToast("AI 상세설명을 생성했습니다.");
      } else {
        setSaveToast("AI 응답이 비어 있어 생성하지 못했습니다.");
      }
    } catch (e) {
      setSaveToast(e?.message || "AI 상세설명 생성에 실패했습니다.");
    } finally {
      setAiBusy(false);
      setTimeout(() => setSaveToast(""), 2200);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden">
      <ScreenBackHeader title="페이지 관리" onBack={onGoMain} />
      <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mt-1 text-[12px] text-gray-500">
            하나의 <b>VLUE PAGE</b>로 활동합니다.
            {isPaid ? " 상품 판매는 입점 신청·승인 후 이용할 수 있습니다." : " 상점·상품 판매는 유료 회원 전용입니다."}
          </p>

          {!isPageCreatedFlag ? (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[13px] font-black text-blue-700">VLUE PAGE 생성</p>
              <p className="mt-1 text-[11px] leading-relaxed text-blue-700/90">
                페이지 이름·소개를 입력하고 생성하면 MY 프로필과 연동됩니다.
              </p>
              <div className="mt-3 space-y-2.5">
                <input
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="VLUE PAGE 이름"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none"
                />
                <textarea
                  value={feedIntro}
                  onChange={(e) => setFeedIntro(e.target.value)}
                  placeholder="페이지 소개"
                  className="min-h-16 w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none"
                />
                <button
                  type="button"
                  onClick={generateAiFeedIntro}
                  disabled={aiBusy}
                  className="w-full rounded-xl border border-violet-200 bg-violet-50 py-2 text-[12px] font-black text-violet-700 disabled:opacity-60"
                >
                  {aiBusy ? "AI 생성 중..." : "🤖 AI 상세설명 생성"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!feedName.trim()) {
                    setSaveToast("페이지 이름을 입력해 주세요.");
                    setTimeout(() => setSaveToast(""), 1800);
                    return;
                  }
                  saveConfig(true);
                }}
                className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
              >
                VLUE PAGE 생성하기
              </button>
              {saveToast && <p className="mt-2 text-center text-[11px] font-bold text-blue-600">{saveToast}</p>}
            </div>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-black text-white">VLUE PAGE</span>
                {storeApproved && (
                  <span className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-800">
                    상점 운영
                  </span>
                )}
              </div>

              <div className="mt-3 rounded-xl bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-700">
                <p className="font-bold">VLUE PAGE 안내</p>
                <p className="mt-0.5">
                  {isPaid
                    ? "활동·프로필을 하나의 VLUE PAGE로 운영합니다. 상품 판매는 아래 입점 신청·승인 후 이용할 수 있습니다."
                    : "무료 회원은 VLUE PAGE(활동·프로필)만 이용합니다. 상점·상품 판매는 유료 회원 가입 후 이용할 수 있습니다."}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[12px] font-black text-gray-900">프로필 사진</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-white shadow-inner">
                    {pageProfileImageDataUrl ? (
                      <img src={pageProfileImageDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-400">미설정</div>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer rounded-xl bg-gray-900 px-4 py-2.5 text-[12px] font-black text-white">
                    이미지 선택
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickPageProfile(e.target.files?.[0])} />
                  </label>
                </div>
                {profilePickInfo && <p className="mt-2 text-[11px] text-gray-600">{profilePickInfo}</p>}
              </div>

              <div className="mt-4 space-y-2.5">
                <input
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="VLUE PAGE 이름"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none"
                />
                <textarea
                  value={feedIntro}
                  onChange={(e) => setFeedIntro(e.target.value)}
                  placeholder="페이지 소개"
                  className="min-h-20 w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none"
                />
                <button
                  type="button"
                  onClick={generateAiFeedIntro}
                  disabled={aiBusy}
                  className="w-full rounded-xl border border-violet-200 bg-violet-50 py-2 text-[12px] font-black text-violet-700 disabled:opacity-60"
                >
                  {aiBusy ? "AI 생성 중..." : "🤖 AI 상세설명 생성"}
                </button>
                <input
                  value={homepage}
                  onChange={(e) => setHomepage(e.target.value)}
                  placeholder="홈페이지 URL (선택)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none"
                />
                <input
                  value={pageContact}
                  onChange={(e) => setPageContact(e.target.value)}
                  placeholder="문의 연락처 (선택)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none"
                />
                <input
                  value={notice}
                  onChange={(e) => setNotice(e.target.value)}
                  placeholder="안내 문구 (운영시간·유의사항)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => saveConfig(false)}
                className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
              >
                VLUE PAGE 저장 · MY 반영
              </button>

              {isPaid && (
                <>
                  <div key={storeTick} className="mt-4">
                    <VlueStoreApplicationPanel isPaid={isPaid} onSubmitted={hydrateFromStorage} />
                  </div>
                  <VlueStoreProductManager isPaid={isPaid} />
                </>
              )}

              {saveToast && <p className="mt-2 text-center text-[11px] font-bold text-blue-600">{saveToast}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default FeedManager;
