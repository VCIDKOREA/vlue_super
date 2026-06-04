import { useState } from "react";
import {
  PRODUCT_CATEGORIES,
  readFileAsDataUrlLimited,
  readStoreApplication,
  saveStoreApplication,
  STORE_APPLICATION_STATUS
} from "../lib/vlueStoreStorage.js";
import { VLUE_STORE_TERMS_VERSION } from "../legal/vlueStoreSellerTerms.js";
import VlueStoreTermsModal from "./VlueStoreTermsModal.jsx";

export default function VlueStoreApplicationPanel({ isPaid, onSubmitted }) {
  if (!isPaid) return null;

  const existing = readStoreApplication();
  const [bizNo, setBizNo] = useState(existing.businessRegNo || "");
  const [productTypes, setProductTypes] = useState(existing.productTypes || []);
  const [applicationNote, setApplicationNote] = useState(existing.applicationNote || "");
  const [bizFile, setBizFile] = useState(existing.businessRegFile || null);
  const [entryFile, setEntryFile] = useState(existing.entryFormFile || null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(Boolean(existing.termsAcceptedAt));
  const [msg, setMsg] = useState("");

  const toggleType = (t) => {
    setProductTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const pickDoc = async (file, kind) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrlLimited(file);
      const meta = { name: file.name, mime: file.type, dataUrl, uploadedAt: new Date().toISOString() };
      if (kind === "biz") setBizFile(meta);
      else setEntryFile(meta);
      setMsg(`${file.name} 첨부됨`);
      setTimeout(() => setMsg(""), 1600);
    } catch (e) {
      setMsg(e?.message || "첨부 실패");
    }
  };

  const submitApplication = () => {
    const digits = String(bizNo).replace(/\D/g, "");
    if (!isPaid) {
      setMsg("상점 신청은 유료 회원만 가능합니다.");
      return;
    }
    if (digits.length !== 10) {
      setMsg("사업자등록번호 10자리를 입력해 주세요.");
      return;
    }
    if (!productTypes.length) {
      setMsg("판매 상품 유형을 1개 이상 선택해 주세요.");
      return;
    }
    if (!bizFile?.dataUrl) {
      setMsg("사업자등록증 사본을 첨부해 주세요.");
      return;
    }
    if (!entryFile?.dataUrl) {
      setMsg("입점 신청서를 첨부해 주세요.");
      return;
    }
    if (!termsAgreed) {
      setTermsOpen(true);
      setMsg("약관 동의가 필요합니다.");
      return;
    }
    saveStoreApplication({
      status: STORE_APPLICATION_STATUS.PENDING,
      businessRegNo: digits,
      productTypes,
      applicationNote: applicationNote.trim(),
      businessRegFile: bizFile,
      entryFormFile: entryFile,
      termsVersion: VLUE_STORE_TERMS_VERSION,
      termsAcceptedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    });
    setMsg("입점 신청이 접수되었습니다. 심사 후 상점 기능이 활성화됩니다.");
    onSubmitted?.();
  };

  if (existing.status === STORE_APPLICATION_STATUS.PENDING) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-950">
        <p className="font-black">상점 심사 중</p>
        <p className="mt-1">제출일: {existing.submittedAt ? new Date(existing.submittedAt).toLocaleString("ko-KR") : "—"}</p>
        <p className="mt-1">승인 후 상품 등록·결제 판매가 가능합니다.</p>
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => {
              saveStoreApplication({
                status: STORE_APPLICATION_STATUS.APPROVED,
                approvedAt: new Date().toISOString()
              });
              onSubmitted?.();
            }}
            className="mt-2 w-full rounded-lg border border-dashed border-amber-500 py-2 text-[11px] font-bold"
          >
            개발: 승인 시뮬레이션
          </button>
        )}
      </div>
    );
  }

  if (existing.status === STORE_APPLICATION_STATUS.APPROVED) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-900">
        <p className="font-black">상점 운영 승인됨</p>
        <p className="mt-1">아래에서 상품을 등록·관리할 수 있습니다. PG 수수료(VAT 별도)·판매 수수료 3.3%(VAT 별도)가 적용됩니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
      <p className="text-[13px] font-black text-indigo-950">상점으로 전환 신청</p>
      <p className="mt-1 text-[11px] leading-relaxed text-indigo-900/90">
        VLUE PAGE는 기본 하나로 운영합니다. 상품 판매·결제를 원하면 서류 제출 후 승인 시 상점 기능이 켜집니다.
      </p>
      <div className="mt-3 space-y-2">
        <input
          value={bizNo}
          onChange={(e) => setBizNo(e.target.value)}
          placeholder="사업자등록번호 10자리"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none"
        />
        <div>
          <p className="mb-1 text-[11px] font-bold text-gray-800">판매 상품 유형</p>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_CATEGORIES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  productTypes.includes(t) ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <label className="block rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700">
          사업자등록증 사본
          <input type="file" accept="image/*,application/pdf" className="mt-1 block w-full text-[11px]" onChange={(e) => pickDoc(e.target.files?.[0], "biz")} />
        </label>
        <label className="block rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700">
          입점 신청서
          <input type="file" accept="image/*,application/pdf" className="mt-1 block w-full text-[11px]" onChange={(e) => pickDoc(e.target.files?.[0], "entry")} />
        </label>
        <textarea
          value={applicationNote}
          onChange={(e) => setApplicationNote(e.target.value)}
          placeholder="신청 메모 (선택)"
          className="min-h-14 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none"
        />
        <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-white px-2 py-2 text-[11px] font-semibold text-gray-800">
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => {
              if (e.target.checked) setTermsOpen(true);
              else setTermsAgreed(false);
            }}
            className="mt-0.5"
          />
          <span>
            PG 수수료(VAT 별도)·판매 수수료 3.3%(VAT 별도) 약관에 동의합니다.{" "}
            <button type="button" className="text-blue-600 underline" onClick={() => setTermsOpen(true)}>
              약관 보기
            </button>
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={submitApplication}
        className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-[13px] font-black text-white"
      >
        상점 입점 신청
      </button>
      {msg && <p className="mt-2 text-center text-[11px] font-bold text-indigo-800">{msg}</p>}

      <VlueStoreTermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAgree={() => {
          setTermsAgreed(true);
          setTermsOpen(false);
        }}
      />
    </div>
  );
}
