/**
 * 직업인증 — 직업 선택 목록 (ㄱ~ㅎ + 기타 직접입력)
 * 캡처 기준 목록. 마지막에 행정사 다음 기타(직접입력).
 */

export const JOB_OCCUPATION_OTHER_ID = "OTHER";

/** @typedef {{ id: string, label: string, initial: string }} JobOccupationItem */

/** @type {JobOccupationItem[]} */
export const JOB_OCCUPATION_LIST = Object.freeze([
  { id: "nurse", label: "간호사", initial: "ㄱ" },
  { id: "nurse_aide", label: "간호조무사", initial: "ㄱ" },
  { id: "appraiser", label: "감정평가사", initial: "ㄱ" },
  { id: "sole_proprietor", label: "개인사업자", initial: "ㄱ" },
  { id: "architect", label: "건축사", initial: "ㄱ" },
  { id: "labor_attorney", label: "공인노무사", initial: "ㄱ" },
  { id: "realtor", label: "공인중개사", initial: "ㄱ" },
  { id: "cpa", label: "공인회계사", initial: "ㄱ" },
  { id: "customs_broker", label: "관세사", initial: "ㄱ" },
  { id: "professor", label: "교수", initial: "ㄱ" },
  { id: "military_civilian", label: "군무원", initial: "ㄱ" },
  { id: "pe_engineer", label: "기술사", initial: "ㄱ" },
  { id: "univ_staff", label: "대학교직원(학생과 공통 이메일 사용)", initial: "ㄷ" },
  { id: "pilot", label: "도선사", initial: "ㄷ" },
  { id: "vet_tech", label: "동물보건사", initial: "ㄷ" },
  { id: "physio", label: "물리치료사", initial: "ㅁ" },
  { id: "beautician", label: "미용사", initial: "ㅁ" },
  { id: "radiologist", label: "방사선사", initial: "ㅂ" },
  { id: "judicial_scrivener", label: "법무사", initial: "ㅂ" },
  { id: "patent_attorney", label: "변리사", initial: "ㅂ" },
  { id: "lawyer", label: "변호사", initial: "ㅂ" },
  { id: "him", label: "보건의료정보관리사", initial: "ㅂ" },
  { id: "childcare", label: "보육교사", initial: "ㅂ" },
  { id: "insurance_planner", label: "보험설계사", initial: "ㅂ" },
  { id: "social_worker", label: "사회복지사", initial: "ㅅ" },
  { id: "tax_accountant", label: "세무사", initial: "ㅅ" },
  { id: "claims_adjuster", label: "손해사정사", initial: "ㅅ" },
  { id: "veterinarian", label: "수의사", initial: "ㅅ" },
  { id: "optician", label: "안경사", initial: "ㅇ" },
  { id: "pharmacist", label: "약사", initial: "ㅇ" },
  { id: "speech_therapist", label: "언어재활사", initial: "ㅇ" },
  { id: "nutritionist", label: "영양사", initial: "ㅇ" },
  { id: "wedding_planner", label: "웨딩플래너", initial: "ㅇ" },
  { id: "kindergarten", label: "유치원교사", initial: "ㅇ" },
  { id: "emt", label: "응급구조사", initial: "ㅇ" },
  { id: "doctor", label: "의사", initial: "ㅇ" },
  { id: "clinical_path", label: "임상병리사", initial: "ㅇ" },
  { id: "ot", label: "작업치료사", initial: "ㅈ" },
  { id: "career_soldier", label: "직업군인", initial: "ㅈ" },
  { id: "dental_tech", label: "치과기공사", initial: "ㅊ" },
  { id: "dental_hygienist", label: "치과위생사", initial: "ㅊ" },
  { id: "dentist", label: "치과의사", initial: "ㅊ" },
  { id: "florist", label: "플로리스트", initial: "ㅍ" },
  { id: "fitness", label: "피트니스강사", initial: "ㅍ" },
  { id: "instructor", label: "학교·학원강사", initial: "ㅎ" },
  { id: "herbal_pharmacist", label: "한약사", initial: "ㅎ" },
  { id: "oriental_doctor", label: "한의사", initial: "ㅎ" },
  { id: "marine_officer", label: "해기사", initial: "ㅎ" },
  { id: "admin_scrivener", label: "행정사", initial: "ㅎ" },
  { id: JOB_OCCUPATION_OTHER_ID, label: "기타(직접입력)", initial: "ㅎ" }
]);

export const JOB_VERIFY_HELP =
  "면허증, 자격증, 등록증, 명함, 사원증 등 직업을 증명할 수 있는 서류로 인증할 수 있어요. (운영진 검토로 1~7일 소요)";

export const JOB_VERIFY_REVIEW_DAYS_HINT = "인증승인 소요기간은 1~7일입니다.";

export const JOB_VERIFY_DOC_KINDS = Object.freeze([
  { id: "license", label: "면허증" },
  { id: "certificate", label: "자격증" },
  { id: "registration", label: "등록증" },
  { id: "business_card", label: "명함" },
  { id: "employee_id", label: "사원증" },
  { id: "business_registration", label: "사업자등록증" },
  { id: "other", label: "기타 증빙" }
]);

/** @returns {{ initial: string, items: JobOccupationItem[] }[]} */
export function groupJobOccupationsByInitial(list = JOB_OCCUPATION_LIST) {
  const map = new Map();
  for (const item of list) {
    const key = item.initial || "#";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()].map(([initial, items]) => ({ initial, items }));
}

export function findJobOccupation(id) {
  return JOB_OCCUPATION_LIST.find((x) => x.id === id) || null;
}

export function isOtherJobOccupation(id) {
  return String(id || "") === JOB_OCCUPATION_OTHER_ID;
}
