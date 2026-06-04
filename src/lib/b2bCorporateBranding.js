/**
 * 기업 CI/BI JSON → 명함 렌더용 display 카드 (개인 원본 필드는 객체에 유지, 화면만 기업 우선)
 * @param {Record<string, unknown>} personalCard
 * @param {Record<string, unknown> | null | undefined} branding
 * @param {{ company_name?: string } | null | undefined} company
 */
export function applyCorporateBrandingToCard(personalCard, branding, company) {
  const b = branding && typeof branding === "object" ? branding : {};
  const logoUrl = String(b.logoUrl || b.logo_url || "").trim();
  const primaryColor = String(b.primaryColor || b.primary_color || "#1e3a8a").trim();
  const fontFamily = String(b.fontFamily || b.font_family || "").trim();
  const secondaryColor = String(b.secondaryColor || b.secondary_color || "").trim();
  const companyName = String(company?.company_name || personalCard.organization || "").trim();

  return {
    ...personalCard,
    organization: companyName || personalCard.organization,
    logoUrl: logoUrl || personalCard.logoUrl,
    _corporateOverride: true,
    _corporatePrimaryColor: primaryColor,
    _corporateSecondaryColor: secondaryColor,
    _corporateFontFamily: fontFamily
  };
}

export function corporateBrandingStyleVars(card) {
  if (!card?._corporateOverride) return undefined;
  const style = {};
  if (card._corporatePrimaryColor) {
    style["--lettering-corp-primary"] = card._corporatePrimaryColor;
  }
  if (card._corporateSecondaryColor) {
    style["--lettering-corp-secondary"] = card._corporateSecondaryColor;
  }
  if (card._corporateFontFamily) {
    style.fontFamily = card._corporateFontFamily;
  }
  return style;
}
