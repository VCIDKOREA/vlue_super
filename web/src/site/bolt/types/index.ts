export type View =
  | "home"
  | "search"
  | "shopping"
  | "auction"
  | "about"
  | "resources"
  | "pricing"
  | "safezone"
  | "mail"
  | "mail-settings"
  | "download"
  | "news"
  | "events"
  | "jobs"
  | "support"
  | "exceleditor"
  | "family"
  | "mypage"
  | "bizcard"
  | "showcase"
  | "biz"
  | "terms"
  | "privacy"
  | "refund";

export interface CertifiedOrg {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  certifiedDate: string;
  validUntil: string;
  certNumber: string;
  status: string;
  description: string;
  representative: string;
  businessNumber: string;
  tags: string[];
  lastVerified: string;
}

export interface PublicDataResult {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  source: string;
  lastUpdated: string;
  status: string;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  imageUrl?: string;
  region?: string;
}

/** VLUE 스토어 — 홈 공식 광고업체 슬롯 */
export interface StoreAdvertiser {
  id: string;
  name: string;
  category: string;
  tagline: string;
  imageUrl: string;
  region?: string;
}

export interface Product {
  id: string;
  name: string;
  seller: string;
  price: number;
  originalPrice?: number;
  category: string;
  imageUrl: string;
  rating: number;
  reviews: number;
  certified: boolean;
  isGroupBuy?: boolean;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  thumbnail: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  listPrice?: number | null;
  period: string;
  description: string;
  color: string;
  recommended?: boolean;
  features: string[];
  priceNote?: string;
}

export interface JobPost {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  deadline: string;
  tags: string[];
  description: string;
  requirements: string[];
  benefits: string[];
}

export interface JobProfile {
  id: string;
  name: string;
  field: string;
  experience: string;
  location: string;
  education: string;
  tags: string[];
  available: boolean;
}

export interface SafeZone {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  type: "home" | "work" | "hospital" | "school" | "custom";
}
