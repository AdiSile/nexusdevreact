"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Particles from "./Particles";
import { fetchSettings } from "../lib/api";
import type { NexusSettings } from "../lib/fallback";
import { fallbackSettings } from "../lib/fallback";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

export interface HeroProps {
  /** Setări preîncărcate (opțional – dacă nu, se face fetch) */
  settings?: NexusSettings;
  /** Clasă CSS suplimentară pe secțiune */
  className?: string;
  /** ID DOM */
  id?: string;
}

/* ─────────────────────────────────────────────
   Statistici derivate din settings
   ───────────────────────────────────────────── */

interface HeroStat {
  value: string;
  label: string;
}

function deriveStats(s: NexusSettings): HeroStat[] {
  const serviceCount = s.services.filter((svc) => svc.isActive).length;
  const processCount = s.process.length;
  const portfolioCount = s.portfolio.filter((p) => p.isActive).length;

  return [
    { value: `${serviceCount}+`, label: "Servicii" },
    { value: `${processCount}`, label: "Etape de lucru" },
    { value: `${portfolioCount}+`, label: "Proiecte" },
    { value: "100%", label: "Remote Global" },
  ];
}

/* ─────────────────────────────────────────────
   Componenta Hero
   ───────────────────────────────────────────── */

export default function Hero({
  settings: initialSettings,
  className = "",
  id,
}: HeroProps) {
  /* ── Ref pentru secțiune (ancoră scroll) ── */
  const sectionRef = useRef<HTMLElement>(null);

  /* ── Stare settings ── */
  const [settings, setSettings] = useState<NexusSettings | null>(
    initialSettings ?? null,
  );

  /* ── Fetch settings dacă nu sunt furnizate ── */
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
          console.warn("[Hero] Fetch settings eșuat – se folosește fallback.");
          setSettings(fallbackSettings);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  /* ── Scroll-driven animations ── */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Video: fade out + slight scale în timpul scroll-ului
  const videoOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.25]);
  const videoScale = useTransform(scrollYProgress, [0, 0.7], [1, 1.08]);

  // Overlay: devine mai întunecat la scroll
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.6], [0.55, 0.85]);

  // Conținut: se deplasează în sus și dispare
  const contentY = useTransform(scrollYProgress, [0, 0.55], [0, 70]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);

  /* ── Extragere date studio ── */
  const studio = settings?.studio;
  const stats = settings ? deriveStats(settings) : [];

  /* ── Stare loading / fallback ── */
  if (!studio) {
    return (
      <section
        ref={sectionRef}
        id={id}
        className={`relative min-h-screen flex items-center justify-center overflow-hidden bg-nexus-dark ${className}`}
      >
        {/* Video placeholder încărcare */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-nexus-medium to-nexus-dark" />

        {/* Particles chiar și în loading */}
        <Particles globalAlpha={0.6} className="z-[1]" />

        {/* Spinner central */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full border-2 border-nexus-accent/30 border-t-nexus-glow animate-spin" />
          <p className="text-white/40 text-sm font-mono tracking-widest uppercase">
            Se încarcă...
          </p>
        </motion.div>
      </section>
    );
  }

  /* ── Split nume studio (pentru efect gradient pe al doilea cuvânt) ── */
  const nameWords = studio.name.split(" ");
  const firstName = nameWords[0] ?? studio.name;
  const restName = nameWords.slice(1).join(" ");

  /* ── Render ── */
  return (
    <section
      ref={sectionRef}
      id={id}
      className={`relative min-h-screen flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* ═════════════════════════════════════════
          FUNDAL VIDEO
          ═════════════════════════════════════════ */}
      <motion.div
        style={{ opacity: videoOpacity, scale: videoScale }}
        className="absolute inset-0 z-0"
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={studio.heroPosterUrl}
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // Fallback silent: afișează doar poster-ul
            const videoEl = e.currentTarget;
            videoEl.style.display = "none";
          }}
        >
          <source src={studio.heroVideoUrl} type="video/mp4" />
          {/* Fallback text pentru browsere fără suport video */}
          Your browser does not support the video tag.
        </video>

        {/* Poster static ca fallback (vizibil când video-ul nu e încărcat) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${studio.heroPosterUrl}')` }}
        />
      </motion.div>

      {/* ═════════════════════════════════════════
          OVERLAY ÎNTUNECAT
          ═════════════════════════════════════════ */}
      <motion.div
        style={{ opacity: overlayOpacity }}
        className="absolute inset-0 z-[1] pointer-events-none"
        // Fundal semi-transparent în gradient
      >
        <div className="absolute inset-0 bg-gradient-to-b from-nexus-dark/70 via-nexus-dark/55 to-nexus-dark/85" />
        {/* Vignetă radială */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(13,10,26,0.7)_100%)]" />
      </motion.div>

      {/* ═════════════════════════════════════════
          PARTICULE (între video și conținut)
          ═════════════════════════════════════════ */}
      <Particles
        globalAlpha={0.7}
        className="z-[2]"
        id="hero-particles"
      />

      {/* ═════════════════════════════════════════
          CONȚINUT PRINCIPAL
          ═════════════════════════════════════════ */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 nexus-container text-center flex flex-col items-center w-full"
      >
        {/* ── Badge an fondat / promovare ── */}
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
        >
          <span className="nexus-badge text-xs sm:text-sm py-1.5 px-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-light opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
            </span>
            {studio.founded ? `Fondat în ${studio.founded}` : "Nexus Dev Studio"}
            {" · "}
            Disponibil remote global
          </span>
        </motion.div>

        {/* ── Titlu principal ── */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.2,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="mt-6 font-heading text-4xl xs:text-5xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight leading-[1.05] max-w-6xl"
        >
          <span className="text-white">{firstName}</span>
          {restName && (
            <>
              {" "}
              <span className="text-nexus-gradient">{restName}</span>
            </>
          )}
        </motion.h1>

        {/* ── Subtitlu / Tagline ── */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.65,
            delay: 0.38,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="mt-6 sm:mt-8 text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/75 max-w-4xl leading-relaxed font-medium"
        >
          {studio.tagline}
        </motion.p>

        {/* ── Descriere ── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.52,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-white/50 max-w-3xl leading-relaxed"
        >
          {studio.description}
        </motion.p>

        {/* ── CTA Buttons ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.7,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {/* CTA Primar – buton mov */}
          <a
            href="#contact"
            className="glass-btn px-8 py-4 text-sm sm:text-base group"
          >
            <svg
              className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
            <span>Începe un proiect</span>
          </a>

          {/* CTA Secundar – buton auriu */}
          <a
            href="#services"
            className="glass-btn-gold px-8 py-4 text-sm sm:text-base group"
          >
            <svg
              className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
            <span>Vezi serviciile</span>
          </a>
        </motion.div>

        {/* ── Statistici / Social proof ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.9,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="mt-12 sm:mt-16 flex flex-wrap justify-center gap-x-8 sm:gap-x-12 gap-y-6"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center min-w-[80px]"
            >
              <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-nexus-gradient font-heading">
                {stat.value}
              </span>
              <span className="text-xs sm:text-sm text-white/45 mt-1.5 font-medium tracking-wide uppercase">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* ── Scroll indicator ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-12 sm:mt-16 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-7 h-11 rounded-full border-2 border-white/15 flex items-start justify-center p-1.5"
          >
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-1.5 h-3 rounded-full bg-white/55"
            />
          </motion.div>
          <p className="text-[10px] sm:text-xs text-white/25 tracking-widest uppercase font-medium">
            Scroll pentru a explora
          </p>
        </motion.div>
      </motion.div>

      {/* ═════════════════════════════════════════
          GRADIENT LA BAZA PENTRU TRANZIȚIE LINĂ
          ═════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 z-[2] h-32 sm:h-48 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(13,10,26,0.7) 50%, #0D0A1A 100%)",
        }}
      />
    </section>
  );
}

/* ─────────────────────────────────────────────
   Exporturi denumite suplimentare
   ───────────────────────────────────────────── */

export { deriveStats };
export type { HeroStat };