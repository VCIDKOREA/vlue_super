import { ensureDigitalCardId, syncDigitalCardExportSnapshot } from "./digitalCardApi.js";

/** 채팅방에 내 디지털 명함 카드 메시지 페이로드 생성 */
export async function buildMyCardChatPayload(myCard, myCardUserId = "me") {
  let vcidLettering = false;
  try {
    vcidLettering = localStorage.getItem("vcid") === "true";
  } catch {
    vcidLettering = false;
  }

  const cardId = (await ensureDigitalCardId()) || "";
  if (cardId && myCard) {
    await syncDigitalCardExportSnapshot(myCard);
  }

  return {
    type: "me",
    text: "[명함카드]",
    card: {
      userId: myCardUserId,
      digitalCardId: cardId,
      membershipTier: myCard?.membershipTier || "free",
      organization: myCard?.organization || "VLUE",
      title: myCard?.title || "",
      name: myCard?.name || "",
      phone: myCard?.phone || "",
      email: myCard?.email || "",
      address: myCard?.address || "",
      landline: myCard?.landline || "",
      fax: myCard?.fax || "",
      backNote: myCard?.backNote || "",
      introBack: myCard?.introBack || "",
      logoUrl: myCard?.logoUrl || "",
      legalName: String(myCard?.legalName || "").trim(),
      vcidLettering
    }
  };
}
