// ─────────────────────────────────────────────────────────
// Nexus Dev Studio — Tipuri TypeScript globale
// ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════
// 1. Settings — Configurare generală a sitului
// ═══════════════════════════════════════════════

export interface SocialLink {
  platform: string;
  url: string;
  label?: string;
  icon?: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: readonly string[];
  ogImage?: string;
  ogType?: "website" | "article";
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  twitterHandle?: string;
}

export interface NavigationItem {
  label: string;
  href: string;
  children?: readonly NavigationItem[];
}

export interface Settings {
  siteName: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  email: string;
  phone?: string;
  address?: string;
  socialLinks: readonly SocialLink[];
  navigation: readonly NavigationItem[];
  seo: SeoMeta;
  footerText?: string;
  googleAnalyticsId?: string;
  locale: string;
  timezone?: string;
}

// ═══════════════════════════════════════════════
// 2. Service — Servicii oferite de studio
// ═══════════════════════════════════════════════

export interface ServiceFeature {
  id: string;
  label: string;
  description?: string;
}

export interface ServicePricingTier {
  name: string;
  price: string;
  currency?: string;
  interval?: "one-time" | "monthly" | "yearly" | "per-project";
  features: readonly string[];
  highlighted?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface Service {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  longDescription?: string;
  icon?: string;
  imageUrl?: string;
  features: readonly ServiceFeature[];
  techStack?: readonly string[];
  pricing?: readonly ServicePricingTier[];
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ═══════════════════════════════════════════════
// 3. ProcessStep — Etapele procesului de lucru
// ═══════════════════════════════════════════════

export interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  icon?: string;
  imageUrl?: string;
  duration?: string;
  deliverables?: readonly string[];
  tools?: readonly string[];
  highlightColor?: string;
}

// ═══════════════════════════════════════════════
// 4. FAQItem — Întrebări frecvente
// ═══════════════════════════════════════════════

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  order: number;
  isActive: boolean;
  relatedServiceIds?: readonly string[];
}

// ═══════════════════════════════════════════════
// 5. PortfolioItem — Proiecte din portofoliu
// ═══════════════════════════════════════════════

export interface PortfolioMediaItem {
  type: "image" | "video";
  url: string;
  alt?: string;
  poster?: string;
  width?: number;
  height?: number;
}

export interface PortfolioTestimonial {
  author: string;
  role?: string;
  company?: string;
  quote: string;
  avatarUrl?: string;
}

export interface PortfolioItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  challenge?: string;
  solution?: string;
  results?: readonly string[];
  category: string;
  tags: readonly string[];
  media: readonly PortfolioMediaItem[];
  thumbnailUrl?: string;
  liveUrl?: string;
  repoUrl?: string;
  testimonial?: PortfolioTestimonial;
  serviceIds: readonly string[];
  clientName?: string;
  completionDate?: string;
  order: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  serviceInterestIds?: readonly string[];
  budgetRange?: string;
  timeline?: string;
  status: ContactMessageStatus;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  readAt?: string;
  repliedAt?: string;
}

// ═══════════════════════════════════════════════
// 7. GlobalPromo — Banner promoțional global
// ═══════════════════════════════════════════════

export type PromoStyle = "info" | "success" | "warning" | "highlight" | "gradient";

export interface PromoAction {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "gold";
  external?: boolean;
}

export interface GlobalPromo {
  id: string;
  text: string;
  subtext?: string;
  style: PromoStyle;
  action?: PromoAction;
  dismissible: boolean;
  expiresAt?: string;
  isActive: boolean;
  pagesExclude?: readonly string[];
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

// ═══════════════════════════════════════════════
// Tipuri utilitare globale
// ═══════════════════════════════════════════════

/** Răspuns standard de la API */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
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
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  serviceInterestIds?: readonly string[];
  budgetRange?: string;
  timeline?: string;
}

/** Înregistrare newsletter */
export interface NewsletterSubscription {
  email: string;
  name?: string;
  subscribedAt: string;
  isActive: boolean;
  unsubscribedAt?: string;
}

/** Coordonate geografice / hartă */
export interface MapCoordinates {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string;
}