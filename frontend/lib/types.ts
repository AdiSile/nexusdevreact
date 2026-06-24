// ─────────────────────────────────────────────────────────
// Nexus Dev Studio — Tipuri TypeScript globale
// ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════
// 1. Settings — Configurare generală a sitului
// ═══════════════════════════════════════════════

export interface SocialLink {
  platform: string;
  url: string;
  label?: string | undefined;
  icon?: string | undefined;
}

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: readonly string[] | undefined;
  ogImage?: string | undefined;
  ogType?: "website" | "article" | undefined;
  twitterCard?:
    | "summary"
    | "summary_large_image"
    | "app"
    | "player"
    | undefined;
  twitterHandle?: string | undefined;
}

export interface NavigationItem {
  label: string;
  href: string;
  children?: readonly NavigationItem[] | undefined;
}

export interface Settings {
  siteName: string;
  tagline: string;
  description: string;
  logoUrl?: string | undefined;
  faviconUrl?: string | undefined;
  primaryColor: string;
  secondaryColor: string;
  email: string;
  phone?: string | undefined;
  address?: string | undefined;
  socialLinks: readonly SocialLink[];
  navigation: readonly NavigationItem[];
  seo: SeoMeta;
  footerText?: string | undefined;
  googleAnalyticsId?: string | undefined;
  locale: string;
  timezone?: string | undefined;
}

// ═══════════════════════════════════════════════
// 2. Service — Servicii oferite de studio
// ═══════════════════════════════════════════════

export interface ServiceFeature {
  id: string;
  label: string;
  description?: string | undefined;
}

export interface ServicePricingTier {
  name: string;
  price: string;
  currency?: string | undefined;
  interval?: "one-time" | "monthly" | "yearly" | "per-project" | undefined;
  features: readonly string[];
  highlighted?: boolean | undefined;
  ctaLabel?: string | undefined;
  ctaHref?: string | undefined;
}

export interface Service {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | undefined;
  description: string;
  longDescription?: string | undefined;
  icon?: string | undefined;
  imageUrl?: string | undefined;
  features: readonly ServiceFeature[];
  techStack?: readonly string[] | undefined;
  pricing?: readonly ServicePricingTier[] | undefined;
  order: number;
  isActive: boolean;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

// ═══════════════════════════════════════════════
// 3. ProcessStep — Etapele procesului de lucru
// ═══════════════════════════════════════════════

export interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  icon?: string | undefined;
  imageUrl?: string | undefined;
  duration?: string | undefined;
  deliverables?: readonly string[] | undefined;
  tools?: readonly string[] | undefined;
  highlightColor?: string | undefined;
}

// ═══════════════════════════════════════════════
// 4. FAQItem — Întrebări frecvente
// ═══════════════════════════════════════════════

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string | undefined;
  order: number;
  isActive: boolean;
  relatedServiceIds?: readonly string[] | undefined;
}

// ═══════════════════════════════════════════════
// 5. PortfolioItem — Proiecte din portofoliu
// ═══════════════════════════════════════════════

export interface PortfolioMediaItem {
  type: "image" | "video";
  url: string;
  alt?: string | undefined;
  poster?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
}

export interface PortfolioTestimonial {
  author: string;
  role?: string | undefined;
  company?: string | undefined;
  quote: string;
  avatarUrl?: string | undefined;
}

export interface PortfolioItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | undefined;
  description: string;
  challenge?: string | undefined;
  solution?: string | undefined;
  results?: readonly string[] | undefined;
  category: string;
  tags: readonly string[];
  media: readonly PortfolioMediaItem[];
  thumbnailUrl?: string | undefined;
  liveUrl?: string | undefined;
  repoUrl?: string | undefined;
  testimonial?: PortfolioTestimonial | undefined;
  serviceIds: readonly string[];
  clientName?: string | undefined;
  completionDate?: string | undefined;
  order: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

// ═══════════════════════════════════════════════
// 6. ContactMessage — Mesaje din formular
// ═══════════════════════════════════════════════

export type ContactMessageStatus =
  | "new"
  | "read"
  | "replied"
  | "archived"
  | "spam";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | undefined;
  company?: string | undefined;
  subject?: string | undefined;
  message: string;
  serviceInterestIds?: readonly string[] | undefined;
  budgetRange?: string | undefined;
  timeline?: string | undefined;
  status: ContactMessageStatus;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  createdAt: string;
  readAt?: string | undefined;
  repliedAt?: string | undefined;
}

// ═══════════════════════════════════════════════
// 7. GlobalPromo — Banner promoțional global
// ═══════════════════════════════════════════════

export type PromoStyle =
  | "info"
  | "success"
  | "warning"
  | "highlight"
  | "gradient";

export interface PromoAction {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "gold" | undefined;
  external?: boolean | undefined;
}

export interface GlobalPromo {
  id: string;
  text: string;
  subtext?: string | undefined;
  style: PromoStyle;
  action?: PromoAction | undefined;
  dismissible: boolean;
  expiresAt?: string | undefined;
  isActive: boolean;
  pagesExclude?: readonly string[] | undefined;
  order: number;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

// ═══════════════════════════════════════════════
// Tipuri utilitare globale
// ═══════════════════════════════════════════════

/** Răspuns standard de la API */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T | undefined;
  error?: string | undefined;
  message?: string | undefined;
  statusCode?: number | undefined;
}

/** Paginare */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T = unknown> {
  items: readonly T[];
  pagination: PaginationMeta;
}

/** Formular de contact (input utilizator) */
export interface ContactFormInput {
  name: string;
  email: string;
  phone?: string | undefined;
  company?: string | undefined;
  subject?: string | undefined;
  message: string;
  serviceInterestIds?: readonly string[] | undefined;
  budgetRange?: string | undefined;
  timeline?: string | undefined;
}

/** Înregistrare newsletter */
export interface NewsletterSubscription {
  email: string;
  name?: string | undefined;
  subscribedAt: string;
  isActive: boolean;
  unsubscribedAt?: string | undefined;
}

/** Coordonate geografice / hartă */
export interface MapCoordinates {
  lat: number;
  lng: number;
  zoom?: number | undefined;
  label?: string | undefined;
}