/** 정통 비즈니스 명함 — 90×50mm (프론트 bizcardSvgEngineCore 와 동기화) */

export type BizcardClassicSnapshot = {
  organization?: string;
  name?: string;
  title?: string;
  department?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  designTemplate?: string;
};

export {
  BIZCARD_ASPECT,
  buildBizcardCardSvgDocument as buildClassicBizcardSvg,
  cardToSvgSnapshot,
  themePalette
} from "../../../../../src/lib/bizcardSvgEngineCore.js";

export function normalizeBizcardTemplate(id?: string | null) {
  const v = String(id || "").trim();
  if (
    v === "classic-light" ||
    v === "modern-dark" ||
    v === "professional-gold" ||
    v === "creative-gradient"
  ) {
    return v;
  }
  return "classic-light";
}
