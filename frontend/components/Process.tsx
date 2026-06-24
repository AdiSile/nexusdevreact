"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCompass,
  faPencil,
  faCode,
  faVial,
  faRocket,
  faChevronRight,
  faCheckCircle,
  faClock,
  faArrowRight,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { fetchSettings } from "../lib/api";
import type { NexusSettings } from "../lib/fallback";
import { fallbackSettings } from "../lib/fallback";
import type { ProcessStep } from "../lib/types";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

export interface ProcessProps {
  /** Setări preîncărcate (opțional) */
  settings?: NexusSettings;
  /** Clasă CSS suplimentară */
  className?: string;
  /** ID DOM */
  id?: string;
}

/* ─────────────────────────────────────────────
   Icon map pentru pașii procesului
   ───────────────────────────────────────────── */

const ICON_MAP: Record<string, IconDefinition> = {
  "fa-compass": faCompass,
  "fa-pencil": faPencil,
  "fa-code": faCode,
  "fa-vial": faVial,
  "fa-rocket": faRocket,
};

/** Iconițe de rezervă per pas (dacă icon din date nu e găsit) */
const FALLBACK_ICONS: IconDefinition[] = [
  faCompass,
  faPencil,
  faCode,
  faVial,
  faRocket,
];

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function resolveIcon(iconName?: string, fallbackIdx?: number): IconDefinition {
  if (iconName && ICON_MAP[iconName]) {
    return ICON_MAP[iconName];
  }
  const idx = fallbackIdx ?? 0;
  return FALLBACK_ICONS[idx % FALLBACK_ICONS.length];
}

/* ─────────────────────────────────────────────
   Sub-componenta: Un singur pas din timeline
   ───────────────────────────────────────────── */

interface TimelineStepProps {
  step: ProcessStep;
  index: number;
  totalSteps: number;
  isEven: boolean;
}

function TimelineStep({ step, index, totalSteps, isEven }: TimelineStepProps) {
  const icon = resolveIcon(step.icon, index);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.55,
        delay: index * 0.12,
        ease: [0.23, 1, 0.32, 1],
      }}
      className={[
        "relative flex items-center w-full",
        /* Pe mobil: totul stânga. Pe glass (≥769px): alternăm */
        "flex-row",
        "glass:flex-row",
        isEven ? "glass:flex-row-reverse" : "",
      ].join(" ")}
    >
      {/* ═══ Conținut card (stânga sau dreapta în funcție de paritate) ═══ */}
      <div
        className={[
          "relative z-10 w-full glass:w-1/2",
          isEven ? "glass:pl-10" : "glass:pr-10",
          "pb-10 sm:pb-14",
        ].join(" ")}
      >
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={[
            "group relative rounded-glass-lg p-5 sm:p-6 lg:p-7",
            "bg-glass-light border border-white/6",
            "transition-all duration-500 ease-out",
            "hover:bg-glass-medium hover:border-white/12",
            "hover:shadow-nexus-card",
          ].join(" ")}
        >
          {/* Highlight-edge glass effect */}
          <div className="glass-highlight rounded-[inherit]">
            {/* ═══ Header: Număr + Icon + Titlu ═══ */}
            <div className="flex items-center gap-4 mb-4">
              {/* Număr pas cu inel animat */}
              <div className="relative flex-shrink-0">
                <div
                  className={[
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center",
                    "bg-nexus-accent/15 border-2 border-nexus-accent/30",
                    "transition-all duration-500",
                    "group-hover:border-nexus-glow/50 group-hover:bg-nexus-accent/25",
                    "group-hover:shadow-[0_0_20px_rgba(108,60,225,0.25)]",
                  ].join(" ")}
                >
                  <span className="font-heading text-lg sm:text-xl font-extrabold text-nexus-glow">
                    {String(step.stepNumber).padStart(2, "0")}
                  </span>
                </div>

                {/* Inel exterior animat (pulse) */}
                <div className="absolute -inset-1.5 rounded-full border border-nexus-accent/20 opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none transition-opacity duration-300" />
              </div>

              {/* Icon container */}
              <div
                className={[
                  "flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center",
                  "bg-gold/8 border border-gold/15",
                  "transition-all duration-500",
                  "group-hover:bg-gold/14 group-hover:border-gold/25",
                  "group-hover:shadow-[0_0_14px_rgba(212,175,55,0.12)]",
                ].join(" ")}
              >
                <FontAwesomeIcon
                  icon={icon}
                  className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-gold-light"
                />
              </div>

              {/* Titlu */}
              <h3 className="font-heading text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight">
                {step.title}
              </h3>
            </div>

            {/* ═══ Descriere ═══ */}
            <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-4">
              {step.description}
            </p>

            {/* ═══ Informații suplimentare (duration, deliverables, tools) ═══ */}
            <div className="flex flex-wrap gap-3">
              {/* Durată estimată */}
              {step.duration && (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/35 font-mono">
                  <FontAwesomeIcon
                    icon={faClock}
                    className="w-3 h-3 text-nexus-glow/50"
                  />
                  {step.duration}
                </span>
              )}

              {/* Deliverables count */}
              {step.deliverables && step.deliverables.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/35 font-mono">
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="w-3 h-3 text-gold/50"
                  />
                  {step.deliverables.length} livrabil
                  {step.deliverables.length !== 1 ? "e" : ""}
                </span>
              )}
            </div>

            {/* ═══ Tools (dacă există) ═══ */}
            {step.tools && step.tools.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex flex-wrap gap-1.5">
                  {step.tools.map((tool) => (
                    <span
                      key={tool}
                      className="px-2 py-0.5 rounded-full bg-white/4 text-[10px] text-white/30 font-medium border border-white/6"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═══ Săgeată către timeline (doar pe desktop) ═══ */}
          <div
            className={[
              "hidden glass:block absolute top-1/2 -translate-y-1/2 z-20",
              isEven ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
            ].join(" ")}
          >
            <div
              className={[
                "w-5 h-5 rotate-45",
                "bg-nexus-accent/25 border border-nexus-accent/30",
                "transition-all duration-500",
                "group-hover:bg-nexus-accent/40 group-hover:border-nexus-glow/40",
              ].join(" ")}
            />
          </div>
        </motion.div>
      </div>

      {/* ═══ Nodul central (bulina de pe linie) ═══ */}
      <div
        className={[
          "absolute left-[18px] glass:left-1/2 glass:-translate-x-1/2 z-10",
          "top-0",
        ].join(" ")}
      >
        {/* Puls exterior */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: index * 0.12 + 0.2, duration: 0.6 }}
          className="absolute inset-0 rounded-full animate-ping bg-nexus-accent/20 pointer-events-none"
          style={{ width: "32px", height: "32px", left: "-6px", top: "-6px" }}
        />

        {/* Bulina principală */}
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 22,
            delay: index * 0.12 + 0.1,
          }}
          className={[
            "relative w-5 h-5 sm:w-6 sm:h-6 rounded-full z-10",
            "bg-nexus-dark border-2 border-nexus-accent/50",
            "shadow-[0_0_12px_rgba(108,60,225,0.30)]",
            "transition-all duration-500",
            "group-hover:border-nexus-glow group-hover:shadow-[0_0_22px_rgba(108,60,225,0.50)]",
          ].join(" ")}
        >
          {/* Punct central luminos */}
          <div className="absolute inset-1 rounded-full bg-nexus-glow/70" />
        </motion.div>
      </div>

      {/* ═══ Spațiu gol pe partea cealaltă (doar pe desktop) ═══ */}
      <div className="hidden glass:block glass:w-1/2" />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Componenta principală: Process
   ───────────────────────────────────────────── */

export default function Process({
  settings: initialSettings,
  className = "",
  id,
}: ProcessProps) {
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
          console.warn("[Process] Fetch eșuat — se folosește fallback.");
          setSettings(fallbackSettings);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  /* ── Pași sortați după stepNumber ── */
  const steps = useMemo(() => {
    if (!settings?.process) return [];
    return [...settings.process]
      .sort((a, b) => a.stepNumber - b.stepNumber);
  }, [settings]);

  /* ── Loading state ── */
  if (!settings) {
    return (
      <section
        id={id}
        className={`relative py-section overflow-hidden ${className}`}
      >
        <div className="nexus-container">
          {/* Skeleton header */}
          <div className="text-center space-y-4 mb-16">
            <div className="mx-auto h-8 w-40 bg-white/5 rounded animate-pulse" />
            <div className="mx-auto h-4 w-72 bg-white/5 rounded animate-pulse" />
          </div>

          {/* Skeleton timeline */}
          <div className="relative max-w-5xl mx-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center mb-10"
              >
                <div className="w-1/2 pr-10">
                  <div className="rounded-glass-lg bg-glass-light border border-white/5 p-6 h-40 animate-pulse">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-white/5" />
                      <div className="h-5 w-24 bg-white/5 rounded" />
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded mb-2" />
                    <div className="h-3 w-5/6 bg-white/5 rounded mb-2" />
                    <div className="h-3 w-2/3 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (steps.length === 0) {
    return null; // Fără pași, nu randăm secțiunea
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
        style={{ backgroundImage: "url('/images/process-bg.jpg')" }}
      />

      {/* Gradient radial decorativ */}
      <div
        aria-hidden="true"
        className="absolute top-1/3 left-0 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.08)_0%,transparent_70%)] pointer-events-none z-0"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-1/3 right-0 translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none z-0"
      />

      {/* Particule plutitoare */}
      <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-[8%] w-1 h-1 bg-gold/18 rounded-full animate-float" />
        <div className="absolute top-56 right-[10%] w-1.5 h-1.5 bg-nexus-glow/15 rounded-full animate-float-delay" />
        <div className="absolute bottom-40 left-[12%] w-1 h-1 bg-gold/14 rounded-full animate-float" />
        <div className="absolute bottom-28 right-[8%] w-1 h-1 bg-nexus-accent/12 rounded-full animate-float-delay" />
        <div className="absolute top-1/2 left-[4%] w-0.5 h-0.5 bg-white/10 rounded-full animate-float" />
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
          className="text-center mb-14 sm:mb-20"
        >
          {/* Badge */}
          <span className="nexus-badge text-xs sm:text-sm py-1.5 px-4 mb-4 inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faRocket} className="w-3 h-3 text-gold" />
            Proces transparent & eficient
          </span>

          {/* Titlu */}
          <h2 className="mt-5 font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Cum{" "}
            <span className="text-nexus-gradient">Lucrăm</span>
          </h2>

          {/* Subtitlu */}
          <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            Fiecare proiect urmează un proces bine definit, de la prima discuție
            până la lansare și suport continuu. Transparență totală, iterații
            rapide și calitate la fiecare pas.
          </p>
        </motion.div>

        {/* ═════════════════════════════════════════
            TIMELINE ANIMAT
            ═════════════════════════════════════════ */}
        <div className="relative max-w-5xl mx-auto">
          {/* ═══ Linia verticală centrală ═══ */}
          <div
            aria-hidden="true"
            className="absolute left-[18px] glass:left-1/2 glass:-translate-x-px top-0 bottom-0 z-[1] pointer-events-none"
          >
            {/* Linia principală */}
            <div className="w-0.5 h-full bg-gradient-to-b from-nexus-accent/40 via-gold/20 to-nexus-accent/40" />

            {/* Overlay animat pe linie (se umple la scroll) */}
            <motion.div
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-nexus-glow via-nexus-accent to-gold-light"
              initial={{ height: "0%" }}
              whileInView={{ height: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 2.5, ease: [0.23, 1, 0.32, 1] }}
              style={{ width: "2px", left: "-1px" }}
            />
          </div>

          {/* ═══ Pașii timeline-ului ═══ */}
          <div className="relative pl-10 glass:pl-0">
            {steps.map((step, idx) => (
              <TimelineStep
                key={step.id}
                step={step}
                index={idx}
                totalSteps={steps.length}
                isEven={idx % 2 === 1}
              />
            ))}
          </div>

          {/* ═══ Nodul final (lansare) ═══ */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 18,
              delay: steps.length * 0.12 + 0.15,
            }}
            className="relative z-10 flex justify-center"
          >
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-nexus-accent to-gold border-2 border-gold/40 shadow-[0_0_28px_rgba(212,175,55,0.25)]">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
              />
            </div>
          </motion.div>
        </div>

        {/* ═════════════════════════════════════════
            CTA FINAL
            ═════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="mt-14 sm:mt-20 text-center"
        >
          <div className="inline-block glass-heavy rounded-glass-lg p-6 sm:p-8 border border-white/8 max-w-xl">
            <p className="text-white/65 text-sm sm:text-base mb-5 leading-relaxed">
              Ai un proiect în minte?{" "}
              <span className="text-white font-semibold">
                Hai să discutăm
              </span>{" "}
              — îl transformăm în realitate pas cu pas, cu transparență totală
              și rezultate măsurabile.
            </p>
            <a
              href="#contact"
              className="glass-btn px-6 py-3 sm:px-8 sm:py-4 group text-sm sm:text-base"
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

export { TimelineStep, resolveIcon, ICON_MAP, FALLBACK_ICONS };