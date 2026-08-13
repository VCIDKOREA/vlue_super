/**
 * 대한민국 핵심 공공·국가기관 공식 번호 화이트리스트 (DCP 시드)
 * 로고 URL은 비움 — 관리자가 공식 로고를 업로드해야 함.
 */
export type NationalAgencySeed = {
  shortNumber: string;
  agencyName: string;
  officialWebsite: string;
  logoResourceName: string;
  sortOrder: number;
};

export const NATIONAL_AGENCY_WHITELIST_SEED: NationalAgencySeed[] = [
  { shortNumber: "112", agencyName: "경찰청", officialWebsite: "https://www.police.go.kr", logoResourceName: "dcp_logo_112", sortOrder: 10 },
  { shortNumber: "119", agencyName: "소방청", officialWebsite: "https://www.nfa.go.kr", logoResourceName: "dcp_logo_119", sortOrder: 20 },
  { shortNumber: "111", agencyName: "국가정보원", officialWebsite: "https://www.nis.go.kr", logoResourceName: "dcp_logo_111", sortOrder: 30 },
  { shortNumber: "122", agencyName: "해양경찰청", officialWebsite: "https://www.kcg.go.kr", logoResourceName: "dcp_logo_122", sortOrder: 40 },
  { shortNumber: "182", agencyName: "경찰청 민원", officialWebsite: "https://www.minwon.police.go.kr", logoResourceName: "dcp_logo_182", sortOrder: 50 },
  { shortNumber: "1332", agencyName: "금융감독원", officialWebsite: "https://www.fss.or.kr", logoResourceName: "dcp_logo_1332", sortOrder: 60 },
  { shortNumber: "1394", agencyName: "경찰청 전기통신금융사기 통합신고대응단", officialWebsite: "https://www.police.go.kr", logoResourceName: "dcp_logo_1394", sortOrder: 70 },
  { shortNumber: "1397", agencyName: "서민금융진흥원", officialWebsite: "https://www.kinfa.or.kr", logoResourceName: "dcp_logo_1397", sortOrder: 80 },
  { shortNumber: "1369", agencyName: "금융결제원", officialWebsite: "https://www.kftc.or.kr", logoResourceName: "dcp_logo_1369", sortOrder: 90 },
  { shortNumber: "1301", agencyName: "검찰청", officialWebsite: "https://www.spo.go.kr", logoResourceName: "dcp_logo_1301", sortOrder: 100 },
  { shortNumber: "110", agencyName: "국민권익위원회 국민콜110", officialWebsite: "https://www.110.go.kr", logoResourceName: "dcp_logo_110", sortOrder: 110 },
  { shortNumber: "1303", agencyName: "국방부 국방헬프콜", officialWebsite: "https://www.mnd.go.kr", logoResourceName: "dcp_logo_1303", sortOrder: 120 },
  { shortNumber: "1331", agencyName: "국가인권위원회", officialWebsite: "https://www.humanrights.go.kr", logoResourceName: "dcp_logo_1331", sortOrder: 130 },
  { shortNumber: "1345", agencyName: "법무부 외국인종합안내센터", officialWebsite: "https://www.immigration.go.kr", logoResourceName: "dcp_logo_1345", sortOrder: 140 },
  { shortNumber: "126", agencyName: "국세청", officialWebsite: "https://www.nts.go.kr", logoResourceName: "dcp_logo_126", sortOrder: 150 },
  { shortNumber: "1390", agencyName: "중앙선거관리위원회", officialWebsite: "https://www.nec.go.kr", logoResourceName: "dcp_logo_1390", sortOrder: 160 },
  { shortNumber: "117", agencyName: "학교폭력신고센터", officialWebsite: "https://www.safe182.go.kr", logoResourceName: "dcp_logo_117", sortOrder: 170 },
  { shortNumber: "118", agencyName: "한국인터넷진흥원", officialWebsite: "https://www.kisa.or.kr", logoResourceName: "dcp_logo_118", sortOrder: 180 },
  { shortNumber: "129", agencyName: "보건복지상담센터", officialWebsite: "https://www.129.go.kr", logoResourceName: "dcp_logo_129", sortOrder: 190 },
  { shortNumber: "1339", agencyName: "질병관리청", officialWebsite: "https://kdca.go.kr", logoResourceName: "dcp_logo_1339", sortOrder: 200 },
  { shortNumber: "1382", agencyName: "행정안전부 주민등록 진위확인", officialWebsite: "https://www.mois.go.kr", logoResourceName: "dcp_logo_1382", sortOrder: 210 },
  { shortNumber: "1393", agencyName: "자살예방핫라인", officialWebsite: "https://www.spckorea.or.kr", logoResourceName: "dcp_logo_1393", sortOrder: 220 },
  { shortNumber: "1399", agencyName: "식품의약품안전처", officialWebsite: "https://www.mfds.go.kr", logoResourceName: "dcp_logo_1399", sortOrder: 230 }
];

export const AGENCY_ABNORMAL_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";
