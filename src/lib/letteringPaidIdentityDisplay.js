/** 유료 Lettering·명함 — 회사명 / 직책·성명 표시 */
export function formatLetteringPaidIdentity(card = {}) {
  const organization = String(card.organization || card.companyName || "").trim();
  const title = String(card.title || card.jobTitle || "").trim();
  const name = String(card.name || card.displayName || "").trim();
  const roleLine = [title, name].filter(Boolean).join(" / ");
  const personLine = [name, title].filter(Boolean).join(" / ");

  return {
    organization,
    name,
    title,
    roleLine,
    personLine,
    companyLine: organization || name || "\u2014",
    hasRoleLine: Boolean(roleLine),
    hasPersonLine: Boolean(name || title)
  };
}
