import { formatPhoneKrDisplay } from "./b2bCompanyContact.js";

export type LineDisplaySource = {
  useMasterDisplayNumber: boolean;
  realCliPhoneE164: string;
};

export type EnterpriseDisplaySource = {
  masterDisplayNumber: string;
};

/** 회선별 디지털 명함·오버레이 표시 번호 */
export function resolveB2bLineDisplay(
  enterprise: EnterpriseDisplaySource,
  line: LineDisplaySource
): { displayNumber: string; maskedDisplayOnly: boolean } {
  const master = String(enterprise.masterDisplayNumber || "").trim();
  const useRep =
    Boolean(line.useMasterDisplayNumber) && master.replace(/\D/g, "").length >= 4;

  if (useRep) {
    return { displayNumber: master, maskedDisplayOnly: true };
  }

  const direct = formatPhoneKrDisplay(line.realCliPhoneE164) || line.realCliPhoneE164;
  return { displayNumber: direct, maskedDisplayOnly: false };
}

export function buildCardProfileJsonForLine(
  enterprise: EnterpriseDisplaySource,
  line: LineDisplaySource
): Record<string, unknown> {
  const { displayNumber, maskedDisplayOnly } = resolveB2bLineDisplay(enterprise, line);
  return {
    maskedDisplayOnly,
    displayNumber,
    useMasterDisplayNumber: Boolean(line.useMasterDisplayNumber)
  };
}
