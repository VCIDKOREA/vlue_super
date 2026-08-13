import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { formatLetteringPhoneDisplay, normalizePhoneDigits } from "./letteringPhoneMatch.js";
import { isPaidLetteringTier } from "./letteringMembership.js";
import { getBusinessCardByNumber } from "./getBusinessCardByNumber.js";
import { mapLookupToLetteringCard } from "./letteringCardMapper.js";
import {
  buildNationalAgencyDcpCard,
  isNationalAgencyDcpCard,
  matchNationalAgency
} from "./nationalAgencyDcpClient.js";

function emptyUnmatched(phoneDisplay, digits) {
  return {
    phone: phoneDisplay,
    phoneDigits: digits,
    verified: false,
    source: "none",
    isPaid: false,
    card: normalizeLetteringCard({
      name: "",
      phone: phoneDisplay,
      membershipTier: "free"
    }),
    attachments: [],
    outlinks: []
  };
}

function dcpPayload(card, phoneDisplay, digits, source) {
  return {
    phone: card.phone || phoneDisplay,
    phoneDigits: digits,
    verified: true,
    source,
    isPaid: true,
    card: normalizeLetteringCard(card),
    attachments: [],
    outlinks: []
  };
}

/**
 * :phone 파라미터 → VLUE Showcase 웹뷰 페이로드
 * API 매칭만 사용. 미매칭 시 데모/내 명함을 상대 카드로 넣지 않음.
 * 112 등 국가기관은 userId 없이도 DCP 쇼케이스.
 */
export async function resolveVlueShowcaseByPhone(phoneRaw) {
  const digits = normalizePhoneDigits(phoneRaw);
  const phoneDisplay = formatLetteringPhoneDisplay(phoneRaw) || phoneRaw || "—";

  const lookup = await getBusinessCardByNumber(phoneRaw, { forCallOverlay: true });
  if (lookup?.ok && lookup.matched) {
    const mapped = mapLookupToLetteringCard(lookup, phoneRaw);
    if (mapped) {
      if (isNationalAgencyDcpCard(mapped)) {
        return dcpPayload(mapped, phoneDisplay, digits, lookup.source || "national_agency_dcp");
      }
      const tier = mapped.membershipTier || "paid";
      return {
        phone: phoneDisplay,
        phoneDigits: digits,
        verified: Boolean(lookup.is_verified),
        source: lookup.source || "api",
        isPaid: isPaidLetteringTier(tier),
        card: { ...mapped, phone: mapped.phone || phoneDisplay, membershipTier: tier },
        attachments: [],
        outlinks: []
      };
    }
  }

  const agency = matchNationalAgency(phoneRaw);
  if (agency) {
    return dcpPayload(
      buildNationalAgencyDcpCard(agency),
      phoneDisplay,
      digits,
      "national_agency_whitelist"
    );
  }

  return emptyUnmatched(phoneDisplay, digits);
}
