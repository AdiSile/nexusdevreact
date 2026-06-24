"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ═══════════════════════════════════════════════════════════════════════════
   Pagina 404 – Nexus Dev Studio
   Design glassmorphism premium cu countdown redirect automat
   ═══════════════════════════════════════════════════════════════════════════ */

const REDIRECT_SECONDS = 8;

export default function NotFoundPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [isHovering, setIsHovering] = useState(false);

  /* ── Countdown redirect automat (cu pauză la hover) ── */
  const redirectHome = useCallback(() => {
    router.push("/");
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) {
      redirectHome();
      return;
    }

    // Pauză când utilizatorul ține hover pe butonul principal
    if (isHovering) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, redirectHome, isHovering]);

  /* ── Handlere hover/focus pentru pauză countdown ── */
  const pauseCountdown = () => setIsHovering(true);
  const resumeCountdown = () => setIsHovering(false);

  /* ── Particule decorative statice (poziții deterministe) ── */
  const decorativeParticles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${(i * 37 + 13) % 100}%`,
    top: `${(i * 53 + 7) % 100}%`,
    size: 2 + (i % 4),
    opacity: 0.08 + (i % 5) * 0.03,
    delay: (i * 0.7) % 4,
    duration: 4 + (i % 3) * 2,
  }));

  return (
    <main className="relative min-h-screen bg-nexus-dark text-white overflow-hidden flex items-center justify-center">
      {/* ═══════════════════════════════════════════════
          FUNDAL – Imagine + overlay gradient
          ═══════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/404-bg.jpg')",
          filter: "brightness(0.35) saturate(0.6)",
        }}
      />

      {/* Overlay gradient radial + vignetă */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-nexus-dark/80 via-nexus-dark/60 to-nexus-dark/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(13,10,26,0.85)_100%)]" />
      </div>

      {/* ═══════════════════════════════════════════════
          PARTICULE DECORATIVE
          ═══════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        {decorativeParticles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-nexus-glow/30"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
            animate={{
              opacity: [p.opacity, p.opacity * 2.2, p.opacity],
              scale: [1, 1.8, 1],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          CONȚINUT PRINCIPAL – Glassmorphism
          ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 glass-heavy rounded-glass-lg p-8 sm:p-12 md:p-16 max-w-2xl w-full mx-4 text-center glass-highlight"
      >
        {/* ── Codul 404 cu efect gradient ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
          className="relative"
        >
          <span className="font-heading text-[8rem] sm:text-[10rem] md:text-[12rem] font-extrabold leading-none tracking-tighter text-nexus-gradient select-none">
            404
          </span>

          {/* Umbră decorativă în spatele cifrelor */}
          <span
            aria-hidden="true"
            className="absolute inset-0 font-heading text-[8rem] sm:text-[10rem] md:text-[12rem] font-extrabold leading-none tracking-tighter text-white/3 blur-xl select-none"
            style={{ transform: "translateY(4px)" }}
          >
            404
          </span>

          {/* Inele decorative animate */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full border border-white/5 pointer-events-none"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full border border-nexus-accent/8 pointer-events-none"
          />
        </motion.div>

        {/* ── Mesaj principal ── */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="mt-3 sm:mt-4 font-heading text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
        >
          Pagina nu a fost găsită
        </motion.h2>

        {/* ── Descriere ── */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-white/55 max-w-lg mx-auto leading-relaxed"
        >
          Se pare că această pagină a dispărut în neantul digital.
          Poate ai greșit adresa sau linkul pe care l-ai accesat nu mai
          este valabil.
        </motion.p>

        {/* ── Separator gradient ── */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.55, ease: [0.23, 1, 0.32, 1] }}
          className="my-6 sm:my-8 glass-divider"
        />

        {/* ── Buton „Înapoi acasă” + countdown ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center gap-4 sm:gap-5"
        >
          {/* Buton CTA */}
          <Link
            href="/"
            onMouseEnter={pauseCountdown}
            onMouseLeave={resumeCountdown}
            onFocus={pauseCountdown}
            onBlur={resumeCountdown}
            className="glass-btn px-8 py-4 text-sm sm:text-base group"
          >
            <svg
              className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
              />
            </svg>
            <span>Înapoi la pagina principală</span>
          </Link>

          {/* Countdown live */}
          <AnimatePresence mode="wait">
            <motion.p
              key={countdown}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-xs sm:text-sm text-white/30 font-mono tracking-wide"
            >
              {countdown <= 0
                ? "Redirecționare..."
                : isHovering
                  ? `Countdown în pauză · ${countdown}s`
                  : `Redirecționare automată în ${countdown}s`}
            </motion.p>
          </AnimatePresence>

          {/* Link-uri secundare */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2">
            <Link
              href="/#services"
              className="text-xs sm:text-sm text-white/30 hover:text-white/60 transition-colors duration-300 underline-offset-4 hover:underline"
            >
              Servicii
            </Link>
            <span className="text-white/15 select-none">·</span>
            <Link
              href="/#portfolio"
              className="text-xs sm:text-sm text-white/30 hover:text-white/60 transition-colors duration-300 underline-offset-4 hover:underline"
            >
              Portofoliu
            </Link>
            <span className="text-white/15 select-none">·</span>
            <Link
              href="/#contact"
              className="text-xs sm:text-sm text-white/30 hover:text-white/60 transition-colors duration-300 underline-offset-4 hover:underline"
            >
              Contact
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          GRADIENT LA BAZĂ (estetic)
          ═══════════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 z-[2] h-24 sm:h-36 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(13,10,26,0.6) 50%, #0D0A1A 100%)",
        }}
      />
    </main>
  );
}