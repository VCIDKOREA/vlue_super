#!/usr/bin/env node
/**
 * 사업자 자동 가입 승인 시뮬레이션 (개발)
 * - 끝자리 99: 폐업 → 수동 심사
 * - 끝자리 88: 정보 불일치 → 수동 심사
 * - 그 외: 자동 승인
 */
const args = process.argv.slice(2);
const passBiz = "1234567801";
const failClosed = "1234567999";
const failMismatch = "1234567888";

console.log(`
사업자번호 mock 규칙:
  ${passBiz}     → 자동 승인 (계속사업자)
  ${failClosed}  → 폐업 (수동 심사)
  ${failMismatch} → 불일치 (수동 심사)

가입 API: POST /api/identity/portone/complete
  isBusinessMember: true
  businessRegistrationNo, businessRepresentativeName, businessOpenDate, companyName
`);
