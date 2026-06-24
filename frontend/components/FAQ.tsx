"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faQuestionCircle,
  faComments,
  faEnvelope,
  faSearch,
  faTimes,
  faTag,
  faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { fetchSettings } from "../lib/api";
import type { NexusSettings } from "../lib/fallback";
import { fallbackSettings } from "../lib/fallback";
import type { FAQItem } from "../lib/types";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

export interface FAQProps {
  /** Setări preîncărcate (opțional) */
  settings?: NexusSettings;
  /** Clasă CSS suplimentară */
  className?: string;
  /** ID DOM */
  id?: string;
}

/** Categorie derivată pentru filtrare */
interface FAQCategory {
  key: string;
  label: string;
  count: number;
}

/** FAQItem îmbogățit cu categorie derivată */
interface EnrichedFAQ extends FAQItem {
  derivedCategory: string;
  searchableText: string;
}

/* ─────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────── */

const ALL_CATEGORY_KEY = "all";

/** Icon-uri asociate unor categorii cunoscute */
const CATEGORY_ICONS: Record<string, IconDefinition> = {
  general: faQuestionCircle,
  tehnic: faFolderOpen,
  pricing: faTag,
  support: faComments,
  process: faFolderOpen,
};

/** Nume afișabile pentru categorii */
const CATEGORY_LABELS: Record<string, string> = {
  general: "Generale",
  tehnic: "Tehnice",
  pricing: "Prețuri & Plată",
  support: "Suport",
  process: "Proces",
  other: "Altele",
};

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function deriveCategory(faq: FAQItem): string {
  if (faq.category) return faq.category.toLowerCase();
  return "general";
}

function getCategoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

function getCategoryIcon(key: string): IconDefinition {
  return CATEGORY_ICONS[key] ?? faQuestionCircle;
}

function enrichFAQItems(items: readonly FAQItem[]): EnrichedFAQ[] {
  return items
    .filter((f) => f.isActive)
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      ...f,
      derivedCategory: deriveCategory(f),
      searchableText: `${f.question} ${f.answer}`.toLowerCase(),
    }));
}

/* ─────────────────────────────────────────────
   Subcomponentă: FAQ Accordion Item
   ───────────────────────────────────────────── */

interface FAQAccordionItemProps {
  faq: EnrichedFAQ;
  isOpen: boolean;
  onToggle: (id: string) => void;
  index: number;
}

function FAQAccordionItem({
  faq,
  isOpen,
  onToggle,
  index,
}: FAQAccordionItemProps) {
  /* Icon pentru categoria item-ului */
  const catIcon = getCategoryIcon(faq.derivedCategory);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.45,
        delay: index * 0.07,
        ease: [0.23, 1, 0.32, 1],
      }}
      className={[
        "group relative",
        "border border-white/8",
        "rounded-glass",
        "bg-glass-light backdrop-blur-md",
        "transition-all duration-300 ease-out",
        isOpen
          ? "border-nexus-glow/30 shadow-[0_0_24px_rgba(108,60,225,0.12)] bg-glass-medium"
          : "hover:border-white/12 hover:bg-glass-medium",
      ].join(" ")}
    >
      {/* ═══ Buton întrebare ═══ */}
      <button
        type="button"
        onClick={() => onToggle(faq.id)}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${faq.id}`}
        className={[
          "w-full flex items-start gap-4 px-5 py-5 sm:px-6 sm:py-6",
          "text-left",
          "focus-visible:outline-2 focus-visible:outline-nexus-glow focus-visible:outline-offset-[-2px]",
          "rounded-[inherit]",
          "transition-colors duration-200",
          isOpen
            ? "text-white"
            : "text-white/80 hover:text-white",
        ].join(" ")}
      >
        {/* Icon container */}
        <div
          className={[
            "flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center",
            "transition-all duration-300",
            isOpen
              ? "bg-nexus-accent/20 border border-nexus-glow/30 text-nexus-glow shadow-[0_0_16px_rgba(108,60,225,0.20)]"
              : "bg-white/4 border border-white/8 text-white/35 group-hover:text-white/55 group-hover:border-white/14",
          ].join(" ")}
        >
          <FontAwesomeIcon
            icon={catIcon}
            className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
          />
        </div>

        {/* Text întrebare */}
        <div className="flex-1 min-w-0 pt-1 sm:pt-1.5">
          <h3
            className={[
              "font-heading text-sm sm:text-base md:text-lg font-semibold leading-snug",
              "transition-colors duration-200",
            ].join(" ")}
          >
            {faq.question}
          </h3>

          {/* Badge categorie */}
          <span className="inline-block mt-1.5 text-[10px] sm:text-xs text-white/25 font-mono tracking-wide uppercase">
            {getCategoryLabel(faq.derivedCategory)}
          </span>
        </div>

        {/* Săgeată expand/colaps */}
        <div
          className={[
            "flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center",
            "transition-all duration-300",
            isOpen
              ? "bg-nexus-accent/20 border border-nexus-glow/25 text-nexus-glow rotate-180"
              : "bg-white/3 border border-white/6 text-white/30 group-hover:text-white/50",
          ].join(" ")}
        >
          <FontAwesomeIcon
            icon={faChevronDown}
            className="w-3.5 h-3.5 transition-transform duration-300"
          />
        </div>
      </button>

      {/* ═══ Conținut răspuns (expandabil) ═══ */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-answer-${faq.id}`}
            key={`answer-${faq.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: {
                  duration: 0.4,
                  ease: [0.23, 1, 0.32, 1],
                },
                opacity: {
                  duration: 0.35,
                  delay: 0.08,
                  ease: "easeOut",
                },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: {
                  duration: 0.3,
                  ease: [0.55, 0, 1, 0.45],
                },
                opacity: {
                  duration: 0.2,
                },
              },
            }}
            className="overflow-hidden"
          >
            {/* Linie separatoare subtilă */}
            <div className="mx-5 sm:mx-6">
              <hr className="border-white/6" />
            </div>

            <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-4 sm:pt-5">
              <div className="flex gap-4">
                {/* Marcator răspuns (linie verticală gradient) */}
                <div
                  aria-hidden="true"
                  className="flex-shrink-0 w-1 self-stretch rounded-full"
                  style={{
                    background:
                      "linear-gradient(to bottom, #6C3CE1, #D4AF37)",
                  }}
                />

                {/* Conținut răspuns */}
                <div className="flex-1 min-w-0">
                  <motion.p
                    initial={{ opacity: 0, x: -6 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      transition: {
                        duration: 0.3,
                        delay: 0.12,
                        ease: "easeOut",
                      },
                    }}
                    exit={{ opacity: 0, x: -6 }}
                    className="text-sm sm:text-base text-white/55 leading-relaxed"
                  >
                    {faq.answer}
                  </motion.p>

                  {/* Servicii relaționate (dacă există) */}
                  {faq.relatedServiceIds &&
                    faq.relatedServiceIds.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: {
                            duration: 0.3,
                            delay: 0.2,
                            ease: "easeOut",
                          },
                        }}
                        exit={{ opacity: 0 }}
                        className="mt-4 flex flex-wrap items-center gap-2"
                      >
                        <span className="text-[10px] sm:text-xs text-white/25 font-mono tracking-wide uppercase">
                          Servicii relaționate:
                        </span>
                        <a
                          href="#services"
                          className={[
                            "px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium",
                            "bg-nexus-accent/10 border border-nexus-accent/20 text-nexus-glow/70",
                            "hover:bg-nexus-accent/20 hover:border-nexus-glow/35 hover:text-nexus-glow",
                            "transition-all duration-200",
                          ].join(" ")}
                        >
                          Vezi serviciile
                        </a>
                      </motion.div>
                    )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Componenta FAQ principală
   ───────────────────────────────────────────── */

export default function FAQ({
  settings: initialSettings,
  className = "",
  id,
}: FAQProps) {
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
          console.warn("[FAQ] Fetch eșuat — se folosește fallback.");
          setSettings(fallbackSettings);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  /* ── Îmbogățire FAQ items ── */
  const enriched = useMemo(
    () => enrichFAQItems(settings?.faq ?? []),
    [settings],
  );

  /* ── Categorii derivate ── */
  const categories = useMemo<FAQCategory[]>(() => {
    const map = new Map<string, number>();
    for (const item of enriched) {
      map.set(item.derivedCategory, (map.get(item.derivedCategory) ?? 0) + 1);
    }
    const list: FAQCategory[] = Array.from(map.entries()).map(
      ([key, count]) => ({
        key,
        label: getCategoryLabel(key),
        count,
      }),
    );
    list.sort((a, b) => b.count - a.count);
    const allCat: FAQCategory = {
      key: ALL_CATEGORY_KEY,
      label: "Toate",
      count: enriched.length,
    };
    return [allCat, ...list];
  }, [enriched]);

  /* ── Filtru activ + căutare ── */
  const [activeCategory, setActiveCategory] =
    useState<string>(ALL_CATEGORY_KEY);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFAQ = useMemo(() => {
    let result = enriched;

    // Filtru categorie
    if (activeCategory !== ALL_CATEGORY_KEY) {
      result = result.filter((f) => f.derivedCategory === activeCategory);
    }

    // Filtru căutare
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      result = result.filter((f) => f.searchableText.includes(q));
    }

    return result;
  }, [enriched, activeCategory, searchQuery]);

  /* ── Stare întrebări expandate ── */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleFAQ = useCallback((faqId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(faqId)) {
        next.delete(faqId);
      } else {
        next.add(faqId);
      }
      return next;
    });
  }, []);

  /* Expand all / Collapse all */
  const expandAll = useCallback(() => {
    setExpandedIds(new Set(filteredFAQ.map((f) => f.id)));
  }, [filteredFAQ]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  /* ── Loading skeleton ── */
  if (!settings) {
    return (
      <section
        id={id}
        className={`relative py-section overflow-hidden ${className}`}
      >
        <div className="nexus-container">
          {/* Skeleton header */}
          <div className="text-center space-y-4 mb-12">
            <div className="mx-auto h-8 w-36 bg-white/5 rounded animate-pulse" />
            <div className="mx-auto h-4 w-80 bg-white/5 rounded animate-pulse" />
          </div>

          {/* Skeleton items */}
          <div className="max-w-3xl mx-auto space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-glass bg-glass-light border border-glass-border p-6 h-20 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-white/5 rounded mb-2" />
                    <div className="h-3 w-1/3 bg-white/5 rounded" />
                  </div>
                </div>
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
        className="absolute inset-0 z-0 bg-cover bg-center bg-fixed opacity-[0.03]"
        style={{ backgroundImage: "url('/images/services-bg.jpg')" }}
      />

      {/* Gradient radial decorativ */}
      <div
        aria-hidden="true"
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.08)_0%,transparent_70%)] pointer-events-none z-0"
      />

      {/* Particule decorative */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-28 right-[12%] w-1 h-1 bg-gold/18 rounded-full animate-float" />
        <div className="absolute bottom-36 left-[8%] w-1.5 h-1.5 bg-nexus-glow/15 rounded-full animate-float-delay" />
        <div className="absolute top-1/2 right-[8%] w-1 h-1 bg-gold/12 rounded-full animate-float" />
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
          className="text-center mb-10 sm:mb-14"
        >
          {/* Badge */}
          <span className="nexus-badge text-xs sm:text-sm py-1.5 px-4 mb-4 inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faComments} className="w-3 h-3 text-gold" />
            Întrebări frecvente
          </span>

          {/* Titlu */}
          <h2 className="mt-5 font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Ai{" "}
            <span className="text-nexus-gradient">întrebări?</span>
          </h2>

          {/* Subtitlu */}
          <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            Am adunat răspunsurile la cele mai frecvente întrebări. Dacă nu
            găsești ce cauți,{" "}
            <a
              href="#contact"
              className="text-nexus-glow hover:text-gold-light transition-colors underline underline-offset-4 decoration-nexus-glow/20 hover:decoration-gold-light/40"
            >
              scrie-ne direct
            </a>
            .
          </p>
        </motion.div>

        {/* ═════════════════════════════════════════
            BARĂ CĂUTARE + FILTRE
            ═════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-3xl mx-auto mb-8 sm:mb-10"
        >
          {/* Câmp căutare */}
          <div className="relative mb-5 sm:mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FontAwesomeIcon
                icon={faSearch}
                className="w-4 h-4 text-white/25"
              />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută o întrebare..."
              aria-label="Caută în întrebări frecvente"
              className={[
                "glass-input w-full pl-11 pr-10 py-3 sm:py-3.5",
                "text-sm sm:text-base",
                "transition-all duration-300",
              ].join(" ")}
            />
            {/* Buton ștergere căutare */}
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Șterge căutarea"
                className={[
                  "absolute inset-y-0 right-0 pr-4 flex items-center",
                  "text-white/30 hover:text-white/60 transition-colors",
                ].join(" ")}
              >
                <FontAwesomeIcon icon={faTimes} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtre categorii */}
          {categories.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {categories.map((cat, idx) => {
                const isActive = activeCategory === cat.key;
                const catIcon = getCategoryIcon(cat.key);
                return (
                  <motion.button
                    key={cat.key}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.25,
                      delay: idx * 0.04,
                      ease: "easeOut",
                    }}
                    onClick={() => setActiveCategory(cat.key)}
                    className={[
                      "relative px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium",
                      "transition-all duration-300 ease-out",
                      "whitespace-nowrap select-none",
                      "flex items-center gap-1.5",
                      "focus-visible:outline-2 focus-visible:outline-nexus-glow",
                      isActive
                        ? "bg-nexus-accent/30 text-white border border-nexus-glow/40 shadow-[0_0_18px_rgba(108,60,225,0.30)]"
                        : "bg-white/4 text-white/55 border border-white/8 hover:bg-white/8 hover:text-white/80 hover:border-white/14",
                    ].join(" ")}
                  >
                    <FontAwesomeIcon
                      icon={catIcon}
                      className={[
                        "w-3 h-3",
                        isActive ? "text-nexus-glow" : "text-white/30",
                      ].join(" ")}
                    />
                    <span>{cat.label}</span>
                    <span
                      className={[
                        "ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold",
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-white/6 text-white/40",
                      ].join(" ")}
                    >
                      {cat.count}
                    </span>

                    {isActive && (
                      <motion.div
                        layoutId="faqFilterIndicator"
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-nexus-glow/60"
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
            </div>
          )}

          {/* Expand / Collapse all + contor rezultate */}
          <div className="flex items-center justify-between mt-4">
            <motion.p
              key={`${activeCategory}-${searchQuery}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="text-xs text-white/30 font-mono"
            >
              {filteredFAQ.length} răspuns
              {filteredFAQ.length !== 1 ? "uri" : ""} găsit
              {filteredFAQ.length !== 1 ? "e" : ""}
              {searchQuery && ` pentru "${searchQuery}"`}
            </motion.p>

            {filteredFAQ.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className={[
                    "text-[10px] sm:text-xs font-medium",
                    "text-nexus-glow/55 hover:text-nexus-glow",
                    "transition-colors duration-200",
                    "underline underline-offset-4 decoration-nexus-glow/15 hover:decoration-nexus-glow/40",
                  ].join(" ")}
                >
                  Deschide toate
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className={[
                    "text-[10px] sm:text-xs font-medium",
                    "text-white/30 hover:text-white/55",
                    "transition-colors duration-200",
                    "underline underline-offset-4 decoration-white/10 hover:decoration-white/30",
                  ].join(" ")}
                >
                  Închide toate
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═════════════════════════════════════════
            LISTA ÎNTREBĂRI (ACORDEON)
            ═════════════════════════════════════════ */}
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="popLayout">
            {filteredFAQ.length > 0 ? (
              <div className="space-y-4 sm:space-y-5">
                {filteredFAQ.map((faq, idx) => (
                  <motion.div
                    key={faq.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -8 }}
                    transition={{
                      duration: 0.35,
                      delay: idx * 0.04,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                  >
                    <FAQAccordionItem
                      faq={faq}
                      isOpen={expandedIds.has(faq.id)}
                      onToggle={toggleFAQ}
                      index={idx}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Stare goală */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 sm:py-20"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-white/4 border border-white/6 flex items-center justify-center mb-4">
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="w-6 h-6 text-white/15"
                  />
                </div>
                <p className="text-white/25 text-sm sm:text-base font-medium">
                  Nicio întrebare găsită.
                </p>
                <p className="text-white/15 text-xs sm:text-sm mt-1">
                  Încearcă un alt termen de căutare sau{" "}
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCategory(ALL_CATEGORY_KEY);
                    }}
                    className="text-nexus-glow/50 hover:text-nexus-glow transition-colors underline underline-offset-4"
                  >
                    resetează filtrele
                  </button>
                  .
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═════════════════════════════════════════
            CTA FINAL
            ═════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="mt-14 sm:mt-18 text-center"
        >
          <div className="inline-block glass-heavy rounded-glass-lg p-6 sm:p-8 border border-white/8 max-w-xl">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-nexus-accent/15 border border-nexus-glow/25 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="w-4 h-4 text-nexus-glow"
                />
              </div>
              <p className="text-white/70 text-sm sm:text-base font-medium">
                Nu ai găsit răspunsul?
              </p>
            </div>
            <p className="text-white/40 text-xs sm:text-sm mb-5 leading-relaxed">
              Suntem aici să te ajutăm. Trimite-ne un mesaj și îți răspundem în
              cel mult 24 de ore.
            </p>
            <a
              href="#contact"
              className="glass-btn px-6 py-3 sm:px-8 sm:py-4 group text-sm sm:text-base"
            >
              <FontAwesomeIcon
                icon={faComments}
                className="w-4 h-4 transition-transform duration-300 group-hover:scale-110"
              />
              <span>Contactează-ne</span>
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
  enrichFAQItems,
  deriveCategory,
  getCategoryLabel,
  getCategoryIcon,
  FAQAccordionItem,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  ALL_CATEGORY_KEY,
};
export type { EnrichedFAQ, FAQCategory, FAQAccordionItemProps };