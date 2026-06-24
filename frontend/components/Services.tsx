"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCode,
  faShoppingCart,
  faMobileAlt,
  faMobileScreen,
  faFileAlt,
  faCloud,
  faPlug,
  faChartLine,
  faBolt,
  faCubes,
  faDatabase,
  faWindowMaximize,
  faPaintBrush,
  faPenRuler,
  faMagnifyingGlass,
  faGaugeHigh,
  faScrewdriverWrench,
  faFillDrip,
  faWordpress,
  faEnvelope,
  faComments,
  faChevronRight,
  faTag,
  faCheck,
  faTimes,
  faFilter,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import GlassCard from "./GlassCard";
import { fetchSettings } from "../lib/api";
import type { NexusSettings } from "../lib/fallback";
import { fallbackSettings } from "../lib/fallback";
import type { Service, ServicePricingTier } from "../lib/types";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

export interface ServicesProps {
  /** Setări preîncărcate (opțional) */
  settings?: NexusSettings;
  /** Clasă CSS suplimentară */
  className?: string;
  /** ID DOM */
  id?: string;
}

/** Categorie derivată pentru filtrare */
interface ServiceCategory {
  key: string;
  label: string;
  count: number;
}

/** Serviciu îmbogățit cu date calculate */
interface EnrichedService extends Service {
  derivedCategory: string;
  standardPrice: number;
  reducedPrice: number;
  discountPercent: number;
  standardTier: ServicePricingTier | null;
  reducedTier: ServicePricingTier | null;
}

/* ─────────────────────────────────────────────
   Mapări
   ───────────────────────────────────────────── */

/** Icon map: string → FontAwesome IconDefinition */
const ICON_MAP: Record<string, IconDefinition> = {
  "fa-code": faCode,
  "fa-shopping-cart": faShoppingCart,
  "fa-mobile-alt": faMobileAlt,
  "fa-mobile-screen": faMobileScreen,
  "fa-file-alt": faFileAlt,
  "fa-cloud": faCloud,
  "fa-plug": faPlug,
  "fa-chart-line": faChartLine,
  "fa-bolt": faBolt,
  "fa-cubes": faCubes,
  "fa-database": faDatabase,
  "fa-window-maximize": faWindowMaximize,
  "fa-paint-brush": faPaintBrush,
  "fa-pen-ruler": faPenRuler,
  "fa-magnifying-glass": faMagnifyingGlass,
  "fa-gauge-high": faGaugeHigh,
  "fa-screwdriver-wrench": faScrewdriverWrench,
  "fa-fill-drip": faFillDrip,
  "fa-wordpress": faWordpress,
  "fa-envelope": faEnvelope,
  "fa-comments": faComments,
};

/** Categorii derivate pe baza slug-ului */
const CATEGORY_RULES: { pattern: RegExp; key: string; label: string }[] = [
  {
    pattern: /web-development|landing-page|website-redesign|wordpress|custom-cms/,
    key: "web",
    label: "Dezvoltare Web",
  },
  {
    pattern: /e-commerce/,
    key: "ecommerce",
    label: "E-Commerce",
  },
  {
    pattern: /mobile-app|pwa|progressive-web/,
    key: "mobile",
    label: "Mobile & PWA",
  },
  {
    pattern: /saas|enterprise-dashboard|real-time|microservices/,
    key: "platform",
    label: "Platforme & SaaS",
  },
  {
    pattern: /api-development|database-design/,
    key: "api-data",
    label: "API & Date",
  },
  {
    pattern: /ui-ux|brand-identity|email-template/,
    key: "design",
    label: "Design",
  },
  {
    pattern: /seo|performance-optimization/,
    key: "perf",
    label: "SEO & Performanță",
  },
  {
    pattern: /maintenance|technical-consultation/,
    key: "support",
    label: "Suport & Consultanță",
  },
];

const ALL_CATEGORY_KEY = "all";

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function deriveCategory(slug: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(slug)) return rule.key;
  }
  return "other";
}

function getCategoryLabel(key: string): string {
  if (key === ALL_CATEGORY_KEY) return "Toate";
  const rule = CATEGORY_RULES.find((r) => r.key === key);
  return rule?.label ?? key;
}

function resolveIcon(iconName?: string): IconDefinition | null {
  if (!iconName) return null;
  return ICON_MAP[iconName] ?? null;
}

function formatPrice(price: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function enrichServices(services: readonly Service[]): EnrichedService[] {
  return services
    .filter((s) => s.isActive)
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const standardTier =
        s.pricing?.find((p) => p.name.toLowerCase() === "standard") ?? null;
      const reducedTier =
        s.pricing?.find(
          (p) =>
            p.name.toLowerCase() === "redus" ||
            p.name.toLowerCase() === "reduced",
        ) ?? null;

      const standardPrice = standardTier
        ? parseInt(standardTier.price, 10) || 0
        : 0;
      const reducedPrice = reducedTier
        ? parseInt(reducedTier.price, 10) || 0
        : standardPrice;
      const discountPercent =
        standardPrice > 0
          ? Math.round(((standardPrice - reducedPrice) / standardPrice) * 100)
          : 0;

      return {
        ...s,
        derivedCategory: deriveCategory(s.slug),
        standardPrice,
        reducedPrice,
        discountPercent,
        standardTier,
        reducedTier,
      };
    });
}

/* ─────────────────────────────────────────────
   Componenta Services
   ───────────────────────────────────────────── */

export default function Services({
  settings: initialSettings,
  className = "",
  id,
}: ServicesProps) {
  /* ── Stare settings ── */
  const [settings, setSettings] = useState<NexusSettings | null>(
    initialSettings ?? null,
  );

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      return;
    }
    let cancelled = false;
    fetchSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        if (!cancelled) {
          console.warn("[Services] Fetch eșuat — se folosește fallback.");
          setSettings(fallbackSettings);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  /* ── Servicii îmbogățite ── */
  const enriched = useMemo(
    () => enrichServices(settings?.services ?? []),
    [settings],
  );

  /* ── Categorii derivate (cu număr) ── */
  const categories = useMemo<ServiceCategory[]>(() => {
    const map = new Map<string, number>();
    for (const s of enriched) {
      map.set(s.derivedCategory, (map.get(s.derivedCategory) ?? 0) + 1);
    }
    const list: ServiceCategory[] = Array.from(map.entries()).map(
      ([key, count]) => {
        const label = getCategoryLabel(key);
        return { key, label, count };
      },
    );
    list.sort((a, b) => b.count - a.count);
    // "Toate" prima
    const allCat: ServiceCategory = {
      key: ALL_CATEGORY_KEY,
      label: "Toate",
      count: enriched.length,
    };
    return [allCat, ...list];
  }, [enriched]);

  /* ── Filtru activ ── */
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_KEY);

  const filteredServices = useMemo(() => {
    if (activeCategory === ALL_CATEGORY_KEY) return enriched;
    return enriched.filter((s) => s.derivedCategory === activeCategory);
  }, [enriched, activeCategory]);

  /* ── Stare pentru toggle expand card (mobile) ── */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /* ── Loading state ── */
  if (!settings) {
    return (
      <section
        id={id}
        className={`relative py-section overflow-hidden ${className}`}
      >
        <div className="nexus-container">
          {/* Skeleton loading */}
          <div className="text-center space-y-4 mb-12">
            <div className="mx-auto h-8 w-48 bg-white/5 rounded animate-pulse" />
            <div className="mx-auto h-4 w-96 bg-white/5 rounded animate-pulse" />
          </div>

          {/* Skeleton grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-glass bg-glass-light border border-glass-border p-6 h-80 animate-pulse"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 mb-4" />
                <div className="h-5 w-3/4 bg-white/5 rounded mb-3" />
                <div className="h-4 w-full bg-white/5 rounded mb-2" />
                <div className="h-4 w-5/6 bg-white/5 rounded mb-2" />
                <div className="h-4 w-2/3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className={`relative py-section sm:py-section-lg overflow-hidden ${className}`}
    >
      {/* ═════════════════════════════════════════
          FUNDAL DECORATIV
          ═════════════════════════════════════════ */}
      {/* Fundal imagine subtil */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center bg-fixed opacity-[0.04]"
        style={{ backgroundImage: "url('/images/services-bg.jpg')" }}
      />

      {/* Gradient radial decorativ */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.10)_0%,transparent_70%)] pointer-events-none z-0"
      />

      {/* Particule decorative aurii în background */}
      <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-1 h-1 bg-gold/20 rounded-full animate-float" />
        <div className="absolute top-40 right-[15%] w-1.5 h-1.5 bg-gold/15 rounded-full animate-float-delay" />
        <div className="absolute bottom-32 left-[5%] w-1 h-1 bg-nexus-glow/20 rounded-full animate-float" />
        <div className="absolute bottom-20 right-[20%] w-1.5 h-1.5 bg-nexus-accent/15 rounded-full animate-float-delay" />
      </div>

      {/* ═════════════════════════════════════════
          CONȚINUT
          ═════════════════════════════════════════ */}
      <div className="relative z-10 nexus-container">
        {/* ── Header secțiune ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          {/* Badge */}
          <span className="nexus-badge text-xs sm:text-sm py-1.5 px-4 mb-4 inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faTag} className="w-3 h-3 text-gold" />
            Prețuri promoționale de lansare
          </span>

          {/* Titlu */}
          <h2 className="mt-5 font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Serviciile{" "}
            <span className="text-nexus-gradient">Noastre</span>
          </h2>

          {/* Subtitlu */}
          <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            De la dezvoltare full-stack până la consultanță tehnică, oferim o
            gamă completă de 21 de servicii digitale. Toate vin cu prețuri
            promoționale de lansare — reducere aplicată automat.
          </p>
        </motion.div>

        {/* ═════════════════════════════════════════
            BARĂ FILTRE ANIMATĂ
            ═════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
          className="mb-10 sm:mb-14"
        >
          {/* Label filtru pe mobil */}
          <div className="flex items-center gap-2 mb-3 sm:hidden">
            <FontAwesomeIcon
              icon={faFilter}
              className="w-3.5 h-3.5 text-nexus-glow"
            />
            <span className="text-xs text-white/40 uppercase tracking-widest font-medium">
              Filtrează
            </span>
          </div>

          {/* Container scrollabil orizontal pe mobil */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <AnimatePresence mode="wait">
              {categories.map((cat, idx) => {
                const isActive = activeCategory === cat.key;
                return (
                  <motion.button
                    key={cat.key}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{
                      duration: 0.25,
                      delay: idx * 0.04,
                      ease: "easeOut",
                    }}
                    onClick={() => setActiveCategory(cat.key)}
                    className={[
                      "relative px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium",
                      "transition-all duration-300 ease-out",
                      "whitespace-nowrap select-none",
                      "focus-visible:outline-2 focus-visible:outline-nexus-glow",
                      isActive
                        ? "bg-nexus-accent/30 text-white border border-nexus-glow/40 shadow-[0_0_18px_rgba(108,60,225,0.30)]"
                        : "bg-white/4 text-white/55 border border-white/8 hover:bg-white/8 hover:text-white/80 hover:border-white/14",
                    ].join(" ")}
                  >
                    <span>{cat.label}</span>
                    {/* Badge cu număr */}
                    <span
                      className={[
                        "ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold",
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-white/6 text-white/40",
                      ].join(" ")}
                    >
                      {cat.count}
                    </span>

                    {/* Indicator activ (liniuță subtilă sub buton) */}
                    {isActive && (
                      <motion.div
                        layoutId="activeFilterIndicator"
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-nexus-glow/60"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Contor rezultate */}
          <motion.p
            key={activeCategory}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-center mt-4 text-xs text-white/30 font-mono"
          >
            {filteredServices.length} serviciu
            {filteredServices.length !== 1 ? "i" : ""} disponibil
            {filteredServices.length !== 1 ? "i" : ""}
            {activeCategory !== ALL_CATEGORY_KEY &&
              ` în categoria "${getCategoryLabel(activeCategory)}"`}
          </motion.p>
        </motion.div>

        {/* ═════════════════════════════════════════
            GRID CARDURI
            ═════════════════════════════════════════ */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7"
        >
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, idx) => {
              const icon = resolveIcon(service.icon);
              const isExpanded = expandedIds.has(service.id);

              return (
                <motion.div
                  key={service.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -10 }}
                  transition={{
                    duration: 0.4,
                    delay: idx * 0.05,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                >
                  <GlassCard
                    variant={service.discountPercent >= 20 ? "heavy" : "default"}
                    padding="lg"
                    borderGlow={
                      service.discountPercent >= 25
                        ? "gold"
                        : service.discountPercent >= 15
                          ? "mixed"
                          : "nexus"
                    }
                    hoverEffect="both"
                    animateIn={false}
                    highlight
                    className="h-full flex flex-col"
                    interactive
                    onClick={() => toggleExpand(service.id)}
                    ariaLabel={`Serviciul ${service.title}. Preț standard ${formatPrice(service.standardPrice)}, preț redus ${formatPrice(service.reducedPrice)}. Reducere ${service.discountPercent}%.`}
                  >
                    {/* ═══ Badge reducere (colț dreapta sus) ═══ */}
                    {service.discountPercent > 0 && (
                      <div className="absolute top-3 right-3 z-20">
                        <motion.div
                          initial={{ scale: 0, rotate: -15 }}
                          whileInView={{ scale: 1, rotate: 0 }}
                          viewport={{ once: true }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 20,
                            delay: 0.2 + idx * 0.03,
                          }}
                          className={[
                            "px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide",
                            "shadow-lg",
                            service.discountPercent >= 30
                              ? "bg-red-500/90 text-white shadow-red-500/25"
                              : service.discountPercent >= 20
                                ? "bg-gold/90 text-nexus-dark shadow-gold/30"
                                : "bg-nexus-accent/85 text-white shadow-nexus-accent/30",
                          ].join(" ")}
                        >
                          -{service.discountPercent}%
                        </motion.div>
                      </div>
                    )}

                    {/* ═══ Icon + Titlu ═══ */}
                    <div className="flex items-start gap-3.5 mb-4">
                      {/* Icon container */}
                      <div
                        className={[
                          "flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center",
                          "transition-colors duration-300",
                          service.discountPercent >= 25
                            ? "bg-gold/10 border border-gold/20 text-gold"
                            : "bg-nexus-accent/10 border border-nexus-accent/20 text-nexus-glow",
                        ].join(" ")}
                      >
                        {icon && (
                          <FontAwesomeIcon
                            icon={icon}
                            className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-heading text-base sm:text-lg font-bold text-white leading-tight">
                          {service.title}
                        </h3>
                        {/* Badge categorie */}
                        <span className="inline-block mt-1 text-[10px] sm:text-xs text-white/30 font-mono tracking-wide uppercase">
                          {getCategoryLabel(service.derivedCategory)}
                        </span>
                      </div>
                    </div>

                    {/* ═══ Descriere ═══ */}
                    <p className="text-sm text-white/50 leading-relaxed mb-4 line-clamp-2">
                      {service.description}
                    </p>

                    {/* ═══ Features (trunchiate când nu e expandat) ═══ */}
                    <div className="mb-4 flex-1">
                      <ul className="space-y-1.5">
                        {service.features
                          .slice(0, isExpanded ? service.features.length : 3)
                          .map((feat) => (
                            <li
                              key={feat.id}
                              className="flex items-start gap-2 text-xs sm:text-sm text-white/55"
                            >
                              <FontAwesomeIcon
                                icon={faCheck}
                                className="w-3 h-3 mt-0.5 text-nexus-glow/60 flex-shrink-0"
                              />
                              <span>{feat.label}</span>
                            </li>
                          ))}
                      </ul>

                      {/* Buton "arată mai mult/mai puțin" */}
                      {service.features.length > 3 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(service.id);
                          }}
                          className="mt-2 text-[11px] sm:text-xs text-nexus-glow/60 hover:text-nexus-glow transition-colors font-medium"
                        >
                          {isExpanded
                            ? "Arată mai puțin"
                            : `+ încă ${service.features.length - 3} feature-uri`}
                        </button>
                      )}
                    </div>

                    {/* ═══ Separator ═══ */}
                    <hr className="glass-divider mb-4" />

                    {/* ═══ Prețuri ═══ */}
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex flex-col">
                        {/* Preț standard (tăiat) */}
                        {service.discountPercent > 0 && (
                          <span className="text-xs sm:text-sm text-white/30 line-through leading-tight">
                            {formatPrice(
                              service.standardPrice,
                              service.standardTier?.currency ?? "EUR",
                            )}
                          </span>
                        )}
                        {/* Preț redus */}
                        <span
                          className={[
                            "font-heading font-extrabold leading-tight",
                            service.discountPercent > 0
                              ? "text-gold-light text-lg sm:text-xl"
                              : "text-white text-lg sm:text-xl",
                          ].join(" ")}
                        >
                          {formatPrice(
                            service.reducedPrice,
                            service.reducedTier?.currency ??
                              service.standardTier?.currency ??
                              "EUR",
                          )}
                        </span>
                        <span className="text-[10px] sm:text-xs text-white/25 mt-0.5">
                          {service.reducedTier?.interval === "per-project" ||
                          service.standardTier?.interval === "per-project"
                            ? "per proiect"
                            : service.reducedTier?.interval ??
                              service.standardTier?.interval ??
                              ""}
                        </span>
                      </div>

                      {/* CTA buton */}
                      <a
                        href="#contact"
                        onClick={(e) => e.stopPropagation()}
                        className={[
                          "px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold",
                          "transition-all duration-300 ease-out",
                          "flex items-center gap-1.5",
                          "hover:scale-105 active:scale-95",
                          service.discountPercent >= 25
                            ? "bg-gold/15 border border-gold/30 text-gold-light hover:bg-gold/25 hover:border-gold/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.25)]"
                            : "bg-nexus-accent/15 border border-nexus-accent/25 text-nexus-glow hover:bg-nexus-accent/25 hover:border-nexus-glow/40 hover:shadow-[0_0_20px_rgba(108,60,225,0.25)]",
                        ].join(" ")}
                      >
                        <span>Alege</span>
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="w-3 h-3"
                        />
                      </a>
                    </div>

                    {/* ═══ Banner economie ═══ */}
                    {service.discountPercent > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-[11px] text-gold-pale/70 text-center font-medium">
                          Economisești{" "}
                          <span className="text-gold-light font-bold">
                            {formatPrice(
                              service.standardPrice - service.reducedPrice,
                              service.standardTier?.currency ?? "EUR",
                            )}
                          </span>{" "}
                          cu prețul promoțional
                        </p>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* ═════════════════════════════════════════
            STARE GOL (după filtrare)
            ═════════════════════════════════════════ */}
        {filteredServices.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 sm:py-20"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-white/4 border border-white/6 flex items-center justify-center mb-4">
              <FontAwesomeIcon
                icon={faFilter}
                className="w-6 h-6 text-white/20"
              />
            </div>
            <p className="text-white/30 text-sm sm:text-base font-medium">
              Niciun serviciu în această categorie.
            </p>
            <button
              onClick={() => setActiveCategory(ALL_CATEGORY_KEY)}
              className="mt-3 text-xs sm:text-sm text-nexus-glow hover:text-gold-light transition-colors font-medium underline underline-offset-4"
            >
              Arată toate serviciile
            </button>
          </motion.div>
        )}

        {/* ═════════════════════════════════════════
            CTA FINAL
            ═════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="mt-14 sm:mt-18 text-center"
        >
          <div className="inline-block glass-heavy rounded-glass-lg p-6 sm:p-8 border border-white/8 max-w-xl">
            <p className="text-white/65 text-sm sm:text-base mb-4 leading-relaxed">
              Nu găsești ce cauți? Fiecare proiect este unic —{" "}
              <span className="text-white font-semibold">
                hai să discutăm nevoile tale
              </span>{" "}
              și să creăm soluția perfectă.
            </p>
            <a
              href="#contact"
              className="glass-btn px-6 py-3 sm:px-8 sm:py-4 group text-sm sm:text-base"
            >
              <FontAwesomeIcon
                icon={faComments}
                className="w-4 h-4 transition-transform duration-300 group-hover:scale-110"
              />
              <span>Solicită o ofertă personalizată</span>
            </a>
          </div>
        </motion.div>
      </div>

      {/* ═════════════════════════════════════════
          GRADIENT TRANZIȚIE JOS
          ═════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 z-[2] h-24 sm:h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(13,10,26,0.6) 0%, transparent 100%)",
        }}
      />
    </section>
  );
}

/* ─────────────────────────────────────────────
   Exporturi denumite
   ───────────────────────────────────────────── */

export {
  enrichServices,
  deriveCategory,
  getCategoryLabel,
  resolveIcon,
  formatPrice,
  CATEGORY_RULES,
  ALL_CATEGORY_KEY,
  ICON_MAP,
};
export type { EnrichedService, ServiceCategory };