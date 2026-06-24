"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faCode,
  faEye,
  faFilter,
  faFolderOpen,
  faTag,
  faChevronRight,
  faArrowRight,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { fetchSettings } from "../lib/api";
import type { NexusSettings } from "../lib/fallback";
import { fallbackSettings } from "../lib/fallback";
import type { PortfolioItem } from "../lib/types";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

export interface PortfolioProps {
  /** Setări preîncărcate (opțional) */
  settings?: NexusSettings;
  /** Clasă CSS suplimentară */
  className?: string;
  /** ID DOM */
  id?: string;
}

/** Categorie derivată pentru filtrare */
interface PortfolioCategory {
  key: string;
  label: string;
  count: number;
}

const ALL_CATEGORY_KEY = "all";

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function deriveCategories(
  items: readonly PortfolioItem[],
): PortfolioCategory[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const cat = item.category || "Altele";
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  const list: PortfolioCategory[] = Array.from(map.entries())
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count);

  const allCat: PortfolioCategory = {
    key: ALL_CATEGORY_KEY,
    label: "Toate",
    count: items.length,
  };
  return [allCat, ...list];
}

/* ─────────────────────────────────────────────
   Sub-componenta: Card de proiect
   ───────────────────────────────────────────── */

interface ProjectCardProps {
  project: PortfolioItem;
  index: number;
}

function ProjectCard({ project, index }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const thumbnailUrl =
    project.thumbnailUrl ??
    project.media.find((m) => m.type === "image")?.url ??
    "/images/portfolio-1.jpg";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: [0.23, 1, 0.32, 1],
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-glass-lg overflow-hidden cursor-pointer"
    >
      {/* ═══ Container imagine cu aspect ratio ═══ */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] overflow-hidden">
        {/* Imaginea proiectului */}
        <img
          src={thumbnailUrl}
          alt={project.media.find((m) => m.type === "image")?.alt ?? project.title}
          loading="lazy"
          className={[
            "w-full h-full object-cover transition-all duration-700 ease-out",
            isHovered ? "scale-110 saturate-110" : "scale-100 saturate-100",
          ].join(" ")}
        />

        {/* ═══ Overlay glassmorphism la hover ═══ */}
        <div
          className={[
            "absolute inset-0 z-10 transition-all duration-500 ease-out",
            "flex flex-col justify-end p-5 sm:p-6",
            isHovered
              ? "opacity-100"
              : "opacity-0",
          ].join(" ")}
        >
          {/* Fundal glassmorphism */}
          <div className="absolute inset-0 bg-gradient-to-t from-nexus-dark/95 via-nexus-dark/75 to-transparent" />

          {/* Strat glass blur suplimentar */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(13, 10, 26, 0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Conținut overlay */}
          <div className="relative z-20 flex flex-col gap-3">
            {/* Categorie badge */}
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={
                isHovered
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 8 }
              }
              transition={{ duration: 0.3, delay: 0.05 }}
              className="self-start px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gold/15 border border-gold/25 text-gold-light tracking-wide"
            >
              {project.category}
            </motion.span>

            {/* Titlu */}
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={
                isHovered
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 10 }
              }
              transition={{ duration: 0.35, delay: 0.1 }}
              className="font-heading text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight"
            >
              {project.title}
            </motion.h3>

            {/* Subtitlu */}
            {project.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={
                  isHovered
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 8 }
                }
                transition={{ duration: 0.35, delay: 0.14 }}
                className="text-sm text-white/55"
              >
                {project.subtitle}
              </motion.p>
            )}

            {/* Descriere */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={
                isHovered
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 8 }
              }
              transition={{ duration: 0.35, delay: 0.16 }}
              className="text-xs sm:text-sm text-white/55 leading-relaxed line-clamp-3"
            >
              {project.description}
            </motion.p>

            {/* Tags */}
            {project.tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={
                  isHovered
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 8 }
                }
                transition={{ duration: 0.35, delay: 0.2 }}
                className="flex flex-wrap gap-1.5"
              >
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-white/6 border border-white/8 text-[10px] sm:text-xs text-white/45 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </motion.div>
            )}

            {/* Butoane de acțiune */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={
                isHovered
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 8 }
              }
              transition={{ duration: 0.35, delay: 0.24 }}
              className="flex flex-wrap gap-3 mt-1"
            >
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={[
                    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg",
                    "text-xs sm:text-sm font-semibold",
                    "bg-nexus-accent/25 border border-nexus-accent/30 text-white",
                    "hover:bg-nexus-accent/40 hover:border-nexus-glow/50",
                    "hover:shadow-[0_0_18px_rgba(108,60,225,0.30)]",
                    "transition-all duration-300",
                  ].join(" ")}
                >
                  <FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5" />
                  <span>Live Demo</span>
                  <FontAwesomeIcon
                    icon={faArrowUpRightFromSquare}
                    className="w-2.5 h-2.5 opacity-60"
                  />
                </a>
              )}

              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={[
                    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg",
                    "text-xs sm:text-sm font-semibold",
                    "bg-white/6 border border-white/10 text-white/75",
                    "hover:bg-white/12 hover:border-white/20 hover:text-white",
                    "transition-all duration-300",
                  ].join(" ")}
                >
                  <FontAwesomeIcon icon={faCode} className="w-3.5 h-3.5" />
                  <span>Cod Sursă</span>
                </a>
              )}
            </motion.div>
          </div>
        </div>

        {/* ═══ Border glow la hover ═══ */}
        <div
          className={[
            "absolute inset-0 z-[5] rounded-[inherit] pointer-events-none transition-all duration-500",
            "border-2",
            isHovered
              ? "border-nexus-glow/30 shadow-[inset_0_0_40px_rgba(108,60,225,0.08)]"
              : "border-transparent",
          ].join(" ")}
        />

        {/* ═══ Highlight edge (efect sticlă) ═══ */}
        <div className="absolute top-0 left-0 right-0 h-px z-[6] bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>

      {/* ═══ Bandă informativă jos (vizibilă mereu) ═══ */}
      <div className="relative z-10 bg-glass-medium border-t border-white/6 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-heading text-sm sm:text-base font-bold text-white truncate">
              {project.title}
            </h4>
            <span className="text-[10px] sm:text-xs text-white/35 font-mono tracking-wide">
              {project.category}
            </span>
          </div>

          <div className="flex items-center gap-1 text-white/25 group-hover:text-white/50 transition-colors duration-300">
            <span className="text-[10px] sm:text-xs font-medium hidden xs:inline">
              Detalii
            </span>
            <FontAwesomeIcon
              icon={faChevronRight}
              className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Componenta principală: Portfolio
   ───────────────────────────────────────────── */

export default function Portfolio({
  settings: initialSettings,
  className = "",
  id,
}: PortfolioProps) {
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
          console.warn("[Portfolio] Fetch eșuat — se folosește fallback.");
          setSettings(fallbackSettings);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  /* ── Proiecte active sortate după order ── */
  const activeProjects = useMemo(() => {
    if (!settings?.portfolio) return [];
    return [...settings.portfolio]
      .filter((p) => p.isActive)
      .sort((a, b) => a.order - b.order);
  }, [settings]);

  /* ── Categorii derivate (cu număr) ── */
  const categories = useMemo(
    () => deriveCategories(activeProjects),
    [activeProjects],
  );

  /* ── Filtru activ ── */
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_KEY);

  const filteredProjects = useMemo(() => {
    if (activeCategory === ALL_CATEGORY_KEY) return activeProjects;
    return activeProjects.filter((p) => p.category === activeCategory);
  }, [activeProjects, activeCategory]);

  /* ── Proiecte evidențiate (featured) ── */
  const featuredProjects = useMemo(
    () => activeProjects.filter((p) => p.isFeatured),
    [activeProjects],
  );

  /* ── Loading state ── */
  if (!settings) {
    return (
      <section
        id={id}
        className={`relative py-section overflow-hidden ${className}`}
      >
        <div className="nexus-container">
          {/* Skeleton header */}
          <div className="text-center space-y-4 mb-12">
            <div className="mx-auto h-8 w-44 bg-white/5 rounded animate-pulse" />
            <div className="mx-auto h-4 w-80 bg-white/5 rounded animate-pulse" />
          </div>

          {/* Skeleton grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-glass-lg bg-glass-light border border-glass-border overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-white/3" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 bg-white/5 rounded" />
                  <div className="h-3 w-1/3 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (activeProjects.length === 0) {
    return null; // Fără proiecte, nu randăm secțiunea
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
        style={{ backgroundImage: "url('/images/portfolio-bg.jpg')" }}
      />

      {/* Gradient radial decorativ */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.07)_0%,transparent_70%)] pointer-events-none z-0"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.07)_0%,transparent_70%)] pointer-events-none z-0"
      />

      {/* Particule plutitoare decorative */}
      <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-24 right-[12%] w-1 h-1 bg-gold/18 rounded-full animate-float" />
        <div className="absolute top-1/3 left-[6%] w-1.5 h-1.5 bg-nexus-glow/12 rounded-full animate-float-delay" />
        <div className="absolute bottom-28 right-[10%] w-1 h-1 bg-gold/14 rounded-full animate-float" />
        <div className="absolute bottom-1/3 left-[15%] w-1 h-1 bg-nexus-accent/10 rounded-full animate-float-delay" />
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
            <FontAwesomeIcon icon={faFolderOpen} className="w-3 h-3 text-gold" />
            Proiecte realizate
          </span>

          {/* Titlu */}
          <h2 className="mt-5 font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Portofoliul{" "}
            <span className="text-nexus-gradient">Nostru</span>
          </h2>

          {/* Subtitlu */}
          <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            Fiecare proiect este o dovadă a pasiunii pentru tehnologie și design.
            De la platforme enterprise până la aplicații mobile, construim
            experiențe digitale care contează.
          </p>
        </motion.div>

        {/* ═════════════════════════════════════════
            PROIECTE EVIDENȚIATE (FEATURED)
            ═════════════════════════════════════════ */}
        {featuredProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="mb-12 sm:mb-16"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              {featuredProjects.slice(0, 2).map((project, idx) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={idx}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═════════════════════════════════════════
            BARĂ FILTRE ANIMATĂ
            ═════════════════════════════════════════ */}
        {categories.length > 2 && (
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

            {/* Container filtre */}
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
                          ? "bg-gold/18 text-gold-light border border-gold/35 shadow-[0_0_18px_rgba(212,175,55,0.20)]"
                          : "bg-white/4 text-white/55 border border-white/8 hover:bg-white/8 hover:text-white/80 hover:border-white/14",
                      ].join(" ")}
                    >
                      <span>{cat.label}</span>
                      {/* Badge cu număr */}
                      <span
                        className={[
                          "ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold",
                          isActive
                            ? "bg-gold/25 text-gold-light"
                            : "bg-white/6 text-white/40",
                        ].join(" ")}
                      >
                        {cat.count}
                      </span>

                      {/* Indicator activ */}
                      {isActive && (
                        <motion.div
                          layoutId="activePortfolioFilterIndicator"
                          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gold/50"
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
              {filteredProjects.length} proiect
              {filteredProjects.length !== 1 ? "e" : ""}
              {activeCategory !== ALL_CATEGORY_KEY &&
                ` în categoria "${activeCategory}"`}
            </motion.p>
          </motion.div>
        )}

        {/* ═════════════════════════════════════════
            GRID PROIECTE
            ═════════════════════════════════════════ */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, idx) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={idx}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* ═════════════════════════════════════════
            STARE GOL (după filtrare)
            ═════════════════════════════════════════ */}
        {filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 sm:py-20"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-white/4 border border-white/6 flex items-center justify-center mb-4">
              <FontAwesomeIcon
                icon={faFolderOpen}
                className="w-6 h-6 text-white/20"
              />
            </div>
            <p className="text-white/30 text-sm sm:text-base font-medium">
              Niciun proiect în această categorie.
            </p>
            <button
              onClick={() => setActiveCategory(ALL_CATEGORY_KEY)}
              className="mt-3 text-xs sm:text-sm text-gold-light hover:text-gold transition-colors font-medium underline underline-offset-4"
            >
              Arată toate proiectele
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
            <p className="text-white/65 text-sm sm:text-base mb-5 leading-relaxed">
              Ai un proiect în minte?{" "}
              <span className="text-white font-semibold">
                Următorul din portofoliu poate fi al tău
              </span>{" "}
              — hai să creăm împreună ceva remarcabil.
            </p>
            <a
              href="#contact"
              className="glass-btn-gold px-6 py-3 sm:px-8 sm:py-4 group text-sm sm:text-base"
            >
              <FontAwesomeIcon
                icon={faArrowRight}
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              />
              <span>Începe un proiect</span>
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

export { ProjectCard, deriveCategories };
export type { PortfolioCategory };
